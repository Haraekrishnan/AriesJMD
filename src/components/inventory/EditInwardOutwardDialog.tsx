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
import type { InwardOutwardRecord } from '@/lib/types';
import { useEffect } from 'react';
import { DatePickerInput } from '../ui/date-picker-input';
import { parseISO } from 'date-fns';

const formSchema = z.object({
  date: z.date({ required_error: 'Date is required' }),
  quantity: z.coerce.number().min(1, 'Quantity must be > 0'),
  source: z.string().min(1, 'Source is required.'),
  remarks: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditInwardOutwardDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  record: InwardOutwardRecord;
}

export default function EditInwardOutwardDialog({ isOpen, setIsOpen, record }: EditInwardOutwardDialogProps) {
  const { updateInwardOutwardRecord } = useAppContext();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (record) {
      form.reset({
        source: record.source,
        remarks: record.remarks,
        quantity: record.quantity,
        date: record.date ? parseISO(record.date) : new Date(),
      });
    }
  }, [record, form, isOpen]);

  const onSubmit = (data: FormValues) => {
    if (!updateInwardOutwardRecord) return;
    updateInwardOutwardRecord({
        ...record,
        ...data,
        date: data.date.toISOString(),
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Inward/Outward Record</DialogTitle>
          <DialogDescription>
            Update the details for this transaction. Item: <strong>{record.itemName}</strong>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Controller name="date" control={form.control} render={({ field }) => <DatePickerInput value={field.value} onChange={field.onChange} />} />
              {form.formState.errors.date && <p className="text-xs text-destructive">{form.formState.errors.date.message}</p>}
            </div>
             <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" type="number" {...form.register('quantity')} />
              {form.formState.errors.quantity && <p className="text-xs text-destructive">{form.formState.errors.quantity.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="source">Source / Reason</Label>
            <Input id="source" {...form.register('source')} />
            {form.formState.errors.source && <p className="text-xs text-destructive">{form.formState.errors.source.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea id="remarks" {...form.register('remarks')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
