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
import { PlusCircle, Trash2, Users2, X } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { usePurchase } from '@/contexts/purchase-provider';
import { Card, CardHeader, CardContent } from '../ui/card';
import { useEffect } from 'react';
import type { Quotation } from '@/lib/types';

const quotationItemSchema = z.object({
    id: z.string(),
    description: z.string().min(1, "Required"),
    uom: z.string().min(1, "Required"),
});

const additionalCostSchema = z.object({
    id: z.string(),
    name: z.string().min(1, "Cost name is required"),
    value: z.coerce.number().min(0, "Value must be non-negative"),
});

const quotationVendorSchema = z.object({
    id: z.string(),
    vendorId: z.string().min(1, "Select vendor"),
    name: z.string(),
    quotes: z.array(z.object({
        itemId: z.string(),
        quantity: z.coerce.number().min(1),
        rate: z.coerce.number().min(0),
        taxPercent: z.coerce.number().min(0).max(100),
    })),
    additionalCosts: z.array(additionalCostSchema).optional(),
});

const quotationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  items: z.array(quotationItemSchema).min(1, "Add at least one item."),
  vendors: z.array(quotationVendorSchema).min(1, "Add at least one vendor."),
});

type FormValues = z.infer<typeof quotationSchema>;

interface CreateQuotationDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  existingQuotation?: Quotation | null;
}

const VendorQuoteSection = ({ vendorIndex, control }: { vendorIndex: number; control: any }) => {
    const { fields, append, remove } = useFieldArray({
        control,
        name: `vendors.${vendorIndex}.additionalCosts`
    });

    return (
        <div className="space-y-2">
            {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-center">
                    <Input {...control.register(`vendors.${vendorIndex}.additionalCosts.${index}.name`)} placeholder="Cost Name (e.g. Cess)" />
                    <Input type="number" {...control.register(`vendors.${vendorIndex}.additionalCosts.${index}.value`)} placeholder="Value"/>
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => append({ id: `cost-${Date.now()}`, name: '', value: 0 })}>
                <PlusCircle className="h-4 w-4 mr-2"/> Add Cost
            </Button>
        </div>
    )
}

