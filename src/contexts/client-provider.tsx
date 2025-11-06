'use client';

import { AppProvider } from './app-provider';
import { useState, useEffect } from 'react';

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return <AppProvider>{isClient ? children : null}</AppProvider>;
}