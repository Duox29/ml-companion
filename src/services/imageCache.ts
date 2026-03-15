import { storage } from './storage';
import { CACHE_KEYS, APP_DATA_VERSION, CacheEntry } from './cacheService';

// ─────────────────────────────────────────────
// Image cache – stores images as base64 data-URIs
// so they remain available offline on the APK.
// ─────────────────────────────────────────────

/**
 * Returns the storage key for a given image URL.
 * We hash-ify the URL by base64-encoding it to avoid
 * characters that Capacitor Preferences doesn't handle.
 */
function imageKey(url: string): string {
  try {
    return `${CACHE_KEYS.IMAGE_PREFIX}${btoa(url)}`;
  } catch {
    // Fall back for URLs with non-Latin chars
    return `${CACHE_KEYS.IMAGE_PREFIX}${encodeURIComponent(url)}`;
  }
}

/**
 * Fetches an image from the network and converts it to a base64
 * data-URI string.
 */
async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${url} (${response.status})`);
  }
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Returns the cached base64 data-URI for an image.
 * Returns `null` when the image is not cached or was cached with a
 * different app version.
 */
export async function getCachedImage(url: string): Promise<string | null> {
  try {
    const key = imageKey(url);
    const raw = await storage.get(key);
    if (!raw) return null;

    const entry: CacheEntry<string> = JSON.parse(raw);
    if (entry.version !== APP_DATA_VERSION) return null;

    return entry.data; // base64 data-URI
  } catch {
    return null;
  }
}

/**
 * Fetches an image and saves the base64 data-URI to cache.
 * Returns the data-URI on success, or the original URL on failure so
 * the UI can still show images via the network.
 */
export async function cacheImage(url: string): Promise<string> {
  try {
    const base64 = await fetchImageAsBase64(url);
    const key = imageKey(url);
    const entry: CacheEntry<string> = {
      version: APP_DATA_VERSION,
      cachedAt: Date.now(),
      data: base64,
    };
    await storage.set(key, JSON.stringify(entry));
    return base64;
  } catch (err) {
    console.warn('[ImageCache] Failed to cache image, falling back to URL:', url, err);
    return url; // Graceful degradation
  }
}

/**
 * Returns a cached image if available; otherwise fetches, caches, and
 * returns it.  Always resolves – falls back to the original URL on any
 * network / storage error.
 */
export async function getOrCacheImage(url: string): Promise<string> {
  const cached = await getCachedImage(url);
  if (cached) return cached;
  return cacheImage(url);
}

/**
 * Caches a list of image URLs in parallel (with a concurrency cap to
 * avoid flooding the network on the first boot).
 *
 * @param urls       List of image URLs to pre-fetch
 * @param concurrency Maximum simultaneous fetch requests (default 3)
 */
export async function preCacheImages(
  urls: string[],
  concurrency = 3,
): Promise<void> {
  // Deduplicate
  const unique = [...new Set(urls)];

  // Process in batches of `concurrency`
  for (let i = 0; i < unique.length; i += concurrency) {
    const batch = unique.slice(i, i + concurrency);
    await Promise.allSettled(batch.map((url) => cacheImage(url)));
  }
}

/**
 * Removes a single cached image entry.
 */
export async function removeCachedImage(url: string): Promise<void> {
  await storage.remove(imageKey(url));
}
