import { Preferences } from '@capacitor/preferences';

/**
 * Unified storage abstraction using Capacitor Preferences.
 * Works on Web (localStorage) and Native (SharedPreferences/NSUserDefaults).
 */
export const storage = {
  async get(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    return value;
  },

  async set(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  },

  async remove(key: string): Promise<void> {
    await Preferences.remove({ key });
  },

  async clear(): Promise<void> {
    await Preferences.clear();
  }
};

export const AUTH_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  USER_DATA: 'auth_user_data',
};
