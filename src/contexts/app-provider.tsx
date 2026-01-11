
'use client';
import { createContext, useContext, ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthProvider, useAuth } from '@/contexts/auth-provider';
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

function CombinedProvider({ children }: { children: ReactNode }) {
  const authProps = useAuth();
  const generalProps = useGeneral();
  const taskProps = useTask();
  const plannerProps = usePlanner();
  const manpowerProps = useManpower();
  const purchaseProps = usePurchase();
  const consumableProps = useConsumable();
  const accommodationProps = useAccommodation();
  const inventoryProps = useInventory(authProps);
  const decorationsProps = useDecorations();
  
  const { user, loading } = authProps;
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
      } else if (user.status !== 'locked' && pathname === '/status') {
        router.replace('/dashboard');
      } else if (user.status !== 'locked' && pathname === '/login') {
        router.replace('/dashboard');
      }
    }
  }, [user, loading, pathname, router]);

  const combinedValue = {
    ...authProps,
    ...generalProps,
    ...taskProps,
    ...plannerProps,
    ...manpowerProps,
    ...purchaseProps,
    ...consumableProps,
    ...accommodationProps,
    ...inventoryProps,
    ...decorationsProps,
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
                    <AccommodationProvider>
                      <InventoryProvider>
                        <DecorationContextProvider>
                          <CombinedProvider>
                            {children}
                          </CombinedProvider>
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
