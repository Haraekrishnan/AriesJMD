'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const newItemForQuoteSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  category: z.enum(['Store Inventory', 'Equipment', 'Daily Consumable', 'Job Consumable']),
  uom: z.string().min(1, 'UOM is required'),
});
export type NewItemForQuoteValues = z.infer<typeof newItemForQuoteSchema>;

interface AddNewItemForQuoteDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onItemCreate: (data: NewItemForQuoteValues) => void;
}

export default function AddNewItemForQuoteDialog({ isOpen, setIsOpen, onItemCreate }: AddNewItemForQuoteDialogProps) {
  const form = useForm<NewItemForQuoteValues>({
    resolver: zodResolver(newItemForQuoteSchema),
    defaultValues: { uom: 'Nos' },
  });

  const onSubmit = (data: NewItemForQuoteValues) => {
    onItemCreate(data);
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset({ uom: 'Nos' });
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Item to Quote</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="new-item-name">Item Name</Label>
            <Input id="new-item-name" {...form.register('name')} />
            {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Category to Add To</Label>
            <Controller
              name="category"
              control={form.control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="Select category..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Store Inventory">Store Inventory (General)</SelectItem>
                    <SelectItem value="Equipment">Equipment</SelectItem>
                    <SelectItem value="Daily Consumable">Daily Consumable</SelectItem>
                    <SelectItem value="Job Consumable">Job Consumable</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.category && <p className="text-xs text-destructive">{form.formState.errors.category.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-item-uom">Unit of Measurement (UOM)</Label>
            <Input id="new-item-uom" {...form.register('uom')} />
            {form.formState.errors.uom && <p className="text-xs text-destructive">{form.formState.errors.uom.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Add Item</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
