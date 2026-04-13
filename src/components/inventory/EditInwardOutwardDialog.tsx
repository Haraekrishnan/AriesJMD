'use client';
import { useForm } from 'react-hook-form';
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

const formSchema = z.object({
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
      });
    }
  }, [record, form]);

  const onSubmit = (data: FormValues) => {
    if (!updateInwardOutwardRecord) return;
    updateInwardOutwardRecord({
        ...record,
        ...data,
    });
    toast({ title: 'Record Updated' });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Inward/Outward Record</DialogTitle>
          <DialogDescription>
            Update the source or remarks for this transaction.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
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
