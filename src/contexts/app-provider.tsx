
'use client';
import { createContext, useContext, ReactNode, useCallback, useEffect } from 'react';
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

const AppContext = createContext({} as any);

function CombinedProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const general = useGeneral();
  const inventory = useInventory();
  const manpower = useManpower();
  const planner = usePlanner();
  const purchase = usePurchase();
  const task = useTask();
  const consumable = useConsumable();
  const accommodation = useAccommodation();
  const decorations = useDecorations();
  
  const router = useRouter();
  const pathname = usePathname();

  const { user, loading } = auth;

  useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname === '/login' || pathname === '/status';

    if (!user && !isAuthPage) {
      router.replace('/login');
    } else if (user) {
      if (user.status === 'locked' && pathname !== '/status') {
        router.replace('/status');
      } else if (user.status !== 'locked' && pathname === '/login') {
         router.replace('/dashboard');
      } else if (user.status !== 'locked' && pathname === '/status') {
         router.replace('/dashboard');
      }
    }
  }, [user, loading, pathname, router]);

  const combinedValue = {
    ...auth,
    ...general,
    ...inventory,
    ...manpower,
    ...planner,
    ...purchase,
    ...task,
    ...consumable,
    ...accommodation,
    ...decorations,
  };

  return (
    <AppContext.Provider value={combinedValue}>
      {children}
    </AppContext.Provider>
  );
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
                        <InventoryProvider>
                            <AccommodationProvider>
                              <DecorationContextProvider>
                                <CombinedProvider>
                                {children}
                                </CombinedProvider>
                              </DecorationContextProvider>
                            </AccommodationProvider>
                        </InventoryProvider>
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
