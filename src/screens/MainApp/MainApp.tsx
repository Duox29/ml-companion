import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Users,
  MessageCircle,
  Inbox,
  UserCircle,
} from "lucide-react";
import WikiTab from "../Wiki";
import CommunityTab from "../Community";
import ChatTab from "../Chat";
import InboxTab from "../Inbox";
import ProfileTab from "../Profile";

type MainAppProps = {
  isGuest: boolean;
  onLogout: () => void;
  onRequireAuth: (step: "login" | "register") => void;
};

export default function MainApp({ isGuest, onLogout, onRequireAuth }: MainAppProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: "wiki", path: "/wiki", label: "Wiki", icon: BookOpen },
    { id: "community", path: "/community", label: "Community", icon: Users },
    { id: "chat", path: "/chat", label: "Chat", icon: MessageCircle },
    { id: "inbox", path: "/inbox", label: "Inbox", icon: Inbox },
    { id: "profile", path: "/profile", label: "Profile", icon: UserCircle },
  ];

  const activeTab = tabs.find(
    (tab) =>
      location.pathname === tab.path ||
      location.pathname.startsWith(`${tab.path}/`),
  )?.id;

  return (
    <div className="flex flex-col h-full w-full bg-bg-light dark:bg-bg-dark relative">
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/wiki/*" element={<WikiTab />} />
          <Route
            path="/community"
            element={<CommunityTab isGuest={isGuest} onRequireAuth={onRequireAuth} />}
          />
          <Route
            path="/chat"
            element={<ChatTab isGuest={isGuest} onRequireAuth={onRequireAuth} />}
          />
          <Route
            path="/inbox"
            element={<InboxTab isGuest={isGuest} onRequireAuth={onRequireAuth} />}
          />
          <Route
            path="/profile"
            element={
              <ProfileTab
                isGuest={isGuest}
                onLogout={onLogout}
                onRequireAuth={onRequireAuth}
              />
            }
          />
          <Route path="/" element={<Navigate to="/wiki" replace />} />
          <Route path="*" element={<Navigate to="/wiki" replace />} />
        </Routes>
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-safe">
        <div className="flex justify-around items-center h-16 px-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`group flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 active:scale-95 ${
                  isActive
                    ? "text-primary dark:text-accent"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <Icon
                  size={24}
                  className={`transition-transform duration-200 ${isActive ? "fill-current opacity-20 scale-110" : "group-hover:scale-110"}`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
