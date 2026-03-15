import { Client, IMessage, StompSubscription } from "@stomp/stompjs";
import { api } from "./api";
import { storage, AUTH_KEYS } from "./storage";
import { Channel, ChannelMessage, PagedData } from "../types";

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
};

type BackendUser = {
  id: string;
  username: string;
  avatarUrl?: string;
};

type BackendChannel = {
  id: string;
  name: string;
  description: string;
  onlineCount: number;
};

type BackendChannelMessage = {
  id: string;
  type: "message" | "presence";
  sender: BackendUser;
  content: string;
  timestamp: string;
};

type GlobalChatSocketListener = {
  onMessage: (message: ChannelMessage) => void;
  onConnectionChange?: (isConnected: boolean) => void;
  onError?: (errorMessage: string) => void;
};

type ChannelSocketSubscription = {
  unsubscribe: () => void;
};

export const GLOBAL_CHAT_ENDPOINTS = {
  listChannels: "/channels",
  getChannelMessages: (channelId: string) => `/channels/${channelId}/messages`,
  sendChannelMessage: (channelId: string) => `/channels/${channelId}/messages`,
  websocketHandshake: "/ws",
  websocketSubscribeTopic: (channelId: string) => `/topic/channels/${channelId}`,
  websocketSendDestination: (channelId: string) => `/app/channels/${channelId}/send`,
};

const SOCKET_RECONNECT_DELAY_MS = 5000;
const SOCKET_CONNECT_TIMEOUT_MS = 10000;

let stompClient: Client | null = null;
let activationPromise: Promise<Client> | null = null;
let activeSubscriptions = 0;
const connectionListeners = new Set<(isConnected: boolean) => void>();
const errorListeners = new Set<(errorMessage: string) => void>();

const REQUIRED_CHANNELS: Channel[] = [
  {
    id: "general",
    name: "general",
    description: "General game discussion",
    onlineCount: 0,
  },
  {
    id: "heroes",
    name: "heroes",
    description: "Hero builds and strategies",
    onlineCount: 0,
  },
  {
    id: "esports",
    name: "esports",
    description: "Pro scene and tournaments",
    onlineCount: 0,
  },
  {
    id: "looking-for-group",
    name: "looking-for-group",
    description: "Find players for ranked",
    onlineCount: 0,
  },
  {
    id: "off-topic",
    name: "off-topic",
    description: "Everything outside gameplay",
    onlineCount: 0,
  },
];

function normalizeChannel(channel: BackendChannel): Channel {
  return {
    id: channel.id,
    name: channel.name,
    description: channel.description,
    onlineCount: channel.onlineCount ?? 0,
  };
}

