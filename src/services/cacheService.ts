import { storage } from './storage';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

/** Keys used for the cache storage */
export const CACHE_KEYS = {
  DATA_VERSION: 'cache_data_version',
  HEROES_LIST: 'cache_heroes_list',
  HERO_DETAIL_PREFIX: 'cache_hero_detail_',
  IMAGE_PREFIX: 'cache_image_',
} as const;

/**
 * The "source of truth" version for the current app build.
 * Bump this string whenever you change hero data, images, etc.
 * Format: "<major>.<minor>.<patch>-<build>"
 */
export const APP_DATA_VERSION = '1.0.0-1';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface CacheEntry<T> {
  version: string;
  cachedAt: number;        // Unix timestamp (ms)
  data: T;
}

export interface CacheStatus {
  isCacheValid: boolean;
  cachedVersion: string | null;
  currentVersion: string;
}

// ─────────────────────────────────────────────
// Version helpers
// ─────────────────────────────────────────────

/**
 * Returns the version string that was last written to the cache.
 * Returns `null` if the cache has never been populated.
 */
export async function getCachedVersion(): Promise<string | null> {
  return storage.get(CACHE_KEYS.DATA_VERSION);
}

/**
 * Checks whether the cached data is still valid for the current app version.
 */
export async function checkCacheStatus(): Promise<CacheStatus> {
  const cachedVersion = await getCachedVersion();
  return {
    isCacheValid: cachedVersion === APP_DATA_VERSION,
    cachedVersion,
    currentVersion: APP_DATA_VERSION,
  };
}

/**
 * Persists the current app version to mark the cache as up-to-date.
 */
export async function markCacheAsCurrent(): Promise<void> {
  await storage.set(CACHE_KEYS.DATA_VERSION, APP_DATA_VERSION);
}

// ─────────────────────────────────────────────
// Generic get / set helpers
// ─────────────────────────────────────────────

/**
 * Reads a cached entry and returns its data, or `null` if not found /
 * version mismatch.
 *
 * @param key     Storage key
 * @param strict  When `true` (default), returns `null` on version mismatch.
 *                Pass `false` to return stale data anyway (e.g. for a
 *                "show cached while refreshing" UX pattern).
 */
export async function getCached<T>(
  key: string,
  strict = true,
): Promise<T | null> {
  try {
    const raw = await storage.get(key);
    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);

    if (strict && entry.version !== APP_DATA_VERSION) {
      return null; // stale – caller should re-fetch
    }

    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Writes data to the cache, tagging it with the current app version and
 * a timestamp.
 */
export async function setCached<T>(key: string, data: T): Promise<void> {
  const entry: CacheEntry<T> = {
    version: APP_DATA_VERSION,
    cachedAt: Date.now(),
    data,
  };
  await storage.set(key, JSON.stringify(entry));
}

/**
 * Removes a specific entry from the cache.
 */
export async function removeCached(key: string): Promise<void> {
  await storage.remove(key);
}

// ─────────────────────────────────────────────
// Hero-specific helpers
// ─────────────────────────────────────────────

/** Returns the cached heroes list, or `null` on miss / version mismatch. */
export async function getCachedHeroesList<T>(): Promise<T | null> {
  return getCached<T>(CACHE_KEYS.HEROES_LIST);
}

/** Persists the heroes list to the cache. */
export async function setCachedHeroesList<T>(data: T): Promise<void> {
  await setCached(CACHE_KEYS.HEROES_LIST, data);
}

/** Returns cached detailed info for a specific hero. */
export async function getCachedHeroDetail<T>(heroId: string): Promise<T | null> {
  return getCached<T>(`${CACHE_KEYS.HERO_DETAIL_PREFIX}${heroId}`);
}

/** Persists hero detailed info to the cache. */
export async function setCachedHeroDetail<T>(heroId: string, data: T): Promise<void> {
  await setCached(`${CACHE_KEYS.HERO_DETAIL_PREFIX}${heroId}`, data);
}

// ─────────────────────────────────────────────
// Full-cache invalidation
// ─────────────────────────────────────────────

/**
 * Clears the version marker so the next app launch treats the cache as
 * stale and re-fetches everything.
 * Individual hero + image entries remain on disk to allow graceful
 * degradation if the network is unavailable.
 */
export async function invalidateCache(): Promise<void> {
  await storage.remove(CACHE_KEYS.DATA_VERSION);
}

/**
 * Nuclear option: removes ALL cached data including images.
 * Use only during logout / settings reset.
 */
export async function clearAllCache(): Promise<void> {
  await storage.clear();
}
