
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
import { JOB_PROGRESS_STEPS } from '@/lib/types';
import { DateRangePicker } from '../ui/date-range-picker';
import type { DateRange } from 'react-day-picker';

const jobStepSchema = z.object({
  name: z.enum(JOB_PROGRESS_STEPS, { required_error: 'Step name is required' }),
  assigneeId: z.string().optional(),
  description: z.string().optional(),
  dueDate: z.date().optional().nullable(),
});

const jobSchema = z.object({
  title: z.string().min(3, 'JMS title is required'),
  projectId: z.string().min(1, 'Project is required'),
  workOrderNo: z.string().optional(),
  foNo: z.string().optional(),
  amount: z.coerce.number().optional(),
  dateRange: z.object({
    from: z.date().optional(),
    to: z.date().optional(),
  }).optional(),
  steps: z.array(jobStepSchema).min(1),
});


type JobFormValues = z.infer<typeof jobSchema>;

interface Props {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function CreateJobDialog({ isOpen, setIsOpen }: Props) {
  const { user, users, projects, createJobProgress } = useAppContext();
  const { toast } = useToast();

  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
        steps: [{ name: 'Timesheets Pending', assigneeId: undefined, description: '', dueDate: null }]
    }
  });

  const assignableUsers = useMemo(() => {
    return users.filter(u => u.role !== 'Manager');
  }, [users]);

  const onSubmit = (data: JobFormValues) => {
    createJobProgress({
      title: data.title,
      projectId: data.projectId,
      workOrderNo: data.workOrderNo,
      foNo: data.foNo,
      amount: data.amount,
      dateFrom: data.dateRange?.from?.toISOString() ?? null,
      dateTo: data.dateRange?.to?.toISOString() ?? null,
      steps: data.steps,
    });
    toast({ title: 'JMS Created', description: data.title });
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset({
        steps: [{ name: 'Timesheets Pending', assigneeId: undefined, description: '', dueDate: null }]
      });
    }
    setIsOpen(open);
  };

  const StepFields = ({ fieldName, title }: { fieldName: `steps.0`; title: string }) => {
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
          </div>
          <div className="space-y-1">
            <Label>Assign To (Optional)</Label>
            <Controller
              control={form.control}
              name={`${fieldName}.assigneeId`}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 col-span-2">
                <Label htmlFor="job-title" className="font-semibold">JMS Title</Label>
                <Input id="job-title" {...form.register('title')} />
                {form.formState.errors.title && <p className="text-xs text-destructive mt-1">{form.formState.errors.title.message}</p>}
            </div>
            <div className="space-y-1">
                <Label>Project</Label>
                <Controller
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.projectId && <p className="text-xs text-destructive mt-1">{form.formState.errors.projectId.message}</p>}
            </div>
            <div className="space-y-1">
                <Label>Date Range</Label>
                <Controller
                  name="dateRange"
                  control={form.control}
                  render={({ field }) => <DateRangePicker date={field.value as DateRange} onDateChange={field.onChange} />}
                />
            </div>
            <div className="space-y-1">
                <Label>Work Order No.</Label>
                <Input {...form.register('workOrderNo')} />
            </div>
             <div className="space-y-1">
                <Label>F.O No.</Label>
                <Input {...form.register('foNo')} />
            </div>
             <div className="space-y-1">
                <Label>Amount</Label>
                <Input type="number" {...form.register('amount')} />
            </div>
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
