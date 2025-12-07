
'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback, Dispatch, SetStateAction } from 'react';
import { Vendor, Payment, PaymentStatus, PurchaseRegister, Comment } from '@/lib/types';
import { rtdb } from '@/lib/rtdb';
import { ref, onValue, set, push, remove, update } from 'firebase/database';
import { useAuth } from './auth-provider';
import { useToast } from '@/hooks/use-toast';

// --- TYPE DEFINITIONS ---

type PurchaseContextType = {
  vendors: Vendor[];
  payments: Payment[];
  purchaseRegisters: PurchaseRegister[];
  pendingPaymentApprovalCount: number;

  addVendor: (vendorData: Omit<Vendor, 'id'>) => void;
  updateVendor: (vendor: Vendor) => void;
  deleteVendor: (vendorId: string) => void;

  addPayment: (paymentData: Omit<Payment, 'id' | 'status' | 'requesterId' | 'date'>) => void;
  updatePayment: (paymentId: string, data: Partial<Payment>) => void;
  deletePayment: (paymentId: string) => void;

  addPurchaseRegister: (purchaseData: Omit<PurchaseRegister, 'id' | 'creatorId' | 'date'>) => void;
  updatePurchaseRegister: (purchase: PurchaseRegister) => void;
  deletePurchaseRegister: (id: string) => void;
  updatePurchaseRegisterPoNumber: (id: string, poNumber: string) => void;
};

// --- HELPER FUNCTIONS ---

const createDataListener = <T extends {}>(
    path: string,
    setData: Dispatch<SetStateAction<Record<string, T>>>,
) => {
    const dbRef = ref(rtdb, path);
    const listeners = [
        onValue(dbRef, (snapshot) => {
            const data = snapshot.val() || {};
            const processedData = Object.keys(data).reduce((acc, key) => {
                acc[key] = { ...data[key], id: key };
                return acc;
            }, {} as Record<string, T>);
            setData(processedData);
        })
    ];
    return () => listeners.forEach(listener => listener());
};

const PurchaseContext = createContext<PurchaseContextType | undefined>(undefined);

export function PurchaseProvider({ children }: { children: ReactNode }) {
    const { user, addActivityLog } = useAuth();
    const { toast } = useToast();

    const [vendorsById, setVendorsById] = useState<Record<string, Vendor>>({});
    const [paymentsById, setPaymentsById] = useState<Record<string, Payment>>({});
    const [purchaseRegistersById, setPurchaseRegistersById] = useState<Record<string, PurchaseRegister>>({});

    const vendors = useMemo(() => Object.values(vendorsById), [vendorsById]);
    const payments = useMemo(() => Object.values(paymentsById), [paymentsById]);
    const purchaseRegisters = useMemo(() => Object.values(purchaseRegistersById), [purchaseRegistersById]);
    
    const pendingPaymentApprovalCount = useMemo(() => {
        if (!user || (user.role !== 'Admin' && user.role !== 'Manager')) return 0;
        return payments.filter(p => p.status === 'Pending').length;
    }, [payments, user]);

    // Vendor Functions
    const addVendor = useCallback((vendorData: Omit<Vendor, 'id'>) => {
        const newRef = push(ref(rtdb, 'vendors'));
        set(newRef, vendorData);
    }, []);

    const updateVendor = useCallback((vendor: Vendor) => {
        const { id, ...data } = vendor;
        update(ref(rtdb, `vendors/${id}`), data);
    }, []);

    const deleteVendor = useCallback((vendorId: string) => {
        remove(ref(rtdb, `vendors/${vendorId}`));
    }, []);
    
    // Payment Functions
    const addPayment = useCallback((paymentData: Omit<Payment, 'id' | 'status' | 'requesterId' | 'date'>) => {
        if (!user) return;
        const newRef = push(ref(rtdb, 'payments'));
        const newPayment = {
            ...paymentData,
            status: 'Pending' as PaymentStatus,
            requesterId: user.id,
            date: new Date().toISOString(),
        };
        set(newRef, newPayment);
    }, [user]);

    const updatePayment = useCallback((paymentId: string, data: Partial<Payment>) => {
        const updateData = { ...data };
        // Prevent critical fields from being overwritten
        delete (updateData as Partial<Payment>).requesterId;
        delete (updateData as Partial<Payment>).date;
    
        update(ref(rtdb, `payments/${paymentId}`), updateData);
    }, []);

    const deletePayment = useCallback((paymentId: string) => {
        remove(ref(rtdb, `payments/${paymentId}`));
    }, []);

    // Purchase Register Functions
    const addPurchaseRegister = useCallback((purchaseData: Omit<PurchaseRegister, 'id' | 'creatorId' | 'date'>) => {
        if (!user) return;
        const newPurchaseRef = push(ref(rtdb, 'purchaseRegisters'));
        
        const newPurchase = {
            ...purchaseData,
            creatorId: user.id,
            date: new Date().toISOString(),
        };

        set(newPurchaseRef, newPurchase).then(() => {
            const paymentData = {
                vendorId: purchaseData.vendorId,
                amount: purchaseData.grandTotal,
                remarks: `From Purchase Register #${newPurchaseRef.key?.slice(-6)}`,
                purchaseRegisterId: newPurchaseRef.key!
            };
            addPayment(paymentData);
        });
    }, [user, addPayment]);

    const updatePurchaseRegister = useCallback((purchase: PurchaseRegister) => {
        const { id, ...data } = purchase;
        update(ref(rtdb, `purchaseRegisters/${id}`), data);
        
        // If there's an associated payment, update its amount
        const associatedPayment = payments.find(p => p.purchaseRegisterId === id);
        if (associatedPayment) {
            update(ref(rtdb, `payments/${associatedPayment.id}`), { amount: data.grandTotal });
        }
    }, [payments]);

    const deletePurchaseRegister = useCallback((id: string) => {
        // Also delete the associated payment
        const associatedPayment = payments.find(p => p.purchaseRegisterId === id);
        if(associatedPayment) {
            remove(ref(rtdb, `payments/${associatedPayment.id}`));
            if(user) addActivityLog(user.id, "Payment Record Deleted", `Deleted payment record linked to purchase ${id}`);
        }
        remove(ref(rtdb, `purchaseRegisters/${id}`));
    }, [payments, user, addActivityLog]);
    
    const updatePurchaseRegisterPoNumber = useCallback((id: string, poNumber: string) => {
        update(ref(rtdb, `purchaseRegisters/${id}`), { poNumber });
    }, []);

    useEffect(() => {
        const unsubscribers = [
            createDataListener('vendors', setVendorsById),
            createDataListener('payments', setPaymentsById),
            createDataListener('purchaseRegisters', setPurchaseRegistersById),
        ];
        return () => unsubscribers.forEach(unsubscribe => unsubscribe());
    }, []);
    
    const contextValue: PurchaseContextType = {
        vendors, payments, purchaseRegisters, pendingPaymentApprovalCount,
        addVendor, updateVendor, deleteVendor,
        addPayment, updatePayment, deletePayment,
        addPurchaseRegister, updatePurchaseRegister, deletePurchaseRegister, updatePurchaseRegisterPoNumber,
    };

    return <PurchaseContext.Provider value={contextValue}>{children}</PurchaseContext.Provider>;
}

export const usePurchase = (): PurchaseContextType => {
  const context = useContext(PurchaseContext);
  if (context === undefined) {
    throw new Error('usePurchase must be used within a PurchaseProvider');
  }
  return context;
};
