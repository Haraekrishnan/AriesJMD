
'use client';
import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Textarea } from '../ui/textarea';
import type { OtherEquipment } from '@/lib/types';

const itemSchema = z.object({
  allottedTo: z.string().min(1, 'Please select a user'),
  equipmentName: z.string().min(1, 'Equipment name is required'),
  serialNumber: z.string().min(1, 'Serial number is required'),
  remarks: z.string().optional(),
});

type FormValues = z.infer<typeof itemSchema>;

interface EditOtherEquipmentDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  item: OtherEquipment;
}

export default function EditOtherEquipmentDialog({ isOpen, setIsOpen, item }: EditOtherEquipmentDialogProps) {
  const { users, updateOtherEquipment } = useAppContext();
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(itemSchema),
  });

  useEffect(() => {
    if (item && isOpen) {
        form.reset(item);
    }
  }, [item, isOpen, form]);

  const onSubmit = (data: FormValues) => {
    updateOtherEquipment({ ...item, ...data });
    toast({
      title: 'Equipment Updated',
      description: 'Equipment details have been updated.',
    });
    setIsOpen(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Equipment</DialogTitle>
          <DialogDescription>Update the details for this item.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Allotted To</Label>
              <Controller name="allottedTo" control={form.control} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue placeholder="Select user"/></SelectTrigger>
                      <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                  </Select>
              )}/>
               {form.formState.errors.allottedTo && <p className="text-xs text-destructive">{form.formState.errors.allottedTo.message}</p>}
            </div>
          <div className="space-y-2">
              <Label htmlFor="equipmentName">Equipment Name</Label>
              <Input id="equipmentName" {...form.register('equipmentName')} />
              {form.formState.errors.equipmentName && <p className="text-xs text-destructive">{form.formState.errors.equipmentName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="serialNumber">Serial Number</Label>
            <Input id="serialNumber" {...form.register('serialNumber')} />
            {form.formState.errors.serialNumber && <p className="text-xs text-destructive">{form.formState.errors.serialNumber.message}</p>}
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
