
'use client';
import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Quotation, QuotationItem, QuotationQuote, QuotationVendorDetails, QuotationStatus } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Crown, AlertCircle, ShoppingCart, FilePlus, ThumbsUp } from 'lucide-react';
import { useAppContext } from '@/contexts/app-provider';
import * as React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '../ui/tooltip';

interface ViewQuotationDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  quotation: Quotation;
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

const statusOptions: QuotationStatus[] = ['Pending', 'Approved', 'PO Sent', 'Partially Received', 'Completed', 'Rejected'];

const ReceiveItemDialog = ({
    isOpen,
    setIsOpen,
    item,
    quote,
    onReceive
}: {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    item: QuotationItem;
    quote: QuotationQuote;
    onReceive: (quantity: number) => void;
}) => {
    const [quantity, setQuantity] = useState<number>(0);

    const maxReceivable = (quote.quantity || 0) - (quote.receivedQuantity || 0);

    const handleSubmit = () => {
        if (quantity > maxReceivable) {
            alert("Cannot receive more than the outstanding quantity.");
            return;
        }
        if (quantity > 0) {
            onReceive(quantity);
        }
        setIsOpen(false);
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Receive Item: {item.description}</DialogTitle>
                    <DialogDescription>
                        Quoted Quantity: {quote.quantity}. Already Received: {quote.receivedQuantity || 0}.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="receive-qty">Quantity to Receive</Label>
                    <Input
                        id="receive-qty"
                        type="number"
                        value={quantity}
                        onChange={e => setQuantity(Number(e.target.value))}
                        max={maxReceivable}
                        min="0"
                    />
                     {quantity > maxReceivable && <p className="text-xs text-destructive mt-1">Cannot exceed remaining quantity of {maxReceivable}.</p>}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={quantity <= 0 || quantity > maxReceivable}>Receive</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default function ViewQuotationDialog({ isOpen, setIsOpen, quotation: initialQuotation }: ViewQuotationDialogProps) {
  const { users, updateQuotation, addConsumableInwardRecord, inventoryItems, updateInventoryItem, can, quotations } = useAppContext();
  const { toast } = useToast();
  const [poNumber, setPoNumber] = useState(initialQuotation.poNumber || '');
  const [receivingInfo, setReceivingInfo] = useState<{ item: QuotationItem; vendor: QuotationVendorDetails; quote: QuotationQuote } | null>(null);

  const quotation = useMemo(() => {
    return quotations.find((q: Quotation) => q.id === initialQuotation.id) || initialQuotation;
  }, [quotations, initialQuotation]);

  const creator = users.find(u => u.id === quotation.creatorId);
  const canFinalize = can.manage_purchase_register;

  const calculatedTotals = useMemo(() => {
    return quotation.vendors.map(vendor => {
        let subTotal = 0;
        let totalTax = 0;
        quotation.items.forEach((item, itemIndex) => {
            let quote: QuotationQuote | undefined;
             if (Array.isArray(vendor.quotes)) {
                quote = vendor.quotes.find(q => q.itemId === item.itemId) || vendor.quotes[itemIndex];
            } else if (vendor.quotes) {
                quote = (vendor.quotes as any)[item.itemId] 
                     || Object.values(vendor.quotes)[itemIndex] 
                     || Object.values(vendor.quotes as any).find((q: any) => q.itemId === item.itemId);
            }
            if (quote) {
                const amount = (quote.quantity || 0) * (quote.rate || 0);
                subTotal += amount;
                totalTax += amount * ((quote.taxPercent || 0) / 100);
            }
        });
      const additionalCostsArray = Array.isArray(vendor.additionalCosts) ? Object.values(vendor.additionalCosts || {}) : Object.values(vendor.additionalCosts || {});
      const additionalCostsTotal = additionalCostsArray.reduce((acc, cost) => acc + (cost.value || 0), 0);
      const grandTotal = subTotal + totalTax + additionalCostsTotal;
      return { vendorId: vendor.vendorId, subTotal, totalTax, additionalCosts: additionalCostsArray, grandTotal };
    });
  }, [quotation]);
  
  const l1VendorId = useMemo(() => {
    if (calculatedTotals.length === 0) return null;
    const sorted = [...calculatedTotals].sort((a, b) => a.grandTotal - b.grandTotal);
    return sorted[0].grandTotal > 0 ? sorted[0].vendorId : null;
  }, [calculatedTotals]);
  
 const handleStatusChange = (newStatus: QuotationStatus) => {
    if (!canFinalize) return;

    if (newStatus === 'PO Sent' && !quotation.finalizedVendorId) {
        toast({ title: 'Vendor Not Finalized', description: 'Please approve the quotation and finalize a vendor before marking "PO Sent".', variant: 'destructive'});
        return;
    }
    
    if (quotation.finalizedVendorId && (newStatus === 'Pending' || newStatus === 'Rejected')) {
      toast({ title: 'Action Not Allowed', description: 'Cannot change status backward after a vendor has been finalized.', variant: 'destructive' });
      return;
    }
    
    updateQuotation({ ...quotation, status: newStatus });
    toast({ title: `Status updated to ${newStatus}` });
  };
  
  const handleFinalizeVendor = (vendorId: string) => {
    if (!canFinalize) return;
    if (quotation.status !== 'Approved') {
      toast({
        variant: 'destructive',
        title: 'Approval Required',
        description: 'You must set the status to "Approved" before you can finalize a vendor.',
      });
      return;
    }
    updateQuotation({ ...quotation, finalizedVendorId: vendorId, status: 'PO Sent' });
    toast({
      title: 'Vendor Finalized & PO Sent',
      description: 'The selected vendor has been finalized and the status is updated to "PO Sent".'
    });
  };

  const handlePoSave = () => {
      updateQuotation({ ...quotation, poNumber, status: 'PO Sent' });
      toast({ title: 'PO Number Saved' });
  };
  
  const handleReceiveItem = (quantity: number) => {
    if (!receivingInfo) return;
    const { item, vendor, quote } = receivingInfo;
    const newReceivedQty = (quote.receivedQuantity || 0) + quantity;

    const updatedVendors = quotation.vendors.map(v => 
        v.id === vendor.id ? {
            ...v,
            quotes: v.quotes.map(q => 
                q.itemId === item.itemId ? { ...q, receivedQuantity: newReceivedQty } : q
            )
        } : v
    );

    const finalizedVendor = updatedVendors.find(v => v.vendorId === quotation.finalizedVendorId);
    const allItemsReceived = finalizedVendor?.quotes.every(q => (q.receivedQuantity || 0) >= q.quantity);
    const newStatus = allItemsReceived ? 'Completed' : 'Partially Received';
    
    updateQuotation({ ...quotation, vendors: updatedVendors, status: newStatus });
    
    if (item.itemType === 'Inventory') {
        const inventoryItem = inventoryItems.find(i => i.id === item.itemId);
        if (inventoryItem) {
            if (inventoryItem.category === 'Daily Consumable' || inventoryItem.category === 'Job Consumable') {
                addConsumableInwardRecord(item.itemId, quantity, new Date());
            } else {
                updateInventoryItem({ ...inventoryItem, quantity: (inventoryItem.quantity || 0) + quantity });
            }
        }
    }
    
    toast({ title: `Received ${quantity} of ${item.description}`});
    setReceivingInfo(null);
  };
  
  return (
    <>
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{quotation.title}</DialogTitle>
          <DialogDescription>
            Created by {creator?.name || 'Unknown'} on {format(parseISO(quotation.createdAt), 'PPP')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-4">
                <Label>Status:</Label>
                <Select value={quotation.status} onValueChange={(val) => handleStatusChange(val as QuotationStatus)} disabled={!canFinalize}>
                    <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            {(quotation.status === 'PO Sent' || quotation.status === 'Partially Received' || quotation.status === 'Completed') && (
                <div className="flex items-center gap-2">
                    <Label htmlFor="poNumber">PO Number:</Label>
                    <Input id="poNumber" value={poNumber} onChange={e => setPoNumber(e.target.value)} className="w-48"/>
                    <Button onClick={handlePoSave} size="sm">Save PO</Button>
                </div>
            )}
        </div>

        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                 <TableHead colSpan={3} className="p-2 text-center font-semibold border-x">
                    Item Details
                 </TableHead>
                {quotation.vendors.map(vendor => (
                  <TableHead key={vendor.id} colSpan={quotation.finalizedVendorId === vendor.vendorId ? 6 : 4} className="text-center font-semibold border-x p-2">
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
                    <TableHead className="text-center w-[80px]">Tax %</TableHead>
                    <TableHead className="text-right w-[120px] border-r">Amount</TableHead>
                     {quotation.finalizedVendorId === vendor.vendorId && (
                        <>
                         <TableHead className="text-center w-[100px] bg-blue-50 dark:bg-blue-900/30">Received</TableHead>
                         <TableHead className="text-center w-[100px] bg-blue-50 dark:bg-blue-900/30 border-r">Action</TableHead>
                        </>
                    )}
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
                  {quotation.vendors.map((vendor, vendorIndex) => {
                    let quote: QuotationQuote | undefined;
                    if (Array.isArray(vendor.quotes)) {
                        quote = vendor.quotes.find(q => q.itemId === item.itemId) || vendor.quotes[itemIndex];
                    } else if (vendor.quotes) {
                        quote = (vendor.quotes as any)[item.itemId] 
                             || Object.values(vendor.quotes)[itemIndex] 
                             || Object.values(vendor.quotes as any).find((q: any) => q.itemId === item.itemId);
                    }
                    const amount = (quote?.quantity || 0) * (quote?.rate || 0);

                    return (
                      <React.Fragment key={vendor.id}>
                        <TableCell className="text-center border-l">{quote?.quantity || 0}</TableCell>
                        <TableCell className="text-right">{formatCurrency(quote?.rate || 0)}</TableCell>
                        <TableCell className="text-center">{quote?.taxPercent || 0}%</TableCell>
                        <TableCell className="text-right font-semibold border-r">{formatCurrency(amount)}</TableCell>
                        {quotation.finalizedVendorId === vendor.vendorId && (
                            <>
                                <TableCell className="text-center bg-blue-50 dark:bg-blue-900/30">
                                    <Badge variant={ (quote?.receivedQuantity || 0) >= (quote?.quantity || 0) ? 'success' : 'secondary'}>
                                        {quote?.receivedQuantity || 0} / {quote?.quantity || 0}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-center bg-blue-50 dark:bg-blue-900/30 border-r">
                                    <Button size="sm" variant="outline" onClick={() => setReceivingInfo({ item, vendor, quote: quote! })} disabled={!quote || (quote.receivedQuantity || 0) >= quote.quantity}>Receive</Button>
                                </TableCell>
                            </>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableRow>
              ))}
              {/* --- FOOTER ROWS --- */}
              <TableRow className="font-bold bg-muted/50">
                  <TableCell colSpan={3} className="text-right">Sub-Total</TableCell>
                  {calculatedTotals.map((total, i) => <TableCell key={i} colSpan={quotation.finalizedVendorId === total.vendorId ? 6 : 4} className="text-right border-x">{formatCurrency(total.subTotal)}</TableCell>)}
              </TableRow>
              {
                Array.from(new Set(calculatedTotals.flatMap(t => t.additionalCosts.map(c => c.name)))).map(costName => (
                  <TableRow key={costName}>
                      <TableCell colSpan={3} className="text-right">{costName}</TableCell>
                      {calculatedTotals.map((total, vendorIndex) => {
                          const cost = total.additionalCosts.find(c => c.name === costName);
                          return (
                            <TableCell key={vendorIndex} colSpan={quotation.finalizedVendorId === total.vendorId ? 6 : 4} className="text-right border-x">{formatCurrency(cost?.value || 0)}</TableCell>
                          )
                      })}
                  </TableRow>
                ))
              }
               <TableRow className="font-bold">
                  <TableCell colSpan={3} className="text-right">Total Tax</TableCell>
                  {calculatedTotals.map((total, i) => <TableCell key={i} colSpan={quotation.finalizedVendorId === total.vendorId ? 6 : 4} className="text-right border-x">{formatCurrency(total.totalTax)}</TableCell>)}
              </TableRow>
               <TableRow className="font-bold text-base bg-muted/50">
                  <TableCell colSpan={3} className="text-right">Grand Total</TableCell>
                  {calculatedTotals.map((total, i) => (
                    <TableCell key={i} colSpan={quotation.finalizedVendorId === total.vendorId ? 6 : 4} className={cn("text-right border-x", total.vendorId === l1VendorId && !quotation.finalizedVendorId && "bg-green-100 dark:bg-green-900/50", quotation.finalizedVendorId === total.vendorId && "bg-green-100 dark:bg-green-900/50")}>
                        <div className="flex items-center justify-end gap-2 p-2">
                           {total.vendorId === l1VendorId && !quotation.finalizedVendorId && (
                               <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger><Crown className="h-4 w-4 text-yellow-500" /></TooltipTrigger>
                                    <TooltipContent><p>Lowest Bid (L1)</p></TooltipContent>
                                </Tooltip>
                               </TooltipProvider>
                           )}
                           <span className="text-lg">{formatCurrency(total.grandTotal)}</span>
                           {quotation.finalizedVendorId === total.vendorId ? (
                                <Badge variant="success">Finalized</Badge>
                           ) : (
                               quotation.status === 'Approved' && canFinalize && (
                                   <AlertDialog>
                                       <AlertDialogTrigger asChild>
                                           <Button size="sm" variant="default"><ThumbsUp className="h-4 w-4 mr-2" />Finalize</Button>
                                       </AlertDialogTrigger>
                                       <AlertDialogContent>
                                           <AlertDialogHeader>
                                               <AlertDialogTitle>Finalize Vendor?</AlertDialogTitle>
                                               <AlertDialogDescription>
                                                   This will select '{quotation.vendors.find(v => v.vendorId === total.vendorId)?.name}' as the final vendor and move the status to "PO Sent". This action cannot be easily undone.
                                               </AlertDialogDescription>
                                           </AlertDialogHeader>
                                           <AlertDialogFooter>
                                               <AlertDialogCancel>Cancel</AlertDialogCancel>
                                               <AlertDialogAction onClick={() => handleFinalizeVendor(total.vendorId)}>Confirm</AlertDialogAction>
                                           </AlertDialogFooter>
                                       </AlertDialogContent>
                                   </AlertDialog>
                               )
                           )}
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
    {receivingInfo && <ReceiveItemDialog isOpen={!!receivingInfo} setIsOpen={() => setReceivingInfo(null)} item={receivingInfo.item} quote={receivingInfo.quote} onReceive={handleReceiveItem} />}
    </>
  );
}
