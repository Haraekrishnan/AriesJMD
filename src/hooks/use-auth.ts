'use client';
import { useAppContext } from '@/contexts/app-provider';

/**
 * A hook to access authentication-related context.
 * This provides a focused API for components that only need auth functions.
 */
export const useAuth = () => {
  const { user, login, logout, loading, updateProfile } = useAppContext();
  return { user, login, logout, loading, updateProfile };
};
