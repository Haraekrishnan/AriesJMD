'use client';
import { ReactNode } from 'react';
import { AuthProvider } from './auth-provider';
import { GeneralProvider } from './general-provider';
import { InventoryProvider } from './inventory-provider';
import { ManpowerProvider } from './manpower-provider';
import { PlannerProvider } from './planner-provider';
import { PurchaseProvider } from './purchase-provider';
import { TaskProvider } from './task-provider';
import { ConsumableProvider } from './consumable-provider';
import { AccommodationProvider } from './accommodation-provider';
import { DecorationContextProvider } from './decoration-provider';
import { InwardOutwardProvider } from './inward-outward-provider';

// This file is simplified to only nest providers.
// The CombinedProvider and useAppContext have been removed to prevent state conflicts and performance issues.
// Components should now use the specific hooks they need (e.g., useAuth, useInventory).

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <GeneralProvider>
        <ManpowerProvider>
          <ConsumableProvider>
            <TaskProvider>
                <PlannerProvider>
                  <PurchaseProvider>
                    <InventoryProvider>
                      <AccommodationProvider>
                        <DecorationContextProvider>
                            <InwardOutwardProvider>
                                {children}
                            </InwardOutwardProvider>
                        </DecorationContextProvider>
                      </AccommodationProvider>
                    </InventoryProvider>
                  </PurchaseProvider>
                </PlannerProvider>
            </TaskProvider>
          </ConsumableProvider>
        </ManpowerProvider>
      </GeneralProvider>
    </AuthProvider>
  );
}
