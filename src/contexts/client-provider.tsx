
'use client';

import { AppProvider } from './app-provider';

export function ClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
        {children}
    </AppProvider>
  );
}