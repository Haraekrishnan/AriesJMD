'use client';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useInwardOutward } from '@/contexts/inward-outward-provider';
import { useInventory } from '@/contexts/inventory-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { PlusCircle, Trash2, ChevronsUpDown, Check } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { useMemo, useState, useRef } from 'react';
import { DatePickerInput } from '../ui/date-picker-input';
import { Separator } from '../ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useGeneral } from '@/contexts/general-provider';
import { cn } from '@/lib/utils';

const newItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  serialNumber: z.string().min(1, 'Serial is required'),
  ariesId: z.string().optional(),
  erpId: z.string().optional(),
  certification: z.string().optional(),
  chestCrollNo: z.string().optional(),
  purchaseDate: z.date().optional().nullable(),
  remarks: z.string().optional(),
  inspectionDate: z.date().optional().nullable(),
  inspectionDueDate: z.date().optional().nullable(),
  tpInspectionDueDate: z.date().optional().nullable(),
  certificateUrl: z.string().url().optional().or(z.literal('')),
  inspectionCertificateUrl: z.string().url().optional().or(z.literal('')),
});

const batchInwardSchema = z.object({
  source: z.string().min(1, 'A source or reason is required.'),
  projectId: z.string().min(1, 'A project must be selected.'),
  items: z.array(newItemSchema).min(1, 'Add at least one item.'),
});

type FormValues = z.infer<typeof batchInwardSchema>;

interface AddInwardRecordDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const generateDefaultItem = () => ({
    id: `item-${Date.now()}-${Math.random()}`,
    name: '',
    serialNumber: '',
    ariesId: '',
    erpId: '',
    certification: '',
    chestCrollNo: '',
    purchaseDate: null,
    remarks: '',
    inspectionDate: null,
    inspectionDueDate: null,
    tpInspectionDueDate: null,
    certificateUrl: '',
    inspectionCertificateUrl: '',
});

