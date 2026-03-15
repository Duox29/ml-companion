import { useState, useEffect, useCallback } from 'react';
import { Hero, HeroDetailedInfo } from '../types';
import {
  checkCacheStatus,
  getCachedHeroesList,
  setCachedHeroesList,
  getCachedHeroDetail,
  setCachedHeroDetail,
  markCacheAsCurrent,
  APP_DATA_VERSION,
} from '../services/cacheService';
import { getCachedImage, getOrCacheImage, preCacheImages } from '../services/imageCache';

// ─────────────────────────────────────────────
// Mock data – replace with real API calls
// ─────────────────────────────────────────────
// In production these would be:
//   const res = await api.get('/heroes');
//   return res.data;

const REMOTE_HEROES: Hero[] = [
  { id: '1', name: 'Tigreal', role: 'Tank',      image: 'https://picsum.photos/seed/tigreal/400/400' },
  { id: '2', name: 'Alucard', role: 'Fighter',   image: 'https://picsum.photos/seed/alucard/400/400' },
  { id: '3', name: 'Nana',    role: 'Mage',      image: 'https://picsum.photos/seed/nana/400/400' },
  { id: '4', name: 'Miya',    role: 'Marksman',  image: 'https://picsum.photos/seed/miya/400/400' },
  { id: '5', name: 'Saber',   role: 'Assassin',  image: 'https://picsum.photos/seed/saber/400/400' },
  { id: '6', name: 'Estes',   role: 'Support',   image: 'https://picsum.photos/seed/estes/400/400' },
  { id: '7', name: 'Chou',    role: 'Fighter',   image: 'https://picsum.photos/seed/chou/400/400' },
  { id: '8', name: 'Gusion',  role: 'Assassin',  image: 'https://picsum.photos/seed/gusion/400/400' },
];

async function fetchHeroesFromApi(): Promise<Hero[]> {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 600));
  return REMOTE_HEROES;
}

async function fetchHeroDetailFromApi(_heroId: string): Promise<HeroDetailedInfo> {
  await new Promise((r) => setTimeout(r, 400));
  // In production: return (await api.get(`/heroes/${heroId}`)).data
  return {
    hero_info: {
      name: 'Tigreal', title: 'Warrior of Dawn',
      role: ['Tank', 'Support'], specialty: ['Crowd Control', 'Initiator'],
      lane: ['Roaming'], price: { battle_points: 6500, tickets: 299 }, resource: 'Mana',
    },
    attributes: {
      movement_speed: 260, physical_attack: 112, magic_defense: 15,
      physical_defense: 25, hp: 2890, mana: 450, attack_speed: 0.826,
      hp_regen: 42, mana_regen: 12,
    },
    skills: {
      passive:  { name: 'Fearless',       icon: 'https://picsum.photos/seed/tigreal_passive/100/100', type: ['Buff', 'Defense'], description: 'Tigreal nhận một tầng cộng dồn Fearless mỗi khi sử dụng kỹ năng hoặc nhận sát thương từ đòn đánh thường. Sau khi tích đủ 4 tầng, Tigreal sẽ hóa giải hoàn toàn sát thương từ đòn đánh thường tiếp theo.' },
      skill_1:  { name: 'Attack Wave',    icon: 'https://picsum.photos/seed/tigreal_s1/100/100',      type: ['AoE', 'Slow'],    description: 'Tigreal đập mạnh xuống đất, tạo ra 3 làn sóng xung kích theo hướng chỉ định. Mỗi làn sóng gây sát thương vật lý và làm chậm kẻ địch 30% trong 1.5 giây.' },
      skill_2:  { name: 'Sacred Hammer', icon: 'https://picsum.photos/seed/tigreal_s2/100/100',      type: ['Charge', 'CC'],   description: 'Tigreal lướt về phía trước, đẩy lùi tất cả kẻ địch trên đường đi. Sau đó có thể tái kích hoạt để hất tung kẻ địch lên không trung trong 1 giây.' },
      ultimate: { name: 'Implosion',      icon: 'https://picsum.photos/seed/tigreal_ult/100/100',     type: ['CC', 'AoE'],      description: 'Tigreal hút tất cả kẻ địch xung quanh vào bản thân và gây choáng chúng trong 1.5 giây, đồng thời gây sát thương vật lý.' },
    },
    background_story: {
      region: 'Moniyan Empire', affiliation: ["Light's Order (Commander)"],
      summary: 'Tigreal là vị tướng tài ba nhất của Đế chế Moniyan, lãnh đạo Đội kỵ sĩ Ánh sáng. Ông được biết đến với lòng quả cảm tuyệt đối và sự trung thành với chính nghĩa.',
    },
    skins: [
      { name: 'Warrior of Dawn (Default)', icon: 'https://picsum.photos/seed/tigreal_skin_default/200/400' },
      { name: 'Dark Guardian (Elite)',      icon: 'https://picsum.photos/seed/tigreal_skin_dark_guardian/200/400' },
      { name: 'Fallen Guard (Elite)',       icon: 'https://picsum.photos/seed/tigreal_skin_fallen_guard/200/400' },
      { name: 'Wyrmslayer (Season 10)',     icon: 'https://picsum.photos/seed/tigreal_skin_wyrmslayer/200/400' },
      { name: 'Lightborn - Defender',       icon: 'https://picsum.photos/seed/tigreal_skin_lightborn/200/400' },
      { name: 'Gold Baron (Special)',        icon: 'https://picsum.photos/seed/tigreal_skin_gold_baron/200/400' },
      { name: 'Galactic Marshal (Starlight)',icon: 'https://picsum.photos/seed/tigreal_skin_galactic_marshal/200/400' },
    ],
    quotes: {
      select: 'I stand for the empire!',
      movement: ['A true hero has come to help.', 'A real man never hides in the bush.', 'We are the shield of the people.', 'March on! Sound the horn of victory!'],
      ultimate: 'Suffer my hammer!',
    },
  };
}

