import { useState } from "react";
import {
  Search,
  Edit,
  ChevronLeft,
  Phone,
  Video,
  MoreVertical,
  Image as ImageIcon,
  Mic,
} from "lucide-react";

const CONVERSATIONS = [
  {
    id: "1",
    name: "ProPlayer99",
    lastMsg: "Wanna duo rank later?",
    time: "10:42 AM",
    unread: 2,
    online: true,
  },
  {
    id: "2",
    name: "MythicSquad",
    lastMsg: "Alex: We need a tank for tournament",
    time: "Yesterday",
    unread: 0,
    online: false,
    isGroup: true,
  },
  {
    id: "3",
    name: "NoobMaster",
    lastMsg: "Thanks for the carry!",
    time: "Mon",
    unread: 0,
    online: true,
  },
];

export default function InboxTab({ isGuest, onRequireAuth }: { isGuest: boolean, onRequireAuth: (step: "login" | "register") => void }) {
  const [activeChat, setActiveChat] = useState<string | null>(null);

  if (isGuest) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-bg-light dark:bg-bg-dark p-6 text-center">
        <div className="w-20 h-20 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
          <Edit size={40} className="text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold mb-2 dark:text-white">Inbox</h2>
        <p className="text-gray-500 mb-8">
          Log in to message friends and join squad chats.
        </p>
        <button onClick={() => onRequireAuth('login')} className="bg-primary text-white px-8 py-3 rounded-xl font-bold w-full max-w-xs">
          Log In
        </button>
      </div>
    );
  }

  if (activeChat) {
    return (
      <DirectMessage chatId={activeChat} onBack={() => setActiveChat(null)} />
    );
  }

  return (
    <div className="flex flex-col h-full bg-bg-light dark:bg-bg-dark">
      <div className="bg-white dark:bg-gray-900 px-4 pt-6 pb-2 shadow-sm sticky top-0 z-10">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold dark:text-white">Inbox</h1>
          <button className="text-primary dark:text-accent p-2">
            <Edit size={22} />
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search messages..."
            className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:text-white"
          />
        </div>

        <div className="flex space-x-6 border-b border-gray-200 dark:border-gray-800">
          {["All", "Direct", "Squads"].map((tab, i) => (
            <button
              key={tab}
              className={`pb-3 text-sm font-bold border-b-2 ${i === 0 ? "border-primary text-primary dark:border-accent dark:text-accent" : "border-transparent text-gray-500"}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {CONVERSATIONS.map((chat) => (
          <button
            key={chat.id}
            onClick={() => setActiveChat(chat.id)}
            className="w-full bg-white dark:bg-gray-900 p-4 flex items-center border-b border-gray-100 dark:border-gray-800 active:bg-gray-50 dark:active:bg-gray-800 transition-colors"
          >
            <div className="relative mr-4">
              <img
                src={`https://picsum.photos/seed/user${chat.id}/100/100`}
                className={`w-14 h-14 object-cover ${chat.isGroup ? "rounded-xl" : "rounded-full"}`}
                alt="Avatar"
              />
              {chat.online && !chat.isGroup && (
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-success border-2 border-white dark:border-gray-900 rounded-full"></div>
              )}
            </div>
            <div className="flex-1 text-left">
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  {chat.name}
                </h3>
                <span
                  className={`text-xs ${chat.unread > 0 ? "text-primary dark:text-accent font-bold" : "text-gray-400"}`}
                >
                  {chat.time}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <p
                  className={`text-sm truncate pr-4 ${chat.unread > 0 ? "text-gray-900 dark:text-white font-medium" : "text-gray-500"}`}
                >
                  {chat.lastMsg}
                </p>
                {chat.unread > 0 && (
                  <div className="w-5 h-5 bg-error text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
                    {chat.unread}
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function DirectMessage({
  chatId,
  onBack,
}: {
  chatId: string;
  onBack: () => void;
}) {
  const chat = CONVERSATIONS.find((c) => c.id === chatId);

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
          <div className="flex items-center">
            <img
              src={`https://picsum.photos/seed/user${chat?.id}/100/100`}
              className={`w-10 h-10 object-cover mr-3 ${chat?.isGroup ? "rounded-xl" : "rounded-full"}`}
              alt="Avatar"
            />
            <div>
              <h2 className="font-bold text-base dark:text-white leading-tight">
                {chat?.name}
              </h2>
              <p className="text-xs text-success flex items-center mt-0.5">
                {chat?.online && !chat?.isGroup && (
                  <span className="w-1.5 h-1.5 bg-success rounded-full mr-1"></span>
                )}
                {chat?.online ? "Online" : "Last seen recently"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex space-x-4 text-gray-500">
          <button>
            <Phone size={20} />
          </button>
          <button>
            <Video size={20} />
          </button>
          <button>
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col-reverse">
        {/* Input Area */}
        <div className="bg-white dark:bg-gray-900 p-3 border-t border-gray-200 dark:border-gray-800 pb-safe mt-auto">
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2">
            <button className="text-gray-400 mr-3">
              <ImageIcon size={20} />
            </button>
            <input
              type="text"
              placeholder="Message..."
              className="flex-1 bg-transparent border-none focus:outline-none text-sm dark:text-white"
            />
            <button className="text-gray-400 ml-3">
              <Mic size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
