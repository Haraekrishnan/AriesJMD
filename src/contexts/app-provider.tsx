
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

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <GeneralProvider>
        <ManpowerProvider>
            <ConsumableProvider>
                <InventoryProvider>
                    <PurchaseProvider>
                        <InwardOutwardProvider>
                            <AccommodationProvider>
                                <PlannerProvider>
                                    <TaskProvider>
                                        <DecorationContextProvider>
                                            {children}
                                        </DecorationContextProvider>
                                    </TaskProvider>
                                </PlannerProvider>
                            </AccommodationProvider>
                        </InwardOutwardProvider>
                    </PurchaseProvider>
                </InventoryProvider>
            </ConsumableProvider>
        </ManpowerProvider>
      </GeneralProvider>
    </AuthProvider>
  );
}

export const useAppContext = () => {
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

    return {
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
};
