
'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react';
import { User } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { rtdb } from '@/lib/rtdb';
import { ref, onValue, get, query, orderByChild, equalTo } from 'firebase/database';
import useLocalStorage from '@/hooks/use-local-storage';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; status?: User['status']; user?: User }>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [storedUserId, setStoredUserId] = useLocalStorage<string | null>('aries-userId-v1', null);
  const [usersById, setUsersById] = useState<Record<string, User>>({});
  const router = useRouter();

  const login = useCallback(async (email: string, pass: string): Promise<{ success: boolean; status?: User['status']; user?: User }> => {
    setLoading(true);
    const usersRef = query(ref(rtdb, 'users'), orderByChild('email'), equalTo(email));
    const snapshot = await get(usersRef);

    if (snapshot.exists()) {
        const usersData = snapshot.val();
        const userId = Object.keys(usersData)[0];
        const foundUser = { id: userId, ...usersData[userId] };

        if (foundUser.password === pass) {
            setStoredUserId(foundUser.id);
            setUser(foundUser);
            setLoading(false);
            return { success: true, status: foundUser.status || 'active', user: foundUser };
        }
    }
    setLoading(false);
    return { success: false };
  }, [setStoredUserId]);

  const logout = useCallback(() => {
    if (user) {
      // Activity log is handled in AppProvider now
    }
    setStoredUserId(null);
    setUser(null);
    router.push('/login');
  }, [user, setStoredUserId, router]);

  useEffect(() => {
    const usersRef = ref(rtdb, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
        const data = snapshot.val();
        setUsersById(data || {});
        if (storedUserId) {
            const foundUser = data?.[storedUserId];
            if (foundUser) {
                setUser({ id: storedUserId, ...foundUser });
            } else {
                setStoredUserId(null);
                setUser(null);
            }
        }
        setLoading(false);
    });
    return () => unsubscribe();
  }, [storedUserId, setStoredUserId]);

  useEffect(() => {
    if (storedUserId && usersById[storedUserId]) {
      const foundUser = { id: storedUserId, ...usersById[storedUserId] };
      if (JSON.stringify(user) !== JSON.stringify(foundUser)) {
        setUser(foundUser);
      }
    } else if (storedUserId && !usersById[storedUserId]) {
        // User might have been deleted, log them out
        logout();
    } else {
      setUser(null);
    }
    if(!loading && !storedUserId) {
      setLoading(false);
    }
  }, [storedUserId, usersById, user, logout, loading]);

  const contextValue: AuthContextType = {
    user,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
