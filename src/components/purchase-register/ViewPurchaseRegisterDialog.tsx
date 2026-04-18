'use client';

import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { PurchaseRegister } from '@/lib/types';
import { usePurchase } from '@/contexts/purchase-provider';
import { format, parseISO } from 'date-fns';
import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';

interface ViewPurchaseRegisterDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  purchaseRegister?: PurchaseRegister;
}

export default function ViewPurchaseRegisterDialog({ isOpen, setIsOpen, purchaseRegister }: ViewPurchaseRegisterDialogProps) {
  const { vendors } = usePurchase();
  
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

  const groupedItems = useMemo(() => {
    if (!purchaseRegister?.items) return [];
    const map = new Map<string, { items: PurchaseRegister['items'], totalQuantity: number, totalAmount: number }>();
    purchaseRegister.items.forEach(item => {
        const key = item.name;
        if (!map.has(key)) {
            map.set(key, { items: [], totalQuantity: 0, totalAmount: 0 });
        }
        const group = map.get(key)!;
        group.items.push(item);
        group.totalQuantity += item.quantity;
        group.totalAmount += (item.quantity * item.unitRate) * (1 + item.tax / 100);
    });
    return Array.from(map.values());
  }, [purchaseRegister]);

  const totalQuantity = useMemo(() => {
    return purchaseRegister?.items.reduce((acc, item) => acc + item.quantity, 0) || 0;
  }, [purchaseRegister?.items]);

  if (!purchaseRegister) return null;
  
  const vendor = vendors.find(v => v.id === purchaseRegister.vendorId);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Purchase Details</DialogTitle>
          <DialogDescription>
            Showing items from Purchase Register #{purchaseRegister.id.slice(-6)} for {vendor?.name} on {purchaseRegister.date ? format(parseISO(purchaseRegister.date), 'dd MMM, yyyy') : ''}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
            {groupedItems.map((group, index) => (
                <Card key={index}>
                    <CardHeader className="p-4 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">{group.items[0].name}</CardTitle>
                            <CardDescription>Total Quantity: {group.totalQuantity} nos</CardDescription>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-bold">{formatCurrency(group.totalAmount)}</p>
                            <p className="text-xs text-muted-foreground">Subtotal for this item</p>
                        </div>
                    </CardHeader>
                    {group.items.length > 1 && (
                        <Accordion type="single" collapsible>
                            <AccordionItem value="item-1" className="border-t">
                                <AccordionTrigger className="px-4 text-sm">Show individual entries</AccordionTrigger>
                                <AccordionContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Quantity</TableHead>
                                                <TableHead>Unit Rate</TableHead>
                                                <TableHead>Tax %</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {group.items.map((item, i) => (
                                                <TableRow key={`${item.id}-${i}`}>
                                                    <TableCell>{item.quantity}</TableCell>
                                                    <TableCell>{formatCurrency(item.unitRate)}</TableCell>
                                                    <TableCell>{item.tax}%</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    )}
                </Card>
            ))}
            <div className="flex justify-end pt-4">
                <div className="w-full max-w-sm space-y-2 text-sm">
                    <div className="flex justify-between"><span>Total Items Quantity:</span><span className="font-bold">{totalQuantity}</span></div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Grand Total:</span><span>{formatCurrency(purchaseRegister.grandTotal)}</span></div>
                </div>
            </div>
        </div>
        <DialogFooter>
          <Button onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
