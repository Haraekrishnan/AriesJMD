'use client';
import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Quotation } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Crown } from 'lucide-react';
import { useAppContext } from '@/contexts/app-provider';
import * as React from 'react';

interface ViewQuotationDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  quotation: Quotation;
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

export default function ViewQuotationDialog({ isOpen, setIsOpen, quotation }: ViewQuotationDialogProps) {
  const { users } = useAppContext();

  const creator = users.find(u => u.id === quotation.creatorId);

  const calculatedTotals = useMemo(() => {
    return quotation.vendors.map(vendor => {
      const subTotal = vendor.quotes.reduce((acc, quote) => acc + (quote.quantity * quote.rate), 0);
      const transport = vendor.transportation || 0;
      const totalBeforeGst = subTotal + transport;
      const gstAmount = totalBeforeGst * (vendor.gstPercent / 100);
      const grandTotal = totalBeforeGst + gstAmount;
      return {
        vendorId: vendor.vendorId,
        subTotal,
        transport,
        totalBeforeGst,
        gstAmount,
        grandTotal,
      };
    });
  }, [quotation]);

  const l1VendorId = useMemo(() => {
    if (calculatedTotals.length === 0) return null;
    const sorted = [...calculatedTotals].sort((a, b) => a.grandTotal - b.grandTotal);
    return sorted[0].grandTotal > 0 ? sorted[0].vendorId : null;
  }, [calculatedTotals]);


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{quotation.title}</DialogTitle>
          <DialogDescription>
            Created by {creator?.name || 'Unknown'} on {format(parseISO(quotation.createdAt), 'PPP')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead colSpan={3} className="p-2"></TableHead>
                {quotation.vendors.map(vendor => (
                  <TableHead key={vendor.id} colSpan={3} className="text-center font-semibold border-x p-2">
                    {vendor.name}
                  </TableHead>
                ))}
              </TableRow>
              <TableRow>
                <TableHead className="w-[40px]">Sl.</TableHead>
                <TableHead className="min-w-[200px]">Description</TableHead>
                <TableHead className="w-[60px]">UOM</TableHead>
                {quotation.vendors.map(vendor => (
                  <React.Fragment key={vendor.id}>
                    <TableHead className="text-center w-[80px] border-l">Qty</TableHead>
                    <TableHead className="text-center w-[100px]">Rate</TableHead>
                    <TableHead className="text-right w-[120px] border-r">Amount</TableHead>
                  </React.Fragment>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotation.items.map((item, itemIndex) => (
                <TableRow key={item.id}>
                  <TableCell>{itemIndex + 1}</TableCell>
                  <TableCell className="font-medium">{item.description}</TableCell>
                  <TableCell>{item.uom}</TableCell>
                  {quotation.vendors.map(vendor => {
                    const quote = vendor.quotes.find(q => q.itemId === item.id);
                    return (
                      <React.Fragment key={vendor.id}>
                        <TableCell className="text-center border-l">{quote?.quantity || 0}</TableCell>
                        <TableCell className="text-center">{formatCurrency(quote?.rate || 0)}</TableCell>
                        <TableCell className="text-right font-semibold border-r">{formatCurrency((quote?.quantity || 0) * (quote?.rate || 0))}</TableCell>
                      </React.Fragment>
                    );
                  })}
                </TableRow>
              ))}
              {/* --- FOOTER ROWS --- */}
              <TableRow className="font-bold bg-muted/50">
                  <TableCell colSpan={3} className="text-right">Sub-Total</TableCell>
                  {calculatedTotals.map((total, i) => <TableCell key={i} colSpan={3} className="text-right border-x">{formatCurrency(total.subTotal)}</TableCell>)}
              </TableRow>
               <TableRow className="font-bold">
                  <TableCell colSpan={3} className="text-right">Transportation</TableCell>
                  {quotation.vendors.map((v, i) => <TableCell key={i} colSpan={3} className="text-right border-x">{v.transportation ? formatCurrency(v.transportation) : '-'}</TableCell>)}
              </TableRow>
               <TableRow className="font-bold bg-muted/50">
                  <TableCell colSpan={3} className="text-right">Total</TableCell>
                  {calculatedTotals.map((total, i) => <TableCell key={i} colSpan={3} className="text-right border-x">{formatCurrency(total.totalBeforeGst)}</TableCell>)}
              </TableRow>
              <TableRow className="font-bold">
                  <TableCell colSpan={3} className="text-right">GST %</TableCell>
                  {quotation.vendors.map((v, i) => <TableCell key={i} colSpan={3} className="text-right border-x">{v.gstPercent}%</TableCell>)}
              </TableRow>
               <TableRow className="font-bold text-base bg-muted/50">
                  <TableCell colSpan={3} className="text-right">Grand Total</TableCell>
                  {calculatedTotals.map((total, i) => (
                    <TableCell key={i} colSpan={3} className={cn("text-right border-x", total.vendorId === l1VendorId && "bg-green-100 dark:bg-green-900/50")}>
                        <div className="flex items-center justify-end gap-2">
                           {total.vendorId === l1VendorId && <Crown className="h-4 w-4 text-green-600" />}
                           {formatCurrency(total.grandTotal)}
                        </div>
                    </TableCell>
                  ))}
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