export default function AddInwardRecordDialog({ isOpen, setIsOpen }: AddInwardRecordDialogProps) {
  const { batchCreateAndLogItems } = useInwardOutward();
  const { inventoryItems } = useInventory();
  const { projects } = useGeneral();
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importError, setImportError] = useState('');

  const itemNames = useMemo(() => Array.from(new Set(inventoryItems.map(item => item.name))), [inventoryItems]);

  const form = useForm<FormValues>({
    resolver: zodResolver(batchInwardSchema),
    defaultValues: {
      source: '',
      projectId: projects.find(p => p.name === 'Store')?.id,
      items: [generateDefaultItem()],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const onSubmit = async (data: FormValues) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    const itemsToCreate = data.items.map(item => ({
        name: item.name,
        serialNumber: item.serialNumber,
        ariesId: item.ariesId,
        erpId: item.erpId,
        certification: item.certification,
        chestCrollNo: item.chestCrollNo,
        remarks: item.remarks,
        purchaseDate: item.purchaseDate ? item.purchaseDate.toISOString() : null,
        inspectionDate: item.inspectionDate ? item.inspectionDate.toISOString() : null,
        inspectionDueDate: item.inspectionDueDate ? item.inspectionDueDate.toISOString() : null,
        tpInspectionDueDate: item.tpInspectionDueDate ? item.tpInspectionDueDate.toISOString() : null,
        certificateUrl: item.certificateUrl || null,
        inspectionCertificateUrl: item.inspectionCertificateUrl || null,
    }));
    try {
      const count = await batchCreateAndLogItems(itemsToCreate, data.source, data.projectId);
      if (!count) throw Error('No items were saved.');
      toast({ title: 'Batch Inward Successful', description: count + ' new items were created and logged.' });
      form.reset(); setImportMessage(''); setImportError(''); setIsOpen(false);
    } catch { toast({ title: 'Could not save items', description: 'Your draft is still here. Please try again.', variant: 'destructive' }); }
    finally { busyRef.current = false; setBusy(false); }
  };

  const handleOpenChange = (open: boolean) => {
    if (busyRef.current) return;
    if (!open) {
      setImportMessage(''); setImportError('');
      form.reset({
        source: '',
        projectId: projects.find(p => p.name === 'Store')?.id,
        items: [generateDefaultItem()],
      });
    }
    setIsOpen(open);
  };

  const downloadTemplate = async () => {
    try {
      const [excel, helper] = await Promise.all([import('xlsx'), import('./inward-excel')]);
      excel.writeFile(helper.inwardTemplate(), 'Batch-Inward-Template.xlsx');
    } catch { setImportError('Could not download the template. Please try again.'); }
  };
  const importExcel = async (file?: File) => {
    if (!file || busyRef.current) return;
    if (!/\.xlsx?$/i.test(file.name) || file.size > 5 * 1024 * 1024) { setImportError('Choose an .xlsx or .xls file smaller than 5 MB.'); return; }
    busyRef.current = true; setBusy(true); setImportError(''); setImportMessage('');
    try {
      const [excel, helper] = await Promise.all([import('xlsx'), import('./inward-excel')]);
      const book = excel.read(await file.arrayBuffer(), { type: 'array', cellDates: false });
      const draft = form.getValues('items');
      const rows = helper.parseInwardWorkbook(book, [...inventoryItems.map(item => item.serialNumber || ''), ...draft.map(item => item.serialNumber)]);
      const imported = rows.map(row => ({ ...generateDefaultItem(), ...row })) as FormValues['items'];
      const empty = draft.length === 1 && Object.entries(draft[0]).every(([key, value]) => key === 'id' || !value);
      if (empty) replace(imported); else append(imported);
      setImportMessage(imported.length + ' items added to the draft. Review below, then Create & Log Items.');
    } catch (error) { setImportError((error as Error).message || 'Could not read this workbook.'); }
    finally { busyRef.current = false; setBusy(false); if (fileInput.current) fileInput.current.value = ''; }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl h-full flex flex-col sm:max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>New Batch Inward Entry</DialogTitle>
          <DialogDescription>Create multiple new serialized items and log them as an inward transaction.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          <fieldset disabled={busy} className="contents">
          <div className="px-1 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="source">Source / Reason</Label>
                <Input id="source" {...form.register('source')} placeholder="e.g., Purchase from Vendor XYZ, Initial Stock" />
                {form.formState.errors.source && <p className="text-xs text-destructive">{form.formState.errors.source.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Project</Label>
                <Controller control={form.control} name="projectId" render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger><SelectValue placeholder="Select project"/></SelectTrigger>
                        <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                )}/>
                {form.formState.errors.projectId && <p className="text-xs text-destructive">{form.formState.errors.projectId.message}</p>}
              </div>
            </div>
          </div>
          <div className="border rounded-md p-3 space-y-2 shrink-0">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={downloadTemplate}>Download Excel Template</Button>
              <Button type="button" variant="outline" onClick={() => fileInput.current?.click()}>Import Excel</Button>
              <input ref={fileInput} type="file" accept=".xlsx,.xls" className="hidden" aria-label="Import inward Excel" onChange={e => void importExcel(e.target.files?.[0])} />
            </div>
            <details className="text-sm"><summary className="cursor-pointer font-medium">How to arrange the Excel file</summary>
              <ul className="list-disc pl-5 space-y-1 mt-2 max-h-32 overflow-y-auto">
                <li>Use the template's Items sheet. Keep row 1 headings; one item per row, up to 200 items.</li>
                <li>Item Name and Serial Number are required. Other fields can be blank.</li>
                <li>Format serial numbers and IDs as Text before entering them to retain leading zeros.</li>
                <li>Dates: DD-MM-YYYY (07-10-2026), YYYY-MM-DD, or Excel date cells.</li>
                <li>Use complete http:// or https:// certificate links. No formulas or merged cells.</li>
                <li>Source and Project above apply to all rows. Import adds to this draft; review before saving.</li>
              </ul>
            </details>
            <p role="status" className="text-sm">{busy ? 'Processing, please wait…' : importMessage}</p>
            {importError && <p role="alert" className="text-sm text-destructive">{importError}</p>}
          </div>
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col mt-4">
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-4">
                <datalist id="item-names-list">
                  {itemNames.map(n => <option key={n} value={n} />)}
                </datalist>
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-md relative bg-muted/30">
                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4 text-destructive"/>
                    </Button>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label>Item Name</Label>
                            <Input {...form.register(`items.${index}.name`)} placeholder="e.g., Harness" list="item-names-list" />
                            {form.formState.errors.items?.[index]?.name && <p className="text-xs text-destructive mt-1">{form.formState.errors.items[index]?.name?.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Serial Number</Label>
                            <Input {...form.register(`items.${index}.serialNumber`)} placeholder="Serial Number" />
                            {form.formState.errors.items?.[index]?.serialNumber && <p className="text-xs text-destructive mt-1">{form.formState.errors.items[index]?.serialNumber?.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Aries ID</Label>
                            <Input {...form.register(`items.${index}.ariesId`)} placeholder="Aries ID" />
                        </div>
                        <div className="space-y-2">
                            <Label>Chest Croll No.</Label>
                            <Input {...form.register(`items.${index}.chestCrollNo`)} placeholder="For Harness only" />
                        </div>
                         <div className="space-y-2">
                            <Label>ERP ID</Label>
                            <Input {...form.register(`items.${index}.erpId`)} placeholder="ERP ID" />
                        </div>
                        <div className="space-y-2">
                            <Label>Certification</Label>
                            <Input {...form.register(`items.${index}.certification`)} placeholder="Certification" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>Purchase Date</Label>
                            <Controller name={`items.${index}.purchaseDate`} control={form.control} render={({field}) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />} />
                        </div>
                        <div className="space-y-2">
                            <Label>Inspection Date</Label>
                            <Controller name={`items.${index}.inspectionDate`} control={form.control} render={({field}) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />} />
                        </div>
                         <div className="space-y-2">
                            <Label>Inspection Due Date</Label>
                            <Controller name={`items.${index}.inspectionDueDate`} control={form.control} render={({field}) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>TP Inspection Due Date</Label>
                            <Controller name={`items.${index}.tpInspectionDueDate`} control={form.control} render={({field}) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />} />
                        </div>
                         <div className="space-y-2 md:col-span-2">
                            <Label>TP Certificate URL</Label>
                            <Input {...form.register(`items.${index}.certificateUrl`)} placeholder="https://..." />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>Inspection Certificate URL</Label>
                            <Input {...form.register(`items.${index}.inspectionCertificateUrl`)} placeholder="https://..." />
                        </div>
                        <div className="space-y-2 md:col-span-4">
                            <Label>Remarks</Label>
                            <Input {...form.register(`items.${index}.remarks`)} placeholder="Optional remarks" />
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          <div className="px-4 pt-4 shrink-0">
            <Button type="button" variant="outline" size="sm" onClick={() => append(generateDefaultItem())}>
              <PlusCircle className="mr-2 h-4 w-4" />Add Row
            </Button>
            {form.formState.errors.items?.root && <p className="text-xs text-destructive pt-2">{form.formState.errors.items.root.message}</p>}
          </div>
          <DialogFooter className="pt-4 mt-auto border-t px-6 pb-6 shrink-0">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
            <Button type="submit">Create & Log Items</Button>
          </DialogFooter>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
