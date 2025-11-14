
'use client';

import { AuthProvider } from './auth-provider';
import { AppProvider } from './app-provider';
import { useState, useEffect } from 'react';

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return (
    <AuthProvider>
      <AppProvider>{children}</AppProvider>
    </AuthProvider>
  );
}
