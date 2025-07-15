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
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '../ui/calendar';

const machineSchema = z.object({
  machineName: z.string().min(1, 'Machine name is required'),
  serialNumber: z.string().min(1, 'Serial number is required'),
  projectId: z.string().min(1, 'Project location is required'),
  unit: z.string().min(1, 'Unit is required'),
  calibrationDueDate: z.date({ required_error: 'Calibration due date is required' }),
  probeDetails: z.string().min(1, 'Probe details are required'),
  cableDetails: z.string().min(1, 'Cable details are required'),
  status: z.string().min(1, 'Status is required'),
});

type MachineFormValues = z.infer<typeof machineSchema>;

interface AddDftMachineDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function AddDftMachineDialog({ isOpen, setIsOpen }: AddDftMachineDialogProps) {
  const { projects, addDftMachine } = useAppContext();
  const { toast } = useToast();

  const form = useForm<MachineFormValues>({
    resolver: zodResolver(machineSchema),
    defaultValues: { status: 'In Service' },
  });

  const onSubmit = (data: MachineFormValues) => {
    addDftMachine({
      ...data,
      calibrationDueDate: data.calibrationDueDate.toISOString(),
    });
    toast({ title: 'Machine Added', description: `${data.machineName} has been added.` });
    setIsOpen(false);
    form.reset();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) form.reset({ status: 'In Service' });
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New DFT Machine</DialogTitle>
          <DialogDescription>Fill in the details for the new machine.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Machine Name</Label><Input {...form.register('machineName')} />{form.formState.errors.machineName && <p className="text-xs text-destructive">{form.formState.errors.machineName.message}</p>}</div>
            <div><Label>Serial Number</Label><Input {...form.register('serialNumber')} />{form.formState.errors.serialNumber && <p className="text-xs text-destructive">{form.formState.errors.serialNumber.message}</p>}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
                <Label>Project / Location</Label>
                <Controller control={form.control} name="projectId" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue placeholder="Select project..."/></SelectTrigger><SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>)}/>{form.formState.errors.projectId && <p className="text-xs text-destructive">{form.formState.errors.projectId.message}</p>}
            </div>
            <div><Label>Unit</Label><Input {...form.register('unit')} placeholder="e.g., Unit A" />{form.formState.errors.unit && <p className="text-xs text-destructive">{form.formState.errors.unit.message}</p>}</div>
          </div>
          <div><Label>Calibration Due Date</Label><Controller control={form.control} name="calibrationDueDate" render={({ field }) => (<Popover><PopoverTrigger asChild><Button variant="outline" className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'dd-MM-yyyy') : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover>)}/>{form.formState.errors.calibrationDueDate && <p className="text-xs text-destructive">{form.formState.errors.calibrationDueDate.message}</p>}</div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Probe Details</Label><Input {...form.register('probeDetails')} />{form.formState.errors.probeDetails && <p className="text-xs text-destructive">{form.formState.errors.probeDetails.message}</p>}</div>
            <div><Label>Cable Details</Label><Input {...form.register('cableDetails')} />{form.formState.errors.cableDetails && <p className="text-xs text-destructive">{form.formState.errors.cableDetails.message}</p>}</div>
          </div>
           <div><Label>Status</Label><Input {...form.register('status')} placeholder="e.g., In Service, Under Maintenance" />{form.formState.errors.status && <p className="text-xs text-destructive">{form.formState.errors.status.message}</p>}</div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Add Machine</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
