export type User = {
  id: string;
  username: string;
  avatar?: string;
  isGuest?: boolean;
};

export type Hero = {
  id: string;
  name: string;
  role: "Tank" | "Fighter" | "Mage" | "Marksman" | "Assassin" | "Support";
  image: string;
};

export type Post = {
  id: string;
  author: User;
  content: string;
  likes: number;
  comments: number;
  timestamp: string;
  tags?: string[];
};

export type Message = {
  id: string;
  sender: User;
  content: string;
  timestamp: string;
};

export type Channel = {
  id: string;
  name: string;
  description: string;
  onlineCount: number;
};

export type Conversation = {
  id: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isGroup?: boolean;
};
