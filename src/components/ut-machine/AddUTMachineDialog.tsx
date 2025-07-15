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

const machineSchema = z.object({
  machineName: z.string().min(1, 'Machine name is required'),
  serialNumber: z.string().min(1, 'Serial number is required'),
  calibrationDueDate: z.string().min(1, 'Calibration due date is required'),
});

type FormValues = z.infer<typeof machineSchema>;

interface AddUTMachineDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function AddUTMachineDialog({ isOpen, setIsOpen }: AddUTMachineDialogProps) {
  const { addUTMachine } = useAppContext();
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(machineSchema),
    defaultValues: { machineName: '', serialNumber: '' },
  });

  const onSubmit = (data: FormValues) => {
    addUTMachine(data);
    toast({
      title: 'UT Machine Added',
      description: `Machine ${data.machineName} has been added to the system.`,
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New UT Machine</DialogTitle>
          <DialogDescription>Fill in the details for the new UT machine.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="machineName">Machine Name</Label>
            <Input id="machineName" {...form.register('machineName')} />
            {form.formState.errors.machineName && <p className="text-xs text-destructive">{form.formState.errors.machineName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="serialNumber">Serial Number</Label>
            <Input id="serialNumber" {...form.register('serialNumber')} />
            {form.formState.errors.serialNumber && <p className="text-xs text-destructive">{form.formState.errors.serialNumber.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="calibrationDueDate">Calibration Due Date</Label>
            <Input id="calibrationDueDate" type="date" {...form.register('calibrationDueDate')} />
            {form.formState.errors.calibrationDueDate && <p className="text-xs text-destructive">{form.formState.errors.calibrationDueDate.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Add Machine</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
