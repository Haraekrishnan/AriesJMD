
'use client';
import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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

function CombinedProvider({ children }: { children: ReactNode }) {
  const contextValue = useAppContext();
  const { user, loading } = contextValue;
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname === '/login' || pathname === '/status';

    if (!user && !isAuthPage) {
      router.replace('/login');
    } else if (user) {
      if (user.status === 'locked' && pathname !== '/status') {
        router.replace('/status');
      } else if (user.status !== 'locked' && isAuthPage) {
        router.replace('/dashboard');
      }
    }
  }, [user, loading, pathname, router]);


  return <>{children}</>;
}


export function AppProvider({ children }: { children: ReactNode }) {
  return (
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
  );
}

function CombinedProviderInner({ children }: { children: ReactNode }) {
  const generalProps = useGeneral();
  const taskProps = useTask();
  const plannerProps = usePlanner();
  const manpowerProps = useManpower();
  const purchaseProps = usePurchase();
  const consumableProps = useConsumable();
  const accommodationProps = useAccommodation();
  const inventoryProps = useInventory();
  const decorationProps = useDecorations();
  
  const combinedContext = {
    ...generalProps,
    ...taskProps,
    ...plannerProps,
    ...manpowerProps,
    ...purchaseProps,
    ...consumableProps,
    ...accommodationProps,
    ...inventoryProps,
    ...decorationProps,
  };

  return (
    <AppContext.Provider value={combinedContext}>
      <CombinedProvider>
          {children}
      </CombinedProvider>
    </AppContext.Provider>
  )
}

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
