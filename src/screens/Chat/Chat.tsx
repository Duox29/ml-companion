import { ChangeEvent, FormEvent, Fragment, UIEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import {
  Hash,
  Users,
  ChevronLeft,
  Send,
  Smile,
  Sticker,
  X,
  Image as ImageIcon,
  Info,
} from "lucide-react";
import { Channel, ChannelMessage } from "../../types";
import {
  fetchGlobalChannelMessages,
  fetchGlobalChannels,
  sendGlobalChannelMessage,
  subscribeToGlobalChannel,
} from "../../services/globalChat";
import { AUTH_KEYS, storage } from "../../services/storage";
import {
  ChatAsset,
  loadCustomChatAssets,
  mergeChatAssets,
  normalizeAssetCode,
  isValidImageSource,
} from "../../services/chatAssets";

const ASSET_TOKEN_REGEX = /(\[img\](.*?)\[\/img\]|:[a-z0-9_+-]+:)/gi;
const INLINE_IMAGE_DATA_REGEX = /\[img\]\s*data:image\/[a-zA-Z0-9.+-]+;base64,[\s\S]*?\[\/img\]/i;
const MAX_INLINE_IMAGE_MESSAGE_LENGTH = 800_000;
const CHANNEL_MESSAGES_PAGE_SIZE = 50;
const LOAD_MORE_SCROLL_THRESHOLD_PX = 120;
const IS_WEB_PLATFORM = Capacitor.getPlatform() === "web";

async function compressImageFile(file: File): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Could not read image file."));
        return;
      }

      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not decode selected image."));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });

  const maxWidth = 1280;
  const maxHeight = 1280;
  const widthRatio = maxWidth / image.width;
  const heightRatio = maxHeight / image.height;
  const ratio = Math.min(1, widthRatio, heightRatio);

  const targetWidth = Math.max(1, Math.round(image.width * ratio));
  const targetHeight = Math.max(1, Math.round(image.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not process image.");
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  const preferPng = file.type.toLowerCase().includes("png");
  const outputType = preferPng ? "image/png" : "image/jpeg";
  const quality = preferPng ? 0.92 : 0.78;

  return canvas.toDataURL(outputType, quality);
}

function renderMessageContent(content: string, assetsByCode: Map<string, ChatAsset>) {
  const text = content || "";
  const parts: Array<{
    type: "text" | "emoji" | "sticker" | "image";
    value: string;
  }> = [];

  let lastIndex = 0;
  text.replace(ASSET_TOKEN_REGEX, (fullMatch, _token, imageValue, offset) => {
    if (offset > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, offset) });
    }

    if (fullMatch.toLowerCase().startsWith("[img]")) {
      const imageSrc = typeof imageValue === "string" ? imageValue.trim() : "";
      if (isValidImageSource(imageSrc)) {
        parts.push({ type: "image", value: imageSrc });
      } else {
        parts.push({ type: "text", value: fullMatch });
      }
    } else {
      const normalizedCode = normalizeAssetCode(fullMatch);
      const asset = assetsByCode.get(normalizedCode);
      if (!asset) {
        parts.push({ type: "text", value: fullMatch });
      } else if (asset.type === "emoji") {
        parts.push({ type: "emoji", value: asset.value });
      } else {
        parts.push({ type: "sticker", value: asset.value });
      }
    }

    lastIndex = offset + fullMatch.length;
    return fullMatch;
  });

  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  if (parts.length === 0) {
    parts.push({ type: "text", value: text });
  }

  return (
    <div className="space-y-2">
      {parts.map((part, index) => {
        if (part.type === "emoji") {
          return (
            <span key={`${part.type}-${index}`} className="text-lg align-middle">
              {part.value}
            </span>
          );
        }

        if (part.type === "sticker") {
          return (
            <img
              key={`${part.type}-${index}`}
              src={part.value}
              alt="sticker"
              className="max-w-[180px] max-h-[180px] rounded-xl border border-gray-200 dark:border-gray-700 object-cover"
            />
          );
        }

        if (part.type === "image") {
          return (
            <img
              key={`${part.type}-${index}`}
              src={part.value}
              alt="chat upload"
              className="max-w-[220px] max-h-[220px] rounded-xl border border-gray-200 dark:border-gray-700 object-cover"
            />
          );
        }

        return (
          <Fragment key={`${part.type}-${index}`}>
            {(() => {
              const lines = part.value.split("\n");
              return lines.map((line, lineIndex) => (
                <Fragment key={`line-${lineIndex}`}>
                  {line}
                  {lineIndex < lines.length - 1 ? <br /> : null}
                </Fragment>
              ));
            })()}
          </Fragment>
        );
      })}
    </div>
  );
}

