

'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback, Dispatch, SetStateAction } from 'react';
import { Vendor, Payment, PaymentStatus, PurchaseRegister, Comment, Quotation, InwardOutwardRecord, Permission, QuotationStatus } from '@/lib/types';
import { rtdb } from '@/lib/rtdb';
import { ref, onValue, set, push, remove, update } from 'firebase/database';
import { useAuth } from './auth-provider';
import { useToast } from '@/hooks/use-toast';

// --- TYPE DEFINITIONS ---

type PermissionsObject = Record<Permission, boolean>;

type PurchaseContextType = {
  vendors: Vendor[];
  payments: Payment[];
  purchaseRegisters: PurchaseRegister[];
  pendingPaymentApprovalCount: number;
  quotations: Quotation[];
  can: PermissionsObject;

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

  addQuotation: (quotationData: Omit<Quotation, 'id' | 'creatorId' | 'createdAt' | 'status'>) => void;
  updateQuotation: (quotation: Quotation) => void;
  deleteQuotation: (quotationId: string) => void;
  setQuotationLock: (quotationId: string, locked: boolean) => void;
  receiveQuoteItem: (quotationId: string, vendorId: string, itemId: string, quantity: number) => void;
};

// --- HELPER FUNCTIONS ---

const createDataListener = <T extends {}>(
    path: string,
    setData: Dispatch<SetStateAction<Record<string, T>>>,
) => {
    const dbRef = ref(rtdb, path);
    const listener = onValue(dbRef, (snapshot) => {
        const data = snapshot.val() || {};
        const processedData = Object.keys(data).reduce((acc, key) => {
            acc[key] = { ...data[key], id: key };
            return acc;
        }, {} as Record<string, T>);
        setData(currentData => {
            if (JSON.stringify(currentData) === JSON.stringify(processedData)) {
                return currentData;
            }
            return processedData;
        });
    });
    return () => listener();
};

const PurchaseContext = createContext<PurchaseContextType | undefined>(undefined);

