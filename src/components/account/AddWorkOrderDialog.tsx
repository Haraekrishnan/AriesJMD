'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useGeneral } from '@/contexts/general-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const workOrderSchema = z.object({
  number: z.string().min(1, 'Work order number is required'),
  type: z.enum(['WO', 'ARC/OTC'], { required_error: 'Type is required' }),
});

type FormValues = z.infer<typeof workOrderSchema>;

interface AddWorkOrderDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function AddWorkOrderDialog({ isOpen, setIsOpen }: AddWorkOrderDialogProps) {
  const { addWorkOrder } = useGeneral();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: { type: 'WO' },
  });

  const onSubmit = (data: FormValues) => {
    addWorkOrder(data);
    toast({ title: 'Work Order Added', description: `The number "${data.number}" has been added.` });
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) form.reset({ type: 'WO' });
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Work Order Number</DialogTitle>
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
            <Button type="submit">Add Number</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}