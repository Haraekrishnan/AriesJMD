
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
import { MobileSimStatus } from '@/lib/types';
import { Textarea } from '../ui/textarea';
import { DatePickerInput } from '../ui/date-picker-input';

const itemSchema = z.object({
  type: z.enum(['Mobile', 'SIM']),
  provider: z.string().min(1, 'Provider is required'),
  number: z.string().min(1, 'Number is required'),
  ariesId: z.string().optional(),
  allottedToUserId: z.string().min(1, 'Please select a user'),
  allotmentDate: z.date({ required_error: 'Allotment date is required' }),
  projectId: z.string().min(1, 'Project is required'),
  status: z.enum(['Active', 'Inactive', 'Returned']),
  remarks: z.string().optional(),
});

type FormValues = z.infer<typeof itemSchema>;

interface AddMobileSimDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const statusOptions: MobileSimStatus[] = ['Active', 'Inactive', 'Returned'];

export default function AddMobileSimDialog({ isOpen, setIsOpen }: AddMobileSimDialogProps) {
  const { users, projects, addMobileSim } = useAppContext();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: { status: 'Active' },
  });

  const onSubmit = (data: FormValues) => {
    addMobileSim({
      ...data,
      allotmentDate: data.allotmentDate.toISOString(),
    });
    toast({ title: 'Item Added', description: `${data.type} has been added.` });
    setIsOpen(false);
    form.reset();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) form.reset({ status: 'Active' });
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Mobile/SIM</DialogTitle>
          <DialogDescription>Fill in the details for the new item.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div><Label>Type</Label><Controller control={form.control} name="type" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Mobile">Mobile</SelectItem><SelectItem value="SIM">SIM</SelectItem></SelectContent></Select>)}/></div>
                <div><Label>Provider</Label><Input {...form.register('provider')} />{form.formState.errors.provider && <p className="text-xs text-destructive">{form.formState.errors.provider.message}</p>}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div><Label>Number/IMEI</Label><Input {...form.register('number')} />{form.formState.errors.number && <p className="text-xs text-destructive">{form.formState.errors.number.message}</p>}</div>
                <div><Label>Aries ID</Label><Input {...form.register('ariesId')} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Allotted To</Label><Controller control={form.control} name="allottedToUserId" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue placeholder="Select user..."/></SelectTrigger><SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select>)}/>{form.formState.errors.allottedToUserId && <p className="text-xs text-destructive">{form.formState.errors.allottedToUserId.message}</p>}</div>
              <div><Label>Allotment Date</Label><Controller control={form.control} name="allotmentDate" render={({ field }) => <DatePickerInput value={field.value} onChange={field.onChange} />} />{form.formState.errors.allotmentDate && <p className="text-xs text-destructive">{form.formState.errors.allotmentDate.message}</p>}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div><Label>Project</Label><Controller control={form.control} name="projectId" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue placeholder="Select project..."/></SelectTrigger><SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>)}/>{form.formState.errors.projectId && <p className="text-xs text-destructive">{form.formState.errors.projectId.message}</p>}</div>
                <div><Label>Status</Label><Controller control={form.control} name="status" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>)}/></div>
            </div>
            <div><Label>Remarks</Label><Textarea {...form.register('remarks')} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Add Item</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
