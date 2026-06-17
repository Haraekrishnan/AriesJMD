'use client';

import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, Users2, X, ChevronsUpDown, Check, ListChecks } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { useEffect, useMemo, useState } from 'react';
import type { Quotation, QuotationItem, QuotationQuote, QuotationVendorDetails, QuotationStatus } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { usePurchase } from '@/contexts/purchase-provider';
import { useInventory } from '@/contexts/inventory-provider';
import { useConsumable } from '@/contexts/consumable-provider';
import AddNewItemForQuoteDialog from './AddNewItemForQuoteDialog';
import type { NewItemForQuoteValues } from './AddNewItemForQuoteDialog';
import AddVendorDialog from '../vendor-management/AddVendorDialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';

const quotationItemSchema = z.object({
    id: z.string(),
    itemId: z.string().min(1, "Item selection is required"),
    description: z.string().min(1, "Description is required"),
    uom: z.string().min(1, "UOM is required"),
    itemType: z.string().min(1, 'Item Type is required'),
    isNew: z.boolean().optional(),
    newItemCategory: z.enum(['Store Inventory', 'Equipment', 'Daily Consumable', 'Job Consumable', 'PPE']).optional(),
});

const quotationVendorSchema = z.object({
    id: z.string(),
    vendorId: z.string().min(1, "Please select a vendor"),
    name: z.string(),
    quotes: z.array(z.object({
        itemId: z.string(),
        quantity: z.coerce.number().min(0),
        rate: z.coerce.number().min(0),
        taxPercent: z.coerce.number().min(0).max(100),
        receivedQuantity: z.coerce.number().optional(),
    })),
    additionalCosts: z.array(z.object({
        id: z.string(),
        name: z.string().min(1, "Cost name is required"),
        value: z.coerce.number().min(0, "Value must be non-negative"),
    })).optional(),
});

const quotationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  items: z.array(quotationItemSchema).min(1, "Add at least one item."),
  vendors: z.array(quotationVendorSchema).min(1, "Add at least one vendor."),
});

type FormValues = z.infer<typeof quotationSchema>;

