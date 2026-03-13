import { useState } from "react";
import {
  Hash,
  Users,
  ChevronLeft,
  Send,
  Smile,
  Image as ImageIcon,
  Info,
} from "lucide-react";

const CHANNELS = [
  {
    id: "general",
    name: "general",
    desc: "General game discussion",
    online: 1245,
  },
  {
    id: "heroes",
    name: "heroes",
    desc: "Hero builds and strategies",
    online: 842,
  },
  {
    id: "esports",
    name: "esports",
    desc: "Pro scene and tournaments",
    online: 530,
  },
  {
    id: "lfg",
    name: "looking-for-group",
    desc: "Find players for ranked",
    online: 921,
  },
];

export default function ChatTab({ isGuest, onRequireAuth }: { isGuest: boolean, onRequireAuth: (step: "login" | "register") => void }) {
  const [activeChannel, setActiveChannel] = useState<string | null>(null);

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
        <button onClick={() => onRequireAuth('login')} className="bg-primary text-white px-8 py-3 rounded-xl font-bold w-full max-w-xs">
          Log In to Chat
        </button>
      </div>
    );
  }

  if (activeChannel) {
    return (
      <ChatRoom
        channelId={activeChannel}
        onBack={() => setActiveChannel(null)}
      />
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

        <div className="space-y-2">
          {CHANNELS.map((channel) => (
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
                  <p className="text-xs text-gray-500">{channel.desc}</p>
                </div>
              </div>
              <div className="flex items-center text-xs text-success font-medium">
                <div className="w-2 h-2 bg-success rounded-full mr-1.5"></div>
                {channel.online}
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
  const channel = CHANNELS.find((c) => c.id === channelId);

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
        {/* Mock Messages (bottom up) */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start">
            <img
              src={`https://picsum.photos/seed/chat${i}/100/100`}
              className="w-8 h-8 rounded-full mr-3 mt-1"
              alt="Avatar"
            />
            <div>
              <div className="flex items-baseline mb-0.5">
                <span className="font-bold text-sm dark:text-white mr-2">
                  User_{i}99
                </span>
                <span className="text-[10px] text-gray-400">10:4{i} AM</span>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl rounded-tl-none text-sm text-gray-800 dark:text-gray-200 shadow-sm border border-gray-100 dark:border-gray-700 inline-block">
                {i % 2 === 0
                  ? "Anyone want to rank up? I play roam/tank."
                  : "Did you guys see the new patch notes? They nerfed my main again 😭"}
              </div>
            </div>
          </div>
        ))}

        <div className="text-center text-xs text-gray-400 my-4">
          Welcome to #{channel?.name}!
        </div>
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-gray-900 p-3 border-t border-gray-200 dark:border-gray-800 pb-safe">
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2">
          <button className="text-gray-400 mr-2">
            <ImageIcon size={20} />
          </button>
          <input
            type="text"
            placeholder={`Message #${channel?.name}...`}
            className="flex-1 bg-transparent border-none focus:outline-none text-sm dark:text-white"
          />
          <button className="text-gray-400 mx-2">
            <Smile size={20} />
          </button>
          <button className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white shrink-0">
            <Send size={14} className="ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
