
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
import type { Anemometer } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const itemSchema = z.object({
  allottedTo: z.string().min(1, 'Please select a user'),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  serialNumber: z.string().min(1, 'Serial number is required'),
  status: z.string().min(1, 'Status is required'),
  projectId: z.string().min(1, 'Project is required'),
  calibrationDueDate: z.date().optional(),
  remarks: z.string().optional(),
});

type FormValues = z.infer<typeof itemSchema>;

interface EditAnemometerDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  item: Anemometer;
}

const statusOptions = ["In Service", "Idle", "Damaged", "Out of Service"];

export default function EditAnemometerDialog({ isOpen, setIsOpen, item }: EditAnemometerDialogProps) {
  const { users, projects, updateAnemometer } = useAppContext();
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(itemSchema),
  });

  useEffect(() => {
    if (item && isOpen) {
        form.reset({
            ...item,
            calibrationDueDate: item.calibrationDueDate ? new Date(item.calibrationDueDate) : undefined,
        });
    }
  }, [item, isOpen, form]);

  const onSubmit = (data: FormValues) => {
    updateAnemometer({ ...item, ...data, calibrationDueDate: data.calibrationDueDate?.toISOString() });
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
          <DialogTitle>Edit Anemometer</DialogTitle>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="make">Make</Label>
              <Input id="make" {...form.register('make')} />
              {form.formState.errors.make && <p className="text-xs text-destructive">{form.formState.errors.make.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input id="model" {...form.register('model')} />
              {form.formState.errors.model && <p className="text-xs text-destructive">{form.formState.errors.model.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="serialNumber">Serial Number</Label>
            <Input id="serialNumber" {...form.register('serialNumber')} />
            {form.formState.errors.serialNumber && <p className="text-xs text-destructive">{form.formState.errors.serialNumber.message}</p>}
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
              <Label>Calibration Due Date (Optional)</Label>
              <Controller name="calibrationDueDate" control={form.control} render={({ field }) => (<Popover><PopoverTrigger asChild><Button variant="outline" className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'dd-MM-yyyy') : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover>)}/>
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
