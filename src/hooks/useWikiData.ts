import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import heroesBundleJson from '../data/wiki/heroes.bundle.json';
import { api } from '../services/api';
import { storage, AUTH_KEYS } from '../services/storage';
import { getCachedImage, getOrCacheImage, preCacheImages } from '../services/imageCache';
import { Hero, HeroRole, HeroesBundle, WikiHeroRecord } from '../types';

const WIKI_KEYS = {
  VERSION: 'wiki_heroes_bundle_version',
  BUNDLE: 'wiki_heroes_bundle_payload',
} as const;

const VALID_ROLES: HeroRole[] = ['Tank', 'Fighter', 'Mage', 'Marksman', 'Assassin', 'Support'];
const LOCAL_BUNDLE = heroesBundleJson as HeroesBundle;
const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8080').replace(/\/+$/, '');

function isCrossOriginApi(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URL(API_BASE_URL, window.location.origin).origin !== window.location.origin;
  } catch {
    return false;
  }
}

function canAttemptRemoteWikiSync(): boolean {
  const override = import.meta.env.VITE_ENABLE_REMOTE_WIKI_SYNC;
  if (override === 'true') return true;
  if (override === 'false') return false;
  if (Capacitor.getPlatform() !== 'web') return true;
  return !isCrossOriginApi();
}

function isHeroRole(value: string): value is HeroRole {
  return VALID_ROLES.includes(value as HeroRole);
}

