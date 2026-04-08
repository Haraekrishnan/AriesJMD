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
import { Badge } from '../ui/badge';
import { usePurchase } from '@/contexts/purchase-provider';
import { Card, CardHeader, CardContent } from '../ui/card';

const quotationItemSchema = z.object({
    id: z.string(),
    description: z.string().min(1, "Required"),
    uom: z.string().min(1, "Required"),
});

const quotationVendorSchema = z.object({
    id: z.string(),
    vendorId: z.string().min(1, "Select vendor"),
    name: z.string(),
    quotes: z.array(z.object({
        itemId: z.string(),
        quantity: z.coerce.number().min(1),
        rate: z.coerce.number().min(0),
    })),
    transportation: z.string().optional(),
    gstPercent: z.coerce.number().min(0).max(100),
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
}

export default function CreateQuotationDialog({ isOpen, setIsOpen }: CreateQuotationDialogProps) {
  const { vendors, addQuotation } = usePurchase();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(quotationSchema),
    defaultValues: { title: '', items: [], vendors: [] },
  });

  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
    control: form.control,
    name: "items"
  });
  
  const { fields: vendorFields, append: appendVendor, remove: removeVendor } = useFieldArray({
    control: form.control,
    name: "vendors"
  });

  const onSubmit = (data: FormValues) => {
    addQuotation(data);
    toast({ title: "Price Comparison Created" });
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
        quotes: itemFields.map(item => ({ itemId: item.id, quantity: 1, rate: 0 })),
        transportation: '',
        gstPercent: 0,
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
          <DialogTitle>New Price Comparison</DialogTitle>
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
                            {itemFields.map((itemField, itemIndex) => (
                                <div key={itemField.id} className="grid grid-cols-3 gap-4 items-center border-b py-2">
                                    <Label className="text-sm">{itemField.description || `Item ${itemIndex + 1}`}</Label>
                                    <Input type="number" {...form.register(`vendors.${vendorIndex}.quotes.${itemIndex}.quantity`)} placeholder="Quantity"/>
                                    <Input type="number" {...form.register(`vendors.${vendorIndex}.quotes.${itemIndex}.rate`)} placeholder="Rate"/>
                                </div>
                            ))}
                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <Input {...form.register(`vendors.${vendorIndex}.transportation`)} placeholder="Transportation Cost"/>
                                <Input type="number" {...form.register(`vendors.${vendorIndex}.gstPercent`)} placeholder="GST %"/>
                            </div>
                        </CardContent>
                    </Card>
                   ))}
                    <Button type="button" variant="outline" size="sm" onClick={handleAddVendor}><PlusCircle className="h-4 w-4 mr-2"/>Add Vendor</Button>
                    {form.formState.errors.vendors && <p className="text-xs text-destructive">{form.formState.errors.vendors.message || form.formState.errors.vendors.root?.message}</p>}
                 </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Create Comparison</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
