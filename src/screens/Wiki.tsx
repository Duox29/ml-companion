import { useState } from "react";
import {
  Search,
  Filter,
  ChevronLeft,
  Heart,
  Share2,
  Calendar,
  Bell,
} from "lucide-react";
import { Hero } from "../types";

const MOCK_HEROES: Hero[] = [
  {
    id: "1",
    name: "Tigreal",
    role: "Tank",
    image: "https://picsum.photos/seed/tigreal/400/400",
  },
  {
    id: "2",
    name: "Alucard",
    role: "Fighter",
    image: "https://picsum.photos/seed/alucard/400/400",
  },
  {
    id: "3",
    name: "Nana",
    role: "Mage",
    image: "https://picsum.photos/seed/nana/400/400",
  },
  {
    id: "4",
    name: "Miya",
    role: "Marksman",
    image: "https://picsum.photos/seed/miya/400/400",
  },
  {
    id: "5",
    name: "Saber",
    role: "Assassin",
    image: "https://picsum.photos/seed/saber/400/400",
  },
  {
    id: "6",
    name: "Estes",
    role: "Support",
    image: "https://picsum.photos/seed/estes/400/400",
  },
  {
    id: "7",
    name: "Chou",
    role: "Fighter",
    image: "https://picsum.photos/seed/chou/400/400",
  },
  {
    id: "8",
    name: "Gusion",
    role: "Assassin",
    image: "https://picsum.photos/seed/gusion/400/400",
  },
];

const MOCK_EVENTS = [
  { id: 1, title: "515 eParty", date: "May 15 - May 31", image: "https://picsum.photos/seed/event1/800/400", type: "In-Game" },
  { id: 2, title: "MSC 2026", date: "June 10 - June 20", image: "https://picsum.photos/seed/event2/800/400", type: "Esports" },
];

const MOCK_NEWS = [
  { id: 1, title: "Patch 1.8.88 Notes", date: "2 hours ago", image: "https://picsum.photos/seed/news1/400/400", summary: "New hero Suyou arrives, plus massive equipment adjustments." },
  { id: 2, title: "New Skin: Tigreal 'Lightborn'", date: "1 day ago", image: "https://picsum.photos/seed/news2/400/400", summary: "The defender of the Moniyan Empire gets a shiny new look." },
  { id: 3, title: "Season 32 Ending Soon", date: "3 days ago", image: "https://picsum.photos/seed/news3/400/400", summary: "Push your rank before the season ends to claim exclusive rewards." },
];

