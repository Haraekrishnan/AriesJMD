
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
import { Trash2, PlusCircle } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { useMemo } from 'react';
import { ScrollArea } from '../ui/scroll-area';

const jobStepSchema = z.object({
  name: z.string().min(1, 'Step name is required'),
  assigneeId: z.string().min(1, 'Please select an assignee'),
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
      steps: [{ name: '', assigneeId: '' }],
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
    createJobProgress(data);
    toast({
      title: 'Job Created',
      description: `The job "${data.title}" has been created.`,
    });
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset({ title: '', steps: [{ name: '', assigneeId: '' }] });
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
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
            <ScrollArea className="h-64 border rounded-md p-4">
                <div className="space-y-4">
                    {fields.map((field, index) => (
                    <div key={field.id} className="flex items-start gap-2">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                        <div>
                            <Input {...form.register(`steps.${index}.name`)} placeholder={`Step ${index + 1} Name`} />
                            {form.formState.errors.steps?.[index]?.name && <p className="text-xs text-destructive">{form.formState.errors.steps[index]?.name?.message}</p>}
                        </div>
                        <div>
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
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', assigneeId: '' })}>
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
