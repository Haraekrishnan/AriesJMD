'use client';

import { AuthProvider } from './auth-provider';

export function ClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
