'use client';

import styles from './purchase-entry.module.css';
import { Textarea } from '@/components/ui/textarea';
import { useWatch } from 'react-hook-form';
import { useForm, useFieldArray, Controller, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, Users2, X, Upload, ListChecks, Loader2, AlertTriangle, Check } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useMemo, useState } from 'react';
import type { Quotation, QuotationItem, QuotationQuote, QuotationVendorDetails, QuotationStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { usePurchase } from '@/contexts/purchase-provider';
import AddVendorDialog from '../vendor-management/AddVendorDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import * as XLSX from 'xlsx';

const quotationItemSchema = z.object({
    id: z.string(),
    itemId: z.string(),
    description: z.string().min(1, "Description is required"),
    uom: z.string().min(1, "UOM is required"),
    itemType: z.string().default('Manual'),
});

const quotationVendorSchema = z.object({
    id: z.string(),
    vendorId: z.string().min(1, "Vendor required"),
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
        <div className="space-y-2 mt-4 p-3 bg-muted/20 rounded-md border border-dashed">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Extra Costs (Freight, etc)</p>
            {fields.map((field, index) => (
                <div className="flex gap-2 items-start" key={field.id}>
                    <Input {...control.register(`vendors.${vendorIndex}.additionalCosts.${index}.name`)} placeholder="Name" className="h-8 text-xs" />
                    <Input type="number" step="any" {...control.register(`vendors.${vendorIndex}.additionalCosts.${index}.value`)} placeholder="Value" className="h-8 text-xs w-20 text-right"/>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4"/></Button>
                </div>
            ))}
            <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px] w-full" onClick={() => append({ id: `cost-${Date.now()}`, name: '', value: 0 })}>
                <PlusCircle className="h-3 w-3 mr-1"/> Add Cost
            </Button>
        </div>
    );
};

const VendorTotal = ({ vendorIndex, control }: { vendorIndex: number; control: any }) => {
    const vendor = useWatch({ control, name: 'vendors.' + vendorIndex });
    const total = (vendor?.quotes || []).reduce((sum: number, q: any) => sum + (Number(q.quantity) || 0) * (Number(q.rate) || 0) * (1 + (Number(q.taxPercent) || 0) / 100), 0) + (vendor?.additionalCosts || []).reduce((sum: number, c: any) => sum + (Number(c.value) || 0), 0);
    return <div className="p-4 flex justify-between gap-2 border-t bg-blue-50 text-sm font-semibold"><span>Vendor total</span><span>{new Intl.NumberFormat('en-IN', {style:'currency',currency:'INR'}).format(total)}</span></div>;
};

