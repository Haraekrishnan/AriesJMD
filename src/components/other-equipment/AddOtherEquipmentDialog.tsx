
'use client';
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
import { DatePickerInput } from '../ui/date-picker-input';

const itemSchema = z.object({
  allottedTo: z.string().min(1, 'Please select a user'),
  equipmentName: z.string().min(1, 'Equipment name is required'),
  serialNumber: z.string().min(1, 'Serial number is required'),
  ariesId: z.string().optional(),
  remarks: z.string().optional(),
  tpInspectionDueDate: z.date().optional().nullable(),
  certificateUrl: z.string().url().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof itemSchema>;

interface AddOtherEquipmentDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function AddOtherEquipmentDialog({ isOpen, setIsOpen }: AddOtherEquipmentDialogProps) {
  const { users, addOtherEquipment } = useAppContext();
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(itemSchema),
  });

  const onSubmit = (data: FormValues) => {
    addOtherEquipment({
      ...data,
      tpInspectionDueDate: data.tpInspectionDueDate?.toISOString(),
    });
    toast({
      title: 'Equipment Added',
      description: `${data.equipmentName} has been added.`,
    });
    setIsOpen(false);
    form.reset();
  };
  
  const handleOpenChange = (open: boolean) => {
      if (!open) form.reset();
      setIsOpen(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Equipment</DialogTitle>
          <DialogDescription>Fill in the details for the new equipment.</DialogDescription>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input id="serialNumber" {...form.register('serialNumber')} />
                {form.formState.errors.serialNumber && <p className="text-xs text-destructive">{form.formState.errors.serialNumber.message}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="ariesId">Aries ID</Label>
                <Input id="ariesId" {...form.register('ariesId')} />
            </div>
          </div>
           <div className="space-y-2">
              <Label>TP Inspection Due Date</Label>
              <Controller name="tpInspectionDueDate" control={form.control} render={({field}) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />} />
          </div>
           <div className="space-y-2">
                <Label htmlFor="certificateUrl">Certificate Link</Label>
                <Input id="certificateUrl" {...form.register('certificateUrl')} />
            </div>
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea id="remarks" {...form.register('remarks')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Add Equipment</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
