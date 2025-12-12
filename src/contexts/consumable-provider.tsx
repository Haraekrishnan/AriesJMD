
'use client';
import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback } from 'react';
import { InventoryItem, ConsumableInwardRecord } from '@/lib/types';
import { rtdb } from '@/lib/rtdb';
import { ref, onValue, update, push, set, remove, get } from 'firebase/database';
import { useAuth } from './auth-provider';

type ConsumableContextType = {
  consumableItems: InventoryItem[];
  consumableInwardHistory: ConsumableInwardRecord[];
  addConsumableItem: (itemData: Omit<InventoryItem, 'id' | 'lastUpdated' | 'status' | 'projectId'>) => void;
  updateConsumableItem: (item: InventoryItem) => void;
  deleteConsumableItem: (itemId: string) => void;
  addConsumableInwardRecord: (itemId: string, quantity: number, date: Date) => void;
  updateConsumableInwardRecord: (record: ConsumableInwardRecord) => void;
  deleteConsumableInwardRecord: (record: ConsumableInwardRecord) => void;
};

const ConsumableContext = createContext<ConsumableContextType | undefined>(undefined);

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

export function ConsumableProvider({ children }: { children: ReactNode }) {
  const { user, addActivityLog } = useAuth();
  const [inventoryItemsById, setInventoryItemsById] = useState<Record<string, InventoryItem>>({});
  const [consumableInwardHistoryById, setConsumableInwardHistoryById] = useState<Record<string, ConsumableInwardRecord>>({});

  useEffect(() => {
    const unsubscribeInventory = createDataListener('inventoryItems', setInventoryItemsById);
    const unsubscribeHistory = createDataListener('consumableInwardHistory', setConsumableInwardHistoryById);
    return () => {
      unsubscribeInventory();
      unsubscribeHistory();
    };
  }, []);

  const consumableItems = useMemo(() => {
    return Object.values(inventoryItemsById).filter(
      item => item.category === 'Daily Consumable' || item.category === 'Job Consumable'
    );
  }, [inventoryItemsById]);
  
  const consumableInwardHistory = useMemo(() => Object.values(consumableInwardHistoryById), [consumableInwardHistoryById]);

  const addConsumableItem = useCallback((itemData: Omit<InventoryItem, 'id' | 'lastUpdated' | 'status' | 'projectId'>) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'inventoryItems'));
    const dataToSave: Partial<InventoryItem> = {
        ...itemData,
        status: 'In Store',
        projectId: 'STORE', // Assign a special project ID for consumables
        lastUpdated: new Date().toISOString(),
    };
    set(newRef, dataToSave);
    addActivityLog(user.id, 'Consumable Item Added', `${itemData.name}`);
  }, [user, addActivityLog]);

  const updateConsumableItem = useCallback((item: InventoryItem) => {
    const { id, ...data } = item;
    const updates = { ...data, lastUpdated: new Date().toISOString() };
    update(ref(rtdb, `inventoryItems/${id}`), updates);
  }, []);
  
  const deleteConsumableItem = useCallback((itemId: string) => {
      remove(ref(rtdb, `inventoryItems/${itemId}`));
  }, []);

  const addConsumableInwardRecord = useCallback((itemId: string, quantity: number, date: Date) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'consumableInwardHistory'));
    const record: Omit<ConsumableInwardRecord, 'id'> = {
        itemId,
        quantity,
        date: date.toISOString(),
        addedByUserId: user.id,
    };
    set(newRef, record);

    const itemRef = ref(rtdb, `inventoryItems/${itemId}/quantity`);
    get(itemRef).then(snapshot => {
        const currentQuantity = snapshot.val() || 0;
        set(itemRef, currentQuantity + quantity);
    });
  }, [user]);

  const updateConsumableInwardRecord = useCallback((record: ConsumableInwardRecord) => {
    const { id, ...data } = record;
    update(ref(rtdb, `consumableInwardHistory/${id}`), data);
  }, []);

  const deleteConsumableInwardRecord = useCallback((record: ConsumableInwardRecord) => {
    remove(ref(rtdb, `consumableInwardHistory/${record.id}`));
    const itemRef = ref(rtdb, `inventoryItems/${record.itemId}/quantity`);
    get(itemRef).then(snapshot => {
        const currentQuantity = snapshot.val() || 0;
        set(itemRef, Math.max(0, currentQuantity - record.quantity));
    });
  }, []);

  const contextValue: ConsumableContextType = {
    consumableItems,
    consumableInwardHistory,
    addConsumableItem,
    updateConsumableItem,
    deleteConsumableItem,
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
