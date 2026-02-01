
'use client';

import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMemo } from 'react';
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
import { Checkbox } from '../ui/checkbox';

const jobStepSchema = z.object({
  name: z.string().min(1, 'Step name is required'),
  assigneeId: z.string().min(1, 'Assignee is required'),
  description: z.string().optional(),
  dueDate: z.date().optional().nullable(),
  requiresAttachment: z.boolean().optional(),
});

const jobSchema = z.object({
  title: z.string().min(3, 'Job title is required'),
  steps: z.array(jobStepSchema).min(1, 'The first step is required.').max(1, 'Only the first step can be defined here.'),
});

type JobFormValues = z.infer<typeof jobSchema>;

interface Props {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function CreateJobDialog({ isOpen, setIsOpen }: Props) {
  const { users, createJobProgress } = useAppContext();
  const { toast } = useToast();

  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      title: '',
      steps: [{ name: '', assigneeId: '', description: '', dueDate: null, requiresAttachment: false }],
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'steps',
  });

  const assignableUsers = useMemo(() => users.filter(u => u.role !== 'Manager'), [users]);

  const onSubmit = (data: JobFormValues) => {
    createJobProgress({
      ...data,
      steps: data.steps.map(s => ({ ...s, dueDate: s.dueDate?.toISOString() || null })),
    });
    toast({ title: 'Job Created', description: data.title });
    setIsOpen(false);
    form.reset();
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset({
          title: '',
          steps: [{ name: '', assigneeId: '', description: '', dueDate: null, requiresAttachment: false }],
      });
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Job</DialogTitle>
          <DialogDescription>Define the job title and the initial step. Subsequent steps can be added by assignees.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="job-title" className="font-semibold">Job Title</Label>
            <Input id="job-title" {...form.register('title')} />
             {form.formState.errors.title && <p className="text-xs text-destructive mt-1">{form.formState.errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label className="font-semibold">First Step</Label>
            <div className="border p-4 rounded-md space-y-3 bg-muted/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="steps.0.name">Step Name</Label>
                  <Input id="steps.0.name" {...form.register(`steps.0.name`)} placeholder="e.g., 'Prepare Documentation'"/>
                   {form.formState.errors.steps?.[0]?.name && <p className="text-xs text-destructive">{form.formState.errors.steps[0]?.name?.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Assign To</Label>
                  <Controller
                    control={form.control}
                    name={`steps.0.assigneeId`}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue placeholder="Select assignee" /></SelectTrigger>
                        <SelectContent>
                          {assignableUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  />
                   {form.formState.errors.steps?.[0]?.assigneeId && <p className="text-xs text-destructive">{form.formState.errors.steps[0]?.assigneeId?.message}</p>}
                </div>
              </div>
               <div className="space-y-1">
                  <Label htmlFor="steps.0.description">Description (Optional)</Label>
                  <Textarea id="steps.0.description" {...form.register(`steps.0.description`)} rows={2} placeholder="Instructions for this step..."/>
              </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Due Date (Optional)</Label>
                      <Controller
                        control={form.control}
                        name={`steps.0.dueDate`}
                        render={({ field }) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />}
                      />
                    </div>
                    <div className="flex items-end pb-1">
                        <div className="flex items-center space-x-2">
                            <Controller
                                name={`steps.0.requiresAttachment`}
                                control={form.control}
                                render={({ field }) => (
                                    <Checkbox
                                        id="steps.0.requiresAttachment"
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                )}
                            />
                            <Label htmlFor="steps.0.requiresAttachment" className="text-sm font-medium leading-none">
                                Requires attachment to complete
                            </Label>
                        </div>
                    </div>
               </div>
            </div>
          </div>
          
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Create Job</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
