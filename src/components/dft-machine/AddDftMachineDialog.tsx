

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
import { DatePickerInput } from '../ui/date-picker-input';
import { ScrollArea } from '../ui/scroll-area';

const machineSchema = z.object({
  machineName: z.string().min(1, 'Machine name is required'),
  serialNumber: z.string().min(1, 'Serial number is required'),
  ariesId: z.string().optional(),
  projectId: z.string().min(1, 'Project location is required'),
  unit: z.string().min(1, 'Unit is required'),
  calibrationDueDate: z.date({ required_error: 'Calibration due date is required' }),
  tpInspectionDueDate: z.date().optional().nullable(),
  probeDetails: z.string().min(1, 'Probe details are required'),
  cableDetails: z.string().min(1, 'Cable details are required'),
  status: z.string().min(1, 'Status is required'),
  certificateUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  movedToProjectId: z.string().optional(),
});

type MachineFormValues = z.infer<typeof machineSchema>;

interface AddDftMachineDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const statusOptions = ["In Service", "Idle", "Damaged", "Out of Service", "Moved to another project"];

export default function AddDftMachineDialog({ isOpen, setIsOpen }: AddDftMachineDialogProps) {
  const { projects, addDftMachine } = useAppContext();
  const { toast } = useToast();

  const form = useForm<MachineFormValues>({
    resolver: zodResolver(machineSchema),
    defaultValues: { status: 'In Service' },
  });

  const watchStatus = form.watch('status');

  const onSubmit = (data: MachineFormValues) => {
    addDftMachine({
      ...data,
      calibrationDueDate: data.calibrationDueDate.toISOString(),
      tpInspectionDueDate: data.tpInspectionDueDate ? data.tpInspectionDueDate.toISOString() : null,
      movedToProjectId: data.movedToProjectId || null,
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
      <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Add New DFT Machine</DialogTitle>
          <DialogDescription>Fill in the details for the new machine.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
           <ScrollArea className="h-96 pr-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Machine Name</Label><Input {...form.register('machineName')} />{form.formState.errors.machineName && <p className="text-xs text-destructive">{form.formState.errors.machineName.message}</p>}</div>
                <div><Label>Serial Number</Label><Input {...form.register('serialNumber')} />{form.formState.errors.serialNumber && <p className="text-xs text-destructive">{form.formState.errors.serialNumber.message}</p>}</div>
              </div>
              <div><Label>Aries ID</Label><Input {...form.register('ariesId')} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Project / Location</Label>
                    <Controller control={form.control} name="projectId" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue placeholder="Select project..."/></SelectTrigger><SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>)}/>{form.formState.errors.projectId && <p className="text-xs text-destructive">{form.formState.errors.projectId.message}</p>}
                </div>
                <div><Label>Unit</Label><Input {...form.register('unit')} placeholder="e.g., Unit A" />{form.formState.errors.unit && <p className="text-xs text-destructive">{form.formState.errors.unit.message}</p>}</div>
              </div>
              <div><Label>Calibration Due Date</Label><Controller name="calibrationDueDate" control={form.control} render={({ field }) => <DatePickerInput value={field.value} onChange={field.onChange} />} />{form.formState.errors.calibrationDueDate && <p className="text-xs text-destructive">{form.formState.errors.calibrationDueDate.message}</p>}</div>
              <div><Label>TP Inspection Due Date (Optional)</Label><Controller name="tpInspectionDueDate" control={form.control} render={({ field }) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Probe Details</Label><Input {...form.register('probeDetails')} />{form.formState.errors.probeDetails && <p className="text-xs text-destructive">{form.formState.errors.probeDetails.message}</p>}</div>
                <div><Label>Cable Details</Label><Input {...form.register('cableDetails')} />{form.formState.errors.cableDetails && <p className="text-xs text-destructive">{form.formState.errors.cableDetails.message}</p>}</div>
              </div>
              <div>
                <Label>Certificate URL</Label>
                <Input {...form.register('certificateUrl')} placeholder="https://..." />
                {form.formState.errors.certificateUrl && <p className="text-xs text-destructive">{form.formState.errors.certificateUrl.message}</p>}
              </div>
              <div><Label>Status</Label>
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
                {watchStatus === 'Moved to another project' && (
                    <div>
                        <Label>Moved To Project (Optional)</Label>
                        <Input {...form.register('movedToProjectId')} placeholder="Enter destination project..." />
                    </div>
                )}
            </div>
           </ScrollArea>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Add Machine</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
