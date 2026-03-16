export type User = {
  id: string;
  username: string;
  avatar?: string;
  isGuest?: boolean;
};

export type Hero = {
  id: string;
  slug: string;
  name: string;
  role: "Tank" | "Fighter" | "Mage" | "Marksman" | "Assassin" | "Support";
  image: string;
};

export type HeroRole = Hero["role"];

export type WikiHeroSkill = {
  id: number;
  name: string;
  icon: string;
  cooldown_cost: string;
  tags: string[];
  description: string;
  video: string;
};

export type WikiHeroRate = {
  rank: string | null;
  camp_type: string | null;
  match_type: string | null;
  win_rate: number | null;
};

export type WikiHeroDetailStat = {
  rank: string | null;
  camp_type: string | null;
  match_type: string | null;
  appearance_rate: number | null;
  ban_rate: number | null;
  win_rate: number | null;
};

export type WikiHeroRecord = {
  id: string;
  slug: string;
  name: string;
  icon: string;
  portrait: string;
  role: HeroRole[];
  lane: string[];
  specialty: string[];
  lore: {
    story: string;
    tale: string;
  };
  skill: WikiHeroSkill[];
  stats: {
    difficulty: number;
    ability: number[];
    hero_rate: WikiHeroRate[];
    detail_stats: WikiHeroDetailStat[];
  };
  skin: Array<Record<string, any>>;
  quote: {
    select: string;
    movement: string[];
    ultimate: string;
  };
  skill_combo: Array<{
    skill_id: number | null;
    title: string;
    description: string;
  }>;
};

export type HeroesBundle = {
  version: string;
  generatedAt: string;
  total: number;
  heroes: WikiHeroRecord[];
};

export type Skill = {
  name: string;
  icon: string;
  type: string[];
  description: string;
};

export type Skin = {
  name: string;
  icon: string;
};

export type HeroDetailedInfo = {
  hero_info: {
    name: string;
    title: string;
    role: string[];
    specialty: string[];
    lane: string[];
    price: {
      battle_points: number;
      tickets: number;
    };
    resource: string;
  };
  attributes: {
    movement_speed: number;
    physical_attack: number;
    magic_defense: number;
    physical_defense: number;
    hp: number;
    mana: number;
    attack_speed: number;
    hp_regen: number;
    mana_regen: number;
  };
  skills: {
    passive: Skill;
    skill_1: Skill;
    skill_2: Skill;
    ultimate: Skill;
  };
  background_story: {
    region: string;
    affiliation: string[];
    summary: string;
  };
  skins: Skin[];
  quotes: {
    select: string;
    movement: string[];
    ultimate: string;
  };
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

export type ChannelMessage = {
  id: string;
  type: "message" | "presence";
  sender: User;
  content: string;
  timestamp: string;
};

export type PagedData<T> = {
  data: T[];
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
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
