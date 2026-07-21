'use client';

import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, Users2, X, Upload, ListChecks, Loader2, AlertTriangle, Check } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useMemo, useState } from 'react';
import type { Quotation, QuotationStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { usePurchase } from '@/contexts/purchase-provider';
import AddVendorDialog from '../vendor-management/AddVendorDialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import * as XLSX from 'xlsx';

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

const VendorCostSection = ({ vendorIndex, control }: { vendorIndex: number; control: any }) => {
    const { fields, append, remove } = useFieldArray({
        control,
        name: `vendors.${vendorIndex}.additionalCosts`
    });

    return (
        <div className="space-y-2 mt-4 p-3 bg-muted/30 rounded-md border">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Extra Costs (Freight, Cess etc)</p>
            {fields.map((field, index) => (
                <div className="flex gap-1 items-start" key={field.id}>
                    <Input {...control.register(`vendors.${vendorIndex}.additionalCosts.${index}.name`)} placeholder="Name" className="h-7 text-[10px]" />
                    <Input type="number" step="any" {...control.register(`vendors.${vendorIndex}.additionalCosts.${index}.value`)} placeholder="Value" className="h-7 text-[10px] w-20"/>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(index)}><Trash2 className="h-3.5 w-3.5 text-destructive"/></Button>
                </div>
            ))}
            <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] w-full" onClick={() => append({ id: `cost-${Date.now()}`, name: '', value: 0 })}>
                <PlusCircle className="h-3 w-3 mr-1"/> Add Cost
            </Button>
        </div>
    );
};

