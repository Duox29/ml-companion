import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { storage, AUTH_KEYS } from '../services/storage';
import { api } from '../services/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, refreshToken: string, userData: User) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // App Startup Flow: Restore session
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = await storage.get(AUTH_KEYS.ACCESS_TOKEN);
        const storedUser = await storage.get(AUTH_KEYS.USER_DATA);

        if (token && storedUser) {
          // Optimistically set user from storage
          setUser(JSON.parse(storedUser));
          
          // Optionally: Verify token with backend
          // const response = await api.get('/auth/me');
          // setUser(response.data);
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
        await logout();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for forced logouts from the API interceptor
    const handleForcedLogout = () => logout();
    window.addEventListener('auth:logout', handleForcedLogout);
    return () => window.removeEventListener('auth:logout', handleForcedLogout);
  }, []);

  const login = async (accessToken: string, refreshToken: string, userData: User) => {
    await storage.set(AUTH_KEYS.ACCESS_TOKEN, accessToken);
    await storage.set(AUTH_KEYS.REFRESH_TOKEN, refreshToken);
    await storage.set(AUTH_KEYS.USER_DATA, JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    await storage.remove(AUTH_KEYS.ACCESS_TOKEN);
    await storage.remove(AUTH_KEYS.REFRESH_TOKEN);
    await storage.remove(AUTH_KEYS.USER_DATA);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      isLoading, 
      login, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
