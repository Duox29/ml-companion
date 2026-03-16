import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  Filter,
  ChevronLeft,
  ArrowUp,
  Share2,
  Calendar,
  Bell,
  RefreshCw,
  Shield,
  Sword,
  Sparkles,
  BarChart3,
  ExternalLink,
  MapPin,
  Clock3,
} from "lucide-react";
import { Hero, WikiEventItem, WikiHeroDetailStat, WikiHeroRecord, WikiNewsItem } from "../../types";
import { useHeroes, useWikiContent, useWikiContentDetail } from "../../hooks/useWikiData";
import { RichContentRenderer, richContentToPlainText } from "../../utils/richContent";

const ROLE_COLORS: Record<string, string> = {
  Tank: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  Fighter: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  Mage: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-200",
  Marksman: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Assassin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  Support: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

const WIKI_CATEGORIES = ["All", "Heroes", "Event", "News"] as const;
const HERO_ROLES = ["All Roles", "Tank", "Fighter", "Mage", "Marksman", "Assassin", "Support"] as const;
const HERO_DETAIL_SECTIONS = ["skills", "stats", "lore", "combos"] as const;

type WikiCategory = (typeof WIKI_CATEGORIES)[number];
type HeroRoleFilter = (typeof HERO_ROLES)[number];
type HeroSection = (typeof HERO_DETAIL_SECTIONS)[number];

function HeroCardSkeleton() {
  return <div className="relative h-36 sm:h-40 rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700 animate-pulse" />;
}

function parseWikiPath(pathname: string): {
  category: WikiCategory;
  heroSlug: string | null;
  contentId: string | null;
} {
  const cleanPath = pathname.split("?")[0];
  const segments = cleanPath.replace(/^\/wiki\/?/, "").split("/").filter(Boolean);
  const first = segments[0];
  const second = segments[1];

  if (!first) return { category: "All", heroSlug: null, contentId: null };
  if (first === "heroes") return { category: "Heroes", heroSlug: second ?? null, contentId: null };
  if (first === "event" || first === "events") return { category: "Event", heroSlug: null, contentId: second ?? null };
  if (first === "news") return { category: "News", heroSlug: null, contentId: second ?? null };
  return { category: "All", heroSlug: null, contentId: null };
}

function stripHtml(input: string) {
  return input.replace(/<[^>]*>/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

function formatRelativeTime(input: string | null | undefined) {
  if (!input) return "N/A";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "N/A";
  const diffMs = date.getTime() - Date.now();

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 1000 * 60 * 60 * 24 * 365],
    ["month", 1000 * 60 * 60 * 24 * 30],
    ["day", 1000 * 60 * 60 * 24],
    ["hour", 1000 * 60 * 60],
    ["minute", 1000 * 60],
  ];

  for (const [unit, unitMs] of units) {
    if (Math.abs(diffMs) >= unitMs) {
      const value = Math.round(diffMs / unitMs);
      return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(value, unit);
    }
  }

  return "just now";
}

function formatMonthDay(input: string | null | undefined): string | null {
  if (!input) return null;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDateTime(input: string | null | undefined): string {
  if (!input) return "N/A";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatEventRange(event: WikiEventItem) {
  const start = formatMonthDay(event.startAt);
  const end = formatMonthDay(event.endAt);
  if (start && end) return `${start} - ${end}`;
  if (start) return start;
  if (end) return end;
  return "TBD";
}

function getNewsSummary(news: WikiNewsItem) {
  if (news.summary?.trim()) return news.summary.trim();
  return richContentToPlainText(news.content, news.contentFormat).slice(0, 140) || "No summary available.";
}

function formatPercent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "N/A";
  return `${(value * 100).toFixed(2)}%`;
}

function getCategoryPath(category: WikiCategory): string {
  if (category === "All") return "/wiki";
  if (category === "Heroes") return "/wiki/heroes";
  if (category === "Event") return "/wiki/event";
  return "/wiki/news";
}

export default function WikiTab() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const { category, heroSlug, contentId } = useMemo(() => parseWikiPath(location.pathname), [location.pathname]);

  const {
    heroes,
    heroRecords,
    resolvedImages,
    isLoading: isHeroesLoading,
    isRefreshing: isHeroesRefreshing,
    cacheVersion,
    dataVersion,
    refresh,
  } = useHeroes();
  const {
    newsItems,
    eventItems,
    isLoading: isWikiContentLoading,
    isForbidden: isWikiContentForbidden,
  } = useWikiContent();
  const detailKind = contentId
    ? (category === "News" ? "news" : category === "Event" ? "event" : null)
    : null;
  const {
    newsDetail,
    eventDetail,
    isLoading: isWikiContentDetailLoading,
  } = useWikiContentDetail(detailKind, contentId);

  const roleParam = searchParams.get("role");
  const activeRole: HeroRoleFilter =
    HERO_ROLES.find((role) => role === roleParam) ?? "All Roles";
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const isSearchEnabled = category !== "All";
  const isHeroSearchActive = category === "Heroes";
  const isEventSearchActive = category === "Event";
  const isNewsSearchActive = category === "News";
  const searchPlaceholder =
    category === "Heroes"
      ? "Search heroes..."
      : category === "Event"
        ? "Search events..."
        : category === "News"
          ? "Search news..."
          : "Search is disabled on All tab";

  const hasNewVersion = Boolean(cacheVersion && cacheVersion !== dataVersion);

  const selectedRecord = useMemo(
    () => heroRecords.find((hero) => hero.slug === heroSlug) ?? null,
    [heroRecords, heroSlug],
  );

  const selectedHeroCard = useMemo(
    () => heroes.find((hero) => hero.slug === heroSlug) ?? null,
    [heroes, heroSlug],
  );

  useEffect(() => {
    setSearchQuery("");
  }, [category]);

  const filteredHeroes =
    (activeRole === "All Roles"
      ? heroes
      : heroes.filter((hero) => hero.role === activeRole)).filter((hero) => {
      if (!isHeroSearchActive || !normalizedSearch) return true;
      return hero.name.toLowerCase().includes(normalizedSearch);
    });

  const visibleHeroes =
    category === "All"
      ? filteredHeroes.slice(0, 4)
      : filteredHeroes;

  const visibleNewsPool = useMemo(() => {
    const published = newsItems.filter((news) => news.published);
    return published.length > 0 ? published : newsItems;
  }, [newsItems]);

  const visibleEventsPool = useMemo(() => {
    const active = eventItems.filter((event) => event.active);
    return active.length > 0 ? active : eventItems;
  }, [eventItems]);

  const filteredEvents =
    isEventSearchActive && normalizedSearch
      ? visibleEventsPool.filter((event) =>
          [
            event.title,
            richContentToPlainText(event.description, event.descriptionFormat),
            event.location ?? "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch),
        )
      : visibleEventsPool;

  const visibleEvents =
    category === "All"
      ? filteredEvents.slice(0, 2)
      : filteredEvents;

  const filteredNews =
    isNewsSearchActive && normalizedSearch
      ? visibleNewsPool.filter((news) =>
          [
            news.title,
            news.summary ?? "",
            richContentToPlainText(news.content, news.contentFormat),
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch),
        )
      : visibleNewsPool;

  const featuredNews = filteredNews[0] ?? visibleNewsPool[0] ?? null;

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (heroSlug) {
    if (!selectedRecord || !selectedHeroCard) {
      return (
        <div className="h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Không tìm thấy hero cho deeplink này.</p>
          <button
            onClick={() => navigate("/wiki/heroes")}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium"
          >
            Quay lại Heroes
          </button>
        </div>
      );
    }

    return (
      <HeroDetail
        hero={selectedHeroCard}
        record={selectedRecord}
        resolvedListImage={resolvedImages[selectedHeroCard.id]}
        isRefreshing={isHeroesRefreshing}
      />
    );
  }

  if (contentId && category === "News") {
    if (isWikiContentDetailLoading) {
      return <div className="h-full bg-gray-200 dark:bg-gray-700 animate-pulse" />;
    }
    if (!newsDetail) {
      return (
        <div className="h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Không tìm thấy news.</p>
          <button
            onClick={() => navigate("/wiki/news")}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium"
          >
            Quay lại News
          </button>
        </div>
      );
    }
    return <NewsDetail news={newsDetail} />;
  }

  if (contentId && category === "Event") {
    if (isWikiContentDetailLoading) {
      return <div className="h-full bg-gray-200 dark:bg-gray-700 animate-pulse" />;
    }
    if (!eventDetail) {
      return (
        <div className="h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Không tìm thấy event.</p>
          <button
            onClick={() => navigate("/wiki/event")}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium"
          >
            Quay lại Events
          </button>
        </div>
      );
    }
    return <EventDetail event={eventDetail} />;
  }

  return (
    <div className="relative flex flex-col h-full bg-bg-light dark:bg-bg-dark">
      <div className="bg-white dark:bg-gray-900 px-4 pt-3 pb-2 sticky top-0 z-10 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center">
            <div className="w-7 h-7 bg-primary text-white rounded-md flex items-center justify-center mr-2">
              <span className="font-game font-bold text-sm">ML</span>
            </div>
            <h1 className="text-lg font-bold dark:text-white">Wiki</h1>
          </div>
          <button aria-label="Notifications" className="p-1.5 text-gray-600 dark:text-gray-300">
            <Bell size={20} />
          </button>
        </div>

        {isSearchEnabled && (
          <div className="relative">
            <Search className="absolute left-3 top-2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl py-1.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:text-white"
            />
          </div>
        )}
      </div>

      {hasNewVersion && (
        <div className="mx-4 mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <span>Có phiên bản dữ liệu mới ({dataVersion}).</span>
            <button
              onClick={refresh}
              disabled={isHeroesRefreshing}
              className="ml-auto inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-300 disabled:opacity-60"
            >
              <RefreshCw size={11} className={isHeroesRefreshing ? "animate-spin" : ""} />
              Cập nhật
            </button>
          </div>
        </div>
      )}

      <div
        ref={scrollContainerRef}
        onScroll={(event) => {
          setShowScrollTop(event.currentTarget.scrollTop > 220);
        }}
        className="flex-1 overflow-y-auto"
      >
        <div className="px-4 py-3 overflow-x-auto whitespace-nowrap hide-scrollbar flex space-x-2">
          {WIKI_CATEGORIES.map((item) => (
            <button
              key={item}
              onClick={() => navigate(getCategoryPath(item))}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${
                category === item
                  ? "bg-primary text-white hover:bg-primary/90 shadow-md"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="px-4 pb-6 space-y-8 mt-2">
          {(category === "All" || category === "News") && (
            <div>
              {category === "All" && <h2 className="text-lg font-bold mb-3 dark:text-white">Featured</h2>}
              <div
                onClick={() => featuredNews && navigate(`/wiki/news/${featuredNews.id}`)}
                className={`relative h-40 rounded-2xl overflow-hidden shadow-md mb-4 group ${
                  featuredNews ? "cursor-pointer" : ""
                }`}
              >
                {isWikiContentLoading ? (
                  <div className="w-full h-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                ) : (
                  <>
                    {featuredNews?.imageUrl ? (
                      <img
                        src={featuredNews.imageUrl}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        alt={featuredNews.title}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4">
                      <span className="bg-accent text-primary text-xs font-bold px-2 py-1 rounded w-max mb-1">LATEST NEWS</span>
                      <h3 className="text-white font-game text-xl font-bold line-clamp-1">
                        {featuredNews?.title || "No news available"}
                      </h3>
                      <p className="text-gray-300 text-sm line-clamp-2">
                        {featuredNews ? getNewsSummary(featuredNews) : "Không có dữ liệu News từ endpoint."}
                      </p>
                    </div>
                  </>
                )}
              </div>
              {category === "News" && (
                <div className="space-y-3">
                  {isWikiContentLoading && (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, idx) => (
                        <div
                          key={idx}
                          className="h-28 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse"
                        />
                      ))}
                    </div>
                  )}
                  {!isWikiContentLoading && filteredNews.map((news) => (
                    <div
                      key={news.id}
                      onClick={() => navigate(`/wiki/news/${news.id}`)}
                      className="flex bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer"
                    >
                      <div className="w-28 h-28 shrink-0 overflow-hidden bg-gray-100 dark:bg-gray-700">
                        {news.imageUrl ? (
                          <img src={news.imageUrl} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" alt={news.title} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                            <Bell size={18} />
                          </div>
                        )}
                      </div>
                      <div className="p-3 flex flex-col justify-between flex-1">
                        <div>
                          <h3 className="font-bold text-sm dark:text-white mb-1 leading-tight">{news.title}</h3>
                          <p className="text-xs text-gray-500 line-clamp-2">{getNewsSummary(news)}</p>
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {formatRelativeTime(news.publishedAt ?? news.updatedAt ?? news.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {!isWikiContentLoading && filteredNews.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Không có news phù hợp với từ khóa tìm kiếm.
                    </p>
                  )}
                  {!isWikiContentLoading && isWikiContentForbidden && filteredNews.length === 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-300">
                      Không có quyền truy cập endpoint nội dung Wiki.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {(category === "All" || category === "Event") && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold dark:text-white">
                  {category === "All" ? "Upcoming Events" : "Events"}
                </h2>
                {category === "All" && (
                  <button onClick={() => navigate("/wiki/event")} className="text-primary dark:text-accent text-sm font-medium">
                    See All
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {isWikiContentLoading && (
                  <div className="space-y-4">
                    {Array.from({ length: 2 }).map((_, idx) => (
                      <div key={idx} className="h-48 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
                    ))}
                  </div>
                )}
                {!isWikiContentLoading && visibleEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => navigate(`/wiki/event/${event.id}`)}
                    className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer"
                  >
                    <div className="h-32 relative overflow-hidden">
                      {event.imageUrl ? (
                        <img src={event.imageUrl} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" alt={event.title} />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-r from-slate-800 to-slate-700" />
                      )}
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-lg flex items-center">
                        <Calendar size={12} className="mr-1" /> {formatEventRange(event)}
                      </div>
                    </div>
                    <div className="p-3 flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-sm dark:text-white">{event.title}</h3>
                        <span className="text-xs text-primary dark:text-accent font-medium">
                          {event.location || "Event"}
                        </span>
                      </div>
                      <button className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300">
                        <Bell size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {category === "Event" && !isWikiContentLoading && visibleEvents.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Không có event phù hợp với từ khóa tìm kiếm.
                  </p>
                )}
                {category === "Event" && !isWikiContentLoading && isWikiContentForbidden && visibleEvents.length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-300">
                    Không có quyền truy cập endpoint nội dung Wiki.
                  </p>
                )}
              </div>
            </div>
          )}

          {(category === "All" || category === "Heroes") && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold dark:text-white">
                  {category === "All" ? "Popular Heroes" : "All Heroes"}
                </h2>
                {category === "All" ? (
                  <button onClick={() => navigate("/wiki/heroes")} className="text-primary dark:text-accent text-sm font-medium">
                    See All
                  </button>
                ) : (
                  <button className="text-gray-500 flex items-center text-sm">
                    <Filter size={14} className="mr-1" /> Role
                  </button>
                )}
              </div>

              {category === "Heroes" && (
                <div className="flex overflow-x-auto hide-scrollbar space-x-2 mb-4 pb-1">
                  {HERO_ROLES.map((role) => (
                    <button
                      key={role}
                      onClick={() => {
                        const next = new URLSearchParams(searchParams);
                        if (role === "All Roles") next.delete("role");
                        else next.set("role", role);
                        setSearchParams(next);
                      }}
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

              <div className="grid grid-cols-2 gap-3">
                {isHeroesLoading
                  ? Array.from({ length: 4 }).map((_, i) => <HeroCardSkeleton key={i} />)
                  : visibleHeroes.map((hero) => (
                      <div key={hero.id}>
                        <HeroCard
                          hero={hero}
                          imageSrc={resolvedImages[hero.id] ?? hero.image}
                          onClick={() => navigate(`/wiki/heroes/${hero.slug}?section=skills`)}
                        />
                      </div>
                    ))}
              </div>
              {category === "Heroes" && !isHeroesLoading && visibleHeroes.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                  Không có hero phù hợp với từ khóa tìm kiếm.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={scrollToTop}
        aria-label="Scroll to top"
        className={`absolute right-4 bottom-24 z-20 w-9 h-9 rounded-full shadow-md border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 text-gray-700 dark:text-gray-200 flex items-center justify-center transition-all duration-200 ${
          showScrollTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
        }`}
      >
        <ArrowUp size={16} />
      </button>
    </div>
  );
}

function HeroCard({
  hero,
  imageSrc,
  onClick,
}: {
  hero: Hero;
  imageSrc: string;
  onClick: () => void | Promise<void>;
}) {
  return (
    <div className="relative h-36 sm:h-40 rounded-xl overflow-hidden shadow-sm cursor-pointer active:scale-95 transition-transform group" onClick={onClick}>
      <img src={imageSrc} className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]" alt={hero.name} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3">
        <h3 className="font-bold text-white font-game text-base leading-tight drop-shadow-md">{hero.name}</h3>
        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mt-1 w-max shadow-sm ${ROLE_COLORS[hero.role]}`}>
          {hero.role}
        </span>
      </div>
    </div>
  );
}

function NewsDetail({ news }: { news: WikiNewsItem }) {
  const navigate = useNavigate();
  const displayTime = formatDateTime(news.publishedAt ?? news.updatedAt ?? news.createdAt);

  return (
    <div className="flex flex-col h-full bg-bg-light dark:bg-bg-dark overflow-y-auto">
      <div className="relative h-64 shrink-0">
        {news.imageUrl ? (
          <img src={news.imageUrl} className="w-full h-full object-cover" alt={news.title} />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-light dark:from-bg-dark via-black/25 to-black/50" />
        <div className="absolute top-0 left-0 right-0 p-4 pt-6 flex justify-between items-center">
          <button
            onClick={() => navigate("/wiki/news")}
            className="w-10 h-10 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white"
          >
            <ChevronLeft size={24} />
          </button>
          <button className="w-10 h-10 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white">
            <Share2 size={20} />
          </button>
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-2xl font-bold text-white leading-tight">{news.title}</h1>
          <p className="text-xs text-gray-300 mt-2">{displayTime}</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {news.summary && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-700 dark:text-gray-200">{news.summary}</p>
          </div>
        )}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
          <RichContentRenderer
            content={news.content}
            format={news.contentFormat}
            paragraphClassName="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words leading-6"
          />
        </div>
        {news.sourceUrl && (
          <a
            href={news.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary dark:text-accent font-medium"
          >
            Open source <ExternalLink size={14} />
          </a>
        )}
      </div>
    </div>
  );
}

function EventDetail({ event }: { event: WikiEventItem }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-bg-light dark:bg-bg-dark overflow-y-auto">
      <div className="relative h-64 shrink-0">
        {event.imageUrl ? (
          <img src={event.imageUrl} className="w-full h-full object-cover" alt={event.title} />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-light dark:from-bg-dark via-black/25 to-black/50" />
        <div className="absolute top-0 left-0 right-0 p-4 pt-6 flex justify-between items-center">
          <button
            onClick={() => navigate("/wiki/event")}
            className="w-10 h-10 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white"
          >
            <ChevronLeft size={24} />
          </button>
          <button className="w-10 h-10 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white">
            <Share2 size={20} />
          </button>
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-2xl font-bold text-white leading-tight">{event.title}</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Clock3 size={15} />
            <span>{formatEventRange(event)}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <MapPin size={15} />
              <span>{event.location}</span>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
          <RichContentRenderer
            content={event.description}
            format={event.descriptionFormat}
            paragraphClassName="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words leading-6"
          />
        </div>

        {event.registrationUrl && (
          <a
            href={event.registrationUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary dark:text-accent font-medium"
          >
            Register now <ExternalLink size={14} />
          </a>
        )}
      </div>
    </div>
  );
}

function HeroDetail({
  hero,
  record,
  resolvedListImage,
  isRefreshing,
}: {
  hero: Hero;
  record: WikiHeroRecord;
  resolvedListImage?: string;
  isRefreshing: boolean;
}) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionParam = searchParams.get("section");
  const section: HeroSection = HERO_DETAIL_SECTIONS.find((item) => item === sectionParam) ?? "skills";
  const detailStats: WikiHeroDetailStat | null = record.stats?.detail_stats?.[0] ?? null;
  const winRate = detailStats?.win_rate ?? null;
  const heroImage = resolvedListImage ?? (record.portrait || hero.image);

  return (
    <div className="flex flex-col h-full bg-bg-light dark:bg-bg-dark overflow-y-auto">
      <div className="relative h-72 shrink-0">
        <img src={heroImage} className="w-full h-full object-cover" alt={hero.name} />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-light dark:from-bg-dark via-black/20 to-black/40" />

        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center pt-6">
          <button
            onClick={() => navigate("/wiki/heroes")}
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
              <Share2 size={20} />
            </button>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-4xl font-game font-bold text-white mb-1">{record.name}</h1>
          <p className="text-gray-300 text-sm mb-3 italic">{record.specialty.join(" • ")}</p>
          <div className="flex flex-wrap gap-2">
            {record.role.map((role) => (
              <span key={role} className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${ROLE_COLORS[role] || "bg-gray-100 text-gray-800"}`}>
                {role}
              </span>
            ))}
            {record.lane.map((lane) => (
              <span key={lane} className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-black/50 text-white backdrop-blur-sm">
                {lane}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800">
        <div className="flex overflow-x-auto hide-scrollbar">
          {HERO_DETAIL_SECTIONS.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set("section", tab);
                setSearchParams(next);
              }}
              className={`flex-1 min-w-[80px] py-4 text-sm font-medium text-center border-b-2 transition-colors capitalize ${
                section === tab
                  ? "border-primary text-primary dark:border-accent dark:text-accent"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {section === "skills" && (
          <div className="space-y-3">
            {record.skill.map((skill, idx) => (
              <div key={skill.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-start gap-3">
                  <img src={skill.icon} alt={skill.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-900 dark:text-white">{skill.name}</h3>
                      <span className="text-[10px] uppercase tracking-wider bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">
                        {idx === 0 ? "Passive" : idx === 3 ? "Ultimate" : `Skill ${idx}`}
                      </span>
                    </div>
                    {skill.cooldown_cost && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{skill.cooldown_cost}</p>
                    )}
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 whitespace-pre-line">
                      {stripHtml(skill.description)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {section === "stats" && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-lg mb-4 dark:text-white">Ability DNA</h3>
              <div className="space-y-3">
                <AbilityRow icon={<Shield size={14} />} label="Durability" value={record.stats.ability?.[0] ?? 0} color="from-cyan-500 to-blue-500" />
                <AbilityRow icon={<Sword size={14} />} label="Offense" value={record.stats.ability?.[1] ?? 0} color="from-red-500 to-orange-500" />
                <AbilityRow icon={<Sparkles size={14} />} label="Skill Effects" value={record.stats.ability?.[2] ?? 0} color="from-indigo-500 to-fuchsia-500" />
                <AbilityRow icon={<BarChart3 size={14} />} label="Difficulty" value={record.stats.ability?.[3] ?? record.stats.difficulty ?? 0} color="from-amber-500 to-yellow-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-lg mb-4 dark:text-white">Meta Snapshot</h3>
              <div className="grid grid-cols-[auto,1fr] gap-4 items-center">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-xs font-bold text-gray-800 dark:text-white"
                  style={{
                    background: `conic-gradient(#10b981 0% ${Math.max(0, Math.min(100, (winRate ?? 0) * 100))}%, #e5e7eb ${Math.max(0, Math.min(100, (winRate ?? 0) * 100))}% 100%)`,
                  }}
                >
                  <span className="w-14 h-14 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center">
                    {formatPercent(winRate)}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <InfoLine label="Appearance Rate" value={formatPercent(detailStats?.appearance_rate)} />
                  <InfoLine label="Ban Rate" value={formatPercent(detailStats?.ban_rate)} />
                  <InfoLine label="Rank" value={record.stats.hero_rate?.[0]?.rank ?? "N/A"} />
                </div>
              </div>
            </div>
          </div>
        )}

        {section === "lore" && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-lg mb-3 dark:text-white">Story</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{record.lore.story || "Chưa có dữ liệu."}</p>
              {record.lore.tale && (
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mt-3">{record.lore.tale}</p>
              )}
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wider mb-2">Select Quote</h3>
              <p className="text-lg font-medium italic dark:text-white">"{record.quote.select || "..."}"</p>
            </div>
          </div>
        )}

        {section === "combos" && (
          <div className="space-y-3">
            {record.skill_combo.map((combo, idx) => (
              <div key={`${combo.title}-${idx}`} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold dark:text-white">{combo.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{combo.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AbilityRow({
  icon,
  label,
  value,
  color,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1 text-gray-600 dark:text-gray-300">
        <span className="inline-flex items-center gap-1.5">
          {icon}
          {label}
        </span>
        <span className="font-semibold">{clamped}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${color}`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-gray-100 dark:border-gray-700 pb-2 last:border-0 last:pb-0">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="font-medium dark:text-white">{value}</span>
    </div>
  );
}
