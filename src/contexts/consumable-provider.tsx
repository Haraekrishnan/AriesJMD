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
  addMultipleConsumableItems: (itemsData: ImportRow[]) => number;
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

// --- HELPER FUNCTIONS ---
const createDataListener = <T extends {}>(
    path: string,
    setData: React.Dispatch<React.SetStateAction<Record<string, T>>>,
) => {
    const dbRef = ref(rtdb, path);
    const unsubscribe = onValue(dbRef, (snapshot) => {
        const data = snapshot.val() || {};
        const processedData = Object.keys(data).reduce((acc, key) => {
            acc[key] = { ...data[key], id: key };
            return acc;
        }, {} as Record<string, T>);
        setData(processedData);
    });
    return unsubscribe;
};

const ConsumableContext = createContext<ConsumableContextType | undefined>(undefined);

export function ConsumableProvider({ children }: { children: ReactNode }) {
  const { user, addActivityLog } = useAuth();
  const { toast } = useToast();
  const [loadingConsumables, setLoadingConsumables] = useState(true);
  const [inventoryItemsById, setInventoryItemsById] = useState<Record<string, InventoryItem>>({});
  const [consumableInwardHistoryById, setConsumableInwardHistoryById] = useState<Record<string, ConsumableInwardRecord>>({});

  useEffect(() => {
    const unsubInventory = createDataListener('inventoryItems', setInventoryItemsById);
    const unsubHistory = createDataListener('consumableInwardHistory', setConsumableInwardHistoryById);
    
    const initialLoadListener = onValue(ref(rtdb, 'inventoryItems'), () => {
        setLoadingConsumables(false);
    }, { onlyOnce: true });

    return () => {
      unsubInventory();
      unsubHistory();
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
    const { id, ...data } = item;
    const updates = { ...data, lastUpdated: new Date().toISOString() };
    try {
        await update(ref(rtdb, `inventoryItems/${id}`), updates);
    } catch (error) {
        console.error("Error updating consumable item:", error);
        toast({ title: 'Error', description: 'Could not update consumable item.', variant: 'destructive' });
    }
  }, [toast]);
  
  const deleteConsumableItem = useCallback(async (itemId: string) => {
      try {
        await remove(ref(rtdb, `inventoryItems/${itemId}`));
      } catch (error) {
        console.error("Error deleting consumable item:", error);
        toast({ title: 'Error', description: 'Could not delete consumable item.', variant: 'destructive' });
      }
  }, [toast]);
  
  const addMultipleConsumableItems = useCallback((itemsData: ImportRow[]): number => {
    let importedCount = 0;
    const updates: { [key: string]: any } = {};

    itemsData.forEach(row => {
        const name = row.Name?.trim();
        if (!name) return;

        const existingItem = consumableItems.find(i => i.name.toLowerCase() === name.toLowerCase());
        if (existingItem) return;
        
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
    });

    if(Object.keys(updates).length > 0) {
        update(ref(rtdb), updates).catch(error => {
            console.error("Error batch adding consumables:", error);
            toast({ title: 'Error', description: 'Could not add multiple items.', variant: 'destructive' });
        });
    }
    return importedCount;
  }, [consumableItems, toast]);

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
        await runTransaction(itemRef, (currentQuantity) => (currentQuantity || 0) + quantity);
    } catch (error) {
        console.error("Error adding inward record:", error);
        toast({ title: 'Error', description: 'Could not log inward stock.', variant: 'destructive' });
    }
  }, [user, toast]);

  const updateConsumableInwardRecord = useCallback(async (record: ConsumableInwardRecord) => {
    const { id, ...data } = record;
    const originalRecord = consumableInwardHistory.find(r => r.id === id);
    if (!originalRecord) return;

    const quantityDifference = data.quantity - originalRecord.quantity;

    try {
        await update(ref(rtdb, `consumableInwardHistory/${id}`), data);
        const itemRef = ref(rtdb, `inventoryItems/${record.itemId}/quantity`);
        await runTransaction(itemRef, (currentQuantity) => {
            return Math.max(0, (currentQuantity || 0) + quantityDifference);
        });
    } catch (error) {
        console.error("Error updating inward record:", error);
        toast({ title: 'Error', description: 'Could not update inward record.', variant: 'destructive' });
    }
  }, [consumableInwardHistory, toast]);

  const deleteConsumableInwardRecord = useCallback(async (record: ConsumableInwardRecord) => {
    try {
        await remove(ref(rtdb, `consumableInwardHistory/${record.id}`));
        const itemRef = ref(rtdb, `inventoryItems/${record.itemId}/quantity`);
        await runTransaction(itemRef, (currentQuantity) => {
            return Math.max(0, (currentQuantity || 0) - record.quantity);
        });
    } catch (error) {
        console.error("Error deleting inward record:", error);
        toast({ title: 'Error', description: 'Could not delete inward record.', variant: 'destructive' });
    }
  }, [toast]);

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
