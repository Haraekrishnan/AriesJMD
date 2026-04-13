'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '../ui/textarea';
import type { InwardOutwardRecord, InventoryItem } from '@/lib/types';
import { useEffect, useMemo } from 'react';
import { DatePickerInput } from '../ui/date-picker-input';
import { parseISO } from 'date-fns';
import { useInventory } from '@/contexts/inventory-provider';
import { ScrollArea } from '../ui/scroll-area';

const editSchema = z.object({
  // Transaction fields
  date: z.date(),
  source: z.string().min(1),
  quantity: z.coerce.number().min(1, "Quantity must be > 0"),
  remarks: z.string().optional(),
  
  // Item fields
  name: z.string().min(1, 'Name is required'),
  serialNumber: z.string().min(1, 'Serial is required'),
  ariesId: z.string().optional(),
  erpId: z.string().optional(),
  certification: z.string().optional(),
  chestCrollNo: z.string().optional(),
  purchaseDate: z.date().optional().nullable(),
  inspectionDate: z.date().optional().nullable(),
  inspectionDueDate: z.date().optional().nullable(),
  tpInspectionDueDate: z.date().optional().nullable(),
  tpCertificateUrl: z.string().url().optional().or(z.literal('')),
  inspectionCertificateUrl: z.string().url().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof editSchema>;

interface EditInwardOutwardDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  record: InwardOutwardRecord;
}

export default function EditInwardOutwardDialog({ isOpen, setIsOpen, record }: EditInwardOutwardDialogProps) {
  const { updateInwardOutwardRecord, updateInventoryItem, inventoryItems } = useInventory();
  const { toast } = useToast();

  const item = useMemo(() => inventoryItems.find(i => i.id === record.itemId), [inventoryItems, record]);

  const form = useForm<FormValues>({
    resolver: zodResolver(editSchema),
  });

  useEffect(() => {
    if (record && item) {
      form.reset({
        // transaction data
        date: parseISO(record.date),
        source: record.source,
        quantity: record.quantity,
        remarks: record.remarks,
        // item data
        name: item.name,
        serialNumber: item.serialNumber,
        ariesId: item.ariesId,
        erpId: item.erpId,
        certification: item.certification,
        chestCrollNo: item.chestCrollNo,
        purchaseDate: item.purchaseDate ? parseISO(item.purchaseDate) : null,
        inspectionDate: item.inspectionDate ? parseISO(item.inspectionDate) : null,
        inspectionDueDate: item.inspectionDueDate ? parseISO(item.inspectionDueDate) : null,
        tpInspectionDueDate: item.tpInspectionDueDate ? parseISO(item.tpInspectionDueDate) : null,
        tpCertificateUrl: item.tpCertificateUrl,
        inspectionCertificateUrl: item.inspectionCertificateUrl,
      });
    }
  }, [record, item, form, isOpen]);

  const onSubmit = (data: FormValues) => {
    if (!item) {
        toast({ title: 'Error', description: 'Associated item not found.', variant: 'destructive'});
        return;
    }
    
    // 1. Update the InwardOutwardRecord
    updateInwardOutwardRecord({
        ...record,
        date: data.date.toISOString(),
        source: data.source,
        quantity: data.quantity,
        remarks: data.remarks
    });

    // 2. Update the InventoryItem
    const { date, source, quantity, remarks, ...itemData } = data;
    updateInventoryItem({
        ...item,
        ...itemData,
        purchaseDate: itemData.purchaseDate ? itemData.purchaseDate.toISOString() : null,
        inspectionDate: itemData.inspectionDate ? itemData.inspectionDate.toISOString() : null,
        inspectionDueDate: itemData.inspectionDueDate ? itemData.inspectionDueDate.toISOString() : null,
        tpInspectionDueDate: itemData.tpInspectionDueDate ? itemData.tpInspectionDueDate.toISOString() : null,
    });

    toast({ title: 'Record Updated' });
    setIsOpen(false);
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl h-full flex flex-col sm:max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Inward Record</DialogTitle>
          <DialogDescription>
            Update details for this transaction and its associated item.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 pr-6 -mr-6">
            <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Transaction Details</h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>Transaction Date</Label>
                        <Controller name="date" control={form.control} render={({ field }) => <DatePickerInput value={field.value} onChange={field.onChange} />} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input id="quantity" type="number" {...form.register('quantity')} />
                        {form.formState.errors.quantity && <p className="text-xs text-destructive">{form.formState.errors.quantity.message}</p>}
                    </div>
                    <div className="space-y-2 md:col-span-3">
                        <Label htmlFor="source">Source / Reason</Label>
                        <Input id="source" {...form.register('source')} />
                    </div>
                     <div className="space-y-2 md:col-span-3">
                        <Label htmlFor="remarks">Remarks</Label>
                        <Textarea id="remarks" {...form.register('remarks')} />
                    </div>
                </div>

                <h3 className="font-semibold text-lg border-b pb-2 pt-4">Item Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label>Item Name</Label>
                            <Input {...form.register(`name`)} placeholder="e.g., Harness" />
                        </div>
                        <div className="space-y-2">
                            <Label>Serial Number</Label>
                            <Input {...form.register(`serialNumber`)} placeholder="Serial Number" />
                        </div>
                        <div className="space-y-2">
                            <Label>Aries ID</Label>
                            <Input {...form.register(`ariesId`)} placeholder="Aries ID" />
                        </div>
                        <div className="space-y-2">
                            <Label>Chest Croll No.</Label>
                            <Input {...form.register(`chestCrollNo`)} placeholder="Chest Croll No." />
                        </div>
                         <div className="space-y-2">
                            <Label>ERP ID</Label>
                            <Input {...form.register(`erpId`)} placeholder="ERP ID" />
                        </div>
                        <div className="space-y-2">
                            <Label>Certification</Label>
                            <Input {...form.register(`certification`)} placeholder="Certification" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>Purchase Date</Label>
                            <Controller name={`purchaseDate`} control={form.control} render={({field}) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />} />
                        </div>
                        <div className="space-y-2">
                            <Label>Inspection Date</Label>
                            <Controller name={`inspectionDate`} control={form.control} render={({field}) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />} />
                        </div>
                         <div className="space-y-2">
                            <Label>Inspection Due Date</Label>
                            <Controller name={`inspectionDueDate`} control={form.control} render={({field}) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>TP Inspection Due Date</Label>
                            <Controller name={`tpInspectionDueDate`} control={form.control} render={({field}) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />} />
                        </div>
                         <div className="space-y-2 md:col-span-2">
                            <Label>TP Certificate URL</Label>
                            <Input {...form.register(`tpCertificateUrl`)} placeholder="https://" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>Inspection Certificate URL</Label>
                            <Input {...form.register(`inspectionCertificateUrl`)} placeholder="https://" />
                        </div>
                    </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}