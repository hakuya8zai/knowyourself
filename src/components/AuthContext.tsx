'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { AuthUser, clearAuth } from '@/lib/google-auth';
import { authFetch } from '@/lib/api';
import { z } from 'zod';

export interface BirthInfo {
  birth_date: string;  // YYYY-MM-DD
  birth_time?: string; // HH:MM
  birth_place?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  gender?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  birthInfo: BirthInfo | null;
  loading: boolean;
  isAuthenticated: boolean;
  hasBirthInfo: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateBirthInfo: (info: BirthInfo) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.selfkit.art/api/v1';
const ProfileSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullish(),
  avatar_url: z.string().nullish(),
  birth_info: z.object({
    birth_date: z.string(),
    birth_time: z.string().optional(),
    birth_place: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    timezone: z.string().optional(),
    gender: z.string().optional(),
  }).nullish(),
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [birthInfo, setBirthInfo] = useState<BirthInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch full profile from API using httpOnly cookie
  const fetchProfile = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/auth/me`);

      if (res.ok) {
        const data = ProfileSchema.parse(await res.json());
        // Update user data
        const userData: AuthUser = {
          id: data.id,
          email: data.email,
          name: data.name || undefined,
          avatar_url: data.avatar_url || undefined,
        };
        setUser(userData);
        setBirthInfo(data.birth_info || null);
        return true;
      } else {
        return false;
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      return false;
    }
  }, []);

  // Verify the httpOnly session with the backend before rendering private UI.
  useEffect(() => {
    async function init() {
      const isValid = await fetchProfile();
      if (!isValid) {
        setUser(null);
        setBirthInfo(null);
      }
      setLoading(false);
    }
    init();
  }, [fetchProfile]);

  const refreshUser = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  const updateBirthInfo = useCallback(async (info: BirthInfo): Promise<boolean> => {
    try {
      const res = await authFetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ birth_info: info }),
      });
      
      if (res.ok) {
        setBirthInfo(info);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update birth info:', err);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    await clearAuth();
    setUser(null);
    setBirthInfo(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      birthInfo,
      loading,
      isAuthenticated: !!user,
      hasBirthInfo: !!birthInfo?.birth_date,
      logout,
      refreshUser,
      updateBirthInfo,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
