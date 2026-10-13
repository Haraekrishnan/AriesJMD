'use client';

import { comparisonValidationMessages } from './comparison-validation';
import styles from './purchase-entry.module.css';
import { Textarea } from '@/components/ui/textarea';
import { useWatch } from 'react-hook-form';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, X, Upload, Loader2, AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useState, type CSSProperties } from 'react';
import type { Quotation } from '@/lib/types';
import { usePurchase } from '@/contexts/purchase-provider';
import AddVendorDialog from '../vendor-management/AddVendorDialog';

import * as XLSX from 'xlsx';

const quotationItemSchema = z.object({
    id: z.string(),
    itemId: z.string(),
    description: z.string().trim().min(1, "Description is required"),
    uom: z.string().trim().min(1, "UOM is required"),
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
  title: z.string().trim().min(1, "Title is required"),
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
        <div className="space-y-2 p-2 bg-muted/20 rounded-md border border-dashed">
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

const QuoteAmount = ({control,vendorIndex,itemIndex}: {control:any;vendorIndex:number;itemIndex:number}) => {
 const quote=useWatch({control,name: 'vendors.'+vendorIndex+'.quotes.'+itemIndex});
 const amount=(Number(quote?.quantity)||0)*(Number(quote?.rate)||0)*(1+(Number(quote?.taxPercent)||0)/100);
 return <div><span className="text-xs text-muted-foreground">Amount incl. tax</span><p className="font-semibold mt-2 whitespace-nowrap">{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(amount)}</p></div>;
};

const VendorTotal = ({ vendorIndex, control }: { vendorIndex: number; control: any }) => {
    const allVendors = useWatch({ control, name: 'vendors' }) || [];
    const vendor = allVendors[vendorIndex];
    const totals = allVendors.map((v: any) => (v?.quotes || []).reduce((sum: number,q: any) => sum+(Number(q.quantity)||0)*(Number(q.rate)||0)*(1+(Number(q.taxPercent)||0)/100),0)+(v?.additionalCosts || []).reduce((sum: number,c: any) => sum+(Number(c.value)||0),0));
    const total = (vendor?.quotes || []).reduce((sum: number, q: any) => sum + (Number(q.quantity) || 0) * (Number(q.rate) || 0) * (1 + (Number(q.taxPercent) || 0) / 100), 0) + (vendor?.additionalCosts || []).reduce((sum: number, c: any) => sum + (Number(c.value) || 0), 0);
    return <div className="p-2 flex justify-between gap-2 bg-blue-50 text-sm font-semibold"><span>Total incl. tax{allVendors.length > 1 && total > 0 && totals.every((n: number) => n > 0) && total === Math.min(...totals) && <small className="block text-green-700">Lowest total</small>}</span><span>{new Intl.NumberFormat('en-IN', {style:'currency',currency:'INR'}).format(total)}</span></div>;
};

export default function CreateQuotationDialog({ isOpen, setIsOpen, existingQuotation }: { isOpen: boolean; setIsOpen: (open: boolean) => void; existingQuotation?: Quotation | null }) {
  const { vendors, addQuotation, updateQuotation } = usePurchase();
  const { toast } = useToast();
  const isEditMode = !!existingQuotation;

  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [errorPopup, setErrorPopup] = useState<{ title: string; messages: string[] } | null>(null);
  const showError = (title: string, messages: string[]) => setErrorPopup({ title, messages });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(quotationSchema),
    shouldUnregister: false,
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
        setErrorPopup(null);
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

  useEffect(() => {
    if (form.formState.isSubmitted) void form.trigger();
  }, [itemFields.length, vendorFields.length, form]);

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

            const missingDescriptions = json.flatMap((row, index) => String(row.Description ?? row.Item ?? '').trim() ? [] : ['Excel data row ' + (index + 1) + ': Item description is missing. Fill the Description or Item column.']);
            if (missingDescriptions.length) { showError('Import needs correction', [...missingDescriptions, 'No items were imported; your draft has been retained.']); return; }
            const newItems = json.map((row, idx) => ({
                id: `import-${Date.now()}-${idx}`,
                itemId: `import-${Date.now()}-${idx}`,
                description: String(row.Description ?? row.Item ?? '').trim(),
                uom: String(row.UOM || row.Unit || 'Nos'),
                itemType: 'Manual'
            })).filter(item => item.description);

            if (newItems.length === 0) {
                showError("No items imported", ["The first Excel sheet must contain a Description or Item column with at least one item. Use UOM or Unit for units. Your current entries have not been replaced."]);
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
            showError("Import failed", [error instanceof Error ? error.message : "The workbook could not be read.", "Check that the file is a valid Excel workbook with Description and UOM headers in the first sheet. Your draft has been retained."]);
        }
    };
    reader.onerror = () => showError("File could not be read", ["Select the Excel file again. Check that it is available on this device and not damaged. Your draft has been retained."]);
    reader.readAsArrayBuffer(file);
    e.target.value = ''; 
  };

  const onSubmit = async (data: FormValues) => {
    if (!data.vendors.length || !data.items.length) {
        showError("Missing comparison details", ["Add at least one item and one vendor."]);
        return;
    }
    
    setIsSubmitting(true);
    try {
        let success = false;
        if (isEditMode && existingQuotation) {
            success = await updateQuotation({ ...existingQuotation, ...data }, error => { throw error; });
        } else {
            success = await addQuotation(data, error => { throw error; });
        }
        
        if (success) {
            setIsOpen(false);
            toast({ title: isEditMode ? "Comparison Updated" : "Comparison Created" });
        } else {
            showError("Comparison not saved", ["The database did not confirm the save. No detailed error was returned.", "Your entered data is still here. Check your connection and sign-in, then retry."]);
        }
    } catch (e: any) {
        showError('Comparison not saved', [e?.code ? 'Error code: ' + e.code : 'Save request failed', e?.message || String(e || 'Submission failed'), 'Your draft has been retained. Correct the issue and retry.']);
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
        setValue(`vendors.${vendorIndex}.vendorId`, vendor.id, { shouldDirty: true, shouldValidate: true });
        setValue(`vendors.${vendorIndex}.name`, vendor.name, { shouldDirty: true, shouldValidate: true });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className={`${styles.dialog} ${styles.comparisonDialog} ${styles.worksheetDialog}`} style={{'--comparison-width': `${Math.max(760, 336 + vendorFields.length * 360)}px`} as CSSProperties} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className={styles.header}>
          <DialogTitle className="text-xl font-bold tracking-tight">{isEditMode ? 'Edit' : 'New'} price comparison</DialogTitle>
          <DialogDescription className="text-sm font-medium text-muted-foreground mt-0.5">Enter items once. Compare vendor offers in one worksheet.</DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={form.handleSubmit(onSubmit, errors => showError('Please correct these details', comparisonValidationMessages(errors, getValues())))} className={styles.form}>
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

          <div className={styles.worksheetToolbar}>
            <div><strong>Items &amp; vendor prices</strong><span className="ml-3 text-muted-foreground">{itemFields.length} items · {vendorFields.length} vendors</span></div>
            <div className="flex gap-2"><Button type="button" variant="outline" onClick={handleAddItemRow}><PlusCircle className="h-4 w-4 mr-2"/>Add Line Item</Button><Button type="button" variant="outline" onClick={handleAddVendor}>Add Vendor</Button></div>
          </div>
          <div className={styles.worksheetScroll} tabIndex={0} aria-label="Editable price comparison worksheet">
            <table className={styles.worksheet} style={{width: 300 + vendorFields.length * 360}}>
              <colgroup><col style={{width:300}}/>{vendorFields.map(v => <col key={v.id} style={{width:360}}/>)}</colgroup>
              <thead><tr><th className={styles.frozenItem}>Item description / Unit</th>{vendorFields.map((vendorField,vIdx) => <th key={vendorField.id}>
                <div className="flex items-center gap-2"><div className="flex-1 min-w-0"><Select value={watch(`vendors.${vIdx}.vendorId`)} onValueChange={val => handleVendorSelect(vIdx,val)}><SelectTrigger aria-label={`Vendor ${vIdx+1}`}><SelectValue placeholder="Select vendor…"/></SelectTrigger><SelectContent>{vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent></Select></div><Button type="button" size="icon" variant="ghost" aria-label={`Remove vendor ${vIdx+1}`} onClick={() => removeVendor(vIdx)}><X className="h-4 w-4"/></Button></div>
              </th>)}</tr></thead>
              <tbody>{itemFields.map((item,iIdx) => <tr key={item.id}>
                <td className={styles.frozenItem}><div className="flex gap-2 items-start"><span className="text-muted-foreground pt-2">{iIdx+1}.</span><div className="flex-1 min-w-0">
                  <Controller name={`items.${iIdx}.description`} control={control} render={({field}) => <Textarea {...field} value={field.value ?? ''} aria-label={`Item ${iIdx+1} description`} rows={1} ref={node => { field.ref(node); if(node){node.style.height='auto';node.style.height=node.scrollHeight+'px';} }} onInput={event => {const node=event.currentTarget;node.style.height='auto';node.style.height=node.scrollHeight+'px';}} placeholder="Item description"/>}/>
                  <div className="flex items-center gap-2 mt-2"><Label htmlFor={`unit-${iIdx}`}>Unit</Label><Input id={`unit-${iIdx}`} aria-label={`Item ${iIdx+1} unit`} {...form.register(`items.${iIdx}.uom`)} placeholder="e.g. Nos" className="max-w-28"/></div>
                </div><Button type="button" size="icon" variant="ghost" aria-label={`Remove item ${iIdx+1}`} onClick={() => handleRemoveItemRow(iIdx)}><Trash2 className="h-4 w-4 text-destructive"/></Button></div></td>
                {vendorFields.map((vendorField,vIdx) => <td key={vendorField.id}><div className={styles.priceFields}>{(['quantity','rate','taxPercent'] as const).map(key => <div key={key}><Label className="block text-muted-foreground mb-1">{key==='quantity'?'Qty':key==='rate'?'Rate ₹':'Tax %'}</Label>
<Controller name={`vendors.${vIdx}.quotes.${iIdx}.${key}`} control={control} render={({field}) => <Input {...field} aria-label={`Vendor ${vIdx+1}, item ${iIdx+1}: ${key}`} type="number" step="any" value={field.value ?? ''} onChange={event => { const raw=event.target.value; field.onChange(raw); if(vIdx===0 && key!=='rate') getValues('vendors').forEach((_,otherIdx) => {if(otherIdx!==0) setValue(`vendors.${otherIdx}.quotes.${iIdx}.${key}`,raw as any,{shouldDirty:true});}); }}/>} /></div>)}
<QuoteAmount control={control} vendorIndex={vIdx} itemIndex={iIdx}/></div></td>)}
              </tr>)}</tbody>
              {vendorFields.length > 0 && <tfoot><tr><th className={styles.frozenItem}>Additional costs</th>{vendorFields.map((v,vIdx) => <td key={v.id}><VendorCostSection vendorIndex={vIdx} control={control}/></td>)}</tr>
              <tr><th className={styles.frozenItem}>Total including tax</th>{vendorFields.map((v,vIdx) => <td key={v.id}><VendorTotal vendorIndex={vIdx} control={control}/></td>)}</tr></tfoot>}
            </table>
            {!itemFields.length && <p className="p-6 text-muted-foreground">Add a line item or import an Excel file to begin.</p>}
            {!vendorFields.length && <p className="px-6 pb-6 text-muted-foreground">Add a vendor to enter and compare prices.</p>}
          </div>
          <p className={styles.worksheetHint}>Quantity and tax entered for the first vendor are copied to the others; you can then adjust each vendor. Excel import uses Description and UOM columns and replaces current items and prices.</p>

          <div className={styles.footer}>
            <div role="alert" className="text-sm text-destructive max-h-28 overflow-auto min-w-0 flex-1">
                {comparisonValidationMessages(errors).map(message => <p key={message}>{message}</p>)}
            </div>
            <div className={styles.footerActions}>
                <Button type="button" variant="outline" className="h-10 px-6" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" className="h-10 px-6 min-w-[170px]" disabled={isSubmitting}>
                    {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin"/>SAVING...</> : (isEditMode ? 'Update Comparison' : 'Save Comparison')}
                </Button>
            </div>
          </div>
        </form>
        <Dialog open={!!errorPopup} onOpenChange={open => { if(!open) setErrorPopup(null); }}>
          <DialogContent className="max-w-xl max-h-[85dvh] flex flex-col" onInteractOutside={e => e.preventDefault()}>
            <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive"/>{errorPopup?.title}</DialogTitle><DialogDescription>Your entries are retained. Review the details below, then return to the worksheet to correct them.</DialogDescription></DialogHeader>
            <ul role="alert" className="overflow-auto min-h-0 list-disc pl-5 space-y-3 text-sm break-words">{errorPopup?.messages.map((message,index) => <li key={index}>{message}</li>)}</ul>
            <Button type="button" onClick={() => setErrorPopup(null)}>Return to comparison</Button>
          </DialogContent>
        </Dialog>
        <AddVendorDialog isOpen={isAddVendorOpen} setIsOpen={setIsAddVendorOpen} />
      </DialogContent>
    </Dialog>
  );
}