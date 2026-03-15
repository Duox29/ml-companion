/// <reference types="vite/client" />
import axios, { AxiosHeaders } from 'axios';
import { storage, AUTH_KEYS } from './storage';

// ─────────────────────────────────────────────────────────────────────────────
// Base URL
// Set VITE_API_URL in your .env file:
//   Development : VITE_API_URL=http://localhost:8080
//   Production  : VITE_API_URL=https://api.your-domain.com
// ─────────────────────────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

if (import.meta.env.DEV) {
  console.info(`[API] Backend URL → ${BASE_URL}`);
}

// Create an Axios instance
export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const AUTH_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
];

let refreshPromise: Promise<string> | null = null;

function isPublicAuthEndpoint(url: string): boolean {
  return AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));
}

function extractTokenPayload(responseData: any): {
  accessToken?: string;
  refreshToken?: string;
} {
  const payload = responseData?.data ?? responseData;
  return {
    accessToken: payload?.accessToken,
    refreshToken: payload?.refreshToken,
  };
}

async function clearAuthStorage() {
  await Promise.all([
    storage.remove(AUTH_KEYS.ACCESS_TOKEN),
    storage.remove(AUTH_KEYS.REFRESH_TOKEN),
    storage.remove(AUTH_KEYS.USER_DATA),
  ]);
}

async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const currentRefreshToken = await storage.get(AUTH_KEYS.REFRESH_TOKEN);

    if (!currentRefreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(
      `${api.defaults.baseURL}/auth/refresh`,
      { refreshToken: currentRefreshToken },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const { accessToken, refreshToken: nextRefreshToken } = extractTokenPayload(
      response.data
    );

    if (!accessToken) {
      throw new Error('Missing access token in refresh response');
    }

    await storage.set(AUTH_KEYS.ACCESS_TOKEN, accessToken);
    if (nextRefreshToken) {
      await storage.set(AUTH_KEYS.REFRESH_TOKEN, nextRefreshToken);
    }

    api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

    return accessToken;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

// Request Interceptor: Attach the access token to every request
api.interceptors.request.use(
  async (config) => {
    const url = config.url ?? '';

    if (!isPublicAuthEndpoint(url)) {
      const token = await storage.get(AUTH_KEYS.ACCESS_TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401s and Refresh Tokens
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as (typeof error.config & {
      _retry?: boolean;
    }) | null;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url ?? '';
    const shouldSkipRefresh =
      originalRequest._retry || isPublicAuthEndpoint(requestUrl);

    // If the error is 401 and we can retry with refresh token
    if (error.response?.status === 401 && !shouldSkipRefresh) {
      originalRequest._retry = true;

      try {
        const newAccessToken = await refreshAccessToken();

        if (!originalRequest.headers) {
          originalRequest.headers = new AxiosHeaders();
        }

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        await clearAuthStorage();
        window.dispatchEvent(new Event('auth:logout'));

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
