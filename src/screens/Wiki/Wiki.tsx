import { useState } from "react";
import {
  Search,
  Filter,
  ChevronLeft,
  Heart,
  Share2,
  Calendar,
  Bell,
  RefreshCw,
  Database,
  WifiOff,
} from "lucide-react";
import { Hero, HeroDetailedInfo } from "../../types";
import { useHeroes, useHeroDetail } from "../../hooks/useWikiData";

// ─────────────────────────────────────────────
// Static mock data (events/news – not yet API-driven)
// ─────────────────────────────────────────────

const MOCK_EVENTS = [
  { id: 1, title: "515 eParty", date: "May 15 - May 31", image: "https://picsum.photos/seed/event1/800/400", type: "In-Game" },
  { id: 2, title: "MSC 2026",   date: "June 10 - June 20", image: "https://picsum.photos/seed/event2/800/400", type: "Esports" },
];

const MOCK_NEWS = [
  { id: 1, title: "Patch 1.8.88 Notes",            date: "2 hours ago", image: "https://picsum.photos/seed/news1/400/400", summary: "New hero Suyou arrives, plus massive equipment adjustments." },
  { id: 2, title: "New Skin: Tigreal 'Lightborn'",  date: "1 day ago",   image: "https://picsum.photos/seed/news2/400/400", summary: "The defender of the Moniyan Empire gets a shiny new look."  },
  { id: 3, title: "Season 32 Ending Soon",          date: "3 days ago",  image: "https://picsum.photos/seed/news3/400/400", summary: "Push your rank before the season ends to claim exclusive rewards." },
];

// ─────────────────────────────────────────────
// Role badge colours
// ─────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  Tank:     "bg-blue-100   text-blue-800   dark:bg-blue-900   dark:text-blue-200",
  Fighter:  "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  Mage:     "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  Marksman: "bg-green-100  text-green-800  dark:bg-green-900  dark:text-green-200",
  Assassin: "bg-red-100    text-red-800    dark:bg-red-900    dark:text-red-200",
  Support:  "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

// ─────────────────────────────────────────────
// Cache status badge
// ─────────────────────────────────────────────

