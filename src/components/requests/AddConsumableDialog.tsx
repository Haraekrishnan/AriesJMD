
'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useConsumable } from '@/contexts/consumable-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const consumableSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  quantity: z.coerce.number().min(0, 'Quantity must be non-negative'),
  unit: z.string().min(1, 'Unit is required (e.g., pcs, box, m)'),
  category: z.enum(['Daily Consumable', 'Job Consumable']),
  remarks: z.string().optional(),
});

type FormValues = z.infer<typeof consumableSchema>;

interface AddConsumableDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function AddConsumableDialog({ isOpen, setIsOpen }: AddConsumableDialogProps) {
  const { addConsumableItem } = useConsumable();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(consumableSchema),
    defaultValues: { quantity: 0, unit: 'pcs', category: 'Daily Consumable' },
  });

  const onSubmit = (data: FormValues) => {
    addConsumableItem(data);
    toast({ title: 'Consumable Added', description: `${data.name} has been added.` });
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
          <DialogTitle>Add New Consumable</DialogTitle>
          <DialogDescription>Add a new consumable item to the inventory.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="name">Item Name</Label>
                <Input id="name" {...form.register('name')} />
                {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input id="quantity" type="number" {...form.register('quantity')} />
                    {form.formState.errors.quantity && <p className="text-xs text-destructive">{form.formState.errors.quantity.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Input id="unit" {...form.register('unit')} />
                    {form.formState.errors.unit && <p className="text-xs text-destructive">{form.formState.errors.unit.message}</p>}
                </div>
            </div>
            <div className="space-y-2">
                <Label>Category</Label>
                <Controller
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Daily Consumable">Daily Consumable</SelectItem>
                                <SelectItem value="Job Consumable">Job Consumable</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Input id="remarks" {...form.register('remarks')} />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit">Add Item</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
