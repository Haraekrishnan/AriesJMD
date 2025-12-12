
'use client';
import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback } from 'react';
import { InventoryItem } from '@/lib/types';
import { rtdb } from '@/lib/rtdb';
import { ref, onValue, update, push, set, remove } from 'firebase/database';
import { useAuth } from './auth-provider';

type ConsumableContextType = {
  consumableItems: InventoryItem[];
  addConsumableItem: (itemData: Omit<InventoryItem, 'id' | 'lastUpdated' | 'status' | 'projectId'>) => void;
  updateConsumableItem: (item: InventoryItem) => void;
  deleteConsumableItem: (itemId: string) => void;
};

const ConsumableContext = createContext<ConsumableContextType | undefined>(undefined);

export function ConsumableProvider({ children }: { children: ReactNode }) {
  const { user, addActivityLog } = useAuth();
  const [inventoryItemsById, setInventoryItemsById] = useState<Record<string, InventoryItem>>({});

  useEffect(() => {
    const dbRef = ref(rtdb, 'inventoryItems');
    const unsubscribe = onValue(dbRef, (snapshot) => {
      const data = snapshot.val() || {};
      const processedData = Object.keys(data).reduce((acc, key) => {
        acc[key] = { ...data[key], id: key };
        return acc;
      }, {} as Record<string, InventoryItem>);
      setInventoryItemsById(processedData);
    });
    return () => unsubscribe();
  }, []);

  const consumableItems = useMemo(() => {
    return Object.values(inventoryItemsById).filter(
      item => item.category === 'Daily Consumable' || item.category === 'Job Consumable'
    );
  }, [inventoryItemsById]);

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


  const contextValue: ConsumableContextType = {
    consumableItems,
    addConsumableItem,
    updateConsumableItem,
    deleteConsumableItem,
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
