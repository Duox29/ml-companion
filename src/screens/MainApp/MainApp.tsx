import { useEffect, useRef } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
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

const MAIN_TABS = [
  { id: "wiki", path: "/wiki", label: "Wiki", icon: BookOpen },
  { id: "community", path: "/community", label: "Community", icon: Users },
  { id: "chat", path: "/chat", label: "Chat", icon: MessageCircle },
  { id: "inbox", path: "/inbox", label: "Inbox", icon: Inbox },
  { id: "profile", path: "/profile", label: "Profile", icon: UserCircle },
] as const;

const SWIPE_DISTANCE_PX = 72;
const SWIPE_VERTICAL_TOLERANCE_PX = 56;
const SWIPE_MAX_DURATION_MS = 450;

const isSwipeDisabledTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest(
      "input, textarea, select, button, a, [role='button'], [contenteditable='true'], [data-disable-tab-swipe='true']",
    ),
  );
};

type MainAppProps = {
  isGuest: boolean;
  onLogout: () => void;
  onRequireAuth: (step: "login" | "register") => void;
};

export default function MainApp({ isGuest, onLogout, onRequireAuth }: MainAppProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const gestureAreaRef = useRef<HTMLDivElement>(null);

  const activeTabIndex = MAIN_TABS.findIndex(
    (tab) =>
      location.pathname === tab.path ||
      location.pathname.startsWith(`${tab.path}/`),
  );
  const activeTabId = activeTabIndex >= 0 ? MAIN_TABS[activeTabIndex].id : undefined;

  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") {
      return;
    }

    let isUnmounted = false;
    let listenerHandle: { remove: () => Promise<void> } | null = null;

    const registerBackHandler = async () => {
      listenerHandle = await CapacitorApp.addListener("backButton", ({ canGoBack }) => {
        if (window.history.length > 1 || canGoBack) {
          navigate(-1);
        }
      });
    };

    registerBackHandler().catch((error) => {
      if (!isUnmounted) {
        console.error("Failed to register Android back handler:", error);
      }
    });

    return () => {
      isUnmounted = true;
      if (listenerHandle) {
        void listenerHandle.remove();
      }
    };
  }, [navigate]);

  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") {
      return;
    }

    const element = gestureAreaRef.current;
    if (!element) {
      return;
    }

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let tracking = false;

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1 || isSwipeDisabledTarget(event.target)) {
        tracking = false;
        return;
      }

      const touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = Date.now();
      tracking = true;
    };

    const handleTouchCancel = () => {
      tracking = false;
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (!tracking || event.changedTouches.length === 0 || activeTabIndex < 0) {
        tracking = false;
        return;
      }

      tracking = false;
      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      const elapsed = Date.now() - startTime;

      if (
        elapsed > SWIPE_MAX_DURATION_MS ||
        Math.abs(deltaX) < SWIPE_DISTANCE_PX ||
        Math.abs(deltaY) > SWIPE_VERTICAL_TOLERANCE_PX
      ) {
        return;
      }

      const direction = deltaX > 0 ? -1 : 1;
      const nextIndex = activeTabIndex + direction;

      if (nextIndex < 0 || nextIndex >= MAIN_TABS.length) {
        return;
      }

      navigate(MAIN_TABS[nextIndex].path);
    };

    element.addEventListener("touchstart", handleTouchStart, { passive: true });
    element.addEventListener("touchcancel", handleTouchCancel, { passive: true });
    element.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchcancel", handleTouchCancel);
      element.removeEventListener("touchend", handleTouchEnd);
    };
  }, [activeTabIndex, navigate]);

  return (
    <div className="flex flex-col h-full w-full bg-bg-light dark:bg-bg-dark relative pt-[max(env(safe-area-inset-top),8px)]">
      <div ref={gestureAreaRef} className="flex-1 overflow-hidden">
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
      <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-[max(env(safe-area-inset-bottom),8px)]">
        <div className="flex justify-around items-center h-12 px-2">
          {MAIN_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTabId === tab.id;
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

