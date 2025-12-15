
'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ManpowerProfile, PpeHistoryRecord } from '@/lib/types';
import { DatePickerInput } from '../ui/date-picker-input';
import { parseISO, isValid } from 'date-fns';

const ppeHistorySchema = z.object({
  ppeType: z.enum(['Coverall', 'Safety Shoes'], { required_error: "PPE Type is required."}),
  size: z.string().min(1, 'Size is required'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1').default(1),
  issueDate: z.date({ required_error: 'Issue date is required' }),
  requestType: z.enum(['New', 'Replacement']),
  remarks: z.string().optional(),
});

type PpeHistoryFormValues = z.infer<typeof ppeHistorySchema>;

interface EditPpeHistoryDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  record: PpeHistoryRecord;
  profile: ManpowerProfile;
}

export default function EditPpeHistoryDialog({ isOpen, setIsOpen, record, profile }: EditPpeHistoryDialogProps) {
  const { updatePpeHistoryRecord } = useAppContext();
  const { toast } = useToast();

  const form = useForm<PpeHistoryFormValues>({
    resolver: zodResolver(ppeHistorySchema),
  });

  useEffect(() => {
    if (record && isOpen) {
        const parsedDate = record.issueDate ? parseISO(record.issueDate) : null;
        form.reset({
            ...record,
            issueDate: parsedDate && isValid(parsedDate) ? parsedDate : undefined,
        });
    }
  }, [record, isOpen, form]);

  const onSubmit = (data: PpeHistoryFormValues) => {
    const updatedRecord: PpeHistoryRecord = {
      ...record,
      ...data,
      issueDate: data.issueDate.toISOString(),
    };
    updatePpeHistoryRecord(profile.id, updatedRecord);
    toast({ title: 'PPE History Updated', description: 'The record has been successfully updated.' });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit PPE Issue Record</DialogTitle>
          <DialogDescription>Update the details for this PPE issue for {profile.name}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label>PPE Type</Label>
                  <Controller name="ppeType" control={form.control} render={({ field }) => ( <Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue placeholder="Select type"/></SelectTrigger><SelectContent><SelectItem value="Coverall">Coverall</SelectItem><SelectItem value="Safety Shoes">Safety Shoes</SelectItem></SelectContent></Select> )}/>
              </div>
              <div className="space-y-2">
                  <Label>Request Type</Label>
                  <Controller name="requestType" control={form.control} render={({ field }) => ( <Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="New">New</SelectItem><SelectItem value="Replacement">Replacement</SelectItem></SelectContent></Select> )}/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Size</Label>
                    <Input {...form.register('size')} />
                    {form.formState.errors.size && <p className="text-xs text-destructive">{form.formState.errors.size.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input type="number" {...form.register('quantity')} />
                    {form.formState.errors.quantity && <p className="text-xs text-destructive">{form.formState.errors.quantity.message}</p>}
                </div>
            </div>
            <div className="space-y-2">
                <Label>Issue Date</Label>
                <Controller name="issueDate" control={form.control} render={({ field }) => <DatePickerInput value={field.value} onChange={field.onChange} />} />
                {form.formState.errors.issueDate && <p className="text-xs text-destructive">{form.formState.errors.issueDate.message}</p>}
            </div>
             <div className="space-y-2">
                <Label>Remarks</Label>
                <Textarea {...form.register('remarks')} rows={2} />
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
