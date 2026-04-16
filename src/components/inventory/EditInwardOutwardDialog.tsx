'use client';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import type { InwardOutwardRecord, InventoryItem } from '@/lib/types';
import { useEffect, useMemo, useState } from 'react';
import { DatePickerInput } from '../ui/date-picker-input';
import { parseISO, isValid } from 'date-fns';
import { ScrollArea } from '../ui/scroll-area';
import { PlusCircle, Trash2, ChevronsUpDown, Check } from 'lucide-react';
import { useInwardOutward } from '@/contexts/inward-outward-provider';
import { useInventory } from '@/contexts/inventory-provider';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { cn } from '@/lib/utils';

const newItemSchema = z.object({
  id: z.string(), // This is the inventory item ID for existing, or a temp ID for new
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

const editSchema = z.object({
  date: z.date(),
  source: z.string().min(1),
  remarks: z.string().optional(),
  items: z.array(newItemSchema).min(1, "At least one item is required."),
});

type FormValues = z.infer<typeof editSchema>;

interface EditInwardOutwardDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  record: InwardOutwardRecord;
}


export default function EditInwardOutwardDialog({ isOpen, setIsOpen, record }: EditInwardOutwardDialogProps) {
  const { updateInwardOutwardRecord } = useInwardOutward();
  const { inventoryItems } = useInventory();
  const { toast } = useToast();
  const [popoverOpenState, setPopoverOpenState] = useState<Record<number, boolean>>({});

  const itemNames = useMemo(() => Array.from(new Set(inventoryItems.map(item => item.name))), [inventoryItems]);

  const form = useForm<FormValues>({
    resolver: zodResolver(editSchema),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  useEffect(() => {
    if (record && isOpen) {
        const itemIds = record.finalizedItemIds || (record.itemId ? [record.itemId] : []);
        const existingItems = itemIds.map(id => inventoryItems.find(i => i.id === id)).filter(Boolean) as InventoryItem[];
        
        form.reset({
            date: parseISO(record.date),
            source: record.source,
            remarks: record.remarks,
            items: existingItems.map(item => ({
                id: item.id,
                name: item.name,
                serialNumber: item.serialNumber,
                ariesId: item.ariesId || '',
                erpId: item.erpId || '',
                certification: item.certification || '',
                chestCrollNo: item.chestCrollNo || '',
                purchaseDate: item.purchaseDate ? parseISO(item.purchaseDate) : null,
                remarks: item.remarks || '',
                inspectionDate: item.inspectionDate ? parseISO(item.inspectionDate) : null,
                inspectionDueDate: item.inspectionDueDate ? parseISO(item.inspectionDueDate) : null,
                tpInspectionDueDate: item.tpInspectionDueDate ? parseISO(item.tpInspectionDueDate) : null,
                certificateUrl: item.certificateUrl || '',
                inspectionCertificateUrl: item.inspectionCertificateUrl || '',
            }))
        });
    }
  }, [record, isOpen, inventoryItems, form]);

  const generateNewItemFromRecord = (record: InwardOutwardRecord) => ({
      id: `new-${Date.now()}-${Math.random()}`,
      name: record.itemName,
      serialNumber: '',
      ariesId: '',
      erpId: '',
      certification: '',
      chestCrollNo: '',
      purchaseDate: record.date ? new Date(record.date) : null,
      remarks: '',
      inspectionDate: null,
      inspectionDueDate: null,
      tpInspectionDueDate: null,
      certificateUrl: '',
      inspectionCertificateUrl: '',
  });

  const onSubmit = (data: FormValues) => {
    updateInwardOutwardRecord(record, data.items.map(item => ({...item, id: item.id.startsWith('new-') ? undefined : item.id} as any)));
    setIsOpen(false);
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    setIsOpen(open);
  };
  
  const handleItemSelect = (index: number, itemName: string) => {
    form.setValue(`items.${index}.name`, itemName);
    setPopoverOpenState(prev => ({...prev, [index]: false}));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl h-full flex flex-col sm:max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Inward Record</DialogTitle>
          <DialogDescription>
            Update details for this transaction and its associated items.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-1 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Transaction Date</Label>
                    <Controller name="date" control={form.control} render={({ field }) => <DatePickerInput value={field.value} onChange={field.onChange} />} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="source">Source / Reason</Label>
                    <Input id="source" {...form.register('source')} />
                </div>
                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="remarks">Remarks</Label>
                    <Textarea id="remarks" {...form.register('remarks')} />
                </div>
            </div>
          </div>
          <div className="flex-1 overflow-hidden flex flex-col mt-4">
            <ScrollArea className="flex-1 px-4 -mx-4">
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-md relative bg-muted/30">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-bold">Item {index + 1}</h4>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4 text-destructive"/>
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label>Item Name</Label>
                            <Controller
                                name={`items.${index}.name`}
                                control={form.control}
                                render={({ field: controllerField }) => (
                                    <Popover open={popoverOpenState[index]} onOpenChange={(open) => setPopoverOpenState(prev => ({ ...prev, [index]: open }))}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                                                <span className="truncate">{controllerField.value || "Select item..."}</span>
                                                <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50"/>
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                            <Command>
                                                <CommandInput placeholder="Search items..." />
                                                <CommandList>
                                                    <CommandEmpty>No item found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {itemNames.map(name => (
                                                            <CommandItem
                                                                key={name}
                                                                value={name}
                                                                onSelect={() => handleItemSelect(index, name)}
                                                            >
                                                                <Check className={cn("mr-2 h-4 w-4", name === controllerField.value ? "opacity-100" : "opacity-0")} />
                                                                {name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                )}
                            />
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
                            <Label>Item Remarks</Label>
                            <Input {...form.register(`items.${index}.remarks`)} placeholder="Optional remarks" />
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          <div className="px-4 pt-4 shrink-0">
            <Button type="button" variant="outline" size="sm" onClick={() => append(generateNewItemFromRecord(record))}>
              <PlusCircle className="mr-2 h-4 w-4" />Add Row
            </Button>
            {form.formState.errors.items?.root && <p className="text-xs text-destructive pt-2">{form.formState.errors.items.root.message}</p>}
          </div>
          <DialogFooter className="pt-4 mt-auto border-t px-6 pb-6 shrink-0">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
