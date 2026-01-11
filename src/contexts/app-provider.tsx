
'use client';
import React, { createContext, useContext, ReactNode, useMemo } from 'react';
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

// Define a type for the combined context value
// This will be an intersection of all individual context types
type AppContextType = 
  ReturnType<typeof useAuth> &
  ReturnType<typeof useGeneral> &
  ReturnType<typeof useInventory> &
  ReturnType<typeof useManpower> &
  ReturnType<typeof usePlanner> &
  ReturnType<typeof usePurchase> &
  ReturnType<typeof useTask> &
  ReturnType<typeof useConsumable> &
  ReturnType<typeof useAccommodation> &
  ReturnType<typeof useDecorations>;

const AppContext = createContext<AppContextType | undefined>(undefined);

const CombinedProviderInner = ({ children }: { children: ReactNode }) => {
  const authProps = useAuth();
  const generalProps = useGeneral();
  const inventoryProps = useInventory();
  const manpowerProps = useManpower();
  const plannerProps = usePlanner();
  const purchaseProps = usePurchase();
  const taskProps = useTask();
  const consumableProps = useConsumable();
  const accommodationProps = useAccommodation();
  const decorationProps = useDecorations();
  
  const combinedContext = useMemo(() => ({
    ...authProps,
    ...generalProps,
    ...inventoryProps,
    ...manpowerProps,
    ...plannerProps,
    ...purchaseProps,
    ...taskProps,
    ...consumableProps,
    ...accommodationProps,
    ...decorationProps,
  }), [
    authProps, generalProps, inventoryProps, manpowerProps, plannerProps,
    purchaseProps, taskProps, consumableProps, accommodationProps, decorationProps
  ]);

  return (
    <AppContext.Provider value={combinedContext}>
      {children}
    </AppContext.Provider>
  );
};

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

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
