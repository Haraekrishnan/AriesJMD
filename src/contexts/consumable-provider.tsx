'use client';
import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback } from 'react';
import { InventoryItem } from '@/lib/types';
import { rtdb } from '@/lib/rtdb';
import { ref, onValue, update } from 'firebase/database';
import { useAuth } from './auth-provider';

type ConsumableContextType = {
  consumableItems: InventoryItem[];
  updateConsumableStock: (itemId: string, newQuantity: number) => void;
};

const ConsumableContext = createContext<ConsumableContextType | undefined>(undefined);

export function ConsumableProvider({ children }: { children: ReactNode }) {
  const { addActivityLog } = useAuth();
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

  const updateConsumableStock = useCallback((itemId: string, newQuantity: number) => {
    const item = inventoryItemsById[itemId];
    if (item) {
      const updates: { [key: string]: any } = {};
      updates[`/inventoryItems/${itemId}/quantity`] = newQuantity;
      updates[`/inventoryItems/${itemId}/lastUpdated`] = new Date().toISOString();
      update(ref(rtdb), updates);
      addActivityLog(`System`, `Stock Update for ${item.name}`, `Quantity changed to ${newQuantity}.`);
    }
  }, [inventoryItemsById, addActivityLog]);

  const contextValue: ConsumableContextType = {
    consumableItems,
    updateConsumableStock,
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
