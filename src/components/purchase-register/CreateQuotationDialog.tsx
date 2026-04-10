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
import { PlusCircle, Trash2, Users2, X, ChevronsUpDown, Check } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { usePurchase } from '@/contexts/purchase-provider';
import { Card, CardHeader, CardContent } from '../ui/card';
import { useEffect, useMemo, useState } from 'react';
import type { Quotation, QuotationItem, QuotationQuote, QuotationVendorDetails } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { cn } from '@/lib/utils';

const quotationItemSchema = z.object({
    id: z.string(),
    itemId: z.string().min(1, 'Item must be selected'),
    description: z.string().min(1, "Description is required"),
    uom: z.string().min(1, "UOM is required"),
    itemType: z.string().min(1, 'Item Type is required'),
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
        receivedQuantity: z.coerce.number().optional(),
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
                    <Input type="number" {...control.register(`vendors.${vendorIndex}.additionalCosts.${index}.value`, { valueAsNumber: true })} placeholder="Value"/>
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => append({ id: `cost-${Date.now()}`, name: '', value: 0 })}>
                <PlusCircle className="h-4 w-4 mr-2"/> Add Cost
            </Button>
        </div>
    )
}

type SearchableQuotationItem = {
    id: string; // The actual item ID
    name: string; // The display name
    category: 'Store Inventory' | 'Equipment' | 'Consumables';
    uom?: string;
    itemType: string; // specific type for later reference
};

