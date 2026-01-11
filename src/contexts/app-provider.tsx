
'use client';
import React, { createContext, useContext, ReactNode, useMemo, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthProvider, useAuth } from './auth-provider';
import { GeneralProvider, useGeneral } from './general-provider';
import { InventoryProvider, useInventory } from './inventory-provider';
import { ManpowerProvider, useManpower } from './manpower-provider';
import { PlannerProvider, usePlanner } from './planner-provider';
import { PurchaseProvider, usePurchase } from './purchase-provider';
import { TaskProvider, useTask } from './task-provider';
import { ConsumableProvider, useConsumable } from './consumable-provider';
import { AccommodationProvider, useAccommodation } from './accommodation-provider';
import { DecorationContextProvider, useDecorations } from './decoration-provider';

const AppContext = createContext<any | undefined>(undefined);

const CombinedProviderInner = ({ children }: { children: ReactNode }) => {
  const authProps = useAuth();
  const generalProps = useGeneral();
  const taskProps = useTask();
  const plannerProps = usePlanner();
  const manpowerProps = useManpower();
  const purchaseProps = usePurchase();
  const consumableProps = useConsumable();
  const accommodationProps = useAccommodation();
  const inventoryProps = useInventory();
  const decorationProps = useDecorations();
  
  const combinedContext = useMemo(() => ({
    ...authProps,
    ...generalProps,
    ...taskProps,
    ...plannerProps,
    ...manpowerProps,
    ...purchaseProps,
    ...consumableProps,
    ...accommodationProps,
    ...inventoryProps,
    ...decorationProps,
  }), [authProps, generalProps, taskProps, plannerProps, manpowerProps, purchaseProps, consumableProps, accommodationProps, inventoryProps, decorationProps]);

  return (
    <AppContext.Provider value={combinedContext}>
      {children}
    </AppContext.Provider>
  )
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <GeneralProvider>
        <TaskProvider>
          <PlannerProvider>
            <ManpowerProvider>
              <PurchaseProvider>
                <ConsumableProvider>
                  <AccommodationProvider>
                    <InventoryProvider>
                      <DecorationContextProvider>
                        <CombinedProviderInner>
                          {children}
                        </CombinedProviderInner>
                      </DecorationContextProvider>
                    </InventoryProvider>
                  </AccommodationProvider>
                </ConsumableProvider>
              </PurchaseProvider>
            </ManpowerProvider>
          </PlannerProvider>
        </TaskProvider>
      </GeneralProvider>
    </AuthProvider>
  );
}


export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