// ─────────────────────────────────────────────
// Heroes list hook
// ─────────────────────────────────────────────

export interface UseHeroesResult {
  heroes: Hero[];
  resolvedImages: Record<string, string>; // heroId → src (cached base64 or URL)
  isLoading: boolean;
  isRefreshing: boolean;
  cacheVersion: string | null;
  dataVersion: string;
  refresh: () => void;
}

export function useHeroes(): UseHeroesResult {
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [resolvedImages, setResolvedImages] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cacheVersion, setCacheVersion] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // 1. Check cache version
      const status = await checkCacheStatus();
      if (!cancelled) setCacheVersion(status.cachedVersion);

      if (status.isCacheValid) {
        // ── Cache hit ──────────────────────────────────────────────
        const cached = await getCachedHeroesList<Hero[]>();
        if (cached && !cancelled) {
          setHeroes(cached);
          setIsLoading(false);
          // Resolve images from cache (non-blocking)
          resolveImages(cached, false).then((imgs) => {
            if (!cancelled) setResolvedImages(imgs);
          });
          return;
        }
      }

      // ── Cache miss or version mismatch – fetch from network ─────
      if (!cancelled) setIsRefreshing(true);
      try {
        const fresh = await fetchHeroesFromApi();
        if (cancelled) return;

        setHeroes(fresh);
        await setCachedHeroesList(fresh);
        await markCacheAsCurrent();
        setCacheVersion(APP_DATA_VERSION);

        // Cache images in the background
        const urls = fresh.map((h) => h.image);
        preCacheImages(urls).then(() => {
          if (!cancelled) resolveImages(fresh, true).then((imgs) => setResolvedImages(imgs));
        });
      } catch (err) {
        console.error('[useHeroes] Fetch failed, trying stale cache:', err);
        // Graceful degradation: serve stale cache
        const stale = await getCachedHeroesList<Hero[]>();
        if (stale && !cancelled) {
          setHeroes(stale);
          resolveImages(stale, false).then((imgs) => {
            if (!cancelled) setResolvedImages(imgs);
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [refreshTick]);

  return {
    heroes,
    resolvedImages,
    isLoading,
    isRefreshing,
    cacheVersion,
    dataVersion: APP_DATA_VERSION,
    refresh,
  };
}

// ─────────────────────────────────────────────
// Hero detail hook
// ─────────────────────────────────────────────

export interface UseHeroDetailResult {
  detail: HeroDetailedInfo | null;
  resolvedImages: Record<string, string>; // imageUrl → src
  isLoading: boolean;
  isRefreshing: boolean;
}

export function useHeroDetail(heroId: string | null): UseHeroDetailResult {
  const [detail, setDetail] = useState<HeroDetailedInfo | null>(null);
  const [resolvedImages, setResolvedImages] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!heroId) return;
    let cancelled = false;

    async function load() {
      setIsLoading(true);

      // 1. Check cache
      const status = await checkCacheStatus();
      if (status.isCacheValid) {
        const cached = await getCachedHeroDetail<HeroDetailedInfo>(heroId);
        if (cached && !cancelled) {
          setDetail(cached);
          setIsLoading(false);
          resolveDetailImages(cached).then((imgs) => {
            if (!cancelled) setResolvedImages(imgs);
          });
          return;
        }
      }

      // 2. Fetch
      if (!cancelled) setIsRefreshing(true);
      try {
        const fresh = await fetchHeroDetailFromApi(heroId);
        if (cancelled) return;

        setDetail(fresh);
        await setCachedHeroDetail(heroId, fresh);

        resolveDetailImages(fresh).then((imgs) => {
          if (!cancelled) setResolvedImages(imgs);
        });
      } catch (err) {
        console.error('[useHeroDetail] Fetch failed, trying stale cache:', err);
        const stale = await getCachedHeroDetail<HeroDetailedInfo>(heroId);
        if (stale && !cancelled) {
          setDetail(stale);
          resolveDetailImages(stale).then((imgs) => {
            if (!cancelled) setResolvedImages(imgs);
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [heroId]);

  return { detail, resolvedImages, isLoading, isRefreshing };
}

// ─────────────────────────────────────────────
// Internal image resolution helpers
// ─────────────────────────────────────────────

async function resolveImages(
  heroes: Hero[],
  forceNetwork: boolean,
): Promise<Record<string, string>> {
  const entries = await Promise.all(
    heroes.map(async (h) => {
      const src = forceNetwork
        ? await getOrCacheImage(h.image)
        : (await getCachedImage(h.image)) ?? h.image;
      return [h.id, src] as [string, string];
    }),
  );
  return Object.fromEntries(entries);
}

async function resolveDetailImages(
  detail: HeroDetailedInfo,
): Promise<Record<string, string>> {
  const urls: string[] = [
    detail.skills.passive.icon,
    detail.skills.skill_1.icon,
    detail.skills.skill_2.icon,
    detail.skills.ultimate.icon,
    ...detail.skins.map((s) => s.icon),
  ];

  const entries = await Promise.all(
    urls.map(async (url) => [url, await getOrCacheImage(url)] as [string, string]),
  );
  return Object.fromEntries(entries);
}
