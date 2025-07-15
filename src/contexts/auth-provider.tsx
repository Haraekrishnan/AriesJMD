'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { USERS } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';

interface AuthContextProps {
  isLoading: boolean;
  user: User | null;
  users: User[];
  login: (email: string, pass: string) => boolean;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextProps>({
  isLoading: true,
  user: null,
  users: [],
  login: () => false,
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useLocalStorage<User | null>('aries-user', null);
  const [users, setUsers] = useLocalStorage<User[]>('aries-users', USERS);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const login = (email: string, pass: string): boolean => {
    const foundUser = users.find((u) => u.email === email && u.password === pass);
    if (foundUser) {
      setUser(foundUser);
      toast({
        title: 'Login Successful',
        description: `Welcome back, ${foundUser.name}!`,
      });
      router.push('/dashboard');
      return true;
    }
    toast({
      variant: 'destructive',
      title: 'Login Failed',
      description: 'Invalid email or password.',
    });
    return false;
  };

  const logout = () => {
    setUser(null);
    router.push('/login');
  };
  
  const value = {
    isLoading,
    user,
    users,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
