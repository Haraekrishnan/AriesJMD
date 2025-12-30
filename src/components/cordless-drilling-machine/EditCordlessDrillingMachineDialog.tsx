
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
import type { CordlessDrillingMachine } from '@/lib/types';

const itemSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  serialNumber: z.string().min(1, 'Serial number is required'),
  ariesId: z.string().optional(),
  status: z.string().min(1, 'Status is required'),
  remarks: z.string().optional(),
});

type FormValues = z.infer<typeof itemSchema>;

interface EditCordlessDrillingMachineDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  item: CordlessDrillingMachine;
}

const statusOptions = ["In Service", "Idle", "Damaged", "Out of Service"];

export default function EditCordlessDrillingMachineDialog({ isOpen, setIsOpen, item }: EditCordlessDrillingMachineDialogProps) {
  const { projects, updateCordlessDrillingMachine } = useAppContext();
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
    updateCordlessDrillingMachine({ ...item, ...data });
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
          <DialogTitle>Edit Cordless Drilling Machine</DialogTitle>
          <DialogDescription>Update the details for this item.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
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
                  <Label>Project</Label>
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