const ROLE_COLORS: Record<string, string> = {
  Tank: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  Fighter:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  Mage: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  Marksman: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Assassin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  Support:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

export default function WikiTab() {
  const [view, setView] = useState<"home" | "hero">("home");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeRole, setActiveRole] = useState("All Roles");
  const [selectedHero, setSelectedHero] = useState<Hero | null>(null);

  if (view === "hero" && selectedHero) {
    return <HeroDetail hero={selectedHero} onBack={() => setView("home")} />;
  }

  const filteredHeroes = activeRole === "All Roles" 
    ? MOCK_HEROES 
    : MOCK_HEROES.filter(h => h.role === activeRole);

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

      <div className="flex-1 overflow-y-auto">
        {/* Category Chips */}
        <div className="px-4 py-3 overflow-x-auto whitespace-nowrap hide-scrollbar flex space-x-2">
          {["All", "Heroes", "Event", "News"].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeCategory === cat ? "bg-primary text-white" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700"}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="px-4 pb-6 space-y-8 mt-2">
          {/* News & Featured Section */}
          {(activeCategory === "All" || activeCategory === "News") && (
            <div>
              {activeCategory === "All" && <h2 className="text-lg font-bold mb-3 dark:text-white">Featured</h2>}
              
              {/* Featured Banner */}
              <div className="relative h-40 rounded-2xl overflow-hidden shadow-md mb-4">
                <img
                  src="https://picsum.photos/seed/featured/800/400"
                  className="w-full h-full object-cover"
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

              {/* News List */}
              {activeCategory === "News" && (
                <div className="space-y-3">
                  {MOCK_NEWS.map(news => (
                    <div key={news.id} className="flex bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 active:scale-[0.98] transition-transform cursor-pointer">
                      <img src={news.image} className="w-28 h-28 object-cover shrink-0" alt={news.title} />
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

          {/* Events Section */}
          {(activeCategory === "All" || activeCategory === "Event") && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold dark:text-white">{activeCategory === "All" ? "Upcoming Events" : "Events"}</h2>
                {activeCategory === "All" && (
                  <button onClick={() => setActiveCategory("Event")} className="text-primary dark:text-accent text-sm font-medium">See All</button>
                )}
              </div>
              <div className="space-y-4">
                {MOCK_EVENTS.map(event => (
                  <div key={event.id} className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="h-32 relative">
                      <img src={event.image} className="w-full h-full object-cover" alt={event.title} />
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

          {/* Heroes Section */}
          {(activeCategory === "All" || activeCategory === "Heroes") && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold dark:text-white">{activeCategory === "All" ? "Popular Heroes" : "All Heroes"}</h2>
                {activeCategory === "All" ? (
                  <button onClick={() => setActiveCategory("Heroes")} className="text-primary dark:text-accent text-sm font-medium">See All</button>
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${activeRole === role ? "bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700"}`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {(activeCategory === "All" ? MOCK_HEROES.slice(0, 4) : filteredHeroes).map((hero) => (
                  <div
                    key={hero.id}
                    className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer active:scale-95 transition-transform"
                    onClick={() => {
                      setSelectedHero(hero);
                      setView("hero");
                    }}
                  >
                    <div className="h-32 bg-gray-200 relative">
                      <img
                        src={hero.image}
                        className="w-full h-full object-cover"
                        alt={hero.name}
                      />
                    </div>
                    <div className="p-3">
                      <h3 className="font-bold text-gray-900 dark:text-white font-game text-lg">
                        {hero.name}
                      </h3>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium mt-1 ${ROLE_COLORS[hero.role]}`}
                      >
                        {hero.role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HeroDetail({ hero, onBack }: { hero: Hero; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState("skills");

  return (
    <div className="flex flex-col h-full bg-bg-light dark:bg-bg-dark overflow-y-auto">
      {/* Hero Banner */}
      <div className="relative h-72 shrink-0">
        <img
          src={hero.image}
          className="w-full h-full object-cover"
          alt={hero.name}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-light dark:from-bg-dark via-black/20 to-black/40"></div>

        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center pt-6">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex space-x-2">
            <button className="w-10 h-10 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white">
              <Heart size={20} />
            </button>
            <button className="w-10 h-10 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white">
              <Share2 size={20} />
            </button>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-4xl font-game font-bold text-white mb-2">
            {hero.name}
          </h1>
          <div className="flex space-x-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${ROLE_COLORS[hero.role]}`}
            >
              {hero.role}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-black/50 text-white backdrop-blur-sm">
              EXP Lane
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-900 sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800">
        <div className="flex overflow-x-auto hide-scrollbar">
          {["Skills", "Skins", "Stats", "Lore", "Builds"].map((tab) => (
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
        {activeTab === "skills" && (
          <div className="space-y-4">
            {[
              {
                type: "Passive",
                name: "Fearless",
                desc: "Each basic attack increases physical and magic defense.",
                cd: "0s",
              },
              {
                type: "Skill 1",
                name: "Attack Wave",
                desc: "Fires an attack wave in a specified direction, dealing Physical Damage and slowing enemies.",
                cd: "8s",
              },
              {
                type: "Skill 2",
                name: "Sacred Hammer",
                desc: "Charges in a specified direction and collides with enemies, dealing Physical Damage and knocking them airborne.",
                cd: "12s",
              },
              {
                type: "Ultimate",
                name: "Implosion",
                desc: "Pulls surrounding enemies to himself, dealing Physical Damage and stunning them.",
                cd: "40s",
              },
            ].map((skill, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
              >
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg mr-4 shrink-0 overflow-hidden">
                    <img
                      src={`https://picsum.photos/seed/skill${i}/100/100`}
                      alt="Skill"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center mb-1">
                      <h3 className="font-bold text-gray-900 dark:text-white mr-2">
                        {skill.name}
                      </h3>
                      <span className="text-[10px] uppercase tracking-wider bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">
                        {skill.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {skill.desc}
                    </p>
                    <div className="text-xs text-gray-500 font-mono">
                      CD: {skill.cd}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab !== "skills" && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <p>Content for {activeTab} coming soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}
