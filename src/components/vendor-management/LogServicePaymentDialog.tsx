
'use client';

import { useMemo, useState } from 'react';
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
import { DateRangePicker } from '../ui/date-range-picker';
import type { DateRange } from 'react-day-picker';
import { PlusCircle, Trash2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';

const SERVICE_TYPES = ['Vehicle Rent', 'Accommodation Cleaning', 'Office Cleaning', 'Drinking Water', 'Mess Related Purchase', 'Others'];

const itemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Item name is required'),
  quantity: z.coerce.number().min(1, 'Must be at least 1'),
  uom: z.string().min(1, 'UOM is required'),
  unitRate: z.coerce.number().min(0.01, 'Must be > 0'),
  tax: z.coerce.number().min(0, 'Cannot be negative').max(100, 'Cannot exceed 100'),
});

const servicePaymentSchema = z.object({
  vendorId: z.string().min(1, 'Please select a vendor'),
  serviceType: z.string().min(1, 'Please select a service type'),
  otherServiceType: z.string().optional(),
  duration: z.object({
      from: z.date().optional(),
      to: z.date().optional()
  }).optional(),
  remarks: z.string().optional(),
  items: z.array(itemSchema).optional(),
  totalAmount: z.coerce.number().optional(), // For when there are no itemizations
  roundOff: z.coerce.number().optional(),
}).refine(data => {
    return (data.items && data.items.length > 0) || (data.totalAmount && data.totalAmount > 0);
}, {
    message: 'You must either add items or enter a total amount.',
    path: ['totalAmount'],
});

type ServicePaymentFormValues = z.infer<typeof servicePaymentSchema>;

interface LogServicePaymentDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function LogServicePaymentDialog({ isOpen, setIsOpen }: LogServicePaymentDialogProps) {
  const { addPayment, vendors } = useAppContext();
  const { toast } = useToast();

  const form = useForm<ServicePaymentFormValues>({
    resolver: zodResolver(servicePaymentSchema),
    defaultValues: { items: [] }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });
  
  const watchedItems = form.watch('items');
  const watchedTotalAmount = form.watch('totalAmount');
  const watchedRoundOff = form.watch('roundOff');

  const totals = useMemo(() => {
    let subTotal = 0;
    let totalTax = 0;
    if (watchedItems && watchedItems.length > 0) {
        subTotal = watchedItems.reduce((acc, item) => acc + (item.quantity * item.unitRate), 0);
        totalTax = watchedItems.reduce((acc, item) => acc + (item.quantity * item.unitRate * (item.tax / 100)), 0);
    } else if (watchedTotalAmount) {
        subTotal = watchedTotalAmount;
    }
    
    const totalBeforeRoundOff = subTotal + totalTax;
    const roundOffValue = parseFloat(String(watchedRoundOff || '0'));
    const grandTotal = totalBeforeRoundOff + roundOffValue;
    return { subTotal, totalTax, grandTotal };
  }, [watchedItems, watchedTotalAmount, watchedRoundOff]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

  const onSubmit = (data: ServicePaymentFormValues) => {
    const description = data.serviceType === 'Others' ? data.otherServiceType : data.serviceType;
    addPayment({
        vendorId: data.vendorId,
        amount: totals.grandTotal,
        durationFrom: data.duration?.from?.toISOString(),
        durationTo: data.duration?.to?.toISOString(),
        remarks: `${description}. ${data.remarks || ''}`.trim(),
    });
    toast({
      title: 'Service Payment Logged',
      description: 'The payment has been saved to the ledger.',
    });
    setIsOpen(false);
    form.reset();
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset({ items: [] });
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl h-full flex flex-col">
        <DialogHeader>
          <DialogTitle>Log Service Payment</DialogTitle>
          <DialogDescription>Log payments for non-item-based services.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 pr-6 -mr-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <Label>Service Duration</Label>
                        <Controller name="duration" control={form.control} render={({field}) => <DateRangePicker date={field.value as DateRange} onDateChange={field.onChange} />} />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Service Type</Label>
                        <Controller control={form.control} name="serviceType" render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger><SelectValue placeholder="Select service type" /></SelectTrigger>
                                <SelectContent>{SERVICE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                        )}/>
                        {form.formState.errors.serviceType && <p className="text-xs text-destructive">{form.formState.errors.serviceType.message}</p>}
                    </div>
                    {form.watch('serviceType') === 'Others' && (
                        <div className="space-y-2">
                            <Label>Specify Service</Label>
                            <Input {...form.register('otherServiceType')} />
                        </div>
                    )}
                </div>
                 <div className="space-y-2">
                    <Label>Remarks / Description</Label>
                    <Textarea {...form.register('remarks')} />
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                    <Label className="font-semibold">Itemized Costs (Optional)</Label>
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
                </div>

                {(!watchedItems || watchedItems.length === 0) && (
                    <div className="space-y-2">
                        <Label>Total Amount (if not itemized)</Label>
                        <Input type="number" {...form.register('totalAmount')} step="0.01"/>
                        {form.formState.errors.totalAmount && <p className="text-xs text-destructive">{form.formState.errors.totalAmount.message}</p>}
                    </div>
                )}
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
                <Button type="submit">Save Payment</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