function normalizeMessage(message: BackendChannelMessage): ChannelMessage {
  const senderName = message.sender?.username?.trim() || "Unknown";
  const parsedTimestamp = message.timestamp ? new Date(message.timestamp) : null;
  const timestamp =
    parsedTimestamp && !Number.isNaN(parsedTimestamp.getTime())
      ? parsedTimestamp.toISOString()
      : new Date().toISOString();

  return {
    id: message.id || `${message.sender?.id ?? "unknown"}-${timestamp}`,
    type: message.type === "presence" ? "presence" : "message",
    content: typeof message.content === "string" ? message.content : "",
    timestamp,
    sender: {
      id: message.sender?.id ?? "",
      username: senderName,
      avatar: message.sender?.avatarUrl || undefined,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function safeNormalizeSocketMessage(payload: unknown): ChannelMessage | null {
  if (!isRecord(payload)) return null;

  const sender = isRecord(payload.sender) ? payload.sender : {};
  const backendMessage: BackendChannelMessage = {
    id: typeof payload.id === "string" ? payload.id : "",
    type: payload.type === "presence" ? "presence" : "message",
    content: typeof payload.content === "string" ? payload.content : "",
    timestamp:
      typeof payload.timestamp === "string"
        ? payload.timestamp
        : new Date().toISOString(),
    sender: {
      id: typeof sender.id === "string" ? sender.id : "",
      username: typeof sender.username === "string" ? sender.username : "Unknown",
      avatarUrl:
        typeof sender.avatarUrl === "string" && sender.avatarUrl.trim()
          ? sender.avatarUrl
          : undefined,
    },
  };

  return normalizeMessage(backendMessage);
}

function getWebSocketUrl(): string {
  const baseUrl = api.defaults.baseURL ?? "";

  try {
    const url = new URL(GLOBAL_CHAT_ENDPOINTS.websocketHandshake, baseUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return url.toString();
  } catch {
    return GLOBAL_CHAT_ENDPOINTS.websocketHandshake;
  }
}

async function getAuthorizedStompClient(): Promise<Client> {
  if (stompClient?.active) {
    return stompClient;
  }

  if (activationPromise) {
    return activationPromise;
  }

  activationPromise = (async () => {
    const token = await storage.get(AUTH_KEYS.ACCESS_TOKEN);
    if (!token) {
      throw new Error("Missing access token for websocket connection.");
    }

    const client = new Client({
      reconnectDelay: SOCKET_RECONNECT_DELAY_MS,
      connectionTimeout: SOCKET_CONNECT_TIMEOUT_MS,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      brokerURL: getWebSocketUrl(),
      debug: () => undefined,
    });

    return await new Promise<Client>((resolve, reject) => {
      let settled = false;

      client.onConnect = () => {
        settled = true;
        stompClient = client;
        connectionListeners.forEach((listener) => listener(true));
        resolve(client);
      };

      client.onStompError = (frame) => {
        const message = frame.headers.message || "WebSocket connection failed.";
        errorListeners.forEach((listener) => listener(message));
        connectionListeners.forEach((listener) => listener(false));
        if (!settled) {
          settled = true;
          activationPromise = null;
          reject(new Error(message));
        }
      };

      client.onWebSocketError = () => {
        connectionListeners.forEach((listener) => listener(false));
        if (!settled) {
          settled = true;
          activationPromise = null;
          reject(new Error("Unable to establish websocket connection."));
        }
      };

      client.onWebSocketClose = () => {
        connectionListeners.forEach((listener) => listener(false));
        if (!settled) {
          settled = true;
          activationPromise = null;
          reject(new Error("WebSocket connection closed before STOMP CONNECT."));
        }
        if (stompClient === client && !client.active) {
          stompClient = null;
        }
      };

      client.activate();
    });
  })();

  try {
    return await activationPromise;
  } finally {
    activationPromise = null;
  }
}

async function deactivateStompClientIfIdle() {
  if (!stompClient || activeSubscriptions > 0) {
    return;
  }

  const client = stompClient;
  stompClient = null;

  if (client.active) {
    await client.deactivate();
  }
}

function withRequiredChannels(channels: Channel[]): Channel[] {
  const channelMap = new Map<string, Channel>();
  channels.forEach((channel) => channelMap.set(channel.id, channel));

  return REQUIRED_CHANNELS.map((required) => {
    const existing = channelMap.get(required.id);
    return existing
      ? {
          ...required,
          ...existing,
        }
      : required;
  });
}

export async function fetchGlobalChannels(): Promise<Channel[]> {
  const response = await api.get<ApiEnvelope<BackendChannel[]>>(
    GLOBAL_CHAT_ENDPOINTS.listChannels
  );
  const channels = (response.data.data ?? []).map(normalizeChannel);
  return withRequiredChannels(channels);
}

export async function fetchGlobalChannelMessages(
  channelId: string,
  page = 1,
  limit = 50
): Promise<PagedData<ChannelMessage>> {
  const response = await api.get<ApiEnvelope<PagedData<BackendChannelMessage>>>(
    GLOBAL_CHAT_ENDPOINTS.getChannelMessages(channelId),
    { params: { page, limit } }
  );

  const payload = response.data.data;
  return {
    ...payload,
    data: (payload.data ?? []).map(normalizeMessage),
  };
}

export async function sendGlobalChannelMessage(
  channelId: string,
  content: string
): Promise<ChannelMessage> {
  const response = await api.post<ApiEnvelope<BackendChannelMessage>>(
    GLOBAL_CHAT_ENDPOINTS.sendChannelMessage(channelId),
    { content }
  );
  return normalizeMessage(response.data.data);
}

export async function subscribeToGlobalChannel(
  channelId: string,
  listener: GlobalChatSocketListener
): Promise<ChannelSocketSubscription> {
  const client = await getAuthorizedStompClient();
  let subscription: StompSubscription | null = null;
  let isClosed = false;

  const handleConnectionChange = (isConnected: boolean) => {
    listener.onConnectionChange?.(isConnected);
  };
  const handleError = (errorMessage: string) => {
    listener.onError?.(errorMessage);
  };

  connectionListeners.add(handleConnectionChange);
  errorListeners.add(handleError);

  try {
    subscription = client.subscribe(
      GLOBAL_CHAT_ENDPOINTS.websocketSubscribeTopic(channelId),
      (frame: IMessage) => {
        try {
          const parsed = JSON.parse(frame.body) as unknown;
          const message = safeNormalizeSocketMessage(parsed);

          if (!message) {
            listener.onError?.("Received an invalid chat payload.");
            return;
          }

          listener.onMessage(message);
        } catch (error) {
          console.error("Failed to parse websocket chat message:", error);
          listener.onError?.("Received an unreadable chat payload.");
        }
      }
    );
    activeSubscriptions += 1;
    handleConnectionChange(client.connected);
  } catch (error) {
    connectionListeners.delete(handleConnectionChange);
    errorListeners.delete(handleError);
    handleConnectionChange(false);
    throw error;
  }

  return {
    unsubscribe: () => {
      if (isClosed) return;
      isClosed = true;

      subscription?.unsubscribe();
      subscription = null;

      connectionListeners.delete(handleConnectionChange);
      errorListeners.delete(handleError);
      activeSubscriptions = Math.max(0, activeSubscriptions - 1);
      handleConnectionChange(false);

      void deactivateStompClientIfIdle();
    },
  };
}

export async function sendGlobalChannelMessageRealtime(
  channelId: string,
  content: string
): Promise<void> {
  const trimmedContent = content.trim();
  if (!trimmedContent) {
    throw new Error("Message content must not be empty.");
  }

  const client = await getAuthorizedStompClient();
  client.publish({
    destination: GLOBAL_CHAT_ENDPOINTS.websocketSendDestination(channelId),
    body: JSON.stringify({ content: trimmedContent }),
  });
}

