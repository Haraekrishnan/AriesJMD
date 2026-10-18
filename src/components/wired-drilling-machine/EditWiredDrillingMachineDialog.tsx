
'use client';
import { equipmentStatusLabel } from '@/components/equipment/equipment-status-label';
import editStyles from '@/components/equipment/equipment-edit.module.css';
import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useGeneral } from '@/contexts/general-provider';
import { useInventory } from '@/contexts/inventory-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Textarea } from '../ui/textarea';
import type { WiredDrillingMachine } from '@/lib/types';

const itemSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  serialNumber: z.string().min(1, 'Serial number is required'),
  ariesId: z.string().optional(),
  status: z.string().min(1, 'Status is required'),
  remarks: z.string().optional(),
});

type FormValues = z.infer<typeof itemSchema>;

interface EditWiredDrillingMachineDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  item: WiredDrillingMachine;
}

const statusOptions = ["In Service", "Idle", "Damaged", "Out of Service"];

export default function EditWiredDrillingMachineDialog({ isOpen, setIsOpen, item }: EditWiredDrillingMachineDialogProps) {
  const { projects } = useGeneral();
  const { updateWiredDrillingMachine } = useInventory();
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
    updateWiredDrillingMachine({ ...item, ...data });
    toast({
      title: 'Equipment Updated',
      description: 'Equipment details have been updated.',
    });
    setIsOpen(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className={editStyles.dialog}>
        <DialogHeader className={editStyles.header}>
          <DialogTitle>Edit Wired Drilling Machine</DialogTitle>
          <DialogDescription>Update the details for this item.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className={editStyles.form}><div className={editStyles.body}><section className={editStyles.section} aria-label="Equipment identity"><h3>Equipment identity</h3><div className={editStyles.fields}><div className={editStyles.field}><div className="space-y-2">
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input id="serialNumber" {...form.register('serialNumber')} />
                {form.formState.errors.serialNumber && <p className="text-xs text-destructive">{form.formState.errors.serialNumber.message}</p>}
            </div></div>
<div className={editStyles.field}><div className="space-y-2">
                <Label htmlFor="ariesId">Aries ID</Label>
                <Input id="ariesId" {...form.register('ariesId')} />
            </div></div></div></section>
<section className={editStyles.section} aria-label="Assignment & status"><h3>Assignment & status</h3><div className={editStyles.fields}><div className={editStyles.field}><div className="space-y-2">
                  <Label>Project</Label>
                  <Controller name="projectId" control={form.control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue placeholder="Select project"/></SelectTrigger>
                          <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                      </Select>
                  )}/>
                  {form.formState.errors.projectId && <p className="text-xs text-destructive">{form.formState.errors.projectId.message}</p>}
              </div></div>
<div className={editStyles.field}><div className="space-y-2">
                  <Label>Status</Label>
                  <Controller control={form.control} name="status" render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger><SelectValue placeholder="Select status..."/></SelectTrigger>
                        <SelectContent>
                            {statusOptions.map(s => <SelectItem key={s} value={s}>{equipmentStatusLabel(s)}</SelectItem>)}
                        </SelectContent>
                    </Select>
                  )}/>
                  {form.formState.errors.status && <p className="text-xs text-destructive">{form.formState.errors.status.message}</p>}
              </div></div></div></section>
<section className={editStyles.section} aria-label="Remarks"><h3>Remarks</h3><div className={editStyles.fields}><div className={editStyles.wideField}><div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea id="remarks" {...form.register('remarks')} />
          </div></div></div></section></div><DialogFooter className={editStyles.footer}>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter></form>
      </DialogContent>
    </Dialog>
  );
}
