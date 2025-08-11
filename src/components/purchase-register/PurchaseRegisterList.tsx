
'use client';

import React, { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Role, PurchaseRegister } from '@/lib/types';
import ViewPurchaseRegisterDialog from './ViewPurchaseRegisterDialog';

interface PurchaseRegisterListProps {
    registers: PurchaseRegister[];
}

export default function PurchaseRegisterList({ registers }: PurchaseRegisterListProps) {
    const { user, vendors, updatePurchaseRegisterPoNumber } = useAppContext();
    const [poNumbers, setPoNumbers] = useState<Record<string, string>>({});
    const [viewingPurchase, setViewingPurchase] = useState<PurchaseRegister | null>(null);
    const { toast } = useToast();

    const canEditPo = (poNumberExists: boolean) => {
        if (!user) return false;
        if (user.role === 'Admin') return true;
        if (poNumberExists) return false;

        const editableRoles: Role[] = ['Project Coordinator', 'Store in Charge', 'Document Controller'];
        return editableRoles.includes(user.role);
    };

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
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {registers.map(pr => {
                        const vendor = vendors.find(v => v.id === pr.vendorId);
                        const poExists = !!pr.poNumber;
                        const canEditThisPo = canEditPo(poExists);

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
        </>
    );
}