export default function CreateQuotationDialog({ isOpen, setIsOpen, existingQuotation }: { isOpen: boolean; setIsOpen: (open: boolean) => void; existingQuotation?: Quotation | null }) {
  const { vendors, addQuotation, updateQuotation } = usePurchase();
  const { toast } = useToast();
  const isEditMode = !!existingQuotation;

  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [editorTab, setEditorTab] = useState('items');
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
        setEditorTab(existingQuotation ? 'vendors' : 'items');
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
                toast({ title: "No valid items found", variant: "destructive" });
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

            toast({ title: "Items Imported", description: `${newItems.length} items added.` });
        } catch (error) {
            toast({ title: "Import Failed", variant: "destructive" });
        }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; 
  };

  const onSubmit = async (data: FormValues) => {
    if (!data.vendors.length || !data.items.length) {
        toast({ title: "Missing data", description: "Add at least one item and one vendor.", variant: "destructive" });
        return;
    }
    
    setIsSubmitting(true);
    try {
        let success = false;
        if (isEditMode && existingQuotation) {
            success = await updateQuotation({ ...existingQuotation, ...data });
        } else {
            success = await addQuotation(data);
        }
        
        if (success) {
            setIsOpen(false);
            toast({ title: isEditMode ? "Comparison Updated" : "Comparison Created" });
        }
    } catch (e: any) {
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
        const primaryQuotes = getValues(`vendors.0.quotes`) || [];
        setValue(`vendors.${vIndex}.quotes`, [
            ...currentQuotes,
            { 
              itemId: tempId, 
              quantity: primaryQuotes[itemFields.length]?.quantity || 1, 
              rate: 0, 
              taxPercent: primaryQuotes[itemFields.length]?.taxPercent || 0, 
              receivedQuantity: 0 
            }
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
    const primaryVendorQuotes = getValues('vendors.0.quotes');
    
    appendVendor({
        id: `vendor-${Date.now()}`,
        vendorId: '',
        name: '',
        quotes: items.map((item, idx) => ({
            itemId: item.itemId,
            quantity: primaryVendorQuotes?.[idx]?.quantity ?? 1,
            rate: 0,
            taxPercent: primaryVendorQuotes?.[idx]?.taxPercent ?? 0,
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
      <DialogContent className={`${styles.dialog} ${styles.comparisonDialog}`} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className={styles.header}>
          <DialogTitle className="text-xl font-bold tracking-tight">{isEditMode ? 'Edit' : 'New'} price comparison</DialogTitle>
          <DialogDescription className="text-sm font-medium text-muted-foreground mt-0.5">Add the items you need, compare vendor prices, then review and save.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit, errors => { if (errors.items) setEditorTab('items'); else if (errors.vendors) setEditorTab('vendors'); })} className={styles.form}>
          <div className="px-4 sm:px-6 py-3 border-b bg-card">
            <div className="flex flex-wrap justify-between items-end gap-3">
              <div className="flex-1 max-w-xl">
                <Label htmlFor="title" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Comparison Title</Label>
                <Input id="title" {...form.register('title')} placeholder="e.g., Monthly Consumables" className="mt-1 h-9 font-semibold" />{errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddVendorOpen(true)}>New vendor</Button>
                  <Input type="file" accept=".xlsx, .xls" className="hidden" id="item-import-file" onChange={handleImportItems} />
                  <Button type="button" variant="outline" asChild className="h-9 font-bold uppercase tracking-wider text-xs">
                      <label htmlFor="item-import-file" className="cursor-pointer flex items-center gap-1.5">
                          <Upload className="h-4 w-4"/>Import Items
                      </label>
                  </Button>
              </div>
            </div>
          </div>

          <Tabs value={editorTab} onValueChange={setEditorTab} className={styles.editorTabs}>
              <TabsList className={styles.editorTabBar}><TabsTrigger value="items">Items &amp; descriptions ({itemFields.length})</TabsTrigger><TabsTrigger value="vendors">Vendor prices ({vendorFields.length})</TabsTrigger></TabsList>
              <div className={styles.body}>
                
                <TabsContent value="items" className="m-0 border rounded-lg bg-card">
                  <div className="px-4 py-2 bg-muted/10 border-b">
                    <div className="flex items-center gap-2">
                      <ListChecks className="h-4 w-4 text-primary" />
                      <span className="text-sm font-bold uppercase tracking-wider">1. Requirements List ({itemFields.length})</span>
                    </div>
                  </div>
                  <div>
                    <div className="p-4 space-y-2"><p className={styles.help}>Enter each item once. Import accepts Description and UOM columns in the first Excel sheet; importing replaces the current items and prices.</p>
                        {itemFields.map((field, index) => (
                            <div className={styles.requirement} key={field.id}>
                                <div className="w-8 text-[10px] font-bold text-muted-foreground text-center bg-muted h-8 flex items-center justify-center rounded">{index + 1}</div>
                                <div><Textarea aria-label={`Item ${index + 1} description`} rows={1} {...form.register(`items.${index}.description`)} ref={node => { form.register(`items.${index}.description`).ref(node); if (node) { node.style.height = "auto"; node.style.height = node.scrollHeight + "px"; } }} onInput={event => { const node = event.currentTarget; node.style.height = "auto"; node.style.height = node.scrollHeight + "px"; }} placeholder="Item description" />{errors.items?.[index]?.description && <p className="text-xs text-destructive">{errors.items[index]?.description?.message}</p>}</div>
                                <Input aria-label={`Item ${index + 1} unit`} {...form.register(`items.${index}.uom`)} placeholder="UOM" className="h-9 text-sm w-20 text-center" />
                                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive" aria-label={`Remove item ${index + 1}`} onClick={() => handleRemoveItemRow(index)}><Trash2 className="h-4 w-4"/></Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" className="w-full h-9 border-dashed text-xs font-bold uppercase tracking-wider mt-2" onClick={handleAddItemRow}>
                            <PlusCircle className="h-3.5 w-3.5 mr-2"/>Add Line Item
                        </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="vendors" className="m-0 border rounded-lg bg-card">
                  <div className="px-4 py-2 bg-muted/10 border-b">
                    <div className="flex items-center gap-2">
                      <Users2 className="h-4 w-4 text-primary" />
                      <span className="text-sm font-bold uppercase tracking-wider">2. Comparison Matrix</span>
                    </div>
                  </div>
                  <div>
                     <p className="p-3 text-sm text-muted-foreground">Quantity and tax entered for the first vendor are copied to the others. You can then adjust each vendor separately.</p>
                     <div className="w-full overflow-x-auto border-t">
                        <div className={styles.matrix}>
                            {/* Sticky Column */}
                            <div className={styles.itemColumn}>
                                <div className={styles.vendorHeader}>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Item Name</span>
                                </div>
                                {itemFields.map((item, idx) => (
                                    <div key={item.id} className={styles.quoteRow}>
                                        <span className="text-sm leading-relaxed whitespace-normal break-words max-h-full overflow-auto" title={watch(`items.${idx}.description`)}>
                                            {idx + 1}. {watch(`items.${idx}.description`) || "..."}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Vendor Columns */}
                            <div className={styles.vendorColumns}>
                                {vendorFields.map((vendorField, vIdx) => (
                                    <div key={vendorField.id} className={styles.vendor}>
                                        <div className={styles.vendorHeader}>
                                            <div className="flex-1">
                                                <Select value={watch(`vendors.${vIdx}.vendorId`)} onValueChange={(val) => handleVendorSelect(vIdx, val)}>
                                                    <SelectTrigger className="text-sm font-medium"><SelectValue placeholder="Select vendor…"/></SelectTrigger>
                                                    <SelectContent>{vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </div>
                                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label={`Remove vendor ${vIdx + 1}`} onClick={() => removeVendor(vIdx)}><X className="h-3.5 w-3.5"/></Button>
                                        </div>

                                        {itemFields.map((item, iIdx) => (
                                            <div key={`${vendorField.id}-${iIdx}`} className={styles.quoteRow}>
                                                <p className={styles.mobileItem}>{iIdx + 1}. {watch(`items.${iIdx}.description`) || "Untitled item"} · {watch(`items.${iIdx}.uom`)}</p>
                                                <div className="w-16 shrink-0 space-y-1">
                                                    <Label className="text-[9px] text-muted-foreground font-bold uppercase block text-center">Qty</Label>
                                                    <Controller
                                                        name={`vendors.${vIdx}.quotes.${iIdx}.quantity`}
                                                        control={control}
                                                        render={({ field }) => (
                                                            <Input aria-label={`Vendor ${vIdx + 1}, item ${iIdx + 1}: quantity`} 
                                                                type="number" 
                                                                step="any"
                                                                className="h-7 text-xs text-center px-0.5 font-bold"
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
                                                <div className="flex-1 space-y-1">
                                                    <Label className="text-[9px] text-muted-foreground font-bold uppercase block text-center">Rate</Label>
                                                    <Controller
                                                        name={`vendors.${vIdx}.quotes.${iIdx}.rate`}
                                                        control={control}
                                                        render={({ field }) => (
                                                            <Input aria-label={`Vendor ${vIdx + 1}, item ${iIdx + 1}: rate`} 
                                                                type="number" 
                                                                step="any"
                                                                className="h-7 text-xs text-right font-bold text-primary px-1"
                                                                value={field.value || ''}
                                                                onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                                                            />
                                                        )}
                                                    />
                                                </div>
                                                <div className="w-16 shrink-0 space-y-1">
                                                    <Label className="text-[9px] text-muted-foreground font-bold uppercase block text-center">Tax%</Label>
                                                    <Controller
                                                        name={`vendors.${vIdx}.quotes.${iIdx}.taxPercent`}
                                                        control={control}
                                                        render={({ field }) => (
                                                            <Input aria-label={`Vendor ${vIdx + 1}, item ${iIdx + 1}: taxPercent`} 
                                                                type="number" 
                                                                step="any"
                                                                className="h-7 text-xs text-center px-0.5 font-bold"
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
                                        
                                        <VendorCostSection vendorIndex={vIdx} control={control} />
                                        <VendorTotal vendorIndex={vIdx} control={control} />
                                    </div>
                                ))}
                                
                                <div className="w-full sm:w-[140px] shrink-0 bg-muted/10 flex items-center justify-center p-3">
                                    <Button type="button" variant="ghost" className="h-20 w-full flex-col gap-2 rounded-lg border-2 border-dashed" onClick={handleAddVendor}>
                                        <PlusCircle className="h-5 w-5 text-muted-foreground"/>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Add Vendor</span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                        
                     </div>
                  </div>
                </TabsContent>
              </div>
          </Tabs>
          
          <div className={styles.footer}>
            <div className="text-xs text-destructive font-bold">
                {Object.keys(errors).length > 0 && <p className="flex items-center gap-1"><AlertTriangle className="h-3 w-3"/> Check the title, item descriptions, units and vendor prices before saving.</p>}
            </div>
            <div className={styles.footerActions}>
                <Button type="button" variant="outline" className="h-10 px-6" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" className="h-10 px-6 min-w-[170px]" disabled={isSubmitting}>
                    {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin"/>SAVING...</> : (isEditMode ? 'Update Comparison' : 'Save Comparison')}
                </Button>
            </div>
          </div>
        </form>
        <AddVendorDialog isOpen={isAddVendorOpen} setIsOpen={setIsAddVendorOpen} />
      </DialogContent>
    </Dialog>
  );
}