export default function CreateQuotationDialog({ isOpen, setIsOpen, existingQuotation }: CreateQuotationDialogProps) {
  const { vendors, addQuotation, updateQuotation } = usePurchase();
  const { 
    inventoryItems, utMachines, dftMachines, digitalCameras, anemometers, otherEquipments, laptopsDesktops, mobileSims, 
    weldingMachines, walkieTalkies, pneumaticDrillingMachines, pneumaticAngleGrinders, wiredDrillingMachines, 
    cordlessDrillingMachines, wiredAngleGrinders, cordlessAngleGrinders, cordlessReciprocatingSaws, consumableItems
  } = useAppContext();
  const { toast } = useToast();
  const isEditMode = !!existingQuotation;

  const [popoverOpenState, setPopoverOpenState] = useState<Record<number, boolean>>({});

  const allItemsForQuote = useMemo(() => {
    const all = [
      ...inventoryItems
        .filter((i) => i.category === 'General' && !i.isArchived)
        .map((i) => ({ id: i.id, name: i.name, uom: i.unit || 'Nos', category: 'Store Inventory' as const, itemType: 'Inventory' })),
      ...consumableItems.map((i) => ({ id: i.id, name: i.name, uom: i.unit || 'pcs', category: 'Consumables' as const, itemType: 'Inventory' })),
      ...utMachines.map((i) => ({ id: i.id, name: i.machineName, uom: 'Nos', category: 'Equipment' as const, itemType: 'UTMachine' })),
      ...dftMachines.map((i) => ({ id: i.id, name: i.machineName, uom: 'Nos', category: 'Equipment' as const, itemType: 'DftMachine' })),
      ...digitalCameras.map((i) => ({ id: i.id, name: `${i.make} ${i.model}`, uom: 'Nos', category: 'Equipment' as const, itemType: 'DigitalCamera' })),
      ...anemometers.map((i) => ({ id: i.id, name: `${i.make} ${i.model}`, uom: 'Nos', category: 'Equipment' as const, itemType: 'Anemometer' })),
      ...laptopsDesktops.map((i) => ({ id: i.id, name: `${i.make} ${i.model}`, uom: 'Nos', category: 'Equipment' as const, itemType: 'LaptopDesktop' })),
      ...mobileSims.filter(i => i.type === 'Mobile' || i.type === 'Mobile with SIM').map(i => ({ id: i.id, name: `${i.make} ${i.model}`, uom: 'Nos', category: 'Equipment' as const, itemType: 'MobileSim' })),
      ...otherEquipments.map((i) => ({ id: i.id, name: i.equipmentName, uom: 'Nos', category: 'Equipment' as const, itemType: 'OtherEquipment' })),
      ...weldingMachines.map((i) => ({ id: i.id, name: `Welding Machine ${i.serialNumber}`, uom: 'Nos', category: 'Equipment' as const, itemType: 'WeldingMachine' })),
      ...walkieTalkies.map((i) => ({ id: i.id, name: `Walkie Talkie ${i.serialNumber}`, uom: 'Nos', category: 'Equipment' as const, itemType: 'WalkieTalkie' })),
      ...pneumaticDrillingMachines.map((i) => ({ id: i.id, name: `Pneumatic Drill ${i.serialNumber}`, uom: 'Nos', category: 'Equipment' as const, itemType: 'PneumaticDrillingMachine' })),
      ...pneumaticAngleGrinders.map((i) => ({ id: i.id, name: `Pneumatic Grinder ${i.serialNumber}`, uom: 'Nos', category: 'Equipment' as const, itemType: 'PneumaticAngleGrinder' })),
      ...wiredDrillingMachines.map((i) => ({ id: i.id, name: `Wired Drill ${i.serialNumber}`, uom: 'Nos', category: 'Equipment' as const, itemType: 'WiredDrillingMachine' })),
      ...cordlessDrillingMachines.map((i) => ({ id: i.id, name: `Cordless Drill ${i.serialNumber}`, uom: 'Nos', category: 'Equipment' as const, itemType: 'CordlessDrillingMachine' })),
      ...wiredAngleGrinders.map((i) => ({ id: i.id, name: `Wired Grinder ${i.serialNumber}`, uom: 'Nos', category: 'Equipment' as const, itemType: 'WiredAngleGrinder' })),
      ...cordlessAngleGrinders.map((i) => ({ id: i.id, name: `Cordless Grinder ${i.serialNumber}`, uom: 'Nos', category: 'Equipment' as const, itemType: 'CordlessAngleGrinder' })),
      ...cordlessReciprocatingSaws.map((i) => ({ id: i.id, name: `Reciprocating Saw ${i.serialNumber}`, uom: 'Nos', category: 'Equipment' as const, itemType: 'CordlessReciprocatingSaw' })),
    ];
    // Create a Set of unique names to avoid duplicates in the dropdown
    const uniqueNames = new Set(all.map(item => item.name));
    // Filter the original array to keep only the first occurrence of each name
    return Array.from(uniqueNames).map(name => all.find(item => item.name === name)!);
  }, [
    inventoryItems, consumableItems, utMachines, dftMachines, digitalCameras, anemometers, 
    laptopsDesktops, mobileSims, otherEquipments, weldingMachines, walkieTalkies,
    pneumaticDrillingMachines, pneumaticAngleGrinders, wiredDrillingMachines, 
    cordlessDrillingMachines, wiredAngleGrinders, cordlessAngleGrinders, 
    cordlessReciprocatingSaws
  ]);

  const groupedItems = useMemo(() => {
      return allItemsForQuote.reduce((acc, item) => {
          const category = item.category;
          if (!acc[category]) {
              acc[category] = [];
          }
          acc[category].push(item);
          return acc;
      }, {} as Record<string, SearchableQuotationItem[]>);
  }, [allItemsForQuote]);

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

  useEffect(() => {
    if (isOpen) {
        if (existingQuotation) {
            const items = existingQuotation.items || [];
            const vendorsWithSyncedQuotes = (existingQuotation.vendors || []).map(vendor => {
                const quotesAsObject = !Array.isArray(vendor.quotes) 
                    ? vendor.quotes 
                    : (vendor.quotes || []).reduce((acc: Record<string, QuotationQuote>, q) => {
                        if (q && q.itemId) acc[q.itemId] = q;
                        return acc;
                      }, {});
                
                const syncedQuotes = items.map(item => {
                    const existingQuote = quotesAsObject ? (quotesAsObject as any)[item.itemId] : undefined;
                    return {
                        itemId: item.itemId,
                        quantity: existingQuote?.quantity ?? 1,
                        rate: existingQuote?.rate ?? 0,
                        taxPercent: existingQuote?.taxPercent ?? 0,
                        receivedQuantity: existingQuote?.receivedQuantity ?? 0,
                    };
                });
                return { ...vendor, quotes: syncedQuotes };
            });

            form.reset({
                title: existingQuotation.title,
                items: items,
                vendors: vendorsWithSyncedQuotes,
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

  useEffect(() => {
    const items = form.getValues("items");
    const vendors = form.getValues("vendors");
  
    vendors.forEach((vendor, vIndex) => {
      if (!vendor.quotes || vendor.quotes.length !== items.length) {
        const existingQuotesMap = new Map((vendor.quotes || []).map(q => [q.itemId, q]));
        const newQuotes = items.map(item => {
            const existingQuote = existingQuotesMap.get(item.itemId);
            return {
                itemId: item.itemId,
                quantity: existingQuote?.quantity ?? 1,
                rate: existingQuote?.rate ?? 0,
                taxPercent: existingQuote?.taxPercent ?? 0,
                receivedQuantity: existingQuote?.receivedQuantity ?? 0,
            };
        });
        form.setValue(`vendors.${vIndex}.quotes`, newQuotes, { shouldDirty: true });
      }
    });
  }, [itemFields.length, form]);


  const onSubmit = (data: FormValues) => {
    console.log("FORM DATA:", data);
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
        quotes: itemFields.map(item => ({ itemId: item.itemId, quantity: 1, rate: 0, taxPercent: 0, receivedQuantity: 0 })),
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
  
  const handleItemSelect = (index: number, item: SearchableQuotationItem) => {
    form.setValue(`items.${index}.itemId`, item.id);
    form.setValue(`items.${index}.description`, item.name);
    form.setValue(`items.${index}.uom`, item.uom || 'Nos');
    form.setValue(`items.${index}.itemType`, item.itemType);
    setPopoverOpenState(prev => ({...prev, [index]: false}));
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
                            <Controller
                                name={`items.${index}.itemId`}
                                control={form.control}
                                render={({ field: controllerField }) => (
                                    <Popover open={popoverOpenState[index]} onOpenChange={(open) => setPopoverOpenState(prev => ({ ...prev, [index]: open }))}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                                                <span className="truncate">{form.getValues(`items.${index}.description`) || "Select item..."}</span>
                                                <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                            <Command>
                                                <CommandInput placeholder="Search all items..." />
                                                <CommandList>
                                                    <CommandEmpty>No items found.</CommandEmpty>
                                                    {Object.entries(groupedItems).map(([category, items]) => (
                                                        <CommandGroup key={category} heading={category}>
                                                            {items.map(item => (
                                                                <CommandItem
                                                                    key={item.id}
                                                                    value={item.name}
                                                                    onSelect={() => handleItemSelect(index, item)}
                                                                >
                                                                    <Check className={cn("mr-2 h-4 w-4", form.getValues(`items.${index}.itemId`) === item.id ? "opacity-100" : "opacity-0")} />
                                                                    {item.name}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    ))}
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                )}
                            />
                            <Input {...form.register(`items.${index}.uom`)} placeholder="UOM" className="w-24"/>
                            <Button type="button" variant="destructive" size="icon" onClick={() => removeItem(index)}><Trash2 className="h-4 w-4"/></Button>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => appendItem({ id: `item-${Date.now()}`, itemId: '', description: '', uom: '', itemType: '' })}><PlusCircle className="h-4 w-4 mr-2"/>Add Item</Button>
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
                                <div key={`${vendorIndex}-${itemIndex}`} className="grid grid-cols-[3fr,1fr,1fr,1fr] gap-4 items-center border-b py-2 last:border-b-0">
                                    <Label className="text-sm truncate">{form.watch(`items.${itemIndex}.description`) || `Item ${itemIndex + 1}`}</Label>
                                    <Input type="number" {...form.register(`vendors.${vendorIndex}.quotes.${itemIndex}.quantity`, { valueAsNumber: true })} placeholder="Qty"/>
                                    <Input type="number" {...form.register(`vendors.${vendorIndex}.quotes.${itemIndex}.rate`, { valueAsNumber: true })} placeholder="Rate"/>
                                    <Input type="number" {...form.register(`vendors.${vendorIndex}.quotes.${itemIndex}.taxPercent`, { valueAsNumber: true })} placeholder="Tax %" />
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