export default function CreateQuotationDialog({ isOpen, setIsOpen, existingQuotation }: { isOpen: boolean; setIsOpen: (open: boolean) => void; existingQuotation?: Quotation | null }) {
  const { vendors, addQuotation, updateQuotation } = usePurchase();
  const { toast } = useToast();
  const isEditMode = !!existingQuotation;

  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(quotationSchema),
    defaultValues: { title: '', items: [], vendors: [] },
  });

  const { control, setValue, getValues, watch, formState: { errors } } = form;

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
    e.target.value = ''; 
  };

  const onSubmit = async (data: FormValues) => {
    if (!data.vendors.length || !data.items.length) {
        toast({ title: "Missing items or vendors", variant: "destructive" });
        return;
    }
    
    setIsSubmitting(true);
    try {
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
        }
    } catch (e: any) {
        console.error("Save Error:", e);
        toast({ variant: 'destructive', title: 'Error', description: e.message || 'Submission failed' });
    } finally {
        setIsSubmitting(false);
    }
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
      <DialogContent className="max-w-[95vw] w-full h-[95vh] flex flex-col p-0 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-2xl">{isEditMode ? 'Edit' : 'New'} Price Comparison</DialogTitle>
          <DialogDescription>List items to quote and enter rates from multiple vendors. Side-by-side view for easier comparison.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pb-2">
            <div className="p-4 bg-muted/30 rounded-md border flex justify-between items-center gap-4">
              <div className="flex-1">
                <Label htmlFor="title" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Comparison Title</Label>
                <Input id="title" {...form.register('title')} placeholder="e.g., Monthly Consumables - Site A" className="mt-1 bg-background" />
                {errors.title && <p className="text-[10px] text-destructive mt-1 font-bold">{errors.title.message}</p>}
              </div>
              <div className="flex items-end gap-2">
                  <Input type="file" accept=".xlsx, .xls" className="hidden" id="item-import-file" onChange={handleImportItems} />
                  <Button type="button" variant="outline" asChild size="sm">
                      <label htmlFor="item-import-file" className="cursor-pointer">
                          <Upload className="h-3.5 w-3.5 mr-2"/>Bulk Import Items
                      </label>
                  </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden px-6 pb-2">
            <Accordion type="multiple" defaultValue={["items", "vendors"]} className="flex-1 flex flex-col gap-4 overflow-hidden">
              
              <AccordionItem value="items" className="border rounded-lg bg-card shrink-0">
                <AccordionTrigger className="px-4 py-2 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-primary" />
                    <span className="text-sm font-bold uppercase tracking-wider">1. Items to Quote ({itemFields.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 pt-0">
                  <ScrollArea className="max-h-[200px]">
                      <div className="space-y-2 mt-2">
                          {itemFields.map((field, index) => (
                              <div className="flex gap-2 items-start" key={field.id}>
                                  <div className="w-8 pt-2 text-[10px] font-black text-muted-foreground text-center">{index + 1}.</div>
                                  <div className="flex-1">
                                      <Input {...form.register(`items.${index}.description`)} placeholder="Item Name / Description" className="h-8 text-sm" />
                                  </div>
                                  <div className="w-20">
                                      <Input {...form.register(`items.${index}.uom`)} placeholder="UOM" className="h-8 text-sm" />
                                  </div>
                                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemoveItemRow(index)}><Trash2 className="h-3.5 w-3.5 text-destructive"/></Button>
                              </div>
                          ))}
                          <Button type="button" variant="outline" size="sm" className="w-full h-8 border-dashed mt-2" onClick={handleAddItemRow}>
                              <PlusCircle className="h-3.5 w-3.5 mr-2"/>Add Item Row
                          </Button>
                      </div>
                  </ScrollArea>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="vendors" className="border rounded-lg bg-card flex-1 flex flex-col overflow-hidden">
                <AccordionTrigger className="px-4 py-2 hover:no-underline shrink-0">
                  <div className="flex items-center gap-2">
                    <Users2 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-bold uppercase tracking-wider">2. Vendor Comparison ({vendorFields.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="flex-1 flex flex-col overflow-hidden p-0">
                   <div className="flex-1 flex flex-col overflow-hidden border-t">
                      <ScrollArea className="flex-1">
                          <div className="flex h-full">
                              <div className="w-[300px] shrink-0 border-r bg-muted/20 sticky left-0 z-20">
                                  <div className="h-[60px] p-3 border-b flex items-center bg-muted/30">
                                      <span className="text-[11px] font-black uppercase text-muted-foreground">Item Description</span>
                                  </div>
                                  {itemFields.map((item, idx) => (
                                      <div key={item.id} className="h-[48px] p-3 border-b flex items-center bg-card">
                                          <span className="text-xs font-bold truncate" title={watch(`items.${idx}.description`)}>
                                              {idx + 1}. {watch(`items.${idx}.description`) || 'Untitled Item'}
                                          </span>
                                      </div>
                                  ))}
                              </div>

                              <div className="flex flex-1 overflow-x-auto min-w-0">
                                  {vendorFields.map((vendorField, vIdx) => (
                                      <div key={vendorField.id} className={cn("w-[280px] shrink-0 border-r", vIdx === 0 && "bg-blue-50/10")}>
                                          <div className="h-[60px] p-2 border-b bg-muted/10 flex flex-col justify-center gap-1">
                                              <div className="flex items-center gap-1">
                                                  <Select value={watch(`vendors.${vIdx}.vendorId`)} onValueChange={(val) => handleVendorSelect(vIdx, val)}>
                                                      <SelectTrigger className="h-7 text-[10px] font-bold"><SelectValue placeholder="Select Vendor"/></SelectTrigger>
                                                      <SelectContent>{vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                                                  </Select>
                                                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeVendor(vIdx)}><X className="h-3 w-3"/></Button>
                                              </div>
                                              {vIdx === 0 && <span className="text-[9px] font-black text-blue-600 uppercase text-center block">Primary Source</span>}
                                          </div>

                                          {itemFields.map((item, iIdx) => (
                                              <div key={`${vendorField.id}-${iIdx}`} className="h-[48px] p-2 border-b flex items-center gap-1">
                                                  <div className="flex-1 space-y-0.5">
                                                      <Label className="text-[9px] text-muted-foreground font-bold uppercase block px-1">Qty</Label>
                                                      <Controller
                                                        name={`vendors.${vIdx}.quotes.${iIdx}.quantity`}
                                                        control={control}
                                                        render={({ field }) => (
                                                          <Input 
                                                              type="number" 
                                                              step="any"
                                                              className="h-7 text-xs text-center px-1"
                                                              value={field.value ?? ''}
                                                              onChange={(e) => {
                                                                const val = e.target.value;
                                                                const numVal = val === '' ? 0 : Number(val);
                                                                field.onChange(numVal);
                                                                if (vIdx === 0) {
                                                                  vendorFields.forEach((_, otherIdx) => {
                                                                    if (otherIdx !== 0) setValue(`vendors.${otherIdx}.quotes.${iIdx}.quantity`, numVal);
                                                                  });
                                                                }
                                                              }}
                                                          />
                                                        )}
                                                      />
                                                  </div>
                                                  <div className="flex-1 space-y-0.5">
                                                      <Label className="text-[9px] text-muted-foreground font-bold uppercase block px-1">Rate</Label>
                                                      <Controller
                                                        name={`vendors.${vIdx}.quotes.${iIdx}.rate`}
                                                        control={control}
                                                        render={({ field }) => (
                                                          <Input 
                                                              type="number" 
                                                              step="any"
                                                              placeholder=""
                                                              className="h-7 text-xs text-right font-bold text-primary px-1"
                                                              value={field.value || ''}
                                                              onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                                                          />
                                                        )}
                                                      />
                                                  </div>
                                                  <div className="flex-1 space-y-0.5">
                                                      <Label className="text-[9px] text-muted-foreground font-bold uppercase block px-1">Tax%</Label>
                                                      <Controller
                                                        name={`vendors.${vIdx}.quotes.${iIdx}.taxPercent`}
                                                        control={control}
                                                        render={({ field }) => (
                                                          <Input 
                                                              type="number" 
                                                              step="any"
                                                              className="h-7 text-xs text-center px-1"
                                                              value={field.value ?? ''}
                                                              onChange={(e) => {
                                                                const val = e.target.value;
                                                                const numVal = val === '' ? 0 : Number(val);
                                                                field.onChange(numVal);
                                                                if (vIdx === 0) {
                                                                  vendorFields.forEach((_, otherIdx) => {
                                                                    if (otherIdx !== 0) setValue(`vendors.${otherIdx}.quotes.${iIdx}.taxPercent`, numVal);
                                                                  });
                                                                }
                                                              }}
                                                          />
                                                        )}
                                                      />
                                                  </div>
                                              </div>
                                          ))}
                                          
                                          <div className="p-3 bg-muted/5">
                                              <VendorCostSection vendorIndex={vIdx} control={control} />
                                          </div>
                                      </div>
                                  ))}
                                  
                                  <div className="w-[100px] shrink-0 border-r bg-muted/20 flex items-center justify-center">
                                      <Button type="button" variant="ghost" className="h-full w-full flex-col gap-2 rounded-none" onClick={handleAddVendor}>
                                          <PlusCircle className="h-6 w-6"/>
                                          <span className="text-[10px] font-black uppercase">Add Vendor</span>
                                      </Button>
                                  </div>
                              </div>
                          </div>
                          <ScrollBar orientation="horizontal" />
                      </ScrollArea>
                   </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          
          <div className="p-6 pt-2 border-t bg-card shrink-0 flex justify-between items-center">
            <div className="flex gap-4">
                {errors.vendors && <p className="text-[11px] text-destructive font-bold flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5"/> Please select a merchant for each quote.</p>}
            </div>
            <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" className="min-w-[140px]" disabled={isSubmitting}>
                    {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Saving...</> : (isEditMode ? 'Save Changes' : 'Create Comparison')}
                </Button>
            </div>
          </div>
        </form>
        <AddVendorDialog isOpen={isAddVendorOpen} setIsOpen={setIsAddVendorOpen} />
      </DialogContent>
    </Dialog>
  );
}