const VendorQuoteSection = ({ vendorIndex, control, formState }: { vendorIndex: number; control: any; formState: any }) => {
    const { fields, append, remove } = useFieldArray({
        control,
        name: `vendors.${vendorIndex}.additionalCosts`
    });

    return (
        <div className="space-y-2">
            {fields.map((field, index) => (
                <div className="flex gap-2 items-start" key={field.id}>
                    <div className="flex-1">
                      <Input {...control.register(`vendors.${vendorIndex}.additionalCosts.${index}.name`)} placeholder="Cost Name (e.g. Cess)" />
                    </div>
                    <div className="flex-1">
                      <Input type="number" step="any" {...control.register(`vendors.${vendorIndex}.additionalCosts.${index}.value`)} placeholder="Value"/>
                    </div>
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
    id: string;
    name: string;
    category: 'Store Inventory' | 'Equipment' | 'Consumables' | 'PPE';
    uom?: string;
    itemType: string;
};

export default function CreateQuotationDialog({ isOpen, setIsOpen, existingQuotation }: { isOpen: boolean; setIsOpen: (open: boolean) => void; existingQuotation?: Quotation | null }) {
  const { vendors, addQuotation, updateQuotation } = usePurchase();
  const { 
    inventoryItems, utMachines, dftMachines, digitalCameras, anemometers, otherEquipments, laptopsDesktops, mobileSims, 
    weldingMachines, walkieTalkies, pneumaticDrillingMachines, pneumaticAngleGrinders, wiredDrillingMachines, 
    cordlessDrillingMachines, wiredAngleGrinders, cordlessAngleGrinders, cordlessReciprocatingSaws
  } = useInventory();
  const { consumableItems } = useConsumable();
  const { toast } = useToast();
  const isEditMode = !!existingQuotation;

  const [popoverOpenState, setPopoverOpenState] = useState<Record<number, boolean>>({});
  const [isNewItemDialogOpen, setIsNewItemDialogOpen] = useState(false);
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);

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
      { id: 'ppe-shoes', name: 'Safety Shoes', uom: 'Pairs', category: 'PPE' as const, itemType: 'PPE' },
    ];
    const uniqueNames = new Set(all.map(item => item.name));
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

  const { control, setValue, getValues, watch } = form;

  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
    control,
    name: "items"
  });
  
  const { fields: vendorFields, append: appendVendor, remove: removeVendor } = useFieldArray({
    control,
    name: "vendors"
  });

  useEffect(() => {
    if (isOpen) {
        if (existingQuotation) {
            const itemsFromQuote = existingQuotation.items || [];
            const vendorsWithSyncedQuotes = (existingQuotation.vendors || []).map(vendor => {
                const quotesArray = Array.isArray(vendor.quotes) ? vendor.quotes : Object.values(vendor.quotes || {});
                const quotesMap = new Map<string, QuotationQuote>();
                quotesArray.forEach(q => {
                    if (q?.itemId) {
                        quotesMap.set(q.itemId, q);
                    }
                });
                const syncedQuotes = itemsFromQuote.map(item => {
                    const existingQuote = quotesMap.get(item.itemId);
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
                items: itemsFromQuote,
                vendors: vendorsWithSyncedQuotes,
            });
        } else {
            form.reset({ title: '', items: [], vendors: [] });
        }
    }
  }, [isOpen, existingQuotation, form]);

  const firstVendorQuotes = useWatch({
    control,
    name: 'vendors.0.quotes'
  });

  useEffect(() => {
    if (!firstVendorQuotes || firstVendorQuotes.length === 0) return;
    const currentVendors = getValues('vendors');
    if (!currentVendors || currentVendors.length <= 1) return;

    currentVendors.forEach((vendor, vIndex) => {
        if (vIndex === 0) return;
        firstVendorQuotes.forEach((quote, iIndex) => {
            if (!quote) return;
            const currentQty = getValues(`vendors.${vIndex}.quotes.${iIndex}.quantity`);
            const currentTax = getValues(`vendors.${vIndex}.quotes.${iIndex}.taxPercent`);
            
            if (currentQty !== quote.quantity) {
                setValue(`vendors.${vIndex}.quotes.${iIndex}.quantity`, quote.quantity);
            }
            if (currentTax !== quote.taxPercent) {
                setValue(`vendors.${vIndex}.quotes.${iIndex}.taxPercent`, quote.taxPercent);
            }
        });
    });
  }, [firstVendorQuotes, getValues, setValue]);

  const onSubmit = async (data: FormValues) => {
    if (!data.vendors.length || !data.items.length) {
        toast({ title: "Missing items or vendors", variant: "destructive" });
        return;
    }
    
    let success = false;
    if (isEditMode && existingQuotation) {
        success = await updateQuotation({ ...existingQuotation, ...data });
        if (success) toast({ title: "Price Comparison Updated" });
    } else {
        success = await addQuotation(data);
        if (success) toast({ title: "Price Comparison Created" });
    }
    
    if (success) {
        setIsOpen(false);
    } else {
        toast({ title: "Failed to save. Check your connection.", variant: "destructive" });
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) form.reset();
    setIsOpen(open);
  };
  
  const handleAddItemRow = () => {
    const tempId = `row-${Date.now()}`;
    appendItem({ id: tempId, itemId: '', description: '', uom: 'Nos', itemType: 'Inventory' });
    
    // Crucial: Add a corresponding quote entry to ALL current vendors
    const currentVendors = getValues('vendors');
    currentVendors.forEach((_, vIndex) => {
        const currentQuotes = getValues(`vendors.${vIndex}.quotes`) || [];
        setValue(`vendors.${vIndex}.quotes`, [
            ...currentQuotes,
            { itemId: '', quantity: 1, rate: 0, taxPercent: 0, receivedQuantity: 0 }
        ]);
    });
  };

  const handleRemoveItemRow = (index: number) => {
    removeItem(index);
    const currentVendors = getValues('vendors');
    currentVendors.forEach((_, vIndex) => {
        const currentQuotes = getValues(`vendors.${vIndex}.quotes`) || [];
        const newQuotes = [...currentQuotes];
        newQuotes.splice(index, 1);
        setValue(`vendors.${vIndex}.quotes`, newQuotes);
    });
  };

  const handleAddVendor = () => {
    const items = getValues('items');
    appendVendor({
        id: `vendor-${Date.now()}`,
        vendorId: '',
        name: '',
        quotes: items.map(item => ({ itemId: item.itemId, quantity: 1, rate: 0, taxPercent: 0, receivedQuantity: 0 })),
        additionalCosts: [],
    });
  };

  const handleVendorSelect = (vendorIndex: number, vendorId: string) => {
    const vendor = vendors.find(v => v.id === vendorId);
    if(vendor) {
        setValue(`vendors.${vendorIndex}.vendorId`, vendor.id);
        setValue(`vendors.${vendorIndex}.name`, vendor.name);
    }
  };
  
  const handleItemSelect = (index: number, item: SearchableQuotationItem) => {
    setValue(`items.${index}.itemId`, item.id);
    setValue(`items.${index}.description`, item.name);
    setValue(`items.${index}.uom`, item.uom || 'Nos');
    setValue(`items.${index}.itemType`, item.itemType);
    
    // Update all vendors' quote arrays for this item index
    const currentVendors = getValues('vendors');
    currentVendors.forEach((_, vIndex) => {
        setValue(`vendors.${vIndex}.quotes.${index}.itemId`, item.id);
    });

    setPopoverOpenState(prev => ({...prev, [index]: false}));
  };

  const handleNewItemCreate = (data: NewItemForQuoteValues) => {
    const tempId = `new-${Date.now()}`;
    const newItem = {
        id: tempId,
        itemId: tempId,
        description: data.name,
        uom: data.uom,
        itemType: data.category === 'PPE' ? 'PPE' : data.category,
        isNew: true,
        newItemCategory: data.category,
    };
    
    appendItem(newItem);
    
    const currentVendors = getValues('vendors');
    currentVendors.forEach((_, vIndex) => {
        const currentQuotes = getValues(`vendors.${vIndex}.quotes`) || [];
        setValue(`vendors.${vIndex}.quotes`, [
            ...currentQuotes,
            { itemId: tempId, quantity: 1, rate: 0, taxPercent: 0, receivedQuantity: 0 }
        ]);
    });
    
    setIsNewItemDialogOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit' : 'New'} Price Comparison</DialogTitle>
          <DialogDescription>Add items and vendors to compare quotes. Quantity and Tax % from the first vendor will auto-fill others.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 bg-muted/30 rounded-md border mb-4">
            <Label htmlFor="title" className="text-base font-semibold">Comparison Title</Label>
            <Input id="title" {...form.register('title')} placeholder="e.g., Monthly Consumables - Site A" className="mt-1 bg-background" />
             {form.formState.errors.title && <p className="text-xs text-destructive mt-1">{form.formState.errors.title.message}</p>}
          </div>

          <ScrollArea className="flex-1">
            <Accordion type="multiple" defaultValue={["items", "vendors"]} className="space-y-4 pr-4">
              <AccordionItem value="items" className="border rounded-lg bg-card">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-5 w-5 text-primary" />
                    <span className="text-lg font-bold">1. Manage Items to Quote ({itemFields.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 pt-0">
                  <div className="space-y-2 mt-2">
                      {itemFields.map((field, index) => (
                          <div className="flex gap-2 items-start" key={field.id}>
                              <div className="w-12 pt-2 text-xs font-bold text-muted-foreground text-center">{index + 1}.</div>
                              <div className="flex-1">
                                <Controller
                                    name={`items.${index}.itemId`}
                                    control={control}
                                    render={({ field: controllerField }) => (
                                        <Popover open={popoverOpenState[index]} onOpenChange={(open) => setPopoverOpenState(prev => ({ ...prev, [index]: open }))}>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="w-full justify-start text-left font-normal">
                                                    <span className="truncate">{form.watch(`items.${index}.description`) || "Select item..."}</span>
                                                    <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50"/>
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                <Command>
                                                    <CommandInput placeholder="Search all items..." />
                                                    <CommandList>
                                                        <CommandEmpty>No items found.</CommandEmpty>
                                                        <CommandItem key="add-new-item" onSelect={() => {
                                                            setIsNewItemDialogOpen(true);
                                                            setPopoverOpenState(prev => { const s = {...prev}; s[index] = false; return s; });
                                                        }}>
                                                            <PlusCircle className="mr-2 h-4 w-4" />
                                                            <span>Add New Item...</span>
                                                        </CommandItem>
                                                        {Object.entries(groupedItems).map(([category, items]) => (
                                                            <CommandGroup heading={category} key={category}>
                                                                {items.map(item => (
                                                                    <CommandItem
                                                                        key={item.id}
                                                                        value={item.name}
                                                                        onSelect={() => handleItemSelect(index, item)}
                                                                    >
                                                                        <Check className={cn("mr-2 h-4 w-4", controllerField.value === item.id ? "opacity-100" : "opacity-0")} />
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
                                {form.formState.errors.items?.[index]?.itemId && <p className="text-xs text-destructive mt-1">{form.formState.errors.items[index].itemId.message}</p>}
                              </div>
                              <Input {...form.register(`items.${index}.uom`)} placeholder="UOM" className="w-24"/>
                              <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItemRow(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                          </div>
                      ))}
                      <div className="flex justify-center pt-2">
                        <Button type="button" variant="outline" size="sm" onClick={handleAddItemRow}>
                            <PlusCircle className="h-4 w-4 mr-2"/>Add Row
                        </Button>
                      </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="vendors" className="border rounded-lg bg-card">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Users2 className="h-5 w-5 text-primary" />
                    <span className="text-lg font-bold">2. Manage Vendors & Quotes ({vendorFields.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 pt-0">
                   <div className="space-y-6 mt-2">
                     {vendorFields.map((vendorField, vendorIndex) => (
                      <Card key={vendorField.id} className={cn(vendorIndex === 0 && "border-primary shadow-sm")}>
                          <CardHeader className="flex-row items-center justify-between p-4 bg-muted/20">
                              <div className="flex items-center gap-4">
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                      <Label className="font-bold whitespace-nowrap">Vendor {vendorIndex + 1}:</Label>
                                      <Select value={form.watch(`vendors.${vendorIndex}.vendorId`)} onValueChange={(vendorId) => handleVendorSelect(vendorIndex, vendorId)}>
                                          <SelectTrigger className="w-64 bg-background"><SelectValue placeholder="Select Vendor"/></SelectTrigger>
                                          <SelectContent>{vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                                      </Select>
                                      <Button type="button" variant="outline" size="sm" onClick={() => setIsAddVendorOpen(true)}>New Vendor</Button>
                                    </div>
                                    {form.formState.errors.vendors?.[vendorIndex]?.vendorId && <p className="text-xs text-destructive">{form.formState.errors.vendors[vendorIndex]!.vendorId!.message}</p>}
                                  </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {vendorIndex === 0 && <Badge variant="secondary" className="bg-primary/10 text-primary">Master Data Source</Badge>}
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeVendor(vendorIndex)}><X className="h-4 w-4"/></Button>
                              </div>
                          </CardHeader>
                          <CardContent className="p-4 pt-4">
                             <div className="grid grid-cols-[3fr,1fr,1fr,1fr] gap-4 mb-2 font-bold text-xs uppercase tracking-wider text-muted-foreground border-b pb-2 px-2">
                                <span>Item Description</span>
                                <span className="text-center">Quantity</span>
                                <span className="text-center">Rate (INR)</span>
                                <span className="text-center">Tax %</span>
                            </div>
                            {itemFields.map((itemField, itemIndex) => (
                                <div className="grid grid-cols-[3fr,1fr,1fr,1fr] gap-4 items-center border-b py-2 last:border-b-0 hover:bg-muted/10 px-2" key={`${vendorField.id}-${itemIndex}`}>
                                    <Label className="text-sm truncate">{form.watch(`items.${itemIndex}.description`) || `Item ${itemIndex + 1}`}</Label>
                                    <div>
                                        <Input type="number" step="any" {...form.register(`vendors.${vendorIndex}.quotes.${itemIndex}.quantity`)} className="text-center h-8"/>
                                    </div>
                                    <div>
                                        <Input type="number" step="any" {...form.register(`vendors.${vendorIndex}.quotes.${itemIndex}.rate`)} className="text-right h-8"/>
                                    </div>
                                    <div>
                                        <Input type="number" step="any" {...form.register(`vendors.${vendorIndex}.quotes.${itemIndex}.taxPercent`)} className="text-center h-8"/>
                                    </div>
                                </div>
                            ))}
                            <div className="mt-6 pt-4 border-t">
                                <h5 className="font-semibold text-sm mb-3">Additional Costs & Charges</h5>
                                <VendorQuoteSection vendorIndex={vendorIndex} control={control} formState={form.formState} />
                            </div>
                          </CardContent>
                      </Card>
                   ))}
                    <Button type="button" variant="outline" className="w-full border-dashed" onClick={handleAddVendor} disabled={itemFields.length === 0}>
                        <PlusCircle className="h-4 w-4 mr-2"/>Add Vendor Quote
                    </Button>
                 </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </ScrollArea>
          
          <DialogFooter className="pt-4 border-t mt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" className="min-w-[120px]">{isEditMode ? 'Save Changes' : 'Create Comparison'}</Button>
          </DialogFooter>
        </form>
         <AddNewItemForQuoteDialog
            isOpen={isNewItemDialogOpen}
            setIsOpen={setIsNewItemDialogOpen}
            onItemCreate={handleNewItemCreate}
        />
        <AddVendorDialog isOpen={isAddVendorOpen} setIsOpen={setIsAddVendorOpen} />
      </DialogContent>
    </Dialog>
  );
}
