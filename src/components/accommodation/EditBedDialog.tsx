
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
import type { Bed } from '@/lib/types';
import { useEffect } from 'react';

const bedSchema = z.object({
  bedNumber: z.string().min(1, 'Bed number is required'),
});

type BedFormValues = z.infer<typeof bedSchema>;

interface EditBedDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  buildingId: string;
  roomId: string;
  bed: Bed;
}

export default function EditBedDialog({ isOpen, setIsOpen, buildingId, roomId, bed }: EditBedDialogProps) {
  const { updateBed } = useAppContext();
  const { toast } = useToast();

  const form = useForm<BedFormValues>({
    resolver: zodResolver(bedSchema),
    defaultValues: {
      bedNumber: bed.bedNumber,
    },
  });

  useEffect(() => {
    form.reset({ bedNumber: bed.bedNumber });
  }, [bed, form]);

  const onSubmit = (data: BedFormValues) => {
    updateBed(buildingId, roomId, { ...bed, bedNumber: data.bedNumber });
    toast({ title: 'Bed Updated', description: 'The bed number has been updated.' });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Edit Bed</DialogTitle>
          <DialogDescription>Update the number/name for this bed.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="bedNumber">Bed Number/Name</Label>
            <Input id="bedNumber" {...form.register('bedNumber')} />
            {form.formState.errors.bedNumber && <p className="text-xs text-destructive">{form.formState.errors.bedNumber.message}</p>}
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
