'use client';
import styles from './comparison-view.module.css';
import { exportToExcel } from './exportQuotationToExcel';
import { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Quotation, QuotationItem, QuotationQuote, QuotationVendorDetails, QuotationStatus } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Crown, ThumbsUp } from 'lucide-react';
import * as React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useAuth } from '@/contexts/auth-provider';
import { usePurchase } from '@/contexts/purchase-provider';

interface ViewQuotationDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  quotation: Quotation;
  onEdit?: (quotation: Quotation) => void;
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
                        step="any"
                        value={quantity}
                        onChange={e => setQuantity(Number(e.target.value))}
                        max={maxReceivable}
                        min="0"
                    />
                </div>
                <DialogFooter className={styles.footer}>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={quantity <= 0 || quantity > maxReceivable}>Receive</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default function ViewQuotationDialog({ isOpen, setIsOpen, quotation: initialQuotation, onEdit }: ViewQuotationDialogProps) {
  const { users, can, user } = useAuth();
  const { quotations, updateQuotation, receiveQuoteItem } = usePurchase();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [frame, setFrame] = useState({left:12,top:12});
  const [exporting, setExporting] = useState(false);
  useEffect(()=>{if(!isOpen || typeof window==='undefined')return; const measure=()=>{const nav=document.querySelector('.portal-navigation')?.getBoundingClientRect();const header=document.querySelector('.main-portal header')?.getBoundingClientRect();setFrame({left:nav && window.innerWidth>=1024?nav.right+12:12,top:header && window.innerWidth>=768?header.bottom+12:12});};measure();window.addEventListener('resize',measure);return()=>window.removeEventListener('resize',measure);},[isOpen]);
  const [poNumber, setPoNumber] = useState(initialQuotation.poNumber || '');
  const [receivingInfo, setReceivingInfo] = useState<{ item: QuotationItem; vendor: QuotationVendorDetails; quote: QuotationQuote } | null>(null);

  const quotation = useMemo(() => {
    return quotations.find((q: Quotation) => q.id === initialQuotation.id) || initialQuotation;
  }, [quotations, initialQuotation]);
  
  useEffect(()=>{setSearch('');setReceivingInfo(null);},[initialQuotation.id,isOpen]);
  useEffect(()=>setPoNumber(quotation.poNumber || ''),[quotation.id,quotation.poNumber]);
  const quoteMaps=useMemo(()=>quotation.vendors.map(v=>new Map<string,QuotationQuote>(((Array.isArray(v.quotes)?v.quotes:Object.values(v.quotes || {})) as QuotationQuote[]).map(q=>[String(q.itemId),q]))),[quotation.vendors]);
  const commonQuantity=quotation.vendors.length>0 && quotation.items.every(item=>{const first=quoteMaps[0]?.get(String(item.itemId));return !!first && quoteMaps.every(m=>{const q=m.get(String(item.itemId));return !!q && Number(q.quantity)===Number(first.quantity);});});
  const span=(vendorId:string)=>(commonQuantity?3:4)+(quotation.finalizedVendorId===vendorId?2:0);
  const leftSpan=commonQuantity?4:3;
  const columnWidths=[38,290,65,...(commonQuantity?[65]:[]),...quotation.vendors.flatMap(v=>[...(commonQuantity?[]:[65]),95,60,120,...(quotation.finalizedVendorId===v.vendorId?[100,95]:[])])];
  const visibleItems=quotation.items.map((item,index)=>({item,index})).filter(({item})=>!search || `${item.description} ${item.uom}`.toLowerCase().includes(search.toLowerCase()));
  const handleExport=async()=>{setExporting(true);try{await exportToExcel(quotation);}catch(error){toast({variant:'destructive',title:'Export failed',description:error instanceof Error?error.message:String(error)});}finally{setExporting(false);}};
  const creator = users.find(u => u.id === quotation.creatorId);
  const canFinalize = can.manage_purchase_register;

  const calculatedTotals = useMemo(() => {
    return quotation.vendors.map(vendor => {
        let subTotal = 0;
        let totalTax = 0;
        const quotesArray: QuotationQuote[] = (Array.isArray(vendor.quotes) ? vendor.quotes : Object.values(vendor.quotes || {})) as QuotationQuote[];

        quotation.items.forEach((item) => {
            const quote = quotesArray.find(q => String(q.itemId) === String(item.itemId));
            if (quote) {
                const amount = (quote.quantity || 0) * (quote.rate || 0);
                subTotal += amount;
                totalTax += amount * ((quote.taxPercent || 0) / 100);
            }
        });
      const additionalCostsArray = Array.isArray(vendor.additionalCosts) ? vendor.additionalCosts : Object.values(vendor.additionalCosts || []);
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
    updateQuotation({ ...quotation, status: newStatus });
    toast({ title: `Status updated to ${newStatus}` });
  };
  
  const handleFinalizeVendor = (vendorId: string) => {
    if (!canFinalize) return;
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
    const { item, vendor } = receivingInfo;
    receiveQuoteItem(quotation.id, vendor.vendorId, item.itemId, quantity);
    toast({ title: `Logged ${quantity} of ${item.description} received.`});
    setReceivingInfo(null);
  };
  
  return (
    <>
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className={styles.dialog} overlayClassName="bg-black/20" style={{'--view-left':`${frame.left}px`,'--view-top':`${frame.top}px`} as React.CSSProperties}>
        <DialogHeader className={styles.header}>
          <DialogTitle>{quotation.title} <span className={styles.request}>{quotation.requestNumber || 'Assigning…'}</span></DialogTitle>
          <DialogDescription>
            Created by {creator?.name || 'Unknown'} on {format(parseISO(quotation.createdAt), 'PPP')}
          </DialogDescription>
        </DialogHeader>

        <div className={styles.viewToolbar}>
            <div className="flex flex-wrap items-center gap-2">
                <Label>Status:</Label>
                <Select value={quotation.status} onValueChange={(val) => handleStatusChange(val as QuotationStatus)} disabled={!canFinalize}>
                    <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <Input aria-label="Find comparison item" placeholder="Find item by description or unit…" value={search} onChange={e=>setSearch(e.target.value)} className={styles.search}/>
            <div className={styles.actions}><Button variant="outline" disabled={exporting} onClick={handleExport}>{exporting?'Exporting…':'Excel'}</Button>{onEdit && canFinalize && (!quotation.isLocked || user?.role==='Admin') && <Button variant="outline" onClick={()=>{setIsOpen(false);onEdit(quotation);}}>Edit comparison</Button>}</div>
            {(quotation.status === 'PO Sent' || quotation.status === 'Partially Received' || quotation.status === 'Completed') && (
                <div className="flex flex-wrap items-center gap-2">
                    <Label htmlFor="poNumber">PO Number:</Label>
                    <Input id="poNumber" value={poNumber} onChange={e => setPoNumber(e.target.value)} className="w-48"/>
                    <Button onClick={handlePoSave} size="sm">Save PO</Button>
                </div>
            )}
        </div>

        <p className={styles.note}>Amounts before tax · Grand totals include tax and additional costs{!commonQuantity && ' · Quantities shown separately for each vendor'}</p>
        <div className={styles.viewScroll} role="region" aria-label="Price comparison table" tabIndex={0}>
          <table className={styles.viewTable} style={{minWidth:columnWidths.reduce((a,b)=>a+b,0)}}>
            <colgroup>{columnWidths.map((width,i)=><col key={i} style={{width}}/>)}</colgroup>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                 <TableHead colSpan={leftSpan} className="p-2 text-center font-semibold border-x">
                    Item Details
                 </TableHead>
                {quotation.vendors.map(vendor => (
                  <TableHead key={vendor.id} colSpan={span(vendor.vendorId)} className="text-center font-semibold border-x p-2">
                    {vendor.name}
                  </TableHead>
                ))}
              </TableRow>
              <TableRow>
                <TableHead className="w-[40px]">Sl.</TableHead>
                <TableHead className="min-w-[200px]">Description</TableHead>
                <TableHead className="w-[60px]">Unit</TableHead>{commonQuantity && <TableHead>Qty</TableHead>}
                {quotation.vendors.map(vendor => (
                  <React.Fragment key={vendor.id}>
                    {!commonQuantity && <TableHead className="text-center w-[80px] border-l">Qty</TableHead>}
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
              {visibleItems.map(({item, index:itemIndex}) => (
                <TableRow key={item.id}>
                  <TableCell>{itemIndex + 1}</TableCell>
                  <TableCell className="font-medium">{item.description}</TableCell>
                  <TableCell>{item.uom}</TableCell>{commonQuantity && <TableCell>{quoteMaps[0]?.get(String(item.itemId))?.quantity}</TableCell>}
                  {quotation.vendors.map((vendor, vendorIndex) => {
                    const quote = quoteMaps[vendorIndex].get(String(item.itemId));
                    const amount = (quote?.quantity || 0) * (quote?.rate || 0);

                    return (
                      <React.Fragment key={vendor.id}>
                        {!commonQuantity && <TableCell className="text-center border-l">{quote?.quantity ?? '—'}</TableCell>}
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
              {!visibleItems.length && <TableRow><TableCell colSpan={columnWidths.length}>No matching items. Clear the search to see all items.</TableCell></TableRow>}
            </TableBody>
            <tfoot>
              <TableRow className="font-bold bg-muted/50">
                  <TableCell colSpan={leftSpan} className="text-right">Sub-Total</TableCell>
                  {calculatedTotals.map((total, i) => <TableCell key={i} colSpan={span(total.vendorId)} className="text-right border-x">{formatCurrency(total.subTotal)}</TableCell>)}
              </TableRow>

               <TableRow className="font-bold">
                  <TableCell colSpan={leftSpan} className="text-right">Total Tax</TableCell>
                  {calculatedTotals.map((total, i) => <TableCell key={i} colSpan={span(total.vendorId)} className="text-right border-x">{formatCurrency(total.totalTax)}</TableCell>)}
              </TableRow>
              <TableRow><TableCell colSpan={leftSpan}>Additional costs</TableCell>{calculatedTotals.map((total,i)=><TableCell key={i} colSpan={span(total.vendorId)} className="text-right"><details><summary>{formatCurrency(total.additionalCosts.reduce((sum,c)=>sum+c.value,0))}</summary><div className={styles.costBreakdown}>{total.additionalCosts.length?total.additionalCosts.map((cost,j)=><div key={j}>{cost.name}: {formatCurrency(cost.value)}</div>):'No additional costs'}</div></details></TableCell>)}</TableRow>
               <TableRow className="font-bold text-base bg-muted/50">
                  <TableCell colSpan={leftSpan} className="text-right">Grand Total</TableCell>
                  {calculatedTotals.map((total, i) => (
                    <TableCell key={i} colSpan={span(total.vendorId)} data-highlight={quotation.finalizedVendorId===total.vendorId || (!quotation.finalizedVendorId && total.vendorId===l1VendorId)} className={cn("text-right border-x", total.vendorId === l1VendorId && !quotation.finalizedVendorId && "bg-green-100 dark:bg-green-900/50", quotation.finalizedVendorId === total.vendorId && "bg-green-100 dark:bg-green-900/50")}>
                        <div className="flex items-center justify-end gap-2 p-2">
                           {total.vendorId === l1VendorId && !quotation.finalizedVendorId && (
                               <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger><Crown className="h-4 w-4 text-yellow-500" /></TooltipTrigger>
                                    <TooltipContent><p>Lowest Bid (L1)</p></TooltipContent>
                                </Tooltip>
                               </TooltipProvider>
                           )}
                           <span className="text-base">{formatCurrency(total.grandTotal)}</span>
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
                                                   This will select '{quotation.vendors.find(v => v.vendorId === total.vendorId)?.name}' as the final vendor.
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
            </tfoot>
          </table>
        </div>
        <DialogFooter className={styles.footer}>
          <span>{search ? `${visibleItems.length} of ` : ''}{quotation.items.length} items · {quotation.vendors.length} vendors{search && ' · Totals include all items'}</span>
          <Button onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {receivingInfo && <ReceiveItemDialog isOpen={!!receivingInfo} setIsOpen={() => setReceivingInfo(null)} item={receivingInfo.item} quote={receivingInfo.quote} onReceive={handleReceiveItem} />}
    </>
  );
}
