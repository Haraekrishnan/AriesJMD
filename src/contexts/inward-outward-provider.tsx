
'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback, useMemo } from 'react';
import { rtdb } from '@/lib/rtdb';
import { ref, onValue, set, push, remove, update } from 'firebase/database';
import { useAuth } from './auth-provider';
import { useGeneral } from './general-provider';
import { useToast } from '@/hooks/use-toast';
import type { InwardOutwardRecord, InventoryItem, User } from '@/lib/types';

type InwardOutwardContextType = {
  inwardOutwardRecords: InwardOutwardRecord[];
  pendingFinalizationCount: number;
  batchCreateAndLogItems: (items: Omit<InventoryItem, 'id' | 'lastUpdated'>[], source: string) => Promise<number>;
  finalizeInwardPurchase: (recordId: string, itemsData: Omit<InventoryItem, 'id' | 'lastUpdated' | 'status' | 'isArchived'>[]) => Promise<void>;
  updateInwardOutwardRecord: (record: InwardOutwardRecord, itemsData: Partial<InventoryItem>[]) => Promise<void>;
  deleteInwardOutwardRecord: (recordId: string) => Promise<void>;
  lockInwardOutwardRecord: (recordId: string) => Promise<void>;
  unlockInwardOutwardRecord: (recordId: string) => Promise<void>;
};

const InwardOutwardContext = createContext<InwardOutwardContextType | undefined>(undefined);

const createDataListener = (
    path: string,
    setData: React.Dispatch<React.SetStateAction<Record<string, any>>>,
) => {
    const dbRef = ref(rtdb, path);
    const listener = onValue(dbRef, (snapshot) => {
        const data = snapshot.val() || {};
        const processedData = Object.keys(data).reduce((acc, key) => {
            acc[key] = { ...data[key], id: key };
            return acc;
        }, {} as Record<string, any>);
        setData(processedData);
    });
    return listener;
};

