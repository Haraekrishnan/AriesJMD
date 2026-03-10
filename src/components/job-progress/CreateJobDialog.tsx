
'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMemo, useState, useEffect } from 'react';
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
import { JOB_PROGRESS_STEPS, JobProgress } from '@/lib/types';
import type { DateRange } from 'react-day-picker';
import { ScrollArea } from '../ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { isSameDay, parseISO } from 'date-fns';

const jobStepSchema = z.object({
  name: z.enum(JOB_PROGRESS_STEPS, { required_error: 'Step name is required' }),
  assigneeId: z.string().optional(),
  description: z.string().optional(),
  dueDate: z.date().optional().nullable(),
}).refine(data => {
    if (data.name === 'JMS Hard copy submitted') {
        return true;
    }
    return !!data.assigneeId;
}, {
    message: 'Assignee is required for this step.',
    path: ['assigneeId'],
});

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
  steps: z.array(jobStepSchema).min(1),
});


type JobFormValues = z.infer<typeof jobSchema>;

interface Props {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function CreateJobDialog({ isOpen, setIsOpen }: Props) {
  const { user, users, projects, createJobProgress, jobProgress } = useAppContext();
  const { toast } = useToast();
  const [isConfirming, setIsConfirming] = useState(false);
  const [duplicateJobs, setDuplicateJobs] = useState<string[]>([]);

  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
        steps: [{ name: 'JMS created', assigneeId: undefined, description: '', dueDate: null }]
    }
  });
  
  const watchedStepName = form.watch('steps.0.name');

  const assignableUsers = useMemo(() => {
    return users.filter(u => u.role !== 'Manager');
  }, [users]);

  const checkForDuplicates = (data: JobFormValues): string[] => {
    const conflicts: string[] = [];
    jobProgress.forEach(job => {
        let matchingFields: string[] = [];

        if (data.jmsNo && job.jmsNo && data.jmsNo === job.jmsNo) {
            matchingFields.push("JMS No.");
        }
        if (data.projectId === job.projectId && data.plantUnit === job.plantUnit && data.amount === job.amount) {
            matchingFields.push("Project, Plant/Unit, and Amount");
        }
        if (data.dateFrom && job.dateFrom && isSameDay(data.dateFrom, parseISO(job.dateFrom))) {
            matchingFields.push("Start Date");
        }
        
        if (matchingFields.length > 0) {
            conflicts.push(`Existing job "${job.title}" has matching fields: ${matchingFields.join(', ')}.`);
        }
    });
    return conflicts;
  };

  const handleCreate = (data: JobFormValues) => {
    createJobProgress({
      title: data.title,
      projectId: data.projectId,
      plantUnit: data.plantUnit,
      workOrderNo: data.workOrderNo,
      foNo: data.foNo,
      jmsNo: data.jmsNo,
      amount: data.amount,
      dateFrom: data.dateFrom?.toISOString() ?? null,
      dateTo: data.dateTo?.toISOString() ?? null,
      steps: data.steps,
    });
    toast({ title: 'JMS Created', description: data.title });
    setIsOpen(false);
  };

  const onSubmit = (data: JobFormValues) => {
    const duplicates = checkForDuplicates(data);
    if (duplicates.length > 0) {
        setDuplicateJobs(duplicates);
        setIsConfirming(true);
    } else {
        handleCreate(data);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset({
        steps: [{ name: 'JMS created', assigneeId: undefined, description: '', dueDate: null }]
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
            <Label>Assign To</Label>
            <Controller
              control={form.control}
              name={`${fieldName}.assigneeId`}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={watchedStepName === 'JMS Hard copy submitted'}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id} disabled={u.status === 'locked'}>
                        {u.name} {u.status === 'locked' && <span className="text-muted-foreground">(Locked)</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
             {form.formState.errors.steps?.[0]?.assigneeId && <p className="text-xs text-destructive mt-1">{form.formState.errors.steps[0].assigneeId.message}</p>}
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
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New JMS</DialogTitle>
          <DialogDescription>Define the job description and its first step to begin the workflow.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 pr-6 -mr-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1 md:col-span-3">
                    <Label htmlFor="title" className="font-semibold">Job Description</Label>
                    <Input id="title" {...form.register('title')} />
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
                    <Label>Plant/Unit</Label>
                    <Input {...form.register('plantUnit')} />
                </div>
                 <div className="space-y-1">
                    <Label>Start Date</Label>
                    <Controller
                      name="dateFrom"
                      control={form.control}
                      render={({ field }) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />}
                    />
                </div>
                <div className="space-y-1">
                    <Label>End Date</Label>
                    <Controller
                      name="dateTo"
                      control={form.control}
                      render={({ field }) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />}
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
                    <Label>Value</Label>
                    <Input type="number" {...form.register('amount')} />
                </div>
                 <div className="space-y-1">
                    <Label>JMS No.</Label>
                    <Input {...form.register('jmsNo')} />
                </div>
              </div>

              <div className="space-y-4">
                <StepFields fieldName="steps.0" title="Initial Step" />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Create JMS</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Potential Duplicate Found</AlertDialogTitle>
                <AlertDialogDescription>
                    One or more existing jobs have similar details. Please review the conflicts below before proceeding.
                    <ul className="list-disc list-inside mt-2 text-sm text-foreground bg-muted p-2 rounded-md">
                        {duplicateJobs.map((d,i) => <li key={i}>{d}</li>)}
                    </ul>
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => { handleCreate(form.getValues()) }}>Create Anyway</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

    