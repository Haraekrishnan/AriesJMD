
'use client';
import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DatePickerInput } from '../ui/date-picker-input';
import { Input } from '../ui/input';
import type { MemoRecord, ManpowerProfile } from '@/lib/types';

const memoSchema = z.object({
  type: z.enum(['Memo', 'Warning Letter']),
  date: z.date({ required_error: 'Please select a date.' }),
  reason: z.string().min(10, 'A detailed reason is required.'),
  issuedBy: z.string().min(1, 'Issuer name is required.'),
});

type MemoFormValues = z.infer<typeof memoSchema>;

interface EditMemoDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  memo: MemoRecord;
  profile: ManpowerProfile;
}

export default function EditMemoDialog({ isOpen, setIsOpen, memo, profile }: EditMemoDialogProps) {
  const { updateMemoRecord } = useAppContext();
  const { toast } = useToast();

  const form = useForm<MemoFormValues>({
    resolver: zodResolver(memoSchema),
  });
  
  useEffect(() => {
    if (memo && isOpen) {
      form.reset({
        type: memo.type,
        date: new Date(memo.date),
        reason: memo.reason,
        issuedBy: memo.issuedBy,
      });
    }
  }, [memo, isOpen, form]);

  const onSubmit = (data: MemoFormValues) => {
    updateMemoRecord(profile.id, {
      ...memo,
      ...data,
      date: data.date.toISOString(),
    });
    toast({ title: `${data.type} Updated`, description: `The record has been updated.` });
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Memo / Warning Letter</DialogTitle>
          <DialogDescription>Update the details for this record for {profile.name}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Controller
                name="type"
                control={form.control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Memo">Memo</SelectItem>
                      <SelectItem value="Warning Letter">Warning Letter</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Date Issued</Label>
              <Controller
                name="date"
                control={form.control}
                render={({ field }) => (
                  <DatePickerInput value={field.value} onChange={field.onChange} />
                )}
              />
               {form.formState.errors.date && <p className="text-xs text-destructive">{form.formState.errors.date.message}</p>}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="issuedBy">Issued By</Label>
            <Input id="issuedBy" {...form.register('issuedBy')} />
            {form.formState.errors.issuedBy && <p className="text-xs text-destructive">{form.formState.errors.issuedBy.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Reason / Details</Label>
            <Textarea {...form.register('reason')} rows={5} />
            {form.formState.errors.reason && <p className="text-xs text-destructive">{form.formState.errors.reason.message}</p>}
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
