
'use client';
import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback } from 'react';
import type { InventoryItem, ConsumableInwardRecord, InventoryCategory } from '@/lib/types';
import { rtdb } from '@/lib/rtdb';
import { ref, onValue, update, push, set, remove, runTransaction } from 'firebase/database';
import { useAuth } from './auth-provider';
import { useToast } from '@/hooks/use-toast';

// --- TYPE DEFINITIONS ---
type ConsumableContextType = {
  consumableItems: InventoryItem[];
  consumableInwardHistory: ConsumableInwardRecord[];
  loadingConsumables: boolean;
  addConsumableItem: (itemData: Omit<InventoryItem, 'id' | 'lastUpdated' | 'status' | 'projectId'>) => Promise<void>;
  updateConsumableItem: (item: InventoryItem) => Promise<void>;
  deleteConsumableItem: (itemId: string) => Promise<void>;
  addMultipleConsumableItems: (itemsData: ImportRow[]) => Promise<number>;
  addConsumableInwardRecord: (itemId: string, quantity: number, date: Date) => Promise<void>;
  updateConsumableInwardRecord: (record: ConsumableInwardRecord) => Promise<void>;
  deleteConsumableInwardRecord: (record: ConsumableInwardRecord) => Promise<void>;
};

type ImportRow = {
    Name: string;
    Category: string;
    Quantity?: number;
    Unit?: string;
    Remarks?: string;
};

// --- CONSTANTS ---
const CATEGORY_DAILY = 'Daily Consumable';
const CATEGORY_JOB = 'Job Consumable';
const STORE_PROJECT_ID = 'STORE';

const ConsumableContext = createContext<ConsumableContextType | undefined>(undefined);

