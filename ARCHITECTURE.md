# Architecture & Tech Stack Documentation

## Overview
This document records the technical decisions, stack, and mechanisms used in the Mobile Legends Wiki App, specifically focusing on cross-platform compatibility (Web + Android APK via Capacitor) and Authentication Persistence.

## Tech Stack
*   **Frontend Framework:** React 19 + Vite
*   **Styling:** Tailwind CSS v4
*   **Icons:** Lucide React
*   **Animations:** Motion (Framer Motion)
*   **Cross-Platform Runtime:** Capacitor (`@capacitor/core`)
*   **Routing:** React Router DOM (`react-router-dom`)
*   **HTTP Client:** Axios (`axios`)
*   **Storage:** Capacitor Preferences (`@capacitor/preferences`)

## Authentication Mechanism

### 1. Unified Storage Layer
We use `@capacitor/preferences` as the unified storage abstraction. 
*   **Web:** Automatically falls back to `localStorage`.
*   **Android/iOS:** Uses native secure-ish key-value stores (`SharedPreferences` on Android, `NSUserDefaults` on iOS).
*   **Benefit:** A single async API (`Preferences.get`, `Preferences.set`) works seamlessly across all platforms without platform-specific branching.

### 2. API Client & Token Injection
We use `axios` with interceptors to manage the JWT lifecycle:
*   **Request Interceptor:** Intercepts every outgoing request, retrieves the `accessToken` from the unified storage, and attaches it to the `Authorization: Bearer <token>` header.
*   **Response Interceptor:** Catches `401 Unauthorized` errors. If a `refreshToken` exists, it attempts to hit the `/refresh` endpoint, updates the tokens in storage, and retries the original failed request automatically.

### 3. State Management (AuthContext)
The `AuthContext` provides a global state for the user's authentication status.
*   **App Startup Flow:** On mount, the `AuthProvider` runs an initialization effect. It checks storage for an `accessToken`. If found, it optionally fetches the user's profile from the backend to verify the token is still valid.
*   **State:** Exposes `user`, `isAuthenticated`, and `isLoading` (true during the initial startup check to prevent flashing protected routes).

### 4. Route Protection
A `PrivateRoute` component wraps routes that require authentication.
*   If `isLoading` is true, it shows a splash/loading screen.
*   If `isAuthenticated` is false, it redirects to the `/login` route.
*   Otherwise, it renders the protected child components.

---

## Data Caching System

### Overview
The caching system stores champion data and images locally on the device (via `@capacitor/preferences`) and uses a **version-check strategy** to decide whether to use the cache or re-fetch from the network.

### Key Files
| File | Responsibility |
|---|---|
| `src/services/cacheService.ts` | Core cache logic: version check, generic get/set, hero-specific helpers |
| `src/services/imageCache.ts` | Image caching: fetch → base64 data-URI → store in Preferences |
| `src/hooks/useWikiData.ts` | React hooks (`useHeroes`, `useHeroDetail`) that implement the cache-first strategy |

### Version Check Strategy

```
App launch / Wiki screen mount
         │
         ▼
  getCachedVersion()
         │
   match current          mismatch / null
  APP_DATA_VERSION? ──────────────────────►  Fetch from API
         │                                         │
         ▼                                         ▼
  Serve from cache                     Save to cache + mark version
         │                                         │
         ▼                                         ▼
  Resolve images                       Pre-cache images (background)
  (from cache first)                             │
                                                 ▼
                                         Update UI (fresh data)
```

*   **`APP_DATA_VERSION`** (in `cacheService.ts`) is the single source of truth for cache validity. Bump it whenever hero data or assets change.
*   On **version mismatch**, data is re-fetched and the cache is updated atomically (write data → write version marker).
*   **Graceful degradation:** If the network fails during a refresh, the old (stale) cache is served so the app still works offline.

### Image Caching
*   Images are downloaded once and stored as **base64 data-URIs** in Capacitor Preferences.
*   `getOrCacheImage(url)` is the primary API: returns cached base64 if present, otherwise fetches and caches.
*   `preCacheImages(urls, concurrency)` bulk-caches a list of images with a concurrency cap (default 3) to avoid flooding the network on first boot.
*   If an image fails to cache, the original URL is returned as a fallback so the UI remains functional.

### Cache Keys
| Key | Content |
|---|---|
| `cache_data_version` | Current `APP_DATA_VERSION` string |
| `cache_heroes_list` | Full `Hero[]` array |
| `cache_hero_detail_<id>` | `HeroDetailedInfo` for a specific hero |
| `cache_image_<base64(url)>` | Base64 data-URI of a cached image |

### How to Invalidate the Cache
1.  **Bump `APP_DATA_VERSION`** in `src/services/cacheService.ts` (e.g. `'1.0.0-1'` → `'1.0.0-2'`). On next app launch, all hero data and images will be re-fetched.
2.  **Manual force-refresh:** The Wiki screen has a *Làm mới* (Refresh) button that clears the version marker and triggers a network fetch.
3.  **Nuclear clear:** Call `clearAllCache()` from `cacheService.ts` to wipe all preferences (used on logout/reset).
