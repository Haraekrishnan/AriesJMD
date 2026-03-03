
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
import type { WeldingMachine } from '@/lib/types';
import { DatePickerInput } from '../ui/date-picker-input';
import { parseISO } from 'date-fns';

const itemSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  make: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().min(1, 'Serial number is required'),
  ariesId: z.string().optional(),
  status: z.string().min(1, 'Status is required'),
  tpInspectionDueDate: z.date().optional().nullable(),
  certificateUrl: z.string().url().optional().or(z.literal('')),
  remarks: z.string().optional(),
});

type FormValues = z.infer<typeof itemSchema>;

interface EditWeldingMachineDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  item: WeldingMachine;
}

const statusOptions = ["In Service", "Idle", "Damaged", "Out of Service"];

export default function EditWeldingMachineDialog({ isOpen, setIsOpen, item }: EditWeldingMachineDialogProps) {
  const { projects, updateWeldingMachine } = useAppContext();
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(itemSchema),
  });

  useEffect(() => {
    if (item && isOpen) {
        form.reset({
            ...item,
            tpInspectionDueDate: item.tpInspectionDueDate ? parseISO(item.tpInspectionDueDate) : null,
        });
    }
  }, [item, isOpen, form]);

  const onSubmit = (data: FormValues) => {
    updateWeldingMachine({
        ...item,
        ...data,
        tpInspectionDueDate: data.tpInspectionDueDate ? data.tpInspectionDueDate.toISOString() : null,
    });
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
          <DialogTitle>Edit Welding Machine</DialogTitle>
          <DialogDescription>Update the details for this item.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="make">Make</Label>
              <Input id="make" {...form.register('make')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input id="model" {...form.register('model')} />
            </div>
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
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Project / Location</Label>
                    <Controller name="projectId" control={form.control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue placeholder="Select project"/></SelectTrigger>
                            <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                        </Select>
                    )}/>
                    {form.formState.errors.projectId && <p className="text-xs text-destructive">{form.formState.errors.projectId.message}</p>}
                </div>
                 <div className="space-y-2">
                    <Label>Status</Label>
                     <Controller control={form.control} name="status" render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue placeholder="Select status..."/></SelectTrigger>
                            <SelectContent>
                                {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}/>
                    {form.formState.errors.status && <p className="text-xs text-destructive">{form.formState.errors.status.message}</p>}
                </div>
            </div>
            <div className="space-y-2">
                <Label>TP Inspection Due Date (Optional)</Label>
                <Controller name="tpInspectionDueDate" control={form.control} render={({ field }) => <DatePickerInput value={field.value} onChange={field.onChange} />} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="certificateUrl">Certificate Link (Optional)</Label>
                <Input id="certificateUrl" {...form.register('certificateUrl')} />
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
