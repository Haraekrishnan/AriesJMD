'use client';

import { comparisonValidationMessages } from './comparison-validation';
import styles from './comparison-sheet.module.css';
import { gridColumns, pastePlan, hasSeparateQuantities, prepareWorksheet, restoreErrorRows, errorPaths } from './comparison-worksheet';
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
import { Fragment as ReactFragment, useEffect, useState, useRef, type CSSProperties } from 'react';
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
    quantity: z.coerce.number().min(0).optional(),
    isNew: z.boolean().optional(),
    newItemCategory: z.enum(['Store Inventory','Equipment','Daily Consumable','Job Consumable']).optional(),
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
 return <div className={styles.amount}>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(amount)}</div>;
};

const VendorTotal = ({ vendorIndex, control }: { vendorIndex: number; control: any }) => {
    const allVendors = useWatch({ control, name: 'vendors' }) || [];
    const vendor = allVendors[vendorIndex];
    const totals = allVendors.map((v: any) => (v?.quotes || []).reduce((sum: number,q: any) => sum+(Number(q.quantity)||0)*(Number(q.rate)||0)*(1+(Number(q.taxPercent)||0)/100),0)+(v?.additionalCosts || []).reduce((sum: number,c: any) => sum+(Number(c.value)||0),0));
    const total = (vendor?.quotes || []).reduce((sum: number, q: any) => sum + (Number(q.quantity) || 0) * (Number(q.rate) || 0) * (1 + (Number(q.taxPercent) || 0) / 100), 0) + (vendor?.additionalCosts || []).reduce((sum: number, c: any) => sum + (Number(c.value) || 0), 0);
    return <div className={styles.vendorTotal}><span>Grand total{allVendors.length > 1 && total > 0 && totals.every((n: number) => n > 0) && total === Math.min(...totals) && <small className="block text-green-700">Lowest total</small>}</span><span>{new Intl.NumberFormat('en-IN', {style:'currency',currency:'INR'}).format(total)}</span></div>;
};

