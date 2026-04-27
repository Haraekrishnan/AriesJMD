'use client';
import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useGeneral } from '@/contexts/general-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { WorkOrder } from '@/lib/types';

const workOrderSchema = z.object({
  number: z.string().min(1, 'Work order number is required'),
  type: z.enum(['WO', 'ARC/OTC'], { required_error: 'Type is required' }),
});

type FormValues = z.infer<typeof workOrderSchema>;

interface EditWorkOrderDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  workOrder: WorkOrder;
}

export default function EditWorkOrderDialog({ isOpen, setIsOpen, workOrder }: EditWorkOrderDialogProps) {
  const { updateWorkOrder } = useGeneral();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(workOrderSchema),
  });

  useEffect(() => {
    if (workOrder && isOpen) {
      form.reset(workOrder);
    }
  }, [workOrder, isOpen, form]);

  const onSubmit = (data: FormValues) => {
    updateWorkOrder({ ...workOrder, ...data });
    toast({ title: 'Work Order Updated' });
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Work Order Number</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="number">Work Order Number</Label>
            <Input id="number" {...form.register('number')} />
            {form.formState.errors.number && <p className="text-xs text-destructive">{form.formState.errors.number.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Controller
              name="type"
              control={form.control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WO">WO Number</SelectItem>
                    <SelectItem value="ARC/OTC">ARC/OTC WO Number</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
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