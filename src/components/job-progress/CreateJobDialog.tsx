'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/auth-provider';
import { usePlanner } from '@/contexts/planner-provider';
import { useGeneral } from '@/contexts/general-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { DatePickerInput } from '../ui/date-picker-input';
import { useMemo } from 'react';

const jobSchema = z.object({
  title: z.string().min(3, 'Job description is required'),
  projectId: z.string().min(1, 'Project is required'),
  plantUnit: z.string().optional(),
  workOrderNo: z.string().optional(),
  foNo: z.string().optional(),
  jmsNo: z.string().optional(),
  amount: z.coerce.number().optional(),
  dateFrom: z.date().optional().nullable(),
  dateTo: z.date().optional().nullable(),
  assigneeId: z.string().min(1, 'Initial assignee is required'),
});

type JobFormValues = z.infer<typeof jobSchema>;

interface CreateJobDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function CreateJobDialog({ isOpen, setIsOpen }: CreateJobDialogProps) {
  const { user, getVisibleUsers } = useAuth();
  const { projects } = useGeneral();
  const { createJobProgress } = usePlanner();
  const { toast } = useToast();

  const assignableUsers = useMemo(() => {
    return getVisibleUsers().filter(u => u.role !== 'Manager');
  }, [getVisibleUsers]);

  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema),
  });

  const onSubmit = (data: JobFormValues) => {
    createJobProgress({
        ...data,
        steps: [{
            name: 'JMS created',
            assigneeId: data.assigneeId,
            description: 'Initial step'
        }],
    });
    toast({ title: "JMS Created", description: "The new JMS has been added to the tracker." });
    setIsOpen(false);
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    setIsOpen(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New JMS</DialogTitle>
          <DialogDescription>
            Create a basic Job Management Sheet. Use the JMS Builder for more detailed entries.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="space-y-2">
                <Label>Job Description</Label>
                <Input {...form.register('title')} />
                 {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Project</Label>
                    <Controller control={form.control} name="projectId" render={({ field }) => ( <Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger><SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select> )}/>
                    {form.formState.errors.projectId && <p className="text-xs text-destructive">{form.formState.errors.projectId.message}</p>}
                </div>
                <div className="space-y-2"><Label>Plant/Unit</Label><Input {...form.register('plantUnit')} /></div>
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>JMS No.</Label><Input {...form.register('jmsNo')} /></div>
                <div className="space-y-2"><Label>Value</Label><Input type="number" {...form.register('amount')} /></div>
            </div>
            <div className="space-y-2">
                <Label>Initial Assignee</Label>
                <Controller control={form.control} name="assigneeId" render={({ field }) => (
                     <Select value={field.value} onValueChange={field.onChange}>
                         <SelectTrigger><SelectValue placeholder="Select assignee..." /></SelectTrigger>
                         <SelectContent>{assignableUsers.map(u => <SelectItem key={u.id} value={u.id} disabled={u.status === 'locked'}>{u.name}{u.status === 'locked' && ' (Locked)'}</SelectItem>)}</SelectContent>
                     </Select>
                )} />
                {form.formState.errors.assigneeId && <p className="text-xs text-destructive">{form.formState.errors.assigneeId.message}</p>}
            </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Create JMS</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
