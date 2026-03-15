import { useState } from "react";
import {
  Search,
  Filter,
  MessageSquare,
  Heart,
  Share2,
  MoreHorizontal,
  Plus,
  X,
  Image as ImageIcon,
} from "lucide-react";

export default function CommunityTab({ isGuest, onRequireAuth }: { isGuest: boolean, onRequireAuth: (step: "login" | "register") => void }) {
  const [showCreate, setShowCreate] = useState(false);

  if (showCreate) {
    return <CreatePost onClose={() => setShowCreate(false)} />;
  }

  return (
    <div className="flex flex-col h-full bg-bg-light dark:bg-bg-dark relative">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 px-4 pt-6 pb-2 sticky top-0 z-10 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-xl font-bold dark:text-white">Community</h1>
          <div className="flex space-x-3 text-gray-600 dark:text-gray-300">
            <button>
              <Search size={22} />
            </button>
            <button>
              <Filter size={22} />
            </button>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex overflow-x-auto hide-scrollbar space-x-2 py-2">
          {["All", "Heroes", "Strategies", "Highlights", "Questions"].map(
            (filter, i) => (
              <button
                key={filter}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${i === 0 ? "bg-primary text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"}`}
              >
                {filter}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto pb-20">
        {[1, 2, 3, 4].map((post) => (
          <div
            key={post}
            className="bg-white dark:bg-gray-900 mb-2 p-4 border-b border-gray-100 dark:border-gray-800"
          >
            {/* Post Header */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center">
                <img
                  src={`https://picsum.photos/seed/user${post}/100/100`}
                  className="w-10 h-10 rounded-full mr-3"
                  alt="Avatar"
                />
                <div>
                  <h3 className="font-bold text-sm dark:text-white">
                    PlayerOne_{post}
                  </h3>
                  <p className="text-xs text-gray-500">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center">
                <button className="text-primary dark:text-accent text-sm font-semibold mr-3">
                  Follow
                </button>
                <button className="text-gray-400">
                  <MoreHorizontal size={20} />
                </button>
              </div>
            </div>

            {/* Post Content */}
            <div className="mb-3">
              <p className="text-sm text-gray-800 dark:text-gray-200 mb-2">
                Just hit Mythic using only Tigreal! Here's my build and emblem
                setup. The key is to always coordinate your ultimate with your
                mage.
              </p>
              {post % 2 === 0 && (
                <div className="rounded-xl overflow-hidden h-48 bg-gray-200">
                  <img
                    src={`https://picsum.photos/seed/post${post}/600/400`}
                    className="w-full h-full object-cover"
                    alt="Post media"
                  />
                </div>
              )}
            </div>

            {/* Post Actions */}
            <div className="flex items-center justify-between text-gray-500 text-sm border-t border-gray-100 dark:border-gray-800 pt-3">
              <div className="flex space-x-6">
                <button className="flex items-center space-x-1 hover:text-primary transition-colors">
                  <Heart size={18} />
                  <span>{120 + post * 15}</span>
                </button>
                <button className="flex items-center space-x-1 hover:text-primary transition-colors">
                  <MessageSquare size={18} />
                  <span>{24 + post * 3}</span>
                </button>
              </div>
              <button className="flex items-center space-x-1 hover:text-primary transition-colors">
                <Share2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* FAB */}
      {!isGuest && (
        <button
          onClick={() => setShowCreate(true)}
          className="absolute bottom-6 right-4 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors z-20"
        >
          <Plus size={28} />
        </button>
      )}

      {isGuest && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-bg-light dark:from-bg-dark to-transparent p-4 pt-12 text-center">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium mb-2 dark:text-white">
              Log in to join the community
            </p>
            <button onClick={() => onRequireAuth('login')} className="w-full bg-primary text-white py-2 rounded-lg text-sm font-bold">
              Log In
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CreatePost({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 absolute inset-0 z-50">
      <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800">
        <button onClick={onClose} className="text-gray-500 font-medium">
          Cancel
        </button>
        <h2 className="font-bold text-lg dark:text-white">Create Post</h2>
        <button className="text-primary dark:text-accent font-bold">
          Post
        </button>
      </div>

      <div className="flex-1 p-4">
        <div className="flex items-start mb-4">
          <img
            src="https://picsum.photos/seed/myavatar/100/100"
            className="w-10 h-10 rounded-full mr-3"
            alt="Avatar"
          />
          <textarea
            className="w-full bg-transparent resize-none outline-none text-gray-900 dark:text-white placeholder-gray-400 text-lg min-h-[150px]"
            placeholder="What's on your mind?"
            autoFocus
          ></textarea>
        </div>
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center pb-safe">
        <div className="flex space-x-4 text-primary dark:text-accent">
          <button>
            <ImageIcon size={24} />
          </button>
          <button className="text-sm font-bold bg-primary/10 px-3 py-1 rounded-full">
            # Add Topic
          </button>
        </div>
        <span className="text-xs text-gray-400">0/500</span>
      </div>
    </div>
  );
}
