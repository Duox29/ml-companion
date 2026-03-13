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
