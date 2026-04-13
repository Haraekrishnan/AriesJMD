
'use client';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import type { InwardOutwardRecord, InventoryItem } from '@/lib/types';
import { DatePickerInput } from '../ui/date-picker-input';
import { Separator } from '../ui/separator';
import { useEffect } from 'react';

const newItemSchema = z.object({
  id: z.string(),
  name: z.string(),
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

const finalizeSchema = z.object({
  items: z.array(newItemSchema).min(1, 'Add at least one item.'),
});

type FormValues = z.infer<typeof finalizeSchema>;

interface FinalizeInwardDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  record: InwardOutwardRecord;
}

export default function FinalizeInwardDialog({ isOpen, setIsOpen, record }: FinalizeInwardDialogProps) {
  const { finalizeInwardPurchase, projects } = useAppContext();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(finalizeSchema),
    defaultValues: {
      items: [],
    },
  });

  useEffect(() => {
    if (record) {
      const newItems = Array.from({ length: record.quantity }, (_, i) => ({
        id: `new-item-${i}`,
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
      }));
      form.reset({ items: newItems });
    }
  }, [record, form]);

  const { fields } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const onSubmit = (data: FormValues) => {
    const storeProject = projects.find(p => p.name === 'Store');

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
        status: 'In Store' as const,
        projectId: storeProject?.id || '',
        quantity: 1,
    }));
    finalizeInwardPurchase(record.id, itemsToCreate);
    toast({ title: 'Inward Finalized', description: `${data.items.length} new items have been created.` });
    setIsOpen(false);
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset({ items: [] });
    }
    setIsOpen(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl h-full flex flex-col sm:max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Finalize Inward Record</DialogTitle>
          <DialogDescription>
            Enter details for the {record.quantity} {record.itemName}(s) received from "{record.source}".
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 px-4 -mx-4">
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-md relative bg-muted/30">
                  <h4 className="font-bold mb-2">Item {index + 1} of {record.quantity}</h4>
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <DialogFooter className="pt-4 mt-auto border-t px-6 pb-6 shrink-0">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
            <Button type="submit">Finalize & Create Items</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