function normalizeHeroRecord(raw: WikiHeroRecord): WikiHeroRecord {
  const roles = Array.isArray(raw.role) ? raw.role.filter(isHeroRole) : [];
  const slug = raw.slug || String(raw.name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return {
    ...raw,
    id: String(raw.id),
    slug,
    role: roles.length ? roles : ['Fighter'],
    lane: Array.isArray(raw.lane) ? raw.lane : [],
    specialty: Array.isArray(raw.specialty) ? raw.specialty : [],
    skill: Array.isArray(raw.skill) ? raw.skill : [],
    skin: Array.isArray(raw.skin) ? raw.skin : [],
    skill_combo: Array.isArray(raw.skill_combo) ? raw.skill_combo : [],
  };
}

function normalizeBundle(input: HeroesBundle): HeroesBundle {
  const heroes = Array.isArray(input.heroes) ? input.heroes.map(normalizeHeroRecord) : [];
  return {
    version: input.version || LOCAL_BUNDLE.version,
    generatedAt: input.generatedAt || new Date().toISOString(),
    total: heroes.length,
    heroes,
  };
}

function toHeroCard(hero: WikiHeroRecord): Hero {
  return {
    id: hero.id,
    slug: hero.slug,
    name: hero.name,
    role: hero.role[0] ?? 'Fighter',
    image: hero.portrait || hero.icon,
  };
}

async function getCachedBundle(): Promise<HeroesBundle | null> {
  const raw = await storage.get(WIKI_KEYS.BUNDLE);
  if (!raw) return null;
  try {
    return normalizeBundle(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function setCachedBundle(bundle: HeroesBundle): Promise<void> {
  await Promise.all([
    storage.set(WIKI_KEYS.BUNDLE, JSON.stringify(bundle)),
    storage.set(WIKI_KEYS.VERSION, bundle.version),
  ]);
}

async function fetchRemoteVersion(): Promise<string | null> {
  const endpoints = ['/wiki/heroes/version', '/mlbb/wiki/heroes/version', '/heroes/version'];
  for (const endpoint of endpoints) {
    try {
      const { data } = await api.get(endpoint);
      const payload = data?.data ?? data;
      const version =
        payload?.version ??
        payload?.dataVersion ??
        (typeof payload === 'string' ? payload : null);
      if (version) return String(version);
    } catch {
      // Keep local data if backend endpoint is not available.
    }
  }
  return null;
}

async function fetchRemoteBundle(): Promise<HeroesBundle | null> {
  const endpoints = ['/wiki/heroes/bundle', '/mlbb/wiki/heroes/bundle', '/heroes/bundle'];
  for (const endpoint of endpoints) {
    try {
      const { data } = await api.get(endpoint);
      const payload = data?.data ?? data;
      if (payload && Array.isArray(payload.heroes)) {
        return normalizeBundle(payload as HeroesBundle);
      }
    } catch {
      // Keep local data if backend endpoint is not available.
    }
  }
  return null;
}

async function resolveHeroImages(
  heroes: Hero[],
  forceNetwork: boolean,
): Promise<Record<string, string>> {
  const entries = await Promise.all(
    heroes.map(async (hero) => {
      const src = forceNetwork
        ? await getOrCacheImage(hero.image)
        : (await getCachedImage(hero.image)) ?? hero.image;
      return [hero.id, src] as [string, string];
    }),
  );
  return Object.fromEntries(entries);
}

export interface UseHeroesResult {
  heroes: Hero[];
  heroRecords: WikiHeroRecord[];
  resolvedImages: Record<string, string>;
  isLoading: boolean;
  isRefreshing: boolean;
  cacheVersion: string | null;
  dataVersion: string;
  refresh: () => void;
}

export function useHeroes(): UseHeroesResult {
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [heroRecords, setHeroRecords] = useState<WikiHeroRecord[]>([]);
  const [resolvedImages, setResolvedImages] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cacheVersion, setCacheVersion] = useState<string | null>(null);
  const [dataVersion, setDataVersion] = useState<string>(LOCAL_BUNDLE.version);
  const [refreshTick, setRefreshTick] = useState(0);

  const refresh = useCallback(() => setRefreshTick((tick) => tick + 1), []);

  useEffect(() => {
    let cancelled = false;
    const forceRefresh = refreshTick > 0;

    async function applyBundle(bundle: HeroesBundle, forceImageNetwork: boolean) {
      const list = bundle.heroes.map(toHeroCard);
      if (!cancelled) {
        setHeroRecords(bundle.heroes);
        setHeroes(list);
      }

      const urls = list.map((item) => item.image).filter(Boolean);
      if (urls.length) preCacheImages(urls).catch(() => undefined);

      const images = await resolveHeroImages(list, forceImageNetwork);
      if (!cancelled) setResolvedImages(images);
    }

    async function load() {
      if (!cancelled && forceRefresh) setIsRefreshing(true);

      const cachedVersionValue = await storage.get(WIKI_KEYS.VERSION);
      const hasAccessToken = Boolean(await storage.get(AUTH_KEYS.ACCESS_TOKEN));
      const canUseRemoteSync = hasAccessToken && canAttemptRemoteWikiSync();
      let activeBundle = await getCachedBundle();

      // First pull: fetch from backend, then cache locally.
      if (!activeBundle) {
        if (!cancelled) setIsRefreshing(true);
        const remoteFirst = canUseRemoteSync ? await fetchRemoteBundle() : null;
        if (remoteFirst) {
          activeBundle = remoteFirst;
          await setCachedBundle(remoteFirst);
        } else {
          activeBundle = normalizeBundle(LOCAL_BUNDLE);
          await setCachedBundle(activeBundle);
        }
      }

      if (!cancelled) {
        setCacheVersion(cachedVersionValue ?? activeBundle.version);
        setDataVersion(activeBundle.version);
      }

      await applyBundle(activeBundle, false);

      const remoteVersion = canUseRemoteSync ? await fetchRemoteVersion() : null;
      if (!cancelled && remoteVersion) {
        setDataVersion(remoteVersion);
      }

      const localVersion = cachedVersionValue ?? activeBundle.version;
      const needUpdate =
        canUseRemoteSync &&
        (forceRefresh || (Boolean(remoteVersion) && remoteVersion !== localVersion));

      if (needUpdate) {
        if (!cancelled) setIsRefreshing(true);
        const remoteBundle = await fetchRemoteBundle();
        if (remoteBundle) {
          activeBundle = remoteBundle;
          await setCachedBundle(activeBundle);
          if (!cancelled) {
            setCacheVersion(activeBundle.version);
            setDataVersion(activeBundle.version);
          }
          await applyBundle(activeBundle, true);
        }
      }

      if (!cancelled) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  return {
    heroes,
    heroRecords,
    resolvedImages,
    isLoading,
    isRefreshing,
    cacheVersion,
    dataVersion,
    refresh,
  };
}

export interface UseHeroDetailResult {
  detail: WikiHeroRecord | null;
  resolvedImages: Record<string, string>;
  isLoading: boolean;
  isRefreshing: boolean;
}

export function useHeroDetail(heroId: string | null): UseHeroDetailResult {
  const [detail, setDetail] = useState<WikiHeroRecord | null>(null);
  const [resolvedImages, setResolvedImages] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!heroId) return;
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      const bundle = (await getCachedBundle()) ?? normalizeBundle(LOCAL_BUNDLE);
      const hero = bundle.heroes.find((item) => item.id === heroId) ?? null;
      if (!cancelled) setDetail(hero);

      if (hero) {
        const imageUrls = [hero.icon, hero.portrait, ...hero.skill.map((s) => s.icon)].filter(Boolean);
        setIsRefreshing(true);
        const entries = await Promise.all(
          imageUrls.map(async (url) => [url, await getOrCacheImage(url)] as [string, string]),
        );
        if (!cancelled) {
          setResolvedImages(Object.fromEntries(entries));
        }
      }

      if (!cancelled) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [heroId]);

  return { detail, resolvedImages, isLoading, isRefreshing };
}
