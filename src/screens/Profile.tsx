import React, { useState } from "react";
import {
  Settings,
  Edit3,
  Grid,
  Bookmark,
  Heart,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Bell,
  Shield,
  Moon,
} from "lucide-react";

export default function ProfileTab({
  isGuest,
  onLogout,
  onRequireAuth,
}: {
  isGuest: boolean;
  onLogout: () => void;
  onRequireAuth: (step: "login" | "register") => void;
}) {
  const [view, setView] = useState<"profile" | "settings">("profile");

  if (isGuest) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-bg-light dark:bg-bg-dark p-6 text-center">
        <div className="w-24 h-24 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
          <img
            src="https://www.svgrepo.com/show/509001/avatar-thinking-9.svg"
            className="w-16 h-16 opacity-50"
            alt="Guest"
          />
        </div>
        <h2 className="text-2xl font-bold mb-2 dark:text-white">
          Guest Profile
        </h2>
        <p className="text-gray-500 mb-8">
          Create an account to save builds, post in community, and chat with
          friends.
        </p>
        <button
          onClick={() => onRequireAuth('register')}
          className="bg-primary text-white px-8 py-3 rounded-xl font-bold w-full max-w-xs mb-4"
        >
          Create Account
        </button>
        <button
          onClick={() => onRequireAuth('login')}
          className="text-primary dark:text-accent font-bold"
        >
          Log In
        </button>
      </div>
    );
  }

  if (view === "settings") {
    return (
      <SettingsScreen onBack={() => setView("profile")} onLogout={onLogout} />
    );
  }

  return (
    <div className="flex flex-col h-full bg-bg-light dark:bg-bg-dark overflow-y-auto">
      {/* Profile Header */}
      <div className="relative bg-white dark:bg-gray-900 pb-6 border-b border-gray-200 dark:border-gray-800">
        <div className="h-32 bg-primary/20 overflow-hidden">
          <img
            src="https://picsum.photos/seed/cover/800/300"
            className="w-full h-full object-cover"
            alt="Cover"
          />
        </div>

        <div className="absolute top-4 right-4">
          <button
            onClick={() => setView("settings")}
            className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white"
          >
            <Settings size={20} />
          </button>
        </div>

        <div className="px-4 relative">
          <div className="flex justify-between items-end -mt-12 mb-4">
            <div className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-900 bg-gray-200 overflow-hidden">
              <img
                src="https://picsum.photos/seed/myavatar/200/200"
                className="w-full h-full object-cover"
                alt="Avatar"
              />
            </div>
            <button className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2 rounded-full font-bold text-sm border border-gray-200 dark:border-gray-700">
              Edit Profile
            </button>
          </div>

          <h1 className="text-2xl font-bold dark:text-white">PlayerOne</h1>
          <p className="text-gray-500 text-sm mb-3">@playerone_mlbb</p>
          <p className="text-gray-800 dark:text-gray-200 text-sm mb-4">
            Mythic Glory 100+ Stars 🌟 | Roam/Tank Main | Content Creator
          </p>

          <div className="flex space-x-6 text-sm">
            <div className="flex flex-col">
              <span className="font-bold text-lg dark:text-white">142</span>
              <span className="text-gray-500">Posts</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg dark:text-white">12.5K</span>
              <span className="text-gray-500">Followers</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg dark:text-white">240</span>
              <span className="text-gray-500">Following</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-900 sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800">
        <div className="flex">
          <button className="flex-1 py-4 flex justify-center border-b-2 border-primary text-primary dark:border-accent dark:text-accent">
            <Grid size={20} />
          </button>
          <button className="flex-1 py-4 flex justify-center border-b-2 border-transparent text-gray-400">
            <Bookmark size={20} />
          </button>
          <button className="flex-1 py-4 flex justify-center border-b-2 border-transparent text-gray-400">
            <Heart size={20} />
          </button>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-3 gap-1 p-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <div key={i} className="aspect-square bg-gray-200 dark:bg-gray-800">
            <img
              src={`https://picsum.photos/seed/post${i}/300/300`}
              className="w-full h-full object-cover"
              alt="Post"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsScreen({
  onBack,
  onLogout,
}: {
  onBack: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="flex flex-col h-full bg-bg-light dark:bg-bg-dark absolute inset-0 z-20 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 px-4 pt-6 pb-4 flex items-center shadow-sm sticky top-0 z-10">
        <button
          onClick={onBack}
          className="mr-4 text-gray-600 dark:text-gray-300"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold dark:text-white">Settings</h1>
      </div>

      <div className="p-4 space-y-6">
        <div>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 px-2">
            Account
          </h2>
          <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800">
            <SettingsRow icon={<Edit3 size={20} />} label="Edit Profile" />
            <div className="h-px bg-gray-100 dark:bg-gray-800 ml-12"></div>
            <SettingsRow
              icon={<Shield size={20} />}
              label="Security & Password"
            />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 px-2">
            Preferences
          </h2>
          <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800">
            <SettingsRow icon={<Bell size={20} />} label="Notifications" />
            <div className="h-px bg-gray-100 dark:bg-gray-800 ml-12"></div>
            <SettingsRow
              icon={<Moon size={20} />}
              label="Appearance"
              value="System"
            />
          </div>
        </div>

        <div>
          <button
            onClick={onLogout}
            className="w-full bg-white dark:bg-gray-900 rounded-2xl p-4 flex items-center text-error font-bold border border-gray-100 dark:border-gray-800 active:bg-red-50 dark:active:bg-red-900/20 transition-colors"
          >
            <LogOut size={20} className="mr-4" />
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
}) {
  return (
    <button className="w-full p-4 flex items-center justify-between active:bg-gray-50 dark:active:bg-gray-800 transition-colors">
      <div className="flex items-center text-gray-700 dark:text-gray-200">
        <div className="w-8 flex justify-center mr-2 text-gray-400">{icon}</div>
        <span className="font-medium">{label}</span>
      </div>
      <div className="flex items-center text-gray-400">
        {value && <span className="text-sm mr-2">{value}</span>}
        <ChevronRight size={20} />
      </div>
    </button>
  );
}
