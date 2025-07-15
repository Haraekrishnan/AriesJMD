'use client';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { UTMachine } from '@/lib/types';
import { format } from 'date-fns';

const machineSchema = z.object({
  machineName: z.string().min(1, 'Machine name is required'),
  serialNumber: z.string().min(1, 'Serial number is required'),
  calibrationDueDate: z.string().min(1, 'Calibration due date is required'),
});

type FormValues = z.infer<typeof machineSchema>;

interface EditUTMachineDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  machine: UTMachine;
}

export default function EditUTMachineDialog({ isOpen, setIsOpen, machine }: EditUTMachineDialogProps) {
  const { updateUTMachine } = useAppContext();
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(machineSchema),
  });

  useEffect(() => {
    if (machine && isOpen) {
        form.reset({
            machineName: machine.machineName,
            serialNumber: machine.serialNumber,
            calibrationDueDate: format(new Date(machine.calibrationDueDate), 'yyyy-MM-dd')
        });
    }
  }, [machine, isOpen, form]);

  const onSubmit = (data: FormValues) => {
    updateUTMachine({ ...machine, ...data });
    toast({
      title: 'UT Machine Updated',
      description: `Machine ${data.machineName} has been updated.`,
    });
    setIsOpen(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit UT Machine: {machine.machineName}</DialogTitle>
          <DialogDescription>Update the details for this UT machine.</DialogDescription>
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
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
