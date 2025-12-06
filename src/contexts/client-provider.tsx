'use client';

import { AuthProvider } from './auth-provider';
import { GeneralProvider } from './general-provider';
import { InventoryProvider } from './inventory-provider';
import { ManpowerProvider } from './manpower-provider';
import { PlannerProvider } from './planner-provider';
import { PurchaseProvider } from './purchase-provider';
import { TaskProvider } from './task-provider';
import { AppProvider } from './app-provider';

export function ClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
        {children}
    </AppProvider>
  );
}