export default function CreateQuotationDialog({ isOpen, setIsOpen, existingQuotation }: { isOpen: boolean; setIsOpen: (open: boolean) => void; existingQuotation?: Quotation | null }) {
  const { vendors, addQuotation, updateQuotation } = usePurchase();
  const { toast } = useToast();
  const isEditMode = !!existingQuotation;

  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [errorPopup, setErrorPopup] = useState<{ title: string; messages: string[]; paths?: string[] } | null>(null);
  const showError = (title: string, messages: string[]) => setErrorPopup({ title, messages });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const blankIds = useRef(new Set<string>());
  const gridRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [separateQuantities, setSeparateQuantities] = useState(false);
  const [selectedRow, setSelectedRow] = useState(0);
  const [findItem, setFindItem] = useState('');
  const [costVendor, setCostVendor] = useState<number | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pendingImport, setPendingImport] = useState<FormValues['items'] | null>(null);
  const activeCell = useRef({row:0,column:0});
  const [frame, setFrame] = useState({left:12,top:12});
  useEffect(() => {
    if(!isOpen || typeof window==='undefined')return;
    const measure=()=>{const nav=document.querySelector('.portal-navigation')?.getBoundingClientRect();const header=document.querySelector('.main-portal header')?.getBoundingClientRect();setFrame({left:nav && nav.width>0 && window.innerWidth>=1024 ? nav.right+12 : 12,top:header && window.innerWidth>=768 ? header.bottom+12 : 12});};
    measure();window.addEventListener('resize',measure);return()=>window.removeEventListener('resize',measure);
  },[isOpen]);

  const form = useForm<FormValues>({
    resolver: async (values, context, options) => {
      const prepared=prepareWorksheet(values,blankIds.current);
      const result=await zodResolver(quotationSchema)(prepared.values,context,options);
      return {...result,errors:restoreErrorRows(result.errors,prepared.keep)};
    },
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
        setCostVendor(null); setPasteOpen(false); setPendingImport(null); activeCell.current={row:0,column:0};
        blankIds.current.clear(); setSelectedRow(0); setFindItem(''); setSeparateQuantities(hasSeparateQuantities((existingQuotation?.vendors || []).map(v=>({...v,quotes:(existingQuotation?.items || []).map(item=>v.quotes.find(q=>q.itemId===item.itemId) || {quantity:1})}))));
        if (existingQuotation) {
            form.reset({
                title: existingQuotation.title,
                items: (existingQuotation.items || []).map((item,i) => ({...item,quantity:existingQuotation.vendors?.[0]?.quotes.find(q=>q.itemId===item.itemId)?.quantity ?? 1})),
                vendors: (existingQuotation.vendors || []).map(v=>({...v,quotes:(existingQuotation.items || []).map(item=>v.quotes.find(q=>q.itemId===item.itemId) || {itemId:item.itemId,quantity:1,rate:0,taxPercent:0})})),
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

            setPendingImport(newItems);
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
    
    data = {...data,items:data.items.map(({quantity,...item})=>item)};
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

  const makeItem = () => {
    const id='item-'+crypto.randomUUID(); blankIds.current.add(id);
    return {id,itemId:id,description:'',uom:'Nos',itemType:'Manual',quantity:1};
  };
  const addRows = (count=1) => {
    const added=Array.from({length:count},makeItem);const previous=getValues('vendors');
    appendItem(added);
    previous.forEach((v,vIdx)=>setValue(`vendors.${vIdx}.quotes`,[...v.quotes,...added.map(item=>({itemId:item.itemId,quantity:1,rate:0,taxPercent:0,receivedQuantity:0}))],{shouldDirty:true}));
  };
  const handleAddItemRow = () => {setSelectedRow(itemFields.length);addRows();};

  const handleRemoveItemRow = (index: number) => {
    removeItem(index);
    setSelectedRow(Math.max(0,index-1));
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
            quantity: primaryVendorQuotes?.[idx]?.quantity ?? item.quantity ?? 1,
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

  const columns=gridColumns(vendorFields.length,separateQuantities);
  const watchedItems=useWatch({control,name:'items'}) || [];
  const leftSpan=separateQuantities?3:4;
  const groupSpan=separateQuantities?4:3;
  const minWidth=(separateQuantities?386:456)+vendorFields.length*(separateQuantities?350:280);
  const writeCell=(row:number,column:ReturnType<typeof gridColumns>[number],value:any) => {
    const options={shouldDirty:true,shouldValidate:form.formState.isSubmitted};
    if(column.vendor!==undefined) setValue(`vendors.${column.vendor}.quotes.${row}.${column.key}` as any,value,options);
    else if(column.key==='quantity') {
      setValue(`items.${row}.quantity`,value,options);
      getValues('vendors').forEach((_,v)=>setValue(`vendors.${v}.quotes.${row}.quantity`,value,options));
    } else setValue(`items.${row}.${column.key}` as any,value,options);
  };
  const focusCell=(row:number,column:number) => {
    requestAnimationFrame(()=>{const cell=gridRef.current?.querySelector<HTMLElement>(`[data-row="${row}"][data-col="${column}"]`);cell?.focus();cell?.scrollIntoView({block:'nearest',inline:'nearest'});});
  };
  const applyPaste=(text:string) => {
    try {
      const plan=pastePlan(text,columns,activeCell.current.row,activeCell.current.column);
      if(!plan.rowCount)return;
      const needed=activeCell.current.row+plan.rowCount-getValues('items').length;
      if(needed>0)addRows(needed);
      plan.changes.forEach(c=>writeCell(c.row,c.column,c.value));
      setPasteOpen(false);setPasteText('');setFindItem('');
    } catch(error) {showError('Paste needs correction',[error instanceof Error?error.message:'Check the pasted cells.','No pasted cells have been applied.']);}
  };
  const duplicateRow=() => {
    const item=getValues(`items.${selectedRow}`);if(!item)return;
    const current=getValues('vendors');const id='item-'+crypto.randomUUID();
    appendItem({...item,id,itemId:id});
    current.forEach((v,vIdx)=>setValue(`vendors.${vIdx}.quotes`,[...v.quotes,{...v.quotes[selectedRow],itemId:id,receivedQuantity:0}],{shouldDirty:true}));
    setSelectedRow(itemFields.length);
  };
  const toggleQuantities=() => {
    if(separateQuantities && hasSeparateQuantities(getValues('vendors'))) {
      showError('Vendor quantities are different',['Keep Vendor quantities enabled to preserve the existing values. To use one common quantity, first make every vendor quantity equal for each item.']);return;
    }
    if(separateQuantities) getValues('items').forEach((_,i)=>setValue(`items.${i}.quantity`,getValues(`vendors.0.quotes.${i}.quantity`) ?? 1));
    setSeparateQuantities(!separateQuantities);
  };
  const gridKeyDown=(event:React.KeyboardEvent<HTMLElement>) => {
    if(event.nativeEvent.isComposing)return;
    if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();event.stopPropagation();formRef.current?.requestSubmit();return;}
    if(event.key!=='Enter' && event.key!=='Tab')return;
    const target=event.target as HTMLElement;if(!target.hasAttribute('data-row'))return;
    event.preventDefault();
    const row=Number(target.dataset.row),column=Number(target.dataset.col);
    const visible=itemFields.map((_,i)=>i).filter(i=>!findItem || watchedItems[i]?.description?.toLowerCase().includes(findItem.toLowerCase()));
    if(event.key==='Tab') {
      const nextColumn=column+(event.shiftKey?-1:1);
      if(nextColumn>=0 && nextColumn<columns.length){focusCell(row,nextColumn);return;}
      const nextRow=visible[visible.indexOf(row)+(event.shiftKey?-1:1)];
      if(nextRow!==undefined)focusCell(nextRow,event.shiftKey?columns.length-1:0);
      else if(!event.shiftKey && !findItem){const nextRow=itemFields.length;addRows();focusCell(nextRow,0);}
      else formRef.current?.querySelector<HTMLButtonElement>('button[type="submit"]')?.focus();
      return;
    }
    const next=visible[visible.indexOf(row)+(event.shiftKey?-1:1)];
    if(next!==undefined)focusCell(next,column);
    else if(!event.shiftKey && !findItem){const nextRow=itemFields.length;addRows();focusCell(nextRow,column);}
  };
  const goToError=(path:string) => {
    setErrorPopup(null);setCostVendor(null);setFindItem('');
    if(path.includes('.quotes.') && path.endsWith('.quantity'))setSeparateQuantities(true);
    const cost=path.match(/^vendors\.(\d+)\.additionalCosts/);if(cost)setCostVendor(Number(cost[1]));
    setTimeout(()=>{const scope=cost?document:formRef.current?.closest('[role="dialog"]') || document;const input=Array.from(scope.querySelectorAll<HTMLElement>('[name],[data-field]')).find(el=>el.getAttribute('name')===path || el.getAttribute('data-field')===path);input?.focus();input?.scrollIntoView({block:'nearest',inline:'nearest'});},120);
  };
  const renderCell=(i:number,columnIndex:number) => {
    const column=columns[columnIndex];
    const name=column.vendor===undefined?`items.${i}.${column.key}`:`vendors.${column.vendor}.quotes.${i}.${column.key}`;
    const label=column.vendor===undefined?`Item ${i+1} ${column.key==='uom'?'unit':column.key}`:`Vendor ${column.vendor+1}, item ${i+1}: ${column.key}`;
    return <Controller name={name as any} control={control} render={({field,fieldState})=>{
      const shared={...field,value:field.value??'',name,'aria-label':label,'aria-invalid':!!fieldState.error,'data-row':i,'data-col':columnIndex,onFocus:()=>{setSelectedRow(i);activeCell.current={row:i,column:columnIndex};},onChange:(event:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>writeCell(i,column,event.target.value)};
      return column.key==='description'
        ? <Textarea {...shared} rows={1} placeholder="Type item description…" ref={node=>{field.ref(node);if(node){node.style.height='auto';node.style.height=node.scrollHeight+'px';}}} onInput={event=>{event.currentTarget.style.height='auto';event.currentTarget.style.height=event.currentTarget.scrollHeight+'px';}}/>
        : <Input {...shared} type={column.key==='uom'?'text':'number'} step="any" className={column.key==='uom'?'':styles.numeric}/>;
    }}/>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className={styles.dialog} overlayClassName="bg-black/20" style={{'--sheet-left':`${frame.left}px`,'--sheet-top':`${frame.top}px`} as CSSProperties} onInteractOutside={e=>e.preventDefault()}>
        <DialogHeader className={styles.header}>
          <DialogTitle>{isEditMode?'Edit':'New'} price comparison <span className={styles.request}>{existingQuotation?.requestNumber || 'Number assigned on save'}</span></DialogTitle>
          <DialogDescription>Enter items once. Compare vendor offers in one worksheet.</DialogDescription>
        </DialogHeader>
        <form ref={formRef} className={styles.form} noValidate onKeyDown={event=>{if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();formRef.current?.requestSubmit();}else if(event.key==='Enter' && event.target instanceof HTMLInputElement && !event.target.hasAttribute('data-row'))event.preventDefault();}} onSubmit={form.handleSubmit(onSubmit,errors=>setErrorPopup({title:'Please correct these details',messages:comparisonValidationMessages(errors,getValues()),paths:errorPaths(errors)}))}>
          <fieldset disabled={isSubmitting} className={styles.fieldset}>
          <div className={styles.metadata}><Label htmlFor="comparison-title">Comparison title</Label><Input id="comparison-title" {...form.register('title')} aria-invalid={!!errors.title} placeholder="e.g. Materials"/><span>{itemFields.length} items · {vendorFields.length} vendors</span></div>
          <div className={styles.toolbar}>
            <Button type="button" onClick={handleAddItemRow}>+ Item</Button>
            <Button type="button" variant="outline" disabled={!itemFields.length} onClick={duplicateRow}>Duplicate</Button>
            <Button type="button" variant="outline" disabled={!itemFields[selectedRow]} onClick={()=>handleRemoveItemRow(selectedRow)}>Delete row</Button>
            <Button type="button" variant="outline" onClick={()=>{setPasteText('');setPasteOpen(true);}}>Paste from Excel</Button>
            <Button type="button" variant="outline" asChild><label htmlFor="sheet-import">Import Excel</label></Button><Input id="sheet-import" type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportItems}/>
            <Button type="button" variant="outline" onClick={handleAddVendor}>+ Vendor</Button>
            <Button type="button" variant="ghost" onClick={()=>setIsAddVendorOpen(true)}>New vendor</Button>
            <Input className={styles.find} aria-label="Find item" placeholder="Find item…" value={findItem} onChange={e=>setFindItem(e.target.value)}/>
            <label className={styles.toggle}><input type="checkbox" checked={separateQuantities} onChange={toggleQuantities}/> Vendor quantities</label>
          </div>
          <div ref={gridRef} className={styles.scroll} role="region" aria-label="Editable price comparison worksheet" tabIndex={0} onKeyDown={gridKeyDown} onPaste={event=>{if(!(event.target as HTMLElement).hasAttribute('data-row'))return;const text=event.clipboardData.getData('text/plain');if(text.includes('\t')||text.includes('\n')){event.preventDefault();applyPaste(text);}}}>
            <table className={styles.table} style={{minWidth}}>
              <colgroup><col style={{width:36}}/><col style={{width:280}}/><col style={{width:70}}/>{!separateQuantities&&<col style={{width:70}}/>}{vendorFields.flatMap(v=>[...(separateQuantities?[<col key={v.id+'qty'} style={{width:70}}/>]:[]),<col key={v.id+'rate'} style={{width:95}}/>,<col key={v.id+'tax'} style={{width:65}}/>,<col key={v.id+'total'} style={{width:120}}/>])}</colgroup>
              <thead><tr><th rowSpan={2} className={styles.frozenNumber}>#</th><th rowSpan={2} className={styles.frozenDescription}>Item description</th><th rowSpan={2}>Unit</th>{!separateQuantities&&<th rowSpan={2}>Qty</th>}{vendorFields.map((v,vi)=><th key={v.id} colSpan={groupSpan}><div className={styles.vendorHeading}><Select value={watch(`vendors.${vi}.vendorId`)} onValueChange={value=>handleVendorSelect(vi,value)}><SelectTrigger data-field={`vendors.${vi}.vendorId`} aria-label={`Vendor ${vi+1}`}><SelectValue placeholder="Select vendor…"/></SelectTrigger><SelectContent>{vendors.map(v=><SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent></Select><Button variant="ghost" size="icon" type="button" aria-label={`Remove vendor ${vi+1}`} onClick={()=>{setCostVendor(null);removeVendor(vi);}}><X size={14}/></Button></div></th>)}</tr><tr>{vendorFields.map(v=><ReactFragment key={v.id}>{separateQuantities&&<th>Qty</th>}<th>Rate ₹</th><th>Tax %</th><th>Amount ₹</th></ReactFragment>)}</tr></thead>
              <tbody>{itemFields.map((item,i)=><tr key={item.id} hidden={!!findItem && !watchedItems[i]?.description?.toLowerCase().includes(findItem.toLowerCase())} data-selected={i===selectedRow}>
                <td className={styles.frozenNumber}><button type="button" aria-label={`Select item ${i+1}`} onClick={()=>{setSelectedRow(i);activeCell.current={row:i,column:0};}}>{i+1}</button></td><td className={styles.frozenDescription}>{renderCell(i,0)}</td><td>{renderCell(i,1)}</td>{!separateQuantities&&<td>{renderCell(i,2)}</td>}
                {vendorFields.map((v,vi)=><ReactFragment key={v.id}>{(separateQuantities?['quantity','rate','taxPercent']:['rate','taxPercent']).map(key=><td key={key}>{renderCell(i,columns.findIndex(c=>c.vendor===vi&&c.key===key))}</td>)}<td className={styles.calculated}><QuoteAmount control={control} vendorIndex={vi} itemIndex={i}/></td></ReactFragment>)}
              </tr>)}</tbody>
              {vendorFields.length>0&&<tfoot><tr><th colSpan={leftSpan}><div>All {itemFields.length} items · totals include tax</div><small>Additional costs included in grand totals</small></th>{vendorFields.map((v,vi)=><td key={v.id} colSpan={groupSpan}><Button type="button" variant="ghost" onClick={()=>setCostVendor(vi)}>Extra costs · Edit</Button><VendorTotal control={control} vendorIndex={vi}/></td>)}</tr></tfoot>}
            </table>
            {!itemFields.length&&<p className={styles.empty}>Add an item or paste rows from Excel to begin.</p>}
            {!vendorFields.length&&<p className={styles.empty}>Add a vendor to compare prices.</p>}
          </div>
          </fieldset>
          <div className={styles.footer}><div><span>Tab → Next cell · Enter ↓ Next row · Shift+Enter ↑ · Ctrl+Enter Save</span><small>Unused new rows are ignored. Partially entered rows require correction.</small></div><Button type="button" variant="outline" disabled={isSubmitting} onClick={()=>setIsOpen(false)}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting?'Saving…':isEditMode?'Update Comparison':'Save Comparison'}</Button></div>
        </form>
        <Dialog open={!!errorPopup} onOpenChange={open=>{if(!open)setErrorPopup(null);}}><DialogContent className={styles.popup} onInteractOutside={e=>e.preventDefault()}><DialogHeader><DialogTitle>{errorPopup?.title}</DialogTitle><DialogDescription>Your entries are retained. Correct the details and retry.</DialogDescription></DialogHeader><ul role="alert">{errorPopup?.messages.map((message,i)=><li key={i}>{message}{errorPopup.paths?.[i]&&<Button type="button" variant="outline" onClick={()=>goToError(errorPopup.paths![i])}>Go to cell</Button>}</li>)}</ul><Button type="button" onClick={()=>setErrorPopup(null)}>Return to comparison</Button></DialogContent></Dialog>
        <Dialog open={costVendor!==null} onOpenChange={open=>{if(!open)setCostVendor(null);}}><DialogContent className={styles.popup}><DialogHeader><DialogTitle>Additional costs · {costVendor!==null ? getValues(`vendors.${costVendor}.name`) || `Vendor ${costVendor+1}` : ''}</DialogTitle><DialogDescription>Freight and other charges are added to this vendor’s grand total.</DialogDescription></DialogHeader>{costVendor!==null&&<VendorCostSection vendorIndex={costVendor} control={control}/>}<Button type="button" onClick={()=>setCostVendor(null)}>Done</Button></DialogContent></Dialog>
        <Dialog open={pasteOpen} onOpenChange={setPasteOpen}><DialogContent className={styles.popup}><DialogHeader><DialogTitle>Paste from Excel</DialogTitle><DialogDescription>Starts at row {activeCell.current.row+1}, editable column {activeCell.current.column+1}. Paste values only; omit headers and calculated Amount columns.</DialogDescription></DialogHeader><p className="text-sm">Column order: {columns.map(c=>`${c.vendor!==undefined?`Vendor ${c.vendor+1} `:''}${c.key==='uom'?'Unit':c.key}`).join(' · ')}</p><Textarea aria-label="Excel cells to paste" rows={8} value={pasteText} onChange={e=>setPasteText(e.target.value)}/><Button type="button" onClick={()=>applyPaste(pasteText)} disabled={!pasteText.trim()}>Apply cells</Button></DialogContent></Dialog>
        <Dialog open={!!pendingImport} onOpenChange={open=>{if(!open)setPendingImport(null);}}><DialogContent className={styles.popup}><DialogHeader><DialogTitle>Replace items with Excel import?</DialogTitle><DialogDescription>{pendingImport?.length} items found. Import replaces the current items and clears vendor quantities, rates and taxes. Vendor selections and additional costs remain.</DialogDescription></DialogHeader><p>First sheet headers: Description (or Item), UOM (or Unit). Missing units default to Nos.</p><div className="flex gap-2"><Button variant="outline" onClick={()=>setPendingImport(null)}>Cancel import</Button><Button onClick={()=>{if(!pendingImport)return;replaceItems(pendingImport.map(item=>({...item,quantity:1})));getValues('vendors').forEach((v,vi)=>setValue(`vendors.${vi}.quotes`,pendingImport.map(item=>({itemId:item.itemId,quantity:1,rate:0,taxPercent:0,receivedQuantity:0})),{shouldDirty:true}));blankIds.current.clear();setSeparateQuantities(false);setFindItem('');setSelectedRow(0);setPendingImport(null);}}>Replace items and prices</Button></div></DialogContent></Dialog>
        <AddVendorDialog isOpen={isAddVendorOpen} setIsOpen={setIsAddVendorOpen}/>
      </DialogContent>
    </Dialog>
  );
}
