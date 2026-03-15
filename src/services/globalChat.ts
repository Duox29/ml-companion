import { api } from "./api";
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

export const GLOBAL_CHAT_ENDPOINTS = {
  listChannels: "/channels",
  getChannelMessages: (channelId: string) => `/channels/${channelId}/messages`,
  sendChannelMessage: (channelId: string) => `/channels/${channelId}/messages`,
  websocketHandshake: "/ws",
  websocketSubscribeTopic: (channelId: string) => `/topic/channels/${channelId}`,
  websocketSendDestination: (channelId: string) => `/app/channels/${channelId}/send`,
};

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
  return {
    id: message.id,
    type: message.type,
    content: message.content,
    timestamp: message.timestamp,
    sender: {
      id: message.sender?.id ?? "",
      username: message.sender?.username ?? "Unknown",
      avatar: message.sender?.avatarUrl,
    },
  };
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

