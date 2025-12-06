
'use client';
import { createContext, useContext, ReactNode } from 'react';
import { AuthProvider, useAuth } from './auth-provider';
import { GeneralProvider, useGeneral } from './general-provider';
import { InventoryProvider, useInventory } from './inventory-provider';
import { ManpowerProvider, useManpower } from './manpower-provider';
import { PlannerProvider, usePlanner } from './planner-provider';
import { PurchaseProvider, usePurchase } from './purchase-provider';
import { TaskProvider, useTask } from './task-provider';

// This is a bit of a hack to merge all the context types
// In a real app, you might consider a more sophisticated state management library
// or be more selective about which hooks are used in which components.
const AppContext = createContext({} as any);

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <GeneralProvider>
        <TaskProvider>
          <PlannerProvider>
            <ManpowerProvider>
              <PurchaseProvider>
                <InventoryProvider>
                  <CombinedProvider>
                    {children}
                  </CombinedProvider>
                </InventoryProvider>
              </PurchaseProvider>
            </ManpowerProvider>
          </PlannerProvider>
        </TaskProvider>
      </GeneralProvider>
    </AuthProvider>
  );
}

// A helper component to combine all context values
function CombinedProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const general = useGeneral();
  const inventory = useInventory();
  const manpower = useManpower();
  const planner = usePlanner();
  const purchase = usePurchase();
  const task = useTask();

  const combinedValue = {
    ...auth,
    ...general,
    ...inventory,
    ...manpower,
    ...planner,
    ...purchase,
    ...task,
  };

  return (
    <AppContext.Provider value={combinedValue}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
