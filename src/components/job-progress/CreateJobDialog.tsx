

'use client';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { Trash2, PlusCircle, ChevronDown } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { useMemo, useState } from 'react';
import { ScrollArea } from '../ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Textarea } from '../ui/textarea';
import { DatePickerInput } from '../ui/date-picker-input';
import { Checkbox } from '../ui/checkbox';
import { JobStep, CustomFieldDefinition } from '@/lib/types';


const customFieldSchema = z.object({
  id: z.string(),
  label: z.string().min(1, 'Label is required'),
  type: z.enum(['text', 'textarea', 'date', 'time', 'url', 'checkbox']),
});

const jobStepSchema = z.object({
  name: z.string().min(1, 'Step name is required'),
  assigneeId: z.string().min(1, 'Please select an assignee'),
  description: z.string().optional(),
  dueDate: z.date().optional().nullable(),
  requiresAttachment: z.boolean().optional(),
  customFields: z.array(customFieldSchema).optional(),
});

const jobProgressSchema = z.object({
  title: z.string().min(3, 'Job title is required'),
  steps: z.array(jobStepSchema).min(1, 'At least one step is required'),
});

type JobProgressFormValues = z.infer<typeof jobProgressSchema>;

interface CreateJobDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function CreateJobDialog({ isOpen, setIsOpen }: CreateJobDialogProps) {
  const { users, createJobProgress } = useAppContext();
  const { toast } = useToast();

  const form = useForm<JobProgressFormValues>({
    resolver: zodResolver(jobProgressSchema),
    defaultValues: {
      title: '',
      steps: [{ name: '', assigneeId: '', description: '', requiresAttachment: false, customFields: [] }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'steps',
  });

  const assignableUsers = useMemo(() => {
    return users.filter(u => u.role !== 'Manager');
  }, [users]);

  const onSubmit = (data: JobProgressFormValues) => {
    const processedData = {
        ...data,
        steps: data.steps.map(step => ({
            ...step,
            dueDate: step.dueDate ? step.dueDate.toISOString() : undefined,
            description: step.description || '',
            requiresAttachment: step.requiresAttachment || false,
            customFields: (step.customFields || []).map(cf => ({...cf, id: cf.id || `cf-${Date.now()}`}))
        })),
    };
    createJobProgress(processedData as any);
    toast({
      title: 'Job Created',
      description: `The job "${data.title}" has been created.`,
    });
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset({ title: '', steps: [{ name: '', assigneeId: '', description: '', requiresAttachment: false, customFields: [] }] });
    }
    setIsOpen(open);
  };
  
  const StepCustomFields = ({ stepIndex }: { stepIndex: number }) => {
      const { fields: customFields, append, remove } = useFieldArray({
          control: form.control,
          name: `steps.${stepIndex}.customFields`
      });

      return (
          <div className="space-y-2 mt-4 pt-4 border-t">
              <h4 className="text-sm font-medium">Custom Fields</h4>
              <div className="space-y-2">
                  {customFields.map((field, cfIndex) => (
                      <div key={field.id} className="flex items-end gap-2 bg-muted/30 p-2 rounded-md">
                          <div className="flex-1 grid grid-cols-2 gap-2">
                              <Input placeholder="Field Label" {...form.register(`steps.${stepIndex}.customFields.${cfIndex}.label`)} />
                              <Controller
                                  control={form.control}
                                  name={`steps.${stepIndex}.customFields.${cfIndex}.type`}
                                  render={({ field: typeField }) => (
                                      <Select onValueChange={typeField.onChange} value={typeField.value}>
                                          <SelectTrigger><SelectValue placeholder="Field Type" /></SelectTrigger>
                                          <SelectContent>
                                              <SelectItem value="text">Text</SelectItem>
                                              <SelectItem value="textarea">Text Area</SelectItem>
                                              <SelectItem value="date">Date</SelectItem>
                                              <SelectItem value="time">Time</SelectItem>
                                              <SelectItem value="url">URL</SelectItem>
                                              <SelectItem value="checkbox">Checkbox</SelectItem>
                                          </SelectContent>
                                      </Select>
                                  )}
                              />
                          </div>
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(cfIndex)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                      </div>
                  ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ id: `cf-${Date.now()}`, label: '', type: 'text' })}>
                  <PlusCircle className="mr-2 h-4 w-4"/>Add Field
              </Button>
          </div>
      )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Create New Job</DialogTitle>
          <DialogDescription>Define the title and the sequential steps for this job.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Job Title</Label>
            <Input id="title" {...form.register('title')} />
            {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Steps</Label>
            <ScrollArea className="h-72 border rounded-md p-4">
                <div className="space-y-4">
                    {fields.map((field, index) => (
                    <Collapsible key={field.id} className="p-4 border rounded-md bg-muted/50">
                        <div className="flex items-start gap-2">
                            <div className="flex-1 grid grid-cols-2 gap-2">
                            <div>
                                <Label className="text-xs">Step {index + 1} Name</Label>
                                <Input {...form.register(`steps.${index}.name`)} placeholder={`Step ${index + 1} Name`} />
                                {form.formState.errors.steps?.[index]?.name && <p className="text-xs text-destructive">{form.formState.errors.steps[index]?.name?.message}</p>}
                            </div>
                            <div>
                                <Label className="text-xs">Assign To</Label>
                                <Controller
                                control={form.control}
                                name={`steps.${index}.assigneeId`}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger><SelectValue placeholder="Assign to..." /></SelectTrigger>
                                    <SelectContent>
                                        {assignableUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                                    </SelectContent>
                                    </Select>
                                )}
                                />
                                {form.formState.errors.steps?.[index]?.assigneeId && <p className="text-xs text-destructive">{form.formState.errors.steps[index]?.assigneeId?.message}</p>}
                            </div>
                            </div>
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                        <CollapsibleTrigger asChild>
                            <Button variant="link" size="sm" className="mt-2 text-xs p-0 h-auto">
                                <ChevronDown className="h-3 w-3 mr-1" /> More Options
                            </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-4 mt-2 animate-accordion-down">
                            <div>
                                <Label className="text-xs">Description / Instructions</Label>
                                <Textarea {...form.register(`steps.${index}.description`)} rows={2} />
                            </div>
                            <div>
                                <Label className="text-xs">Due Date</Label>
                                <Controller name={`steps.${index}.dueDate`} control={form.control} render={({ field }) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />} />
                            </div>
                            <div className="flex items-center space-x-2">
                                <Controller name={`steps.${index}.requiresAttachment`} control={form.control} render={({ field }) => <Checkbox id={`req-attach-${index}`} checked={field.value} onCheckedChange={field.onChange} />} />
                                <Label htmlFor={`req-attach-${index}`} className="text-xs font-normal">Requires Attachment on Completion</Label>
                            </div>
                            <StepCustomFields stepIndex={index} />
                        </CollapsibleContent>
                    </Collapsible>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', assigneeId: '', description: '', requiresAttachment: false, customFields: [] })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Step
                    </Button>
                     {form.formState.errors.steps && <p className="text-xs text-destructive">{form.formState.errors.steps.message}</p>}
                </div>
            </ScrollArea>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Create Job</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
