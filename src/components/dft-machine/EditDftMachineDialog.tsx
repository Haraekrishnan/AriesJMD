
'use client';
import { equipmentStatusLabel } from '@/components/equipment/equipment-status-label';
import editStyles from '@/components/equipment/equipment-edit.module.css';
import { useEffect } from 'react';
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
import type { DftMachine } from '@/lib/types';
import { DatePickerInput } from '../ui/date-picker-input';
import { ScrollArea } from '../ui/scroll-area';
import { Textarea } from '../ui/textarea';
import { parseISO } from 'date-fns';

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
  remarks: z.string().optional(),
});

type MachineFormValues = z.infer<typeof machineSchema>;

interface EditDftMachineDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  machine: DftMachine;
}

const statusOptions = ["In Service", "Idle", "Damaged", "Out of Service", "Moved to another project"];

export default function EditDftMachineDialog({ isOpen, setIsOpen, machine }: EditDftMachineDialogProps) {
  const { projects, updateDftMachine } = useAppContext();
  const { toast } = useToast();

  const form = useForm<MachineFormValues>({
    resolver: zodResolver(machineSchema),
  });

  const watchStatus = form.watch('status');

  useEffect(() => {
    if (machine && isOpen) {
        form.reset({
            ...machine,
            remarks: (machine as any).remarks || '',
            calibrationDueDate: new Date(machine.calibrationDueDate),
            tpInspectionDueDate: machine.tpInspectionDueDate ? parseISO(machine.tpInspectionDueDate) : null,
        });
    }
  }, [machine, isOpen, form]);

  const onSubmit = (data: MachineFormValues) => {
    updateDftMachine({
      ...machine,
      ...data,
      calibrationDueDate: data.calibrationDueDate.toISOString(),
      tpInspectionDueDate: data.tpInspectionDueDate ? data.tpInspectionDueDate.toISOString() : null,
      movedToProjectId: data.movedToProjectId || null,
    });
    toast({ title: 'Machine Updated', description: `${data.machineName} has been updated.` });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className={editStyles.dialog} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className={editStyles.header}>
          <DialogTitle>Edit DFT Machine</DialogTitle>
          <DialogDescription>Update details for {machine.machineName} (SN: {machine.serialNumber}).</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className={editStyles.form}><div className={editStyles.body}><section className={editStyles.section} aria-label="Equipment identity"><h3>Equipment identity</h3><div className={editStyles.fields}><div className={editStyles.field}><div><Label>Machine Name</Label><Input {...form.register('machineName')} />{form.formState.errors.machineName && <p className="text-xs text-destructive">{form.formState.errors.machineName.message}</p>}</div></div>
<div className={editStyles.field}><div><Label>Serial Number</Label><Input {...form.register('serialNumber')} />{form.formState.errors.serialNumber && <p className="text-xs text-destructive">{form.formState.errors.serialNumber.message}</p>}</div></div>
<div className={editStyles.field}><div><Label>Aries ID</Label><Input {...form.register('ariesId')} /></div></div></div></section>
<section className={editStyles.section} aria-label="Assignment & status"><h3>Assignment & status</h3><div className={editStyles.fields}><div className={editStyles.field}><div>
                    <Label>Project / Location</Label>
                    <Controller control={form.control} name="projectId" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>)}/>{form.formState.errors.projectId && <p className="text-xs text-destructive">{form.formState.errors.projectId.message}</p>}
                </div></div>
<div className={editStyles.field}><div><Label>Unit</Label><Input {...form.register('unit')} />{form.formState.errors.unit && <p className="text-xs text-destructive">{form.formState.errors.unit.message}</p>}</div></div>
<div className={editStyles.field}><div><Label>Status</Label>
                <Controller control={form.control} name="status" render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger><SelectValue placeholder="Select status..."/></SelectTrigger>
                        <SelectContent>
                            {statusOptions.map(s => <SelectItem key={s} value={s}>{equipmentStatusLabel(s)}</SelectItem>)}
                        </SelectContent>
                    </Select>
                )}/>
                {form.formState.errors.status && <p className="text-xs text-destructive">{form.formState.errors.status.message}</p>}
              </div></div>
<div className={editStyles.field}>{watchStatus === 'Moved to another project' && (
                    <div>
                        <Label>Moved To Project (Optional)</Label>
                        <Input {...form.register('movedToProjectId')} placeholder="Enter destination project..." />
                    </div>
                )}</div></div></section>
<section className={editStyles.section} aria-label="Inspection & certificates"><h3>Inspection & certificates</h3><div className={editStyles.fields}><div className={editStyles.field}><div><Label>Calibration Due Date</Label><Controller name="calibrationDueDate" control={form.control} render={({ field }) => <DatePickerInput value={field.value} onChange={field.onChange} />} />{form.formState.errors.calibrationDueDate && <p className="text-xs text-destructive">{form.formState.errors.calibrationDueDate.message}</p>}</div></div>
<div className={editStyles.field}><div><Label>TP Inspection Due Date (Optional)</Label><Controller name="tpInspectionDueDate" control={form.control} render={({ field }) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />} /></div></div>
<div className={editStyles.wideField}><div>
                <Label>Certificate URL</Label>
                <Input {...form.register('certificateUrl')} placeholder="https://..." />
                {form.formState.errors.certificateUrl && <p className="text-xs text-destructive">{form.formState.errors.certificateUrl.message}</p>}
              </div></div></div></section>
<section className={editStyles.section} aria-label="Probe & cable"><h3>Probe & cable</h3><div className={editStyles.fields}><div className={editStyles.field}><div><Label>Probe Details</Label><Input {...form.register('probeDetails')} />{form.formState.errors.probeDetails && <p className="text-xs text-destructive">{form.formState.errors.probeDetails.message}</p>}</div></div>
<div className={editStyles.field}><div><Label>Cable Details</Label><Input {...form.register('cableDetails')} />{form.formState.errors.cableDetails && <p className="text-xs text-destructive">{form.formState.errors.cableDetails.message}</p>}</div></div></div></section>
<section className={editStyles.section} aria-label="Remarks"><h3>Remarks</h3><div className={editStyles.fields}><div className={editStyles.wideField}><div>
                    <Label>Remarks</Label>
                    <Textarea {...form.register('remarks')} />
                </div></div></div></section></div><DialogFooter className={editStyles.footer}>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter></form>
      </DialogContent>
    </Dialog>
  );
}
