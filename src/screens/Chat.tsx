import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Hash,
  Users,
  ChevronLeft,
  Send,
  Smile,
  Image as ImageIcon,
  Info,
} from "lucide-react";
import { Channel, ChannelMessage } from "../types";
import {
  fetchGlobalChannelMessages,
  fetchGlobalChannels,
  sendGlobalChannelMessage,
} from "../services/globalChat";

export default function ChatTab({
  isGuest,
  onRequireAuth,
}: {
  isGuest: boolean;
  onRequireAuth: (step: "login" | "register") => void;
}) {
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
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

  if (activeChannel) {
    return (
      <ChatRoom channelId={activeChannel} onBack={() => setActiveChannel(null)} />
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
              onClick={() => setActiveChannel(channel.id)}
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
              <div className="flex items-center text-xs text-success font-medium">
                <div className="w-2 h-2 bg-success rounded-full mr-1.5"></div>
                {channel.onlineCount}
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
  const [isSending, setIsSending] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoadingMessages(true);
        setMessagesError(null);

        const [channels, page] = await Promise.all([
          fetchGlobalChannels(),
          fetchGlobalChannelMessages(channelId, 1, 50),
        ]);

        setChannel(channels.find((c) => c.id === channelId) ?? null);
        setMessages(page.data ?? []);
      } catch (error) {
        console.error("Failed to load channel messages:", error);
        setMessagesError("Could not load messages. Please try again.");
      } finally {
        setIsLoadingMessages(false);
      }
    };

    load();
  }, [channelId]);

  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      const aTime = new Date(a.timestamp).getTime();
      const bTime = new Date(b.timestamp).getTime();
      return bTime - aTime;
    });
  }, [messages]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const content = input.trim();
    if (!content || isSending) return;

    try {
      setIsSending(true);
      const sent = await sendGlobalChannelMessage(channelId, content);
      setMessages((prev) => [sent, ...prev]);
      setInput("");
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessagesError("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-light dark:bg-bg-dark absolute inset-0 z-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 px-4 pt-6 pb-3 flex items-center justify-between shadow-sm border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="mr-3 text-gray-600 dark:text-gray-300"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="font-bold text-lg dark:text-white flex items-center">
              <Hash size={18} className="text-gray-400 mr-1" />
              {channel?.name}
            </h2>
            <p className="text-xs text-success flex items-center">
              <span className="w-1.5 h-1.5 bg-success rounded-full mr-1"></span>
              {channel?.online} online
            </p>
          </div>
        </div>
        <button className="text-gray-500">
          <Users size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col-reverse">
        {messagesError && (
          <div className="text-sm text-error text-center">{messagesError}</div>
        )}

        {isLoadingMessages && (
          <div className="text-sm text-gray-500 text-center">Loading messages...</div>
        )}

        {!isLoadingMessages &&
          !messagesError &&
          sortedMessages.map((message) => (
            <div key={message.id} className="flex items-start">
              {message.sender.avatar ? (
                <img
                  src={message.sender.avatar}
                  className="w-8 h-8 rounded-full mr-3 mt-1 object-cover"
                  alt={message.sender.username}
                />
              ) : (
                <div className="w-8 h-8 rounded-full mr-3 mt-1 bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-700 dark:text-gray-200">
                  {message.sender.username.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-baseline mb-0.5">
                  <span className="font-bold text-sm dark:text-white mr-2">
                    {message.sender.username}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl rounded-tl-none text-sm text-gray-800 dark:text-gray-200 shadow-sm border border-gray-100 dark:border-gray-700 inline-block">
                  {message.content}
                </div>
              </div>
            </div>
          ))}

        {!isLoadingMessages && !messagesError && sortedMessages.length === 0 && (
          <div className="text-center text-sm text-gray-500 mt-6">
            No messages yet. Start the conversation.
          </div>
        )}

        <div className="text-center text-xs text-gray-400 my-4">
          Welcome to #{channel?.name}!
        </div>
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-gray-900 p-3 border-t border-gray-200 dark:border-gray-800 pb-safe">
        <form
          onSubmit={onSubmit}
          className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2"
        >
          <button type="button" className="text-gray-400 mr-2">
            <ImageIcon size={20} />
          </button>
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={`Message #${channel?.name}...`}
            className="flex-1 bg-transparent border-none focus:outline-none text-sm dark:text-white"
            disabled={isSending}
          />
          <button type="button" className="text-gray-400 mx-2">
            <Smile size={20} />
          </button>
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white shrink-0 disabled:opacity-60"
          >
            <Send size={14} className="ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
