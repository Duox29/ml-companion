/// <reference types="vite/client" />
import axios from 'axios';
import { storage, AUTH_KEYS } from './storage';

// Create an Axios instance
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://api.example.com', // Replace with your actual API URL
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach the access token to every request
api.interceptors.request.use(
  async (config) => {
    const token = await storage.get(AUTH_KEYS.ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401s and Refresh Tokens
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await storage.get(AUTH_KEYS.REFRESH_TOKEN);
        
        if (!refreshToken) {
          // No refresh token, force logout
          throw new Error('No refresh token available');
        }

        // Attempt to refresh the token
        // Note: Use a separate axios instance or standard fetch to avoid interceptor loops
        const response = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // Save new tokens
        await storage.set(AUTH_KEYS.ACCESS_TOKEN, accessToken);
        if (newRefreshToken) {
          await storage.set(AUTH_KEYS.REFRESH_TOKEN, newRefreshToken);
        }

        // Update the failed request's header and retry
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
        
      } catch (refreshError) {
        // Refresh failed (e.g., refresh token expired)
        await storage.remove(AUTH_KEYS.ACCESS_TOKEN);
        await storage.remove(AUTH_KEYS.REFRESH_TOKEN);
        await storage.remove(AUTH_KEYS.USER_DATA);
        
        // Optional: Dispatch a custom event to trigger a logout in the UI
        window.dispatchEvent(new Event('auth:logout'));
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
