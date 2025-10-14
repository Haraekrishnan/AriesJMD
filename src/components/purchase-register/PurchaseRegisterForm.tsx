
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronsUpDown, Trash2, PlusCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AddVendorDialog from '../vendor-management/AddVendorDialog';
import { DateRangePicker } from '../ui/date-range-picker';
import { DatePickerInput } from '../ui/date-picker-input';
import type { DateRange } from 'react-day-picker';

const itemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Item name is required'),
  quantity: z.coerce.number().min(1, 'Must be at least 1'),
  uom: z.string().min(1, 'UOM is required'),
  unitRate: z.coerce.number().min(0.01, 'Must be > 0'),
  tax: z.coerce.number().min(0, 'Cannot be negative').max(100, 'Cannot exceed 100'),
});

const purchaseSchema = z.object({
  vendorId: z.string().min(1, 'Please select a vendor'),
  items: z.array(itemSchema).min(1, 'Please add at least one item.'),
  poNumber: z.string().optional(),
  invoiceNumber: z.string().optional(),
  deliveryNoteNumber: z.string().optional(),
  poDate: z.date().optional(),
  invoiceDate: z.date().optional(),
  roundOff: z.coerce.number().optional(),
});

type PurchaseFormValues = z.infer<typeof purchaseSchema>;

export default function PurchaseRegisterForm() {
  const { vendors, addVendor, addPurchaseRegister, purchaseRegisters } = useAppContext();
  const { toast } = useToast();
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  
  const allItemsEverPurchased = useMemo(() => {
    const itemMap = new Map<string, { lastPrice: number }>();
    if (purchaseRegisters && Array.isArray(purchaseRegisters)) {
        purchaseRegisters.forEach(reg => {
            if (reg.items && Array.isArray(reg.items)) {
                reg.items.forEach(item => {
                    const existing = itemMap.get(item.name.toLowerCase());
                    if (!existing || item.unitRate > existing.lastPrice) {
                        itemMap.set(item.name.toLowerCase(), { lastPrice: item.unitRate });
                    }
                });
            }
        });
    }
    return itemMap;
  }, [purchaseRegisters]);

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: { vendorId: '', items: [{ id: `item-${Date.now()}`, name: '', quantity: 1, uom: 'Nos', unitRate: 0, tax: 0 }] }
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

  const onSubmit = (data: PurchaseFormValues) => {
    addPurchaseRegister({
        ...data,
        subTotal: totals.subTotal,
        totalTax: totals.totalTax,
        grandTotal: totals.grandTotal,
        poDate: data.poDate?.toISOString(),
        invoiceDate: data.invoiceDate?.toISOString(),
    });
    toast({ title: 'Purchase Registered', description: 'The entry has been saved and sent for approval.' });
    form.reset({ vendorId: '', items: [{ id: `item-${Date.now()}`, name: '', quantity: 1, uom: 'Nos', unitRate: 0, tax: 0 }] });
  };
  
  return (
    <>
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
        <div className="flex-1 space-y-2">
            <Label>Vendor</Label>
            <div className="flex items-center gap-2">
              <Controller
                  name="vendorId"
                  control={form.control}
                  render={({ field }) => (
                      <Popover>
                          <PopoverTrigger asChild>
                              <Button variant="outline" role="combobox" className="w-full justify-between">
                                  {field.value ? vendors.find(v => v.id === field.value)?.name : "Select vendor..."}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                              <Command>
                                  <CommandInput placeholder="Search vendors..." />
                                  <CommandList>
                                  <CommandEmpty>No vendor found.</CommandEmpty>
                                  <CommandGroup>
                                      {vendors.map(vendor => (
                                      <CommandItem key={vendor.id} value={vendor.name} onSelect={() => form.setValue("vendorId", vendor.id)}>
                                          {vendor.name}
                                      </CommandItem>
                                      ))}
                                  </CommandGroup>
                                  </CommandList>
                              </Command>
                          </PopoverContent>
                      </Popover>
                  )}
              />
              <Button type="button" variant="outline" onClick={() => setIsAddVendorOpen(true)}>New</Button>
            </div>
             {form.formState.errors.vendorId && <p className="text-xs text-destructive">{form.formState.errors.vendorId.message}</p>}
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-12 gap-4 font-semibold text-sm px-2">
            <div className="col-span-3">Item Name</div>
            <div className="col-span-2">Quantity</div>
            <div className="col-span-1">UOM</div>
            <div className="col-span-2">Unit Rate</div>
            <div className="col-span-1">Tax %</div>
            <div className="col-span-2">Total</div>
            <div className="col-span-1"></div>
        </div>
        {fields.map((field, index) => {
            const itemName = watchedItems[index]?.name.toLowerCase();
            const lastPurchase = allItemsEverPurchased.get(itemName);
            const currentRate = watchedItems[index]?.unitRate;
            const isOverpriced = lastPurchase && currentRate > lastPurchase.lastPrice;
            const itemTotal = (watchedItems[index].quantity * watchedItems[index].unitRate) * (1 + watchedItems[index].tax / 100);

            return (
                <div key={field.id} className="grid grid-cols-12 gap-4 items-start">
                    <div className="col-span-3 space-y-1">
                        <Input {...form.register(`items.${index}.name`)} placeholder="e.g., Cement Bag" />
                        {isOverpriced && (
                            <div className="flex items-center gap-1 text-xs text-orange-600">
                                <AlertCircle className="h-3 w-3" />
                                Price is higher than last purchase (₹{lastPurchase.lastPrice})
                            </div>
                        )}
                    </div>
                    <div className="col-span-2"><Input type="number" {...form.register(`items.${index}.quantity`)} /></div>
                    <div className="col-span-1"><Input {...form.register(`items.${index}.uom`)} /></div>
                    <div className="col-span-2"><Input type="number" {...form.register(`items.${index}.unitRate`)} step="0.01" /></div>
                    <div className="col-span-1"><Input type="number" {...form.register(`items.${index}.tax`)} /></div>
                    <div className="col-span-2 flex items-center h-10 px-3 text-sm font-medium">{formatCurrency(itemTotal)}</div>
                    <div className="col-span-1"><Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button></div>
                </div>
            );
        })}
      </div>
      
      <Button type="button" variant="outline" size="sm" onClick={() => append({ id: `item-${Date.now()}`, name: '', quantity: 1, uom: 'Nos', unitRate: 0, tax: 0 })}>
        <PlusCircle className="mr-2 h-4 w-4"/>Add Item
      </Button>
      {form.formState.errors.items?.root && <p className="text-xs text-destructive pt-2">{form.formState.errors.items.root.message}</p>}


      <div className="mt-6 flex justify-end">
        <div className="w-full max-w-sm space-y-2">
            <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(totals.subTotal)}</span></div>
            <div className="flex justify-between"><span>Total Tax:</span><span>{formatCurrency(totals.totalTax)}</span></div>
            <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Grand Total:</span><span>{formatCurrency(totals.grandTotal)}</span></div>
        </div>
      </div>
      
      <div className="flex justify-end pt-6">
        <Button type="submit">Save Purchase Register</Button>
      </div>
    </form>
    <AddVendorDialog isOpen={isAddVendorOpen} setIsOpen={setIsAddVendorOpen} />
    </>
  );
}
