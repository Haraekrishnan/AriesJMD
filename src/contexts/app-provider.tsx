
'use client';
import { createContext, useContext, ReactNode } from 'react';
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
import { InwardOutwardProvider, useInwardOutward } from './inward-outward-provider';

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
  const decorations = useDecorations();
  const inwardOutward = useInwardOutward();
  
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
    ...inwardOutward,
  };

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
        <ManpowerProvider>
          <ConsumableProvider>
            <TaskProvider>
                <PlannerProvider>
                  <PurchaseProvider>
                    <InventoryProvider>
                      <AccommodationProvider>
                        <DecorationContextProvider>
                            <InwardOutwardProvider>
                                <CombinedProvider>
                                    {children}
                                </CombinedProvider>
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

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context as ReturnType<typeof useAuth> & ReturnType<typeof useGeneral> & ReturnType<typeof useInventory> & ReturnType<typeof useManpower> & ReturnType<typeof usePlanner> & ReturnType<typeof usePurchase> & ReturnType<typeof useTask> & ReturnType<typeof useConsumable> & ReturnType<typeof useAccommodation> & ReturnType<typeof useDecorations> & ReturnType<typeof useInwardOutward>;
};