export function ConsumableProvider({ children }: { children: ReactNode }) {
  const { user, addActivityLog } = useAuth();
  const { toast } = useToast();
  const [loadingConsumables, setLoadingConsumables] = useState(true);
  const [inventoryItemsById, setInventoryItemsById] = useState<Record<string, InventoryItem>>({});
  const [consumableInwardHistoryById, setConsumableInwardHistoryById] = useState<Record<string, ConsumableInwardRecord>>({});

  useEffect(() => {
    const createDataListener = <T extends {}>(
        path: string,
        setData: React.Dispatch<React.SetStateAction<Record<string, T>>>,
    ) => {
        const dbRef = ref(rtdb, path);
        const unsubscribe = onValue(dbRef, (snapshot) => {
            const data = (snapshot.val() || {}) as Record<string, T>;
            const processedData = Object.keys(data).reduce((acc, key) => {
                acc[key] = { ...data[key], id: key };
                return acc;
            }, {} as Record<string, T>);
            setData(processedData);
        });
        return unsubscribe;
    };

    const unsubInventory = createDataListener('inventoryItems', setInventoryItemsById);
    const unsubHistory = createDataListener('consumableInwardHistory', setConsumableInwardHistoryById);
    
    const initialLoadRef = ref(rtdb, 'inventoryItems');
    const initialLoadListener = onValue(initialLoadRef, () => {
        setLoadingConsumables(false);
    }, { onlyOnce: true });

    return () => {
      unsubInventory();
      unsubHistory();
      // Even with { onlyOnce: true }, it's safer to have a cleanup mechanism,
      // though onValue with onlyOnce typically handles its own teardown.
      // This call does no harm and ensures cleanup if behavior changes.
      initialLoadListener();
    };
  }, []);

  const consumableItems = useMemo(() => {
    return Object.values(inventoryItemsById).filter(
      item => item.category === CATEGORY_DAILY || item.category === CATEGORY_JOB
    );
  }, [inventoryItemsById]);
  
  const consumableInwardHistory = useMemo(() => Object.values(consumableInwardHistoryById), [consumableInwardHistoryById]);

  const addConsumableItem = useCallback(async (itemData: Omit<InventoryItem, 'id' | 'lastUpdated' | 'status' | 'projectId'>) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'inventoryItems'));
    const dataToSave: Partial<InventoryItem> = {
        ...itemData,
        status: 'In Store',
        projectId: STORE_PROJECT_ID,
        lastUpdated: new Date().toISOString(),
    };
    try {
        await set(newRef, dataToSave);
        addActivityLog(user.id, 'Consumable Item Added', `${itemData.name}`);
    } catch (error) {
        console.error("Error adding consumable item:", error);
        toast({ title: 'Error', description: 'Could not add consumable item.', variant: 'destructive' });
    }
  }, [user, addActivityLog, toast]);

  const updateConsumableItem = useCallback(async (item: InventoryItem) => {
    if (!user) return;
    const { id, ...data } = item;
    const updates = { ...data, lastUpdated: new Date().toISOString() };
    try {
        await update(ref(rtdb, `inventoryItems/${id}`), updates);
        addActivityLog(user.id, 'Consumable Item Updated', `Updated item: ${item.name}`);
    } catch (error) {
        console.error("Error updating consumable item:", error);
        toast({ title: 'Error', description: 'Could not update consumable item.', variant: 'destructive' });
    }
  }, [user, addActivityLog, toast]);
  
  const deleteConsumableItem = useCallback(async (itemId: string) => {
      if (!user) return;
      const itemToDelete = inventoryItemsById[itemId];
      if (!itemToDelete) return;

      try {
        await remove(ref(rtdb, `inventoryItems/${itemId}`));
        addActivityLog(user.id, 'Consumable Item Deleted', `Deleted item: ${itemToDelete.name}`);
      } catch (error) {
        console.error("Error deleting consumable item:", error);
        toast({ title: 'Error', description: 'Could not delete consumable item.', variant: 'destructive' });
      }
  }, [user, addActivityLog, toast, inventoryItemsById]);
  
  const addMultipleConsumableItems = useCallback(async (itemsData: ImportRow[]): Promise<number> => {
    if (!user) return 0;
    let importedCount = 0;
    const updates: { [key: string]: any } = {};

    const normalize = (str: string) => str.trim().toLowerCase().replace(/\s+/g, ' ');
    const existingNormalizedNames = new Set(consumableItems.map(i => normalize(i.name)));

    itemsData.forEach(row => {
        const name = row.Name?.trim();
        if (!name) return;
        
        const normalizedName = normalize(name);
        if (existingNormalizedNames.has(normalizedName)) return;
        
        const category = row.Category?.trim();
        if (category !== CATEGORY_DAILY && category !== CATEGORY_JOB) return;

        const dataToSave: Partial<InventoryItem> = {
            name,
            quantity: Math.max(0, Number(row.Quantity) || 0),
            unit: row.Unit?.trim() || 'pcs',
            category: category as InventoryCategory,
            remarks: row.Remarks?.trim() || '',
            status: 'In Store',
            projectId: STORE_PROJECT_ID,
            lastUpdated: new Date().toISOString(),
        };
        
        const newRef = push(ref(rtdb, 'inventoryItems'));
        updates[`/inventoryItems/${newRef.key}`] = dataToSave;
        importedCount++;
        existingNormalizedNames.add(normalizedName);
    });

    if(Object.keys(updates).length > 0) {
        try {
            await update(ref(rtdb), updates);
            addActivityLog(user.id, 'Bulk Added Consumables', `Added ${importedCount} new items via Excel.`);
        } catch (error) {
            console.error("Error batch adding consumables:", error);
            toast({ title: 'Error', description: 'Could not add multiple items.', variant: 'destructive' });
        }
    }
    return importedCount;
  }, [user, addActivityLog, consumableItems, toast]);

  const addConsumableInwardRecord = useCallback(async (itemId: string, quantity: number, date: Date) => {
    if (!user || quantity <= 0) return;
    const newRef = push(ref(rtdb, 'consumableInwardHistory'));
    const record: Omit<ConsumableInwardRecord, 'id'> = {
        itemId,
        quantity,
        date: date.toISOString(),
        addedByUserId: user.id,
    };

    try {
        await set(newRef, record);
        const itemRef = ref(rtdb, `inventoryItems/${itemId}/quantity`);
        await runTransaction(itemRef, (currentQuantity) => (Number(currentQuantity) || 0) + quantity);
        const itemName = inventoryItemsById[itemId]?.name || `Unknown Item (${itemId})`;
        addActivityLog(user.id, 'Logged Inward Stock', `${quantity} units of ${itemName}`);
    } catch (error) {
        console.error("Error adding inward record:", error);
        toast({ title: 'Error', description: 'Could not log inward stock.', variant: 'destructive' });
    }
  }, [user, toast, addActivityLog, inventoryItemsById]);

  const updateConsumableInwardRecord = useCallback(async (record: ConsumableInwardRecord) => {
    if (!user) return;
    const { id, ...data } = record;
    if (data.quantity < 0) {
        toast({ title: 'Invalid Quantity', description: 'Quantity cannot be negative.', variant: 'destructive'});
        return;
    }

    const originalRecord = consumableInwardHistory.find(r => r.id === id);
    if (!originalRecord) return;

    const quantityDifference = data.quantity - originalRecord.quantity;

    try {
        await update(ref(rtdb, `consumableInwardHistory/${id}`), data);
        const itemRef = ref(rtdb, `inventoryItems/${record.itemId}/quantity`);
        await runTransaction(itemRef, (currentQuantity) => {
            return Math.max(0, (Number(currentQuantity) || 0) + quantityDifference);
        });
        const itemName = inventoryItemsById[record.itemId]?.name || `Unknown Item (${record.itemId})`;
        addActivityLog(user.id, 'Updated Inward Stock', `Adjusted quantity for ${itemName}`);
    } catch (error) {
        console.error("Error updating inward record:", error);
        toast({ title: 'Error', description: 'Could not update inward record.', variant: 'destructive' });
    }
  }, [user, consumableInwardHistory, toast, addActivityLog, inventoryItemsById]);

  const deleteConsumableInwardRecord = useCallback(async (record: ConsumableInwardRecord) => {
    if (!user) return;
    try {
        await remove(ref(rtdb, `consumableInwardHistory/${record.id}`));
        const itemRef = ref(rtdb, `inventoryItems/${record.itemId}/quantity`);
        await runTransaction(itemRef, (currentQuantity) => {
            return Math.max(0, (Number(currentQuantity) || 0) - record.quantity);
        });
        const itemName = inventoryItemsById[record.itemId]?.name || `Unknown Item (${record.itemId})`;
        addActivityLog(user.id, 'Deleted Inward Stock Record', `Removed a record of ${record.quantity} for ${itemName}`);
    } catch (error) {
        console.error("Error deleting inward record:", error);
        toast({ title: 'Error', description: 'Could not delete inward record.', variant: 'destructive' });
    }
  }, [user, toast, addActivityLog, inventoryItemsById]);

  const contextValue: ConsumableContextType = {
    consumableItems,
    consumableInwardHistory,
    loadingConsumables,
    addConsumableItem,
    updateConsumableItem,
    deleteConsumableItem,
    addMultipleConsumableItems,
    addConsumableInwardRecord,
    updateConsumableInwardRecord,
    deleteConsumableInwardRecord,
  };

  return (
    <ConsumableContext.Provider value={contextValue}>
      {children}
    </ConsumableContext.Provider>
  );
}

export const useConsumable = (): ConsumableContextType => {
  const context = useContext(ConsumableContext);
  if (context === undefined) {
    throw new Error('useConsumable must be used within a ConsumableProvider');
  }
  return context;
};