export default function CreateQuotationDialog({ isOpen, setIsOpen, existingQuotation }: CreateQuotationDialogProps) {
  const { vendors, addQuotation, updateQuotation } = usePurchase();
  const { toast } = useToast();
  const isEditMode = !!existingQuotation;

  const form = useForm<FormValues>({
    resolver: zodResolver(quotationSchema),
    defaultValues: { title: '', items: [], vendors: [] },
  });

  const { fields: itemFields, append: appendItem, remove: removeItem, replace: replaceItems } = useFieldArray({
    control: form.control,
    name: "items"
  });
  
  const { fields: vendorFields, append: appendVendor, remove: removeVendor, replace: replaceVendors } = useFieldArray({
    control: form.control,
    name: "vendors"
  });

  const watchItems = form.watch('items');

  useEffect(() => {
    if (isOpen) {
        if (existingQuotation) {
            form.reset({
                title: existingQuotation.title,
                items: existingQuotation.items,
                vendors: existingQuotation.vendors.map(v => ({
                    ...v,
                    quotes: Array.isArray(v.quotes) ? v.quotes : [],
                    additionalCosts: Array.isArray(v.additionalCosts) ? v.additionalCosts : [],
                }))
            });
        } else {
            form.reset({
                title: '',
                items: [],
                vendors: []
            });
        }
    }
  }, [isOpen, existingQuotation, form]);

  const onSubmit = (data: FormValues) => {
    if (isEditMode && existingQuotation) {
        updateQuotation({ ...existingQuotation, ...data });
        toast({ title: "Price Comparison Updated" });
    } else {
        addQuotation(data);
        toast({ title: "Price Comparison Created" });
    }
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) form.reset();
    setIsOpen(open);
  };
  
  const handleAddVendor = () => {
    appendVendor({
        id: `vendor-${Date.now()}`,
        vendorId: '',
        name: '',
        quotes: itemFields.map(item => ({ itemId: item.id, quantity: 1, rate: 0, taxPercent: 0 })),
        additionalCosts: [],
    });
  };

  const handleVendorSelect = (vendorIndex: number, vendorId: string) => {
    const vendor = vendors.find(v => v.id === vendorId);
    if(vendor) {
        form.setValue(`vendors.${vendorIndex}.vendorId`, vendor.id);
        form.setValue(`vendors.${vendorIndex}.name`, vendor.name);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit' : 'New'} Price Comparison</DialogTitle>
          <DialogDescription>Add items and vendors to compare quotes.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 pr-6 -mr-6">
            <div className="space-y-6">
              <div>
                <Label htmlFor="title" className="text-base font-semibold">Comparison Title</Label>
                <Input id="title" {...form.register('title')} />
                 {form.formState.errors.title && <p className="text-xs text-destructive mt-1">{form.formState.errors.title.message}</p>}
              </div>

              <div>
                <Label className="text-base font-semibold">Items to Quote</Label>
                <div className="space-y-2 mt-2">
                    {itemFields.map((field, index) => (
                        <div key={field.id} className="flex gap-2 items-start">
                            <Input {...form.register(`items.${index}.description`)} placeholder="Item Description" />
                            <Input {...form.register(`items.${index}.uom`)} placeholder="UOM" className="w-24"/>
                            <Button type="button" variant="destructive" size="icon" onClick={() => removeItem(index)}><Trash2 className="h-4 w-4"/></Button>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => appendItem({ id: `item-${Date.now()}`, description: '', uom: '' })}><PlusCircle className="h-4 w-4 mr-2"/>Add Item</Button>
                    {form.formState.errors.items && <p className="text-xs text-destructive">{form.formState.errors.items.message || form.formState.errors.items.root?.message}</p>}
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-base font-semibold">Vendors & Quotes</Label>
                 <div className="space-y-4 mt-2">
                   {vendorFields.map((vendorField, vendorIndex) => (
                    <Card key={vendorField.id}>
                        <CardHeader className="flex-row items-center justify-between p-4">
                            <div className="flex items-center gap-4">
                                <Users2 className="h-6 w-6"/>
                                <Select onValueChange={(vendorId) => handleVendorSelect(vendorIndex, vendorId)} defaultValue={vendorField.vendorId}>
                                    <SelectTrigger className="w-64"><SelectValue placeholder="Select Vendor"/></SelectTrigger>
                                    <SelectContent>{vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeVendor(vendorIndex)}><X className="h-4 w-4"/></Button>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                             <div className="grid grid-cols-[3fr,1fr,1fr,1fr] gap-4 mb-2 font-medium text-sm">
                                <span>Item</span>
                                <span className="text-center">Quantity</span>
                                <span className="text-center">Rate</span>
                                <span className="text-center">Tax %</span>
                            </div>
                            {itemFields.map((itemField, itemIndex) => (
                                <div key={itemField.id} className="grid grid-cols-[3fr,1fr,1fr,1fr] gap-4 items-center border-b py-2 last:border-b-0">
                                    <Label className="text-sm truncate">{watchItems?.[itemIndex]?.description || `Item ${itemIndex + 1}`}</Label>
                                    <Input type="number" {...form.register(`vendors.${vendorIndex}.quotes.${itemIndex}.quantity`)} placeholder="Qty"/>
                                    <Input type="number" {...form.register(`vendors.${vendorIndex}.quotes.${itemIndex}.rate`)} placeholder="Rate"/>
                                    <Input type="number" {...form.register(`vendors.${vendorIndex}.quotes.${itemIndex}.taxPercent`)} placeholder="Tax %" />
                                </div>
                            ))}
                            <Separator className="my-4"/>
                            <h5 className="font-semibold text-sm mb-2">Additional Costs</h5>
                            <VendorQuoteSection vendorIndex={vendorIndex} control={form.control} />
                        </CardContent>
                    </Card>
                   ))}
                    <Button type="button" variant="outline" size="sm" onClick={handleAddVendor} disabled={itemFields.length === 0}><PlusCircle className="h-4 w-4 mr-2"/>Add Vendor</Button>
                    {form.formState.errors.vendors && <p className="text-xs text-destructive">{form.formState.errors.vendors.message || form.formState.errors.vendors.root?.message}</p>}
                 </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">{isEditMode ? 'Save Changes' : 'Create Comparison'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