export function InwardOutwardProvider({ children }: { children: ReactNode }) {
  const { user, addActivityLog, can } = useAuth();
  const { projects } = useGeneral();
  const { toast } = useToast();
  const [inwardOutwardRecordsById, setInwardOutwardRecordsById] = useState<Record<string, InwardOutwardRecord>>({});

  useEffect(() => {
    const listener = createDataListener('inwardOutwardRecords', setInwardOutwardRecordsById);
    return () => listener();
  }, []);
  
  const inwardOutwardRecords = useMemo(() => Object.values(inwardOutwardRecordsById), [inwardOutwardRecordsById]);

  const pendingFinalizationCount = useMemo(() => {
    if (!can.manage_inward_outward) return 0;
    return inwardOutwardRecords.filter(r => r.status === 'Pending Details').length;
  }, [inwardOutwardRecords, can.manage_inward_outward]);

  const batchCreateAndLogItems = useCallback(async (itemsToCreate: Omit<InventoryItem, 'id' | 'lastUpdated'>[], source: string) => {
    if (!user) return 0;
    
    const updates: { [key: string]: any } = {};
    const now = new Date().toISOString();
    const storeProject = projects.find(p => p.name === 'Store');
    let totalQuantity = 0;
    const itemSummary: Record<string, number> = {};

    itemsToCreate.forEach(itemData => {
      const newRef = push(ref(rtdb, 'inventoryItems'));
      const newId = newRef.key!;
      updates[`/inventoryItems/${newId}`] = {
        ...itemData,
        isArchived: false,
        lastUpdated: now,
        status: 'In Store',
        projectId: storeProject?.id || projects[0]?.id,
      };
      totalQuantity += 1;
      itemSummary[itemData.name] = (itemSummary[itemData.name] || 0) + 1;
    });

    if (totalQuantity > 0) {
      const newRecordRef = push(ref(rtdb, 'inwardOutwardRecords'));
      const record: Omit<InwardOutwardRecord, 'id'> = {
        type: 'Inward',
        quantity: totalQuantity,
        date: now,
        source: source,
        userId: user.id,
        status: 'Pending Details',
        itemName: Object.keys(itemSummary).join(', '),
      };
      updates[`/inwardOutwardRecords/${newRecordRef.key}`] = record;
      
      try {
        await update(ref(rtdb), updates);
        addActivityLog(user.id, 'Batch Inward Created', `Logged ${totalQuantity} new items from source: ${source}`);
      } catch(error) {
        console.error(error);
        toast({ title: 'Error', description: 'Failed to create batch inward record.', variant: 'destructive' });
      }
    }
    return totalQuantity;
  }, [user, addActivityLog, projects, toast]);
  
  const finalizeInwardPurchase = useCallback(async (recordId: string, itemsData: Omit<InventoryItem, 'id' | 'lastUpdated' | 'status' | 'isArchived'>[]) => {
    if (!user) return;
    const updates: { [key: string]: any } = {};
    const now = new Date().toISOString();
    const storeProject = projects.find(p => p.name === 'Store');
    const newFinalizedItemIds: string[] = [];

    itemsData.forEach(itemData => {
        const newRef = push(ref(rtdb, 'inventoryItems'));
        const newId = newRef.key!;
        updates[`/inventoryItems/${newId}`] = {
            ...itemData,
            isArchived: false,
            lastUpdated: now,
            status: 'In Store',
            projectId: storeProject?.id || projects[0]?.id,
        };
        newFinalizedItemIds.push(newId);
    });

    updates[`inwardOutwardRecords/${recordId}/status`] = 'Completed';
    updates[`inwardOutwardRecords/${recordId}/finalizedItemIds`] = newFinalizedItemIds;
    updates[`inwardOutwardRecords/${recordId}/quantity`] = itemsData.length;

    try {
        await update(ref(rtdb), updates);
        addActivityLog(user.id, 'Finalized Inward Purchase', `Record ID: ${recordId}`);
        toast({ title: 'Inward Record Finalized', description: `${itemsData.length} items have been created.` });
    } catch(error) {
        console.error(error);
        toast({ title: 'Error', description: 'Failed to finalize inward record.', variant: 'destructive' });
    }
  }, [user, addActivityLog, projects, toast]);
  
  const updateInwardOutwardRecord = useCallback(async (record: InwardOutwardRecord, itemsData: Partial<InventoryItem>[]) => {
    if (!user) return;
    const updates: { [key: string]: any } = {};
    const now = new Date().toISOString();

    const originalRecord = inwardOutwardRecordsById[record.id];
    if (!originalRecord) return;

    // Update inventory items
    itemsData.forEach(itemUpdate => {
        if (itemUpdate.id) {
            const itemPath = `inventoryItems/${itemUpdate.id}`;
            Object.entries(itemUpdate).forEach(([key, value]) => {
                if (key !== 'id') {
                    updates[`${itemPath}/${key}`] = value;
                }
            });
            updates[`${itemPath}/lastUpdated`] = now;
        }
    });

    // Update the inward record itself
    updates[`inwardOutwardRecords/${record.id}`] = { ...originalRecord, ...record };

    try {
        await update(ref(rtdb), updates);
        addActivityLog(user.id, "Updated Inward/Outward Record", `Record ID: ${record.id}`);
        toast({ title: 'Record and Items Updated' });
    } catch (error) {
        console.error(error);
        toast({ title: 'Error', description: 'Failed to update record.', variant: 'destructive' });
    }
  }, [user, addActivityLog, inwardOutwardRecordsById, toast]);

  const deleteInwardOutwardRecord = useCallback(async (recordId: string) => {
    if (!user || user.role !== 'Admin') return;
    try {
        await remove(ref(rtdb, `inwardOutwardRecords/${recordId}`));
        toast({ title: 'Record Deleted', variant: 'destructive' });
        addActivityLog(user.id, 'Inward/Outward Record Deleted', `Record ID: ${recordId}`);
    } catch (error) {
        console.error(error);
        toast({ title: 'Error', description: 'Failed to delete record.', variant: 'destructive' });
    }
  }, [user, toast, addActivityLog]);

  const lockInwardOutwardRecord = useCallback(async (recordId: string) => {
    if (!user || !can.manage_inward_outward) {
        toast({ title: 'Permission Denied', variant: 'destructive' });
        return;
    }
    try {
        await update(ref(rtdb, `inwardOutwardRecords/${recordId}`), { isLocked: true });
        toast({ title: 'Record Locked' });
    } catch (error) {
        console.error(error);
        toast({ title: 'Error', description: 'Failed to lock the record.', variant: 'destructive' });
    }
  }, [user, can.manage_inward_outward, toast]);

  const unlockInwardOutwardRecord = useCallback(async (recordId: string) => {
      if (!user || user.role !== 'Admin') {
          toast({ title: 'Permission Denied', description: 'Only Admins can unlock records.', variant: 'destructive' });
          return;
      }
      try {
          await update(ref(rtdb, `inwardOutwardRecords/${recordId}`), { isLocked: false });
          toast({ title: 'Record Unlocked' });
      } catch (error) {
          console.error(error);
          toast({ title: 'Error', description: 'Failed to unlock the record.', variant: 'destructive' });
      }
  }, [user, toast]);

  const contextValue: InwardOutwardContextType = {
    inwardOutwardRecords,
    pendingFinalizationCount,
    batchCreateAndLogItems,
    finalizeInwardPurchase,
    updateInwardOutwardRecord,
    deleteInwardOutwardRecord,
    lockInwardOutwardRecord,
    unlockInwardOutwardRecord,
  };

  return <InwardOutwardContext.Provider value={contextValue}>{children}</InwardOutwardContext.Provider>;
}

export const useInwardOutward = (): InwardOutwardContextType => {
  const context = useContext(InwardOutwardContext);
  if (context === undefined) {
    throw new Error('useInwardOutward must be used within an InwardOutwardProvider');
  }
  return context;
};
