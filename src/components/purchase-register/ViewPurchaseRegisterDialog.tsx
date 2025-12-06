
'use client';

import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { PurchaseRegister } from '@/lib/types';
import { useAppContext } from '@/contexts/app-provider';
import { format } from 'date-fns';

interface ViewPurchaseRegisterDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  purchaseRegister?: PurchaseRegister;
}

export default function ViewPurchaseRegisterDialog({ isOpen, setIsOpen, purchaseRegister }: ViewPurchaseRegisterDialogProps) {
  const { vendors } = useAppContext();
  
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

  if (!purchaseRegister) return null;
  
  const vendor = vendors.find(v => v.id === purchaseRegister.vendorId);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Purchase Details</DialogTitle>
          <DialogDescription>
            Showing items from Purchase Register #{purchaseRegister.id.slice(-6)} for {vendor?.name} on {format(new Date(purchaseRegister.date), 'dd MMM, yyyy')}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Item Name</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Unit Rate</TableHead>
                        <TableHead className="text-right">Tax %</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {purchaseRegister.items.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.unitRate)}</TableCell>
                            <TableCell className="text-right">{item.tax}%</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency((item.quantity * item.unitRate) * (1 + item.tax / 100))}</TableCell>
                        </TableRow>
                    ))}
                     <TableRow className="font-bold bg-muted">
                        <TableCell colSpan={4} className="text-right">Grand Total</TableCell>
                        <TableCell className="text-right">{formatCurrency(purchaseRegister.grandTotal)}</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
        <DialogFooter>
          <Button onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