export default function ChatTab({
  isGuest,
  onRequireAuth,
}: {
  isGuest: boolean;
  onRequireAuth: (step: "login" | "register") => void;
}) {
  const navigate = useNavigate();
  const { channelId: rawChannelId } = useParams<{ channelId?: string }>();
  const activeChannelId = useMemo(() => {
    if (!rawChannelId) return null;
    try {
      return decodeURIComponent(rawChannelId);
    } catch {
      return rawChannelId;
    }
  }, [rawChannelId]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [channelsError, setChannelsError] = useState<string | null>(null);

  useEffect(() => {
    if (isGuest) return;

    const loadChannels = async () => {
      try {
        setIsLoadingChannels(true);
        setChannelsError(null);
        const data = await fetchGlobalChannels();
        setChannels(data);
      } catch (error) {
        console.error("Failed to load channels:", error);
        setChannelsError("Could not load channels. Please try again.");
      } finally {
        setIsLoadingChannels(false);
      }
    };

    loadChannels();
  }, [isGuest]);

  if (isGuest) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-bg-light dark:bg-bg-dark p-6 text-center">
        <div className="w-20 h-20 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
          <Hash size={40} className="text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold mb-2 dark:text-white">Global Chat</h2>
        <p className="text-gray-500 mb-8">
          Log in to chat with thousands of players worldwide in real-time.
        </p>
        <button
          onClick={() => onRequireAuth("login")}
          className="bg-primary text-white px-8 py-3 rounded-xl font-bold w-full max-w-xs"
        >
          Log In to Chat
        </button>
      </div>
    );
  }

  if (activeChannelId) {
    return (
      <ChatRoom channelId={activeChannelId} onBack={() => navigate("/chat")} />
    );
  }

  return (
    <div className="flex flex-col h-full bg-bg-light dark:bg-bg-dark">
      <div className="bg-white dark:bg-gray-900 px-4 pt-6 pb-4 shadow-sm">
        <h1 className="text-xl font-bold dark:text-white">Global Chat</h1>
      </div>

      <div className="p-4">
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-xl p-3 mb-6 flex items-start">
          <Info size={18} className="text-blue-500 mt-0.5 mr-2 shrink-0" />
          <p className="text-xs text-blue-800 dark:text-blue-200">
            <strong>Chat Rules:</strong> Be respectful. No spam. English only in
            #general.{" "}
            <a href="#" className="underline font-medium">
              Read Full Rules
            </a>
          </p>
        </div>

        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">
          Channels
        </h2>

        {isLoadingChannels && (
          <div className="text-sm text-gray-500 px-1">Loading channels...</div>
        )}

        {channelsError && (
          <div className="text-sm text-error px-1">{channelsError}</div>
        )}

        {!isLoadingChannels && !channelsError && channels.length === 0 && (
          <div className="text-sm text-gray-500 px-1">No channels available.</div>
        )}

        <div className="space-y-2">
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => navigate(`/chat/${encodeURIComponent(channel.id)}`)}
              className="w-full bg-white dark:bg-gray-800 p-4 rounded-xl flex items-center justify-between border border-gray-100 dark:border-gray-700 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mr-3 text-gray-500">
                  <Hash size={20} />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    #{channel.name}
                  </h3>
                  <p className="text-xs text-gray-500">{channel.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatRoom({
  channelId,
  onBack,
}: {
  channelId: string;
  onBack: () => void;
}) {
  const [channel, setChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [initialConnectionNotice, setInitialConnectionNotice] = useState<string | null>(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false);
  const [customAssets, setCustomAssets] = useState<ChatAsset[]>([]);
  const [pendingImageDataUrl, setPendingImageDataUrl] = useState<string | null>(null);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const messageInputRef = useRef<HTMLInputElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const focusMessageInput = () => {
    const inputElement = messageInputRef.current;
    if (!inputElement) return;
    inputElement.focus({ preventScroll: true });
  };

  const allAssets = useMemo(() => mergeChatAssets(customAssets), [customAssets]);
  const emojiAssets = useMemo(
    () => allAssets.filter((asset) => asset.type === "emoji"),
    [allAssets]
  );
  const stickerAssets = useMemo(
    () => allAssets.filter((asset) => asset.type === "sticker"),
    [allAssets]
  );
  const assetsByCode = useMemo(() => {
    const map = new Map<string, ChatAsset>();
    allAssets.forEach((asset) => map.set(asset.code, asset));
    return map;
  }, [allAssets]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        setIsLoadingMessages(true);
        setMessagesError(null);
        setIsSocketConnected(false);
        setInitialConnectionNotice(null);
        setPendingImageDataUrl(null);
        setCurrentPage(1);
        setHasMoreMessages(false);
        setIsLoadingMoreMessages(false);

        const [channels, page] = await Promise.all([
          fetchGlobalChannels(),
          fetchGlobalChannelMessages(channelId, 1, CHANNEL_MESSAGES_PAGE_SIZE),
        ]);

        if (!isMounted) return;

        setChannel(channels.find((c) => c.id === channelId) ?? null);
        setMessages(Array.isArray(page.data) ? page.data : []);
        setCurrentPage(page.page || 1);
        setHasMoreMessages(Boolean(page.hasNext));

        subscriptionRef.current?.unsubscribe();
        const nextSubscription = await subscribeToGlobalChannel(channelId, {
          onMessage: (message) => {
            if (!isMounted) return;
            setMessages((prev) => {
              const next = [message, ...prev];
              const deduped = new Map<string, ChannelMessage>();

              for (const item of next) {
                deduped.set(item.id, item);
              }

              return Array.from(deduped.values());
            });
          },
          onConnectionChange: (connected) => {
            if (!isMounted) return;
            setIsSocketConnected(connected);
            setInitialConnectionNotice((prev) => {
              if (prev !== null) return prev;
              return connected
                ? null
                : "Realtime disconnected.";
            });
          },
          onError: (error) => {
            if (!isMounted) return;
            setMessagesError(error);
          },
        });

        if (!isMounted) {
          nextSubscription.unsubscribe();
          return;
        }

        subscriptionRef.current = nextSubscription;
        requestAnimationFrame(() => {
          const container = messagesContainerRef.current;
          if (!container) return;
          container.scrollTop = 0;
        });

        if (IS_WEB_PLATFORM) {
          setTimeout(() => {
            if (!isMounted) return;
            focusMessageInput();
          }, 0);
        }
      } catch (error) {
        console.error("Failed to load channel messages:", error);
        if (isMounted) {
          setMessagesError("Could not load messages. Please try again.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingMessages(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
    };
  }, [channelId]);

  const loadOlderMessages = async () => {
    if (isLoadingMessages || isLoadingMoreMessages || !hasMoreMessages) {
      return;
    }

    const container = messagesContainerRef.current;
    const previousScrollHeight = container?.scrollHeight ?? 0;
    const previousScrollTop = container?.scrollTop ?? 0;
    const targetPage = currentPage + 1;

    try {
      setIsLoadingMoreMessages(true);
      setMessagesError(null);
      const page = await fetchGlobalChannelMessages(
        channelId,
        targetPage,
        CHANNEL_MESSAGES_PAGE_SIZE
      );

      setMessages((prev) => {
        const deduped = new Map<string, ChannelMessage>();
        [...prev, ...(Array.isArray(page.data) ? page.data : [])].forEach((item) => {
          if (!deduped.has(item.id)) {
            deduped.set(item.id, item);
          }
        });
        return Array.from(deduped.values());
      });

      setCurrentPage(page.page || targetPage);
      setHasMoreMessages(Boolean(page.hasNext));

      requestAnimationFrame(() => {
        const updatedContainer = messagesContainerRef.current;
        if (!updatedContainer) return;
        const heightDelta = updatedContainer.scrollHeight - previousScrollHeight;
        updatedContainer.scrollTop = previousScrollTop + Math.max(0, heightDelta);
      });
    } catch (error) {
      console.error("Failed to load older channel messages:", error);
      setMessagesError("Could not load older messages. Please try again.");
    } finally {
      setIsLoadingMoreMessages(false);
    }
  };

  const handleMessagesScroll = (event: UIEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    const scrollableHeight = container.scrollHeight - container.clientHeight;
    const isNearTop =
      container.scrollTop >= Math.max(0, scrollableHeight - LOAD_MORE_SCROLL_THRESHOLD_PX);

    if (isNearTop) {
      void loadOlderMessages();
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadChatSettings = async () => {
      try {
        const storedCustomAssets = await loadCustomChatAssets();
        if (!isMounted) return;
        setCustomAssets(storedCustomAssets);
      } catch (error) {
        console.error("Failed to load chat asset settings:", error);
      }
    };

    loadChatSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      const aTime = Number.isNaN(new Date(a.timestamp).getTime())
        ? 0
        : new Date(a.timestamp).getTime();
      const bTime = Number.isNaN(new Date(b.timestamp).getTime())
        ? 0
        : new Date(b.timestamp).getTime();
      return bTime - aTime;
    });
  }, [messages]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const textContent = input.trim();
    const draftInput = input;
    const draftImage = pendingImageDataUrl;
    const content = pendingImageDataUrl
      ? `${textContent}${textContent ? " " : ""}[img]${pendingImageDataUrl}[/img]`
      : textContent;
    if (!content || isSending) return;

    try {
      setIsSending(true);
      setMessagesError(null);
      const hasInlineImageData = INLINE_IMAGE_DATA_REGEX.test(content);

      if (hasInlineImageData && content.length > MAX_INLINE_IMAGE_MESSAGE_LENGTH) {
        setMessagesError("Image is too large. Please choose a smaller image.");
        return;
      }

      // Clear draft immediately to keep typing flow smooth while request is in-flight.
      setInput("");
      setPendingImageDataUrl(null);
      focusMessageInput();

      const created = await sendGlobalChannelMessage(channelId, content);
      setMessages((prev) => {
        const next = [created, ...prev];
        const deduped = new Map<string, ChannelMessage>();
        for (const item of next) {
          deduped.set(item.id, item);
        }
        return Array.from(deduped.values());
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessagesError("Failed to send message. Please try again.");
      setInput(draftInput);
      setPendingImageDataUrl(draftImage);
    } finally {
      setIsSending(false);
      requestAnimationFrame(() => focusMessageInput());
    }
  };

  const addCodeToInput = (code: string) => {
    setInput((prev) => `${prev}${prev.endsWith(" ") || !prev ? "" : " "}${code} `);
  };

  const handleSendStickerCode = async (code: string) => {
    try {
      setIsSending(true);
      setMessagesError(null);
      const created = await sendGlobalChannelMessage(channelId, code);
      setMessages((prev) => {
        const next = [created, ...prev];
        const deduped = new Map<string, ChannelMessage>();
        for (const item of next) {
          deduped.set(item.id, item);
        }
        return Array.from(deduped.values());
      });
      setIsStickerPickerOpen(false);
    } catch (error) {
      console.error("Failed to send sticker:", error);
      setMessagesError("Failed to send sticker. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleImageButtonClick = () => {
    const manualUrl = window.prompt("Paste image URL, or leave blank to pick a local file.");
    if (manualUrl === null) return;
    if (manualUrl && manualUrl.trim()) {
      const url = manualUrl.trim();
      if (!isValidImageSource(url)) {
        setMessagesError("Invalid image URL.");
        return;
      }
      addCodeToInput(`[img]${url}[/img]`);
      return;
    }
    imageInputRef.current?.click();
  };

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessagesError("Only image files are supported.");
      return;
    }

    void (async () => {
      try {
        setMessagesError(null);
        const compressedImage = await compressImageFile(file);
        setPendingImageDataUrl(compressedImage);
      } catch (error) {
        console.error("Failed to process selected image:", error);
        setMessagesError("Could not process selected image.");
      }
    })();
  };

  return (
    <div className="flex flex-col h-full bg-bg-light dark:bg-bg-dark absolute inset-0 z-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 px-3 py-2.5 flex items-center justify-between shadow-sm border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="mr-2 text-gray-600 dark:text-gray-300"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="font-bold text-base dark:text-white flex items-center">
              <Hash size={16} className="text-gray-400 mr-1" />
              {channel?.name ?? channelId}
            </h2>
            <p
              className={`text-xs flex items-center ${isSocketConnected ? "text-success" : "text-error"}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full mr-1 ${isSocketConnected ? "bg-success" : "bg-error"}`}
              ></span>
              {isSocketConnected ? "Connected" : "Disconnected"}
            </p>
          </div>
        </div>
        <button className="text-gray-500">
          <Users size={18} />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col-reverse"
      >


        {initialConnectionNotice && (
          <div className="text-center text-[11px] text-gray-400">{initialConnectionNotice}</div>
        )}

        {messagesError && (
          <div className="text-sm text-error text-center">{messagesError}</div>
        )}

        {isLoadingMessages && (
          <div className="text-sm text-gray-500 text-center">Loading messages...</div>
        )}

        {!isLoadingMessages &&
          sortedMessages.map((message) => (
            <div key={message.id} className="flex items-start">
              {message.sender.avatar ? (
                <img
                  src={message.sender.avatar}
                  className="w-8 h-8 rounded-full mr-3 mt-1 object-cover"
                  alt={message.sender.username || "User avatar"}
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="w-8 h-8 rounded-full mr-3 mt-1 bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-700 dark:text-gray-200">
                  {(message.sender.username || "?").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-baseline mb-0.5">
                  <span className="font-bold text-sm dark:text-white mr-2">
                    {message.sender.username || "Unknown"}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {Number.isNaN(new Date(message.timestamp).getTime())
                      ? "--:--"
                      : new Date(message.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                  </span>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl rounded-tl-none text-sm text-gray-800 dark:text-gray-200 shadow-sm border border-gray-100 dark:border-gray-700 inline-block">
                  {renderMessageContent(message.content || "", assetsByCode)}
                </div>
              </div>
            </div>
          ))}

        {!isLoadingMessages && sortedMessages.length === 0 && (
          <div className="text-center text-sm text-gray-500 mt-6">
            No messages yet. Start the conversation.
          </div>
        )}

        <div className="text-center text-xs text-gray-400 my-4">
          Welcome to #{channel?.name ?? channelId}!
        </div>
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-gray-900 p-3 border-t border-gray-200 dark:border-gray-800 pb-safe">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageFileChange}
          className="hidden"
        />

        {isEmojiPickerOpen && (
          <div className="mb-2 bg-gray-100 dark:bg-gray-800 rounded-2xl p-3 flex flex-wrap gap-2">
            {emojiAssets.map((asset) => (
              <button
                key={asset.code}
                type="button"
                onClick={() => {
                  addCodeToInput(asset.code);
                  setIsEmojiPickerOpen(false);
                }}
                className="px-2 py-1 bg-white dark:bg-gray-700 rounded-lg text-lg"
                title={asset.code}
              >
                {asset.value}
              </button>
            ))}
          </div>
        )}

        {isStickerPickerOpen && (
          <div className="mb-2 bg-gray-100 dark:bg-gray-800 rounded-2xl p-3 grid grid-cols-4 gap-2">
            {stickerAssets.map((asset) => (
              <button
                key={asset.code}
                type="button"
                onClick={() => void handleSendStickerCode(asset.code)}
                className="bg-white dark:bg-gray-700 rounded-lg p-1"
                title={`${asset.code} (tap to send code)`}
              >
                <img
                  src={asset.value}
                  alt={asset.code}
                  className="w-full h-16 object-cover rounded-md"
                />
              </button>
            ))}
          </div>
        )}

        {pendingImageDataUrl && (
          <div className="mb-2 bg-gray-100 dark:bg-gray-800 rounded-2xl p-2 flex items-center gap-3">
            <img
              src={pendingImageDataUrl}
              alt="Selected preview"
              className="w-16 h-16 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
            />

            <button
              type="button"
              onClick={() => setPendingImageDataUrl(null)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1"
              title="Remove selected image"
              aria-label="Remove selected image"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <form
          onSubmit={onSubmit}
          className="flex min-w-0 items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-1.5"
        >
          <button
            type="button"
            className="text-gray-400 shrink-0 p-1"
            onClick={handleImageButtonClick}
          >
            <ImageIcon size={20} />
          </button>
          <input
            ref={messageInputRef}
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={`Message #${channel?.name ?? channelId}...`}
            className="flex-1 min-w-0 bg-transparent border-none focus:outline-none text-sm dark:text-white"
          />
          <button
            type="button"
            className="text-gray-400 shrink-0 p-1"
            onClick={() => {
              setIsEmojiPickerOpen((prev) => !prev);
              setIsStickerPickerOpen(false);
            }}
          >
            <Smile size={20} />
          </button>
          <button
            type="button"
            className="text-gray-400 shrink-0 p-1"
            title="Open sticker picker"
            aria-label="Open sticker picker"
            onClick={() => {
              setIsStickerPickerOpen((prev) => !prev);
              setIsEmojiPickerOpen(false);
            }}
          >
            <Sticker size={16} />
          </button>
          <button
            type="submit"
            disabled={isSending || (!input.trim() && !pendingImageDataUrl)}
            onPointerDown={(event) => {
              if (!IS_WEB_PLATFORM) {
                event.preventDefault();
              }
            }}
            className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white shrink-0 disabled:opacity-60"
          >
            <Send size={14} className="ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
