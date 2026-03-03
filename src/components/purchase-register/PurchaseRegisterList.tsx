'use client';

import React, { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Save, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Role, PurchaseRegister } from '@/lib/types';
import ViewPurchaseRegisterDialog from './ViewPurchaseRegisterDialog';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '../ui/alert-dialog';
import EditPurchaseLedgerDialog from '../vendor-management/EditPurchaseLedgerDialog';


interface PurchaseRegisterListProps {
    registers: PurchaseRegister[];
}

export default function PurchaseRegisterList({ registers }: PurchaseRegisterListProps) {
    const { user, vendors, updatePurchaseRegisterPoNumber, deletePurchaseRegister } = useAppContext();
    const [poNumbers, setPoNumbers] = useState<Record<string, string>>({});
    const [viewingPurchase, setViewingPurchase] = useState<PurchaseRegister | null>(null);
    const [editingPurchase, setEditingPurchase] = useState<PurchaseRegister | null>(null);
    const { toast } = useToast();

    const canEditRegister = useMemo(() => {
        if (!user) return false;
        return ['Admin', 'Project Coordinator'].includes(user.role);
    }, [user]);

    const handlePoChange = (id: string, value: string) => {
        setPoNumbers(prev => ({ ...prev, [id]: value }));
    };

    const handleSavePo = (id: string) => {
        const poNumber = poNumbers[id];
        if (typeof poNumber === 'string') {
            updatePurchaseRegisterPoNumber(id, poNumber);
            toast({ title: 'PO Number Saved', description: 'The PO number has been updated.' });
        }
    };
    
    const handleDelete = (id: string) => {
        deletePurchaseRegister(id);
        toast({ title: 'Purchase Register Deleted', variant: 'destructive' });
    }

    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

    if (registers.length === 0) {
        return <p className="text-center text-muted-foreground py-8">No purchase history found for the selected filters.</p>;
    }

    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>PO Number</TableHead>
                        <TableHead>Details</TableHead>
                        {canEditRegister && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {registers.map(pr => {
                        const vendor = vendors.find(v => v.id === pr.vendorId);
                        const poExists = !!pr.poNumber;
                        const canEditThisPo = user?.role === 'Admin' || (user?.role === 'Project Coordinator' && !poExists);

                        return (
                            <TableRow key={pr.id}>
                                <TableCell>{format(parseISO(pr.date), 'dd MMM, yyyy')}</TableCell>
                                <TableCell>{vendor?.name || 'N/A'}</TableCell>
                                <TableCell>{formatCurrency(pr.grandTotal)}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Input 
                                            defaultValue={pr.poNumber || ''}
                                            onChange={(e) => handlePoChange(pr.id, e.target.value)}
                                            disabled={!canEditThisPo}
                                            className="h-8"
                                        />
                                        {canEditThisPo && (
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSavePo(pr.id)}>
                                                <Save className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Button variant="link" onClick={() => setViewingPurchase(pr)}>View Items</Button>
                                </TableCell>
                                {canEditRegister && (
                                  <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => setEditingPurchase(pr)}>
                                        <Edit className="h-4 w-4"/>
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                             <Button variant="ghost" size="icon" className="text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>This will permanently delete this purchase record and its associated payment ledger.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(pr.id)}>Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                  </TableCell>
                                )}
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
            {viewingPurchase && (
                <ViewPurchaseRegisterDialog
                    isOpen={!!viewingPurchase}
                    setIsOpen={() => setViewingPurchase(null)}
                    purchaseRegister={viewingPurchase}
                />
            )}
             {editingPurchase && (
                <EditPurchaseLedgerDialog
                    isOpen={!!editingPurchase}
                    setIsOpen={() => setEditingPurchase(null)}
                    purchaseRegister={editingPurchase}
                />
            )}
        </>
    );
}
