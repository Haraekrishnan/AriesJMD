
'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import type { ManpowerProfile } from '@/lib/types';
import { DatePickerInput } from '../ui/date-picker-input';
import { useEffect } from 'react';

const ppeHistorySchema = z.object({
  ppeType: z.enum(['Coverall', 'Safety Shoes'], { required_error: "PPE Type is required."}),
  size: z.string().min(1, 'Size is required'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  issueDate: z.date({ required_error: 'Issue date is required' }),
  requestType: z.enum(['New', 'Replacement']),
  remarks: z.string().optional(),
});

type PpeHistoryFormValues = z.infer<typeof ppeHistorySchema>;

interface AddPpeHistoryDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  profile: ManpowerProfile;
}

export default function AddPpeHistoryDialog({ isOpen, setIsOpen, profile }: AddPpeHistoryDialogProps) {
  const { user, addPpeHistoryRecord } = useAppContext();
  const { toast } = useToast();

  const form = useForm<PpeHistoryFormValues>({
    resolver: zodResolver(ppeHistorySchema),
    defaultValues: {
      requestType: 'New',
      issueDate: new Date(),
    },
  });

  const ppeType = form.watch('ppeType');

  useEffect(() => {
    if (ppeType && profile) {
      const size = ppeType === 'Coverall' ? profile.coverallSize : profile.shoeSize;
      form.setValue('size', size || '');
    }
  }, [ppeType, profile, form]);

  const onSubmit = (data: PpeHistoryFormValues) => {
    if (!user) return;
    addPpeHistoryRecord(profile.id, {
      ...data,
      issueDate: data.issueDate.toISOString(),
      issuedById: user.id,
    });
    toast({ title: 'PPE Record Added', description: 'The PPE issue history has been updated.' });
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset({
        requestType: 'New',
        issueDate: new Date(),
        quantity: 1,
      });
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add PPE Issue Record</DialogTitle>
          <DialogDescription>Manually log a PPE item issued to {profile.name}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>PPE Type</Label>
              <Controller
                name="ppeType"
                control={form.control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Coverall">Coverall</SelectItem>
                      <SelectItem value="Safety Shoes">Safety Shoes</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.ppeType && <p className="text-xs text-destructive">{form.formState.errors.ppeType.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label>Size</Label>
                    <Input {...form.register('size')} placeholder="e.g., 42 or XL" />
                    {form.formState.errors.size && <p className="text-xs text-destructive">{form.formState.errors.size.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input type="number" {...form.register('quantity')} />
                    {form.formState.errors.quantity && <p className="text-xs text-destructive">{form.formState.errors.quantity.message}</p>}
                </div>
            </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Request Type</Label>
              <Controller
                name="requestType"
                control={form.control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="Replacement">Replacement</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Issue Date</Label>
              <Controller name="issueDate" control={form.control} render={({ field }) => <DatePickerInput value={field.value} onChange={field.onChange} />} />
              {form.formState.errors.issueDate && <p className="text-xs text-destructive">{form.formState.errors.issueDate.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Remarks</Label>
            <Textarea {...form.register('remarks')} rows={3} placeholder="Reason for replacement, etc." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Add Record</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
