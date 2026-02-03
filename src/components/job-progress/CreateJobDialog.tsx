
'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { useToast } from '@/hooks/use-toast';
import { JOB_PROGRESS_STEPS, JobProgressStepName } from '@/lib/types';
import { Checkbox } from '../ui/checkbox';

const jobStepSchema = z.object({
  name: z.enum(JOB_PROGRESS_STEPS, { required_error: 'Step name is required' }),
  assigneeId: z.string().min(1, 'Assignee is required'),
  description: z.string().optional(),
  dueDate: z.date().optional().nullable(),
});

const jobSchema = z.object({
  title: z.string().min(3, 'JMS title is required'),
  steps: z.array(jobStepSchema).min(1),
});

type JobFormValues = z.infer<typeof jobSchema>;

interface Props {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function CreateJobDialog({ isOpen, setIsOpen }: Props) {
  const { user, users, createJobProgress, getAssignableUsers } = useAppContext();
  const { toast } = useToast();

  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
        steps: [{ name: 'Timesheets Pending', assigneeId: '', description: '', dueDate: null }]
    }
  });

  const assignableUsers = useMemo(() => {
    return getAssignableUsers();
  }, [getAssignableUsers]);

  const onSubmit = (data: JobFormValues) => {
    createJobProgress({
      title: data.title,
      steps: data.steps,
    });
    toast({ title: 'JMS Created', description: data.title });
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset({
        steps: [{ name: 'Timesheets Pending', assigneeId: '', description: '', dueDate: null }]
      });
    }
    setIsOpen(open);
  };

  const StepFields = ({ fieldName, title }: { fieldName: `steps.0`; title: string }) => {
    const errors = form.formState.errors.steps?.[0] as any;
    return (
      <div className="border p-4 rounded-md space-y-3 bg-muted/50">
        <h4 className="font-semibold text-sm">{title}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor={`${fieldName}.name`}>Step Name</Label>
            <Controller
              control={form.control}
              name={`${fieldName}.name`}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select step" />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_PROGRESS_STEPS.map(step => (
                      <SelectItem key={step} value={step}>
                        {step}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors?.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Assign To <span className="text-destructive">*</span></Label>
            <Controller
              control={form.control}
              name={`${fieldName}.assigneeId`}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors?.assigneeId && <p className="text-xs text-destructive">{errors.assigneeId.message}</p>}
          </div>
        </div>
        <div className="space-y-1">
          <Label>Description (Optional)</Label>
          <Textarea {...form.register(`${fieldName}.description`)} rows={2} />
        </div>
        <div className="space-y-1">
          <Label>Due Date (Optional)</Label>
          <Controller
            control={form.control}
            name={`${fieldName}.dueDate`}
            render={({ field }) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />}
          />
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New JMS</DialogTitle>
          <DialogDescription>Define the JMS title and its first step to begin the workflow.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="job-title" className="font-semibold">JMS Title</Label>
            <Input id="job-title" {...form.register('title')} />
            {form.formState.errors.title && <p className="text-xs text-destructive mt-1">{form.formState.errors.title.message}</p>}
          </div>

          <div className="space-y-4">
            <StepFields fieldName="steps.0" title="Initial Step" />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Create JMS</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
