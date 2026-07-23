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
import type { Quotation, QuotationItem, QuotationQuote, QuotationVendorDetails, QuotationStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { usePurchase } from '@/contexts/purchase-provider';
import AddVendorDialog from '../vendor-management/AddVendorDialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
        <div className="space-y-4 mt-4 p-4 bg-muted/30 rounded-md border">
            <p className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-2">Extra Costs (Freight, Cess etc)</p>
            {fields.map((field, index) => (
                <div className="flex gap-2 items-start" key={field.id}>
                    <Input {...control.register(`vendors.${vendorIndex}.additionalCosts.${index}.name`)} placeholder="Cost Name" className="h-10 text-sm font-medium" />
                    <Input type="number" step="any" {...control.register(`vendors.${vendorIndex}.additionalCosts.${index}.value`)} placeholder="Value" className="h-10 text-sm w-32 font-bold text-right"/>
                    <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-destructive/10" onClick={() => remove(index)}><Trash2 className="h-5 w-5"/></Button>
                </div>
            ))}
            <Button type="button" variant="ghost" size="sm" className="h-9 text-xs w-full font-bold uppercase tracking-wider" onClick={() => append({ id: `cost-${Date.now()}`, name: '', value: 0 })}>
                <PlusCircle className="h-4 w-4 mr-2"/> Add Additional Cost
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
    const firstVendorQuotes = getValues('vendors.0.quotes');
    
    appendVendor({
        id: `vendor-${Date.now()}`,
        vendorId: '',
        name: '',
        quotes: items.map((item, idx) => ({
            itemId: item.itemId,
            quantity: firstVendorQuotes ? (firstVendorQuotes[idx]?.quantity ?? 1) : 1,
            rate: 0,
            taxPercent: firstVendorQuotes ? (firstVendorQuotes[idx]?.taxPercent ?? 0) : 0,
            receivedQuantity: 0
        })),
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
      <DialogContent className="max-w-[98vw] w-full h-[95vh] flex flex-col p-0 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="p-8 pb-4">
          <DialogTitle className="text-3xl font-black tracking-tight">{isEditMode ? 'EDIT' : 'NEW'} PRICE COMPARISON</DialogTitle>
          <DialogDescription className="text-lg font-medium text-muted-foreground mt-1">List items and enter merchant rates side-by-side for rapid evaluation.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-8 pb-4">
            <div className="p-6 bg-muted/40 rounded-xl border-2 flex justify-between items-center gap-8 shadow-sm">
              <div className="flex-1">
                <Label htmlFor="title" className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Comparison Title</Label>
                <Input id="title" {...form.register('title')} placeholder="e.g., Monthly Consumables - Site A" className="mt-2 bg-background h-12 text-lg font-bold border-muted-foreground/20 focus:border-primary transition-all" />
                {errors.title && <p className="text-sm text-destructive mt-2 font-bold flex items-center gap-1"><AlertTriangle className="h-4 w-4"/>{errors.title.message}</p>}
              </div>
              <div className="flex items-end gap-3">
                  <Input type="file" accept=".xlsx, .xls" className="hidden" id="item-import-file" onChange={handleImportItems} />
                  <Button type="button" variant="outline" asChild className="h-12 px-8 font-bold uppercase tracking-wider border-2 hover:bg-muted transition-colors">
                      <label htmlFor="item-import-file" className="cursor-pointer flex items-center gap-2">
                          <Upload className="h-5 w-5"/>Excel Import
                      </label>
                  </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden px-8 pb-4">
            <Accordion type="multiple" defaultValue={["items", "vendors"]} className="flex-1 flex flex-col gap-6 overflow-hidden">
              
              <AccordionItem value="items" className="border rounded-xl bg-card shrink-0 shadow-sm overflow-hidden">
                <AccordionTrigger className="px-6 py-4 hover:no-underline bg-muted/20 border-b">
                  <div className="flex items-center gap-3">
                    <ListChecks className="h-6 w-6 text-primary" />
                    <span className="text-lg font-black uppercase tracking-widest">1. Requirements List ({itemFields.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-0">
                  <ScrollArea className="max-h-[300px] visible-scrollbar">
                      <div className="space-y-3 p-6">
                          {itemFields.map((field, index) => (
                              <div className="flex gap-4 items-center group" key={field.id}>
                                  <div className="w-10 text-xs font-black text-muted-foreground text-center bg-muted h-10 flex items-center justify-center rounded-lg">{index + 1}.</div>
                                  <div className="flex-1">
                                      <Input {...form.register(`items.${index}.description`)} placeholder="Item Name / Description" className="h-12 text-base font-bold bg-muted/10 border-transparent focus:bg-background transition-all" />
                                  </div>
                                  <div className="w-32">
                                      <Input {...form.register(`items.${index}.uom`)} placeholder="UOM" className="h-12 text-base font-bold text-center bg-muted/10 border-transparent focus:bg-background" />
                                  </div>
                                  <Button type="button" variant="ghost" size="icon" className="h-12 w-12 text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemoveItemRow(index)}><Trash2 className="h-5 w-5"/></Button>
                              </div>
                          ))}
                          <Button type="button" variant="outline" className="w-full h-12 border-dashed border-2 mt-4 text-base font-bold uppercase tracking-wider hover:bg-muted" onClick={handleAddItemRow}>
                              <PlusCircle className="h-5 w-5 mr-3"/>Add New Line Item
                          </Button>
                      </div>
                  </ScrollArea>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="vendors" className="border rounded-xl bg-card flex-1 flex flex-col overflow-hidden shadow-sm">
                <AccordionTrigger className="px-6 py-4 hover:no-underline shrink-0 bg-muted/20 border-b">
                  <div className="flex items-center gap-3">
                    <Users2 className="h-6 w-6 text-primary" />
                    <span className="text-lg font-black uppercase tracking-widest">2. Quotation Comparison Matrix ({vendorFields.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="flex-1 flex flex-col overflow-hidden p-0">
                   <ScrollArea className="flex-1 border-t visible-scrollbar">
                      <div className="flex min-w-max h-full">
                          {/* Sticky Item Column */}
                          <div className="w-[360px] shrink-0 border-r bg-muted/30 sticky left-0 z-20 shadow-2xl">
                              <div className="h-[100px] p-6 border-b flex items-center bg-muted/40">
                                  <span className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Item Description</span>
                              </div>
                              {itemFields.map((item, idx) => (
                                  <div key={item.id} className="h-[80px] p-6 border-b flex items-center bg-card">
                                      <span className="text-base font-black truncate leading-tight text-foreground" title={watch(`items.${idx}.description`)}>
                                          {idx + 1}. {watch(`items.${idx}.description`) || <span className="text-muted-foreground/30 italic font-medium">Empty Line</span>}
                                      </span>
                                  </div>
                              ))}
                          </div>

                          {/* Scrollable Vendor Columns */}
                          <div className="flex flex-1">
                              {vendorFields.map((vendorField, vIdx) => (
                                  <div key={vendorField.id} className={cn("w-[360px] shrink-0 border-r transition-all duration-300", vIdx === 0 ? "bg-primary/[0.03] ring-inset ring-2 ring-primary/20" : "bg-card")}>
                                      <div className="h-[100px] p-4 border-b bg-muted/10 flex flex-col justify-center gap-3">
                                          <div className="flex items-center gap-3">
                                              <Select value={watch(`vendors.${vIdx}.vendorId`)} onValueChange={(val) => handleVendorSelect(vIdx, val)}>
                                                  <SelectTrigger className="h-11 text-sm font-black shadow-sm uppercase tracking-wider"><SelectValue placeholder="Select Merchant"/></SelectTrigger>
                                                  <SelectContent>{vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                                              </Select>
                                              <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-destructive/10" onClick={() => removeVendor(vIdx)}><X className="h-5 w-5"/></Button>
                                          </div>
                                          {vIdx === 0 && <span className="text-[10px] font-black text-primary uppercase text-center tracking-[0.1em] bg-primary/10 py-1 rounded-full">Primary Vendor (Autosync Active)</span>}
                                      </div>

                                      {itemFields.map((item, iIdx) => (
                                          <div key={`${vendorField.id}-${iIdx}`} className="h-[80px] p-4 border-b flex items-center gap-4 bg-muted/5">
                                              <div className="w-20 space-y-1.5">
                                                  <Label className="text-[10px] text-muted-foreground font-black uppercase block text-center tracking-tighter">Qty</Label>
                                                  <Controller
                                                    name={`vendors.${vIdx}.quotes.${iIdx}.quantity`}
                                                    control={control}
                                                    render={({ field }) => (
                                                      <Input 
                                                          type="number" 
                                                          step="any"
                                                          className="h-10 text-base text-center px-1 font-black bg-background"
                                                          value={field.value ?? ''}
                                                          onChange={(e) => {
                                                            const val = e.target.value;
                                                            const numVal = val === '' ? 0 : Number(val);
                                                            field.onChange(numVal);
                                                            if (vIdx === 0) {
                                                              const currentVendors = getValues('vendors');
                                                              currentVendors.forEach((_, otherIdx) => {
                                                                if (otherIdx !== 0) setValue(`vendors.${otherIdx}.quotes.${iIdx}.quantity`, numVal);
                                                              });
                                                            }
                                                          }}
                                                      />
                                                    )}
                                                  />
                                              </div>
                                              <div className="flex-1 space-y-1.5">
                                                  <Label className="text-[10px] text-muted-foreground font-black uppercase block text-center tracking-tighter">Unit Rate (INR)</Label>
                                                  <Controller
                                                    name={`vendors.${vIdx}.quotes.${iIdx}.rate`}
                                                    control={control}
                                                    render={({ field }) => (
                                                      <Input 
                                                          type="number" 
                                                          step="any"
                                                          className="h-10 text-lg text-right font-black text-primary px-3 bg-background border-primary/20 shadow-inner"
                                                          value={field.value || ''}
                                                          onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                                                      />
                                                    )}
                                                  />
                                              </div>
                                              <div className="w-20 space-y-1.5">
                                                  <Label className="text-[10px] text-muted-foreground font-black uppercase block text-center tracking-tighter">Tax %</Label>
                                                  <Controller
                                                    name={`vendors.${vIdx}.quotes.${iIdx}.taxPercent`}
                                                    control={control}
                                                    render={({ field }) => (
                                                      <Input 
                                                          type="number" 
                                                          step="any"
                                                          className="h-10 text-base text-center px-1 font-black bg-background"
                                                          value={field.value ?? ''}
                                                          onChange={(e) => {
                                                            const val = e.target.value;
                                                            const numVal = val === '' ? 0 : Number(val);
                                                            field.onChange(numVal);
                                                            if (vIdx === 0) {
                                                              const currentVendors = getValues('vendors');
                                                              currentVendors.forEach((_, otherIdx) => {
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
                                      
                                      <div className="p-6 bg-muted/10 border-t">
                                          <VendorCostSection vendorIndex={vIdx} control={control} />
                                      </div>
                                  </div>
                              ))}
                              
                              <div className="w-[160px] shrink-0 border-r bg-muted/30 flex items-center justify-center p-4">
                                  <Button type="button" variant="ghost" className="h-full w-full flex-col gap-6 rounded-2xl hover:bg-muted/50 transition-all border-4 border-dashed border-muted-foreground/10" onClick={handleAddVendor}>
                                      <PlusCircle className="h-12 w-12 text-primary/40"/>
                                      <span className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground/60 text-center">Add<br/>Merchant</span>
                                  </Button>
                              </div>
                          </div>
                      </div>
                      <ScrollBar orientation="horizontal" className="visible-scrollbar h-4" />
                   </ScrollArea>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          
          <div className="p-10 pt-6 border-t bg-card shrink-0 flex justify-between items-center shadow-[0_-15px_50px_-15px_rgba(0,0,0,0.1)] z-30">
            <div className="flex gap-4">
                {errors.vendors && <p className="text-base text-destructive font-black flex items-center gap-3 animate-bounce"><AlertTriangle className="h-6 w-6"/> MISSING DATA: Assign a merchant to each column before saving.</p>}
            </div>
            <div className="flex gap-4">
                <Button type="button" variant="outline" className="h-14 px-10 text-lg font-bold uppercase tracking-widest border-2" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" className="h-14 px-12 text-lg font-black uppercase tracking-[0.2em] min-w-[280px] shadow-xl shadow-primary/20" disabled={isSubmitting}>
                    {isSubmitting ? <><Loader2 className="h-6 w-6 mr-3 animate-spin"/>TRANSMITTING...</> : (isEditMode ? 'Update Evaluation' : 'Finalize Comparison')}
                </Button>
            </div>
          </div>
        </form>
        <AddVendorDialog isOpen={isAddVendorOpen} setIsOpen={setIsAddVendorOpen} />
      </DialogContent>
    </Dialog>
  );
}
