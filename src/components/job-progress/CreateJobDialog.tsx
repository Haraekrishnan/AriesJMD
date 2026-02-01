
'use client';

import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMemo } from 'react';
import { Trash2, PlusCircle } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
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
  steps: z.array(jobStepSchema).min(1, 'At least one step is required'),
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

  const { fields: steps, append, remove } = useFieldArray({
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
      form.reset();
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Job</DialogTitle>
          <DialogDescription>Define the title and sequence of steps for this job.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 flex-1 flex flex-col overflow-hidden">
          <div className="shrink-0">
            <Label htmlFor="job-title" className="font-semibold">Job Title</Label>
            <Input id="job-title" {...form.register('title')} />
             {form.formState.errors.title && <p className="text-xs text-destructive mt-1">{form.formState.errors.title.message}</p>}
          </div>

          <Label className="font-semibold shrink-0">Steps</Label>
          <ScrollArea className="flex-1 -mr-6 pr-6">
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={step.id} className="border p-4 rounded-md space-y-3 bg-muted/50 relative">
                  <Label className="font-medium">Step {index + 1}</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor={`steps.${index}.name`}>Step Name</Label>
                      <Input id={`steps.${index}.name`} {...form.register(`steps.${index}.name`)} placeholder="e.g., 'Prepare Documentation'"/>
                       {form.formState.errors.steps?.[index]?.name && <p className="text-xs text-destructive">{form.formState.errors.steps[index]?.name?.message}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label>Assign To</Label>
                      <Controller
                        control={form.control}
                        name={`steps.${index}.assigneeId`}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger><SelectValue placeholder="Select assignee" /></SelectTrigger>
                            <SelectContent>
                              {assignableUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      />
                       {form.formState.errors.steps?.[index]?.assigneeId && <p className="text-xs text-destructive">{form.formState.errors.steps[index]?.assigneeId?.message}</p>}
                    </div>
                  </div>
                   <div className="space-y-1">
                      <Label htmlFor={`steps.${index}.description`}>Description (Optional)</Label>
                      <Textarea id={`steps.${index}.description`} {...form.register(`steps.${index}.description`)} rows={2} placeholder="Instructions for this step..."/>
                  </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label>Due Date (Optional)</Label>
                          <Controller
                            control={form.control}
                            name={`steps.${index}.dueDate`}
                            render={({ field }) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />}
                          />
                        </div>
                        <div className="flex items-end pb-1">
                            <div className="flex items-center space-x-2">
                                <Controller
                                    name={`steps.${index}.requiresAttachment`}
                                    control={form.control}
                                    render={({ field }) => (
                                        <Checkbox
                                            id={`steps.${index}.requiresAttachment`}
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    )}
                                />
                                <Label htmlFor={`steps.${index}.requiresAttachment`} className="text-sm font-medium leading-none">
                                    Requires attachment to complete
                                </Label>
                            </div>
                        </div>
                   </div>
                  {index > 0 && (
                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', assigneeId: '', description: '', dueDate: null, requiresAttachment: false })}>
                <PlusCircle className="h-4 w-4 mr-2" />Add Step
              </Button>
               {form.formState.errors.steps && <p className="text-xs text-destructive pt-2">{form.formState.errors.steps.message || form.formState.errors.steps.root?.message}</p>}
            </div>
          </ScrollArea>
          
          <DialogFooter className="mt-auto pt-4 border-t shrink-0">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Create Job</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