export function PurchaseProvider({ children }: { children: ReactNode }) {
    const { user, addActivityLog, can } = useAuth();
    const { toast } = useToast();

    const [vendorsById, setVendorsById] = useState<Record<string, Vendor>>({});
    const [paymentsById, setPaymentsById] = useState<Record<string, Payment>>({});
    const [purchaseRegistersById, setPurchaseRegistersById] = useState<Record<string, PurchaseRegister>>({});
    const [quotationsById, setQuotationsById] = useState<Record<string, Quotation>>({});

    const vendors = useMemo(() => Object.values(vendorsById), [vendorsById]);
    const payments = useMemo(() => Object.values(paymentsById), [paymentsById]);
    const purchaseRegisters = useMemo(() => Object.values(purchaseRegistersById), [purchaseRegistersById]);
    const quotations = useMemo(() => Object.values(quotationsById), [quotationsById]);
    
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

    // Quotation Functions
    const addQuotation = useCallback((quotationData: Omit<Quotation, 'id' | 'creatorId' | 'createdAt' | 'status'>) => {
        if (!user) return;
        const newRef = push(ref(rtdb, 'quotations'));
        const newQuotation: Omit<Quotation, 'id'> = {
            ...quotationData,
            creatorId: user.id,
            createdAt: new Date().toISOString(),
            status: 'Pending',
        };
        set(newRef, newQuotation);
    }, [user]);

    const updateQuotation = useCallback((quotation: Quotation) => {
        const { id, ...data } = quotation;
        const oldQuotation = quotationsById[id];
        
        const updateData: Partial<Quotation> = { ...data };
    
        const lockingStatuses: QuotationStatus[] = ['Approved', 'PO Sent', 'Partially Received', 'Completed'];
        if (lockingStatuses.includes(data.status) && oldQuotation?.status !== data.status) {
            if (!oldQuotation?.isLocked) {
                 updateData.isLocked = true;
            }
        }
        
        update(ref(rtdb, `quotations/${id}`), updateData);
    }, [quotationsById]);

    const deleteQuotation = useCallback((quotationId: string) => {
        if (!user || user.role !== 'Admin') {
            toast({ title: "Permission Denied", variant: "destructive" });
            return;
        }
        remove(ref(rtdb, `quotations/${quotationId}`));
        toast({ title: "Price Comparison Deleted", variant: "destructive" });
        if(user) addActivityLog(user.id, 'Price Comparison Deleted', `ID: ${quotationId}`);
    }, [user, toast, addActivityLog]);
    
    const setQuotationLock = useCallback((quotationId: string, locked: boolean) => {
        if (user?.role !== 'Admin') {
            toast({ title: "Permission Denied", description: "Only admins can lock or unlock price comparisons.", variant: "destructive" });
            return;
        }
        update(ref(rtdb, `quotations/${quotationId}`), { isLocked: locked });
        toast({ title: `Price Comparison ${locked ? 'Locked' : 'Unlocked'}` });
    }, [user, toast]);

    const receiveQuoteItem = useCallback((quotationId: string, vendorId: string, itemId: string, quantity: number) => {
        if (!user) return;
        const quotation = quotations.find(q => q.id === quotationId);
        if (!quotation) return;

        const vendor = quotation.vendors.find(v => v.vendorId === vendorId);
        const item = quotation.items.find(i => i.itemId === itemId);
        if (!vendor || !item) return;

        const updates: { [key: string]: any } = {};
        
        // 1. Create Inward Record
        const newInwardRef = push(ref(rtdb, 'inwardOutwardRecords'));
        const inwardRecord: Omit<InwardOutwardRecord, 'id'> = {
            itemId,
            itemType: item.itemType,
            itemName: item.description,
            type: 'Inward',
            quantity,
            date: new Date().toISOString(),
            source: `From Quotation - ${quotation.title}`,
            userId: user.id,
            status: 'Pending Details',
            quotationId,
            vendorId,
        };
        updates[`/inwardOutwardRecords/${newInwardRef.key}`] = inwardRecord;

        // 2. Update Quotation received quantity
        const vendorIndex = quotation.vendors.findIndex(v => v.id === vendor.id);
        const quoteIndex = vendor.quotes.findIndex(q => q.itemId === itemId);
        if(vendorIndex > -1 && quoteIndex > -1) {
            const currentReceived = vendor.quotes[quoteIndex].receivedQuantity || 0;
            const newReceived = currentReceived + quantity;
            updates[`/quotations/${quotationId}/vendors/${vendorIndex}/quotes/${quoteIndex}/receivedQuantity`] = newReceived;

            // 3. Update Quotation status
            const allItemsReceived = quotation.vendors[vendorIndex].quotes.every(q => {
                const received = q.itemId === itemId ? newReceived : (q.receivedQuantity || 0);
                return received >= q.quantity;
            });

            if (allItemsReceived) {
                updates[`/quotations/${quotationId}/status`] = 'Completed';
            } else {
                updates[`/quotations/${quotationId}/status`] = 'Partially Received';
            }
        }
        
        update(ref(rtdb), updates);

    }, [user, quotations]);


    useEffect(() => {
        const unsubscribers = [
            createDataListener('vendors', setVendorsById),
            createDataListener('payments', setPaymentsById),
            createDataListener('purchaseRegisters', setPurchaseRegistersById),
            createDataListener('quotations', setQuotationsById),
        ];
        return () => unsubscribers.forEach(unsubscribe => unsubscribe());
    }, []);
    
    const contextValue: PurchaseContextType = {
        vendors, payments, purchaseRegisters, pendingPaymentApprovalCount, quotations, can,
        addVendor, updateVendor, deleteVendor,
        addPayment, updatePayment, deletePayment,
        addPurchaseRegister, updatePurchaseRegister, deletePurchaseRegister, updatePurchaseRegisterPoNumber,
        addQuotation, updateQuotation, deleteQuotation,
        setQuotationLock,
        receiveQuoteItem,
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
