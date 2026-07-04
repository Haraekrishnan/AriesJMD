'use client';

import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, Users2, X, Upload, ListChecks, Info } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { useEffect, useMemo, useState } from 'react';
import type { Quotation, QuotationItem, QuotationQuote, QuotationVendorDetails, QuotationStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { usePurchase } from '@/contexts/purchase-provider';
import AddVendorDialog from '../vendor-management/AddVendorDialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import * as XLSX from 'xlsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const quotationItemSchema = z.object({
    id: z.string(),
    itemId: z.string(),
    description: z.string().min(1, "Description is required"),
    uom: z.string().min(1, "UOM is required"),
    itemType: z.string().optional(),
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

const VendorQuoteSection = ({ vendorIndex, control }: { vendorIndex: number; control: any }) => {
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

export default function CreateQuotationDialog({ isOpen, setIsOpen, existingQuotation }: { isOpen: boolean; setIsOpen: (open: boolean) => void; existingQuotation?: Quotation | null }) {
  const { vendors, addQuotation, updateQuotation } = usePurchase();
  const { toast } = useToast();
  const isEditMode = !!existingQuotation;

  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(quotationSchema),
    defaultValues: { title: '', items: [], vendors: [] },
  });

  const { control, setValue, getValues, watch } = form;

  const { fields: itemFields, append: appendItem, remove: removeItem, replace: replaceItems } = useFieldArray({
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
            form.reset({
                title: existingQuotation.title,
                items: existingQuotation.items || [],
                vendors: existingQuotation.vendors || [],
            });
        } else {
            form.reset({ title: '', items: [], vendors: [] });
        }
    }
  }, [isOpen, existingQuotation, form]);

  const handleImportItems = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = new Uint8Array(event.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json: any[] = XLSX.utils.sheet_to_json(sheet);

            const newItems = json.map((row, idx) => ({
                id: `import-${Date.now()}-${idx}`,
                itemId: `import-${Date.now()}-${idx}`,
                description: String(row.Description || row.Item || ''),
                uom: String(row.UOM || row.Unit || 'Nos'),
                itemType: 'Manual'
            })).filter(item => item.description);

            if (newItems.length === 0) {
                toast({ title: "No valid items found", description: "Ensure your columns are named 'Description' and 'UOM'.", variant: "destructive" });
                return;
            }

            replaceItems(newItems);
            
            // Sync vendors with new empty quotes for these items
            const currentVendors = getValues('vendors');
            currentVendors.forEach((v, vIndex) => {
                setValue(`vendors.${vIndex}.quotes`, newItems.map(item => ({
                    itemId: item.itemId,
                    quantity: 1,
                    rate: 0,
                    taxPercent: 0,
                    receivedQuantity: 0
                })));
            });

            toast({ title: "Items Imported", description: `${newItems.length} items added successfully.` });
        } catch (error) {
            console.error(error);
            toast({ title: "Import Failed", description: "Invalid Excel format.", variant: "destructive" });
        }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; // Reset input
  };

  const onSubmit = (data: FormValues) => {
    if (!data.vendors.length || !data.items.length) {
        toast({ title: "Missing items or vendors", variant: "destructive" });
        return;
    }
    
    if (isEditMode && existingQuotation) {
        updateQuotation({ ...existingQuotation, ...data });
        toast({ title: "Price Comparison Updated" });
    } else {
        addQuotation(data);
        toast({ title: "Price Comparison Created" });
    }
    
    setIsOpen(false);
  };

  const handleAddItemRow = () => {
    const tempId = `row-${Date.now()}`;
    appendItem({ id: tempId, itemId: tempId, description: '', uom: 'Nos', itemType: 'Manual' });
    
    const currentVendors = getValues('vendors');
    currentVendors.forEach((_, vIndex) => {
        const currentQuotes = getValues(`vendors.${vIndex}.quotes`) || [];
        setValue(`vendors.${vIndex}.quotes`, [
            ...currentQuotes,
            { itemId: tempId, quantity: 1, rate: 0, taxPercent: 0, receivedQuantity: 0 }
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit' : 'New'} Price Comparison</DialogTitle>
          <DialogDescription>List items to quote and enter rates from multiple vendors. Use the Import feature for long lists.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 bg-muted/30 rounded-md border mb-4 flex justify-between items-center">
            <div className="flex-1 mr-4">
              <Label htmlFor="title" className="text-base font-semibold">Comparison Title</Label>
              <Input id="title" {...form.register('title')} placeholder="e.g., Monthly Consumables - Site A" className="mt-1 bg-background" />
            </div>
            <div className="flex items-end gap-2">
                <Input type="file" accept=".xlsx, .xls" className="hidden" id="item-import-file" onChange={handleImportItems} />
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center gap-2">
                                <Button type="button" variant="outline" asChild>
                                    <label htmlFor="item-import-file" className="cursor-pointer">
                                        <Upload className="h-4 w-4 mr-2"/>Bulk Import Items
                                    </label>
                                </Button>
                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-xs">
                            <p className="font-bold mb-1 text-sm text-primary">Excel Import Guide:</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              Your Excel file must have a header row with these exact column names in the first sheet:
                            </p>
                            <ul className="list-disc list-inside mt-2 text-xs space-y-1 font-medium">
                                <li><strong>Description</strong> (Item details)</li>
                                <li><strong>UOM</strong> (Unit, e.g. Nos, kg)</li>
                            </ul>
                            <p className="mt-2 text-[10px] text-muted-foreground italic">Note: These will be added to Section 1 below.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <Accordion type="multiple" defaultValue={["items", "vendors"]} className="space-y-4 pr-4">
              <AccordionItem value="items" className="border rounded-lg bg-card">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-5 w-5 text-primary" />
                    <span className="text-lg font-bold">1. Items to Quote ({itemFields.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 pt-0">
                  <div className="space-y-2 mt-2">
                      {itemFields.map((field, index) => (
                          <div className="flex gap-2 items-start" key={field.id}>
                              <div className="w-12 pt-2 text-xs font-bold text-muted-foreground text-center">{index + 1}.</div>
                              <div className="flex-1">
                                <Input {...form.register(`items.${index}.description`)} placeholder="Item Name / Description" />
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
                    <span className="text-lg font-bold">2. Vendor Quotes ({vendorFields.length})</span>
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
                                  </div>
                              </div>
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeVendor(vendorIndex)}><X className="h-4 w-4"/></Button>
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
                                        <Input 
                                            type="number" 
                                            step="any" 
                                            {...form.register(`vendors.${vendorIndex}.quotes.${itemIndex}.quantity`, {
                                                onChange: (e) => {
                                                    if (vendorIndex === 0) {
                                                        const val = e.target.value;
                                                        vendorFields.forEach((_, vIdx) => {
                                                            if (vIdx !== 0) setValue(`vendors.${vIdx}.quotes.${itemIndex}.quantity`, Number(val));
                                                        });
                                                    }
                                                }
                                            })} 
                                            className="text-center h-8"
                                        />
                                    </div>
                                    <div>
                                        <Input type="number" step="any" {...form.register(`vendors.${vendorIndex}.quotes.${itemIndex}.rate`)} className="text-right h-8"/>
                                    </div>
                                    <div>
                                        <Input 
                                            type="number" 
                                            step="any" 
                                            {...form.register(`vendors.${vendorIndex}.quotes.${itemIndex}.taxPercent`, {
                                                onChange: (e) => {
                                                    if (vendorIndex === 0) {
                                                        const val = e.target.value;
                                                        vendorFields.forEach((_, vIdx) => {
                                                            if (vIdx !== 0) setValue(`vendors.${vIdx}.quotes.${itemIndex}.taxPercent`, Number(val));
                                                        });
                                                    }
                                                }
                                            })} 
                                            className="text-center h-8"
                                        />
                                    </div>
                                </div>
                            ))}
                            <div className="mt-6 pt-4 border-t">
                                <h5 className="font-semibold text-sm mb-3">Additional Costs & Charges</h5>
                                <VendorQuoteSection vendorIndex={vendorIndex} control={control} />
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
        <AddVendorDialog isOpen={isAddVendorOpen} setIsOpen={setIsAddVendorOpen} />
      </DialogContent>
    </Dialog>
  );
}