function CacheStatusBadge({
  isCacheValid,
  cachedVersion,
  dataVersion,
  isRefreshing,
  onRefresh,
}: {
  isCacheValid: boolean;
  cachedVersion: string | null;
  dataVersion: string;
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700/60">
      {isRefreshing ? (
        <span className="flex items-center gap-1.5 text-xs text-blue-500 font-medium">
          <RefreshCw size={12} className="animate-spin" />
          Đang cập nhật dữ liệu…
        </span>
      ) : isCacheValid ? (
        <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          <Database size={12} />
          Cache hợp lệ · v{cachedVersion}
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
          <WifiOff size={12} />
          Cache cũ · cần cập nhật lên v{dataVersion}
        </span>
      )}
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="ml-auto text-xs text-primary dark:text-accent font-medium flex items-center gap-1 disabled:opacity-50"
      >
        <RefreshCw size={11} className={isRefreshing ? "animate-spin" : ""} />
        Làm mới
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Hero card skeleton
// ─────────────────────────────────────────────

function HeroCardSkeleton() {
  return (
    <div className="relative h-40 rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700 animate-pulse" />
  );
}

// ─────────────────────────────────────────────
// Main Wiki tab
// ─────────────────────────────────────────────

export default function WikiTab() {
  const [view, setView] = useState<"home" | "hero">("home");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeRole, setActiveRole] = useState("All Roles");
  const [selectedHero, setSelectedHero] = useState<Hero | null>(null);

  const {
    heroes,
    resolvedImages,
    isLoading,
    isRefreshing,
    cacheVersion,
    dataVersion,
    refresh,
  } = useHeroes();

  const isCacheValid = cacheVersion === dataVersion;

  if (view === "hero" && selectedHero) {
    return (
      <HeroDetail
        hero={selectedHero}
        resolvedListImage={resolvedImages[selectedHero.id]}
        onBack={() => setView("home")}
      />
    );
  }

  const filteredHeroes =
    activeRole === "All Roles"
      ? heroes
      : heroes.filter((h) => h.role === activeRole);

  return (
    <div className="flex flex-col h-full bg-bg-light dark:bg-bg-dark">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 px-4 pt-6 pb-4 sticky top-0 z-10 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center mr-3">
              <span className="font-game font-bold text-sm">ML</span>
            </div>
            <h1 className="text-xl font-bold dark:text-white">Wiki</h1>
          </div>
          <button className="p-2 text-gray-600 dark:text-gray-300">
            <Search size={24} />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search heroes, events, news..."
            className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:text-white"
          />
        </div>
      </div>

      {/* Cache status bar */}
      <CacheStatusBadge
        isCacheValid={isCacheValid}
        cachedVersion={cacheVersion}
        dataVersion={dataVersion}
        isRefreshing={isRefreshing}
        onRefresh={refresh}
      />

      <div className="flex-1 overflow-y-auto">
        {/* Category Chips */}
        <div className="px-4 py-3 overflow-x-auto whitespace-nowrap hide-scrollbar flex space-x-2">
          {["All", "Heroes", "Event", "News"].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${
                activeCategory === cat
                  ? "bg-primary text-white hover:bg-primary/90 shadow-md"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="px-4 pb-6 space-y-8 mt-2">
          {/* ── News / Featured ─────────────────────────────────── */}
          {(activeCategory === "All" || activeCategory === "News") && (
            <div>
              {activeCategory === "All" && (
                <h2 className="text-lg font-bold mb-3 dark:text-white">Featured</h2>
              )}

              <div className="relative h-40 rounded-2xl overflow-hidden shadow-md mb-4 cursor-pointer group">
                <img
                  src="https://picsum.photos/seed/featured/800/400"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  alt="Featured"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4">
                  <span className="bg-accent text-primary text-xs font-bold px-2 py-1 rounded w-max mb-1">
                    NEW HERO
                  </span>
                  <h3 className="text-white font-game text-2xl font-bold">Suyou</h3>
                  <p className="text-gray-300 text-sm">The Masked Immortal</p>
                </div>
              </div>

              {activeCategory === "News" && (
                <div className="space-y-3">
                  {MOCK_NEWS.map((news) => (
                    <div
                      key={news.id}
                      className="flex bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 active:scale-[0.98] transition-transform cursor-pointer group"
                    >
                      <div className="w-28 h-28 shrink-0 overflow-hidden">
                        <img
                          src={news.image}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          alt={news.title}
                        />
                      </div>
                      <div className="p-3 flex flex-col justify-between flex-1">
                        <div>
                          <h3 className="font-bold text-sm dark:text-white mb-1 leading-tight">{news.title}</h3>
                          <p className="text-xs text-gray-500 line-clamp-2">{news.summary}</p>
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium">{news.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Events ──────────────────────────────────────────── */}
          {(activeCategory === "All" || activeCategory === "Event") && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold dark:text-white">
                  {activeCategory === "All" ? "Upcoming Events" : "Events"}
                </h2>
                {activeCategory === "All" && (
                  <button
                    onClick={() => setActiveCategory("Event")}
                    className="text-primary dark:text-accent text-sm font-medium"
                  >
                    See All
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {MOCK_EVENTS.map((event) => (
                  <div
                    key={event.id}
                    className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer active:scale-[0.98] transition-transform group"
                  >
                    <div className="h-32 relative overflow-hidden">
                      <img
                        src={event.image}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        alt={event.title}
                      />
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-lg flex items-center">
                        <Calendar size={12} className="mr-1" /> {event.date}
                      </div>
                    </div>
                    <div className="p-3 flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-sm dark:text-white">{event.title}</h3>
                        <span className="text-xs text-primary dark:text-accent font-medium">{event.type}</span>
                      </div>
                      <button className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                        <Bell size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Heroes ──────────────────────────────────────────── */}
          {(activeCategory === "All" || activeCategory === "Heroes") && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold dark:text-white">
                  {activeCategory === "All" ? "Popular Heroes" : "All Heroes"}
                </h2>
                {activeCategory === "All" ? (
                  <button
                    onClick={() => setActiveCategory("Heroes")}
                    className="text-primary dark:text-accent text-sm font-medium"
                  >
                    See All
                  </button>
                ) : (
                  <button className="text-gray-500 flex items-center text-sm">
                    <Filter size={14} className="mr-1" /> Sort
                  </button>
                )}
              </div>

              {activeCategory === "Heroes" && (
                <div className="flex overflow-x-auto hide-scrollbar space-x-2 mb-4 pb-1">
                  {["All Roles", "Tank", "Fighter", "Mage", "Marksman", "Assassin", "Support"].map((role) => (
                    <button
                      key={role}
                      onClick={() => setActiveRole(role)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 hover:scale-105 active:scale-95 ${
                        activeRole === role
                          ? "bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 shadow-md"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700"
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {isLoading
                  ? Array.from({ length: 4 }).map((_, i) => <HeroCardSkeleton key={i} />)
                  : (activeCategory === "All" ? filteredHeroes.slice(0, 4) : filteredHeroes).map((hero) => {
                      const heroImageSrc = resolvedImages[hero.id] ?? hero.image;
                      return (
                        <div key={hero.id}>
                          <HeroCard
                            hero={hero}
                            imageSrc={heroImageSrc}
                            onClick={() => {
                              setSelectedHero(hero);
                              setView("hero");
                            }}
                          />
                        </div>
                      );
                    })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Hero card
// ─────────────────────────────────────────────

function HeroCard({
  hero,
  imageSrc,
  onClick,
}: {
  hero: Hero;
  imageSrc: string;
  onClick: () => void;
}) {
  return (
    <div
      className="relative h-40 rounded-xl overflow-hidden shadow-sm cursor-pointer active:scale-95 transition-transform group"
      onClick={onClick}
    >
      <img
        src={imageSrc}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        alt={hero.name}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3">
        <h3 className="font-bold text-white font-game text-lg leading-tight drop-shadow-md">
          {hero.name}
        </h3>
        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mt-1 w-max shadow-sm ${ROLE_COLORS[hero.role]}`}>
          {hero.role}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Hero detail screen
// ─────────────────────────────────────────────

function HeroDetail({
  hero,
  resolvedListImage,
  onBack,
}: {
  hero: Hero;
  resolvedListImage?: string;
  onBack: () => void;
}) {
  const [activeTab, setActiveTab] = useState("skills");
  const { detail, resolvedImages, isLoading, isRefreshing } = useHeroDetail(hero.id);

  // Show loading skeleton while fetching
  if (isLoading || !detail) {
    return (
      <div className="flex flex-col h-full bg-bg-light dark:bg-bg-dark items-center justify-center gap-4 p-8">
        <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
          Đang tải thông tin tướng…
        </p>
      </div>
    );
  }

  const heroImage = resolvedListImage ?? hero.image;

  const resolveSkillIcon = (icon: string) => resolvedImages[icon] ?? icon;
  const resolveSkinIcon  = (icon: string) => resolvedImages[icon] ?? icon;

  return (
    <div className="flex flex-col h-full bg-bg-light dark:bg-bg-dark overflow-y-auto">
      {/* Hero Banner */}
      <div className="relative h-72 shrink-0">
        <img src={heroImage} className="w-full h-full object-cover" alt={hero.name} />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-light dark:from-bg-dark via-black/20 to-black/40" />

        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center pt-6">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            {isRefreshing && (
              <span className="bg-black/40 backdrop-blur-md rounded-full px-3 py-1 text-white text-xs flex items-center gap-1.5">
                <RefreshCw size={11} className="animate-spin" /> Đang cập nhật
              </span>
            )}
            <button className="w-10 h-10 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white">
              <Heart size={20} />
            </button>
            <button className="w-10 h-10 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white">
              <Share2 size={20} />
            </button>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-4xl font-game font-bold text-white mb-1">{detail.hero_info.name}</h1>
          <p className="text-gray-300 text-sm mb-3 italic">"{detail.hero_info.title}"</p>
          <div className="flex flex-wrap gap-2">
            {detail.hero_info.role.map((r) => (
              <span key={r} className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${ROLE_COLORS[r] || "bg-gray-100 text-gray-800"}`}>
                {r}
              </span>
            ))}
            {detail.hero_info.lane.map((l) => (
              <span key={l} className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-black/50 text-white backdrop-blur-sm">
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-900 sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800">
        <div className="flex overflow-x-auto hide-scrollbar">
          {["Skills", "Stats", "Lore", "Skins", "Quotes"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase())}
              className={`flex-1 min-w-[80px] py-4 text-sm font-medium text-center border-b-2 transition-colors ${
                activeTab === tab.toLowerCase()
                  ? "border-primary text-primary dark:border-accent dark:text-accent"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* ── Skills ── */}
        {activeTab === "skills" && (
          <div className="space-y-4">
            {[
              { category: "Passive", ...detail.skills.passive },
              { category: "Skill 1", ...detail.skills.skill_1 },
              { category: "Skill 2", ...detail.skills.skill_2 },
              { category: "Ultimate", ...detail.skills.ultimate },
            ].map((skill, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg mr-4 shrink-0 overflow-hidden">
                    <img src={resolveSkillIcon(skill.icon)} alt="Skill" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="flex items-center mb-1 flex-wrap gap-2">
                      <h3 className="font-bold text-gray-900 dark:text-white">{skill.name}</h3>
                      <span className="text-[10px] uppercase tracking-wider bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">
                        {skill.category}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {skill.type?.map((t: string) => (
                        <span key={t} className="text-[10px] uppercase tracking-wider bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800">
                          {t}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{skill.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Stats ── */}
        {activeTab === "stats" && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-lg mb-4 dark:text-white">Attributes</h3>
              <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                <StatRow label="HP"               value={detail.attributes.hp} />
                <StatRow label="Mana"             value={detail.attributes.mana} />
                <StatRow label="Physical Attack"  value={detail.attributes.physical_attack} />
                <StatRow label="Magic Defense"    value={detail.attributes.magic_defense} />
                <StatRow label="Physical Defense" value={detail.attributes.physical_defense} />
                <StatRow label="Movement Speed"   value={detail.attributes.movement_speed} />
                <StatRow label="Attack Speed"     value={detail.attributes.attack_speed} />
                <StatRow label="HP Regen"         value={detail.attributes.hp_regen} />
                <StatRow label="Mana Regen"       value={detail.attributes.mana_regen} />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-lg mb-4 dark:text-white">Hero Info</h3>
              <div className="space-y-3">
                <InfoRow label="Specialty" value={detail.hero_info.specialty.join(", ")} />
                <InfoRow label="Resource"  value={detail.hero_info.resource} />
                <InfoRow label="Price"     value={`${detail.hero_info.price.battle_points} BP / ${detail.hero_info.price.tickets} Tickets`} />
              </div>
            </div>
          </div>
        )}

        {/* ── Lore ── */}
        {activeTab === "lore" && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-lg mb-2 dark:text-white">Background Story</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                  Region: {detail.background_story.region}
                </span>
                <span className="text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                  Affiliation: {detail.background_story.affiliation.join(", ")}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {detail.background_story.summary}
              </p>
            </div>
          </div>
        )}

        {/* ── Skins ── */}
        {activeTab === "skins" && (
          <div className="grid grid-cols-2 gap-4">
            {detail.skins.map((skin, i) => (
              <div key={i} className="relative h-48 rounded-xl overflow-hidden shadow-sm group">
                <img
                  src={resolveSkinIcon(skin.icon)}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  alt={skin.name}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3 text-center">
                  <h3 className="font-bold text-sm text-white drop-shadow-md">{skin.name}</h3>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Quotes ── */}
        {activeTab === "quotes" && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wider mb-2">Hero Select</h3>
              <p className="text-lg font-medium italic dark:text-white">"{detail.quotes.select}"</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wider mb-2">Movement</h3>
              <ul className="space-y-3">
                {detail.quotes.movement.map((quote, i) => (
                  <li key={i} className="text-md italic dark:text-gray-300">"{quote}"</li>
                ))}
              </ul>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wider mb-2">Ultimate</h3>
              <p className="text-lg font-medium italic dark:text-white text-red-500">"{detail.quotes.ultimate}"</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Reusable sub-components
// ─────────────────────────────────────────────

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</span>
      <span className="font-mono font-medium dark:text-white">{value}</span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium dark:text-white text-right">{value}</span>
    </div>
  );
}
