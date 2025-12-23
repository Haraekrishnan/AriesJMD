
'use client';
import { createContext, useContext, ReactNode, useCallback, useEffect } from 'react';
import { AuthProvider, useAuth } from './auth-provider';
import { GeneralProvider, useGeneral } from './general-provider';
import { InventoryProvider, useInventory } from './inventory-provider';
import { ManpowerProvider, useManpower } from './manpower-provider';
import { PlannerProvider, usePlanner } from './planner-provider';
import { PurchaseProvider, usePurchase } from './purchase-provider';
import { TaskProvider, useTask } from './task-provider';
import { ConsumableProvider, useConsumable } from './consumable-provider';
import { AccommodationProvider, useAccommodation } from './accommodation-provider';
import { usePathname, useRouter } from 'next/navigation';

const AppContext = createContext({} as any);

function CombinedProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const general = useGeneral();
  const inventory = useInventory();
  const manpower = useManpower();
  const planner = usePlanner();
  const purchase = usePurchase();
  const task = useTask();
  const consumable = useConsumable();
  const accommodation = useAccommodation();
  const router = useRouter();
  const pathname = usePathname();

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
  };

  const { user, loading } = auth;

  useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname === '/login' || pathname === '/status';

    if (!user) {
      if (!isAuthPage) {
        router.replace('/login');
      }
      return;
    }
    
    if (user.status === 'locked') {
      if (pathname !== '/status') {
        router.replace('/status');
      }
    } else if (user.status === 'active') {
      if (isAuthPage) {
        router.replace('/dashboard');
      }
    }

  }, [user, loading, pathname, router]);

  return (
    <AppContext.Provider value={combinedValue}>
      {children}
    </AppContext.Provider>
  );
}

export function AppProvider({ children }: { children: ReactNode }) {
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
                                <CombinedProvider>
                                {children}
                                </CombinedProvider>
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
