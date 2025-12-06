

'use client';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DatePickerInput } from '../ui/date-picker-input';
import { useMemo } from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

const itemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Item name is required'),
  quantity: z.coerce.number().min(1, 'Must be at least 1'),
  uom: z.string().min(1, 'UOM is required'),
  unitRate: z.coerce.number().min(0.01, 'Must be > 0'),
  tax: z.coerce.number().min(0, 'Cannot be negative').max(100, 'Cannot exceed 100'),
});


const paymentSchema = z.object({
  vendorId: z.string().min(1, 'Please select a vendor'),
  poNumber: z.string().optional(),
  invoiceNumber: z.string().optional(),
  deliveryNoteNumber: z.string().optional(),
  poDate: z.date().optional(),
  invoiceDate: z.date().optional(),
  items: z.array(itemSchema).min(1, 'Please add at least one item.'),
  roundOff: z.coerce.number().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface AddPurchaseLedgerDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function AddPurchaseLedgerDialog({ isOpen, setIsOpen }: AddPurchaseLedgerDialogProps) {
  const { addPurchaseRegister, vendors } = useAppContext();
  const { toast } = useToast();

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      items: [{ id: `item-${Date.now()}`, name: '', quantity: 1, uom: 'Nos', unitRate: 0, tax: 0 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });
  
  const watchedItems = form.watch('items');
  const watchedRoundOff = form.watch('roundOff');

  const totals = useMemo(() => {
    const subTotal = watchedItems.reduce((acc, item) => acc + (item.quantity * item.unitRate), 0);
    const totalTax = watchedItems.reduce((acc, item) => acc + (item.quantity * item.unitRate * (item.tax / 100)), 0);
    const totalBeforeRoundOff = subTotal + totalTax;
    const grandTotal = totalBeforeRoundOff + (watchedRoundOff || 0);
    return { subTotal, totalTax, totalBeforeRoundOff, grandTotal };
  }, [watchedItems, watchedRoundOff]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

  const onSubmit = (data: PaymentFormValues) => {
    addPurchaseRegister({
        ...data,
        subTotal: totals.subTotal,
        totalTax: totals.totalTax,
        grandTotal: totals.grandTotal,
        poDate: data.poDate?.toISOString(),
        invoiceDate: data.invoiceDate?.toISOString(),
    });
    toast({
      title: 'Ledger Entry Added',
      description: 'The purchase has been logged and sent for approval.',
    });
    setIsOpen(false);
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset({ items: [{ id: `item-${Date.now()}`, name: '', quantity: 1, uom: 'Nos', unitRate: 0, tax: 0 }] });
    }
    setIsOpen(open);
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl h-full flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Purchase Ledger</DialogTitle>
          <DialogDescription>Log approved and purchased items against a vendor.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 pr-6 -mr-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>Vendor</Label>
                        <Controller control={form.control} name="vendorId" render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger><SelectValue placeholder="Select a vendor" /></SelectTrigger>
                                <SelectContent>{vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                            </Select>
                        )}/>
                        {form.formState.errors.vendorId && <p className="text-xs text-destructive">{form.formState.errors.vendorId.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="poNumber">PO Number</Label>
                        <Input id="poNumber" {...form.register('poNumber')} />
                    </div>
                     <div className="space-y-2">
                        <Label>PO Date</Label>
                        <Controller name="poDate" control={form.control} render={({field}) => <DatePickerInput value={field.value} onChange={field.onChange} />} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="invoiceNumber">Invoice No</Label>
                        <Input id="invoiceNumber" {...form.register('invoiceNumber')} />
                    </div>
                     <div className="space-y-2">
                        <Label>Invoice Date</Label>
                        <Controller name="invoiceDate" control={form.control} render={({field}) => <DatePickerInput value={field.value} onChange={field.onChange} />} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="deliveryNoteNumber">Delivery Note No</Label>
                        <Input id="deliveryNoteNumber" {...form.register('deliveryNoteNumber')} />
                    </div>
                </div>

                <Separator />
                
                <div className="space-y-2">
                    <Label className="font-semibold">Items</Label>
                     <div className="grid grid-cols-12 gap-2 font-medium text-xs text-muted-foreground">
                        <div className="col-span-3">Item Name</div>
                        <div className="col-span-2">Quantity</div>
                        <div className="col-span-1">UOM</div>
                        <div className="col-span-2">Unit Rate</div>
                        <div className="col-span-1">Tax %</div>
                        <div className="col-span-2">Total</div>
                        <div className="col-span-1"></div>
                    </div>
                    {fields.map((field, index) => {
                        const itemTotal = (watchedItems[index]?.quantity * watchedItems[index]?.unitRate) * (1 + (watchedItems[index]?.tax || 0) / 100);
                        return (
                            <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                                <div className="col-span-3"><Input {...form.register(`items.${index}.name`)} placeholder="Item Name" /></div>
                                <div className="col-span-2"><Input type="number" {...form.register(`items.${index}.quantity`)} /></div>
                                <div className="col-span-1"><Input {...form.register(`items.${index}.uom`)} /></div>
                                <div className="col-span-2"><Input type="number" {...form.register(`items.${index}.unitRate`)} step="0.01" /></div>
                                <div className="col-span-1"><Input type="number" {...form.register(`items.${index}.tax`)} /></div>
                                <div className="col-span-2 flex items-center h-10 px-3 text-sm font-medium">{formatCurrency(itemTotal || 0)}</div>
                                <div className="col-span-1"><Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button></div>
                            </div>
                        )
                    })}
                     <Button type="button" variant="outline" size="sm" onClick={() => append({ id: `item-${Date.now()}`, name: '', quantity: 1, uom: 'Nos', unitRate: 0, tax: 0 })}>
                        <PlusCircle className="mr-2 h-4 w-4"/>Add Item
                    </Button>
                    {form.formState.errors.items && <p className="text-xs text-destructive">{form.formState.errors.items.message || form.formState.errors.items.root?.message}</p>}
                </div>
              </div>
            </ScrollArea>
            <div className="shrink-0 pt-4 border-t">
                <div className="flex justify-end">
                    <div className="w-full max-w-sm space-y-2 text-sm">
                        <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(totals.subTotal)}</span></div>
                        <div className="flex justify-between"><span>Total Tax:</span><span>{formatCurrency(totals.totalTax)}</span></div>
                        <div className="flex justify-between items-center">
                            <Label htmlFor="roundOff">Round Off:</Label>
                            <Input id="roundOff" type="number" {...form.register('roundOff')} step="0.01" className="w-24 h-8" />
                        </div>
                        <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Grand Total:</span><span>{formatCurrency(totals.grandTotal)}</span></div>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit">Submit for Approval</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
