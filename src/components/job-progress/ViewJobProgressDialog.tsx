
'use client';

import { useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import type { JobProgress, JobStep, JobStepStatus, Task, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { format, parseISO, formatDistanceToNow, isValid } from 'date-fns';
import { CheckCircle, Clock, Circle, XCircle, Send, PlusCircle, UserRoundCog } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DatePickerInput } from '../ui/date-picker-input';
import { Checkbox } from '../ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

const nextStepSchema = z.object({
  name: z.string().min(1, 'Step name is required'),
  assigneeId: z.string().min(1, 'Assignee is required'),
  description: z.string().optional(),
  dueDate: z.date().optional().nullable(),
  requiresAttachment: z.boolean().optional(),
  customFields: z.array(z.object({ label: z.string(), type: z.enum(['text', 'date', 'number', 'url', 'time']), value: z.any() })).optional(),
});

type NextStepFormValues = z.infer<typeof nextStepSchema>;


interface ViewJobProgressDialogProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    job: JobProgress;
}

const statusConfig: { [key in JobStepStatus]: { icon: React.ElementType, color: string, label: string } } = {
  'Not Started': { icon: Circle, color: 'text-gray-400', label: 'Not Started' },
  'Pending': { icon: Clock, color: 'text-yellow-500', label: 'Pending' },
  'Acknowledged': { icon: Clock, color: 'text-blue-500', label: 'In Progress' },
  'Completed': { icon: CheckCircle, color: 'text-green-500', label: 'Completed' },
  'Skipped': { icon: XCircle, color: 'text-gray-500', label: 'Skipped' },
};


const NextStepForm = ({
  job,
  currentStep,
  onCancel,
}: {
  job: JobProgress;
  currentStep: JobStep;
  onCancel: () => void;
}) => {
  const { user, users, addAndCompleteStep, updateJobStepStatus } = useAppContext();
  const { toast } = useToast();

  const form = useForm<NextStepFormValues>({
    resolver: zodResolver(nextStepSchema),
    defaultValues: { name: '', assigneeId: '', description: '', dueDate: null, requiresAttachment: false, customFields: [] },
  });

  const assignableUsers = useMemo(() => users.filter(u => u.role !== 'Manager'), [users]);
  
  const handleFinalCompletion = () => {
    updateJobStepStatus(job.id, currentStep.id, 'Completed', "Final step completed.");
    onCancel();
    toast({ title: 'Job Completed!' });
  };

  const onNextStepSubmit = (data: NextStepFormValues) => {
    addAndCompleteStep(
      job.id,
      currentStep.id,
      undefined, 
      undefined, 
      undefined, 
      { ...data, dueDate: data.dueDate?.toISOString() }
    );
    onCancel();
    toast({ title: `Step completed, next step assigned.` });
  };

  return (
    <form onSubmit={form.handleSubmit(onNextStepSubmit)} className="space-y-4 p-4 border-t mt-4">
      <h4 className="font-semibold">Define Next Step</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Step Name</Label>
          <Input {...form.register('name')} />
          {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>Assign To</Label>
          <Controller
            control={form.control}
            name="assigneeId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="Select assignee" /></SelectTrigger>
                <SelectContent>
                  {assignableUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.assigneeId && <p className="text-xs text-destructive">{form.formState.errors.assigneeId.message}</p>}
        </div>
      </div>
      <div className="space-y-1">
        <Label>Description (Optional)</Label>
        <Textarea {...form.register('description')} rows={2}/>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="button" variant="secondary" onClick={handleFinalCompletion}>Complete as Final Step</Button>
        <Button type="submit">Complete & Assign Next Step</Button>
      </div>
    </form>
  );
};

const reassignSchema = z.object({
  newAssigneeId: z.string().min(1, 'Please select a new assignee.'),
  comment: z.string().min(1, 'A reason for reassignment is required.'),
});

type ReassignFormValues = z.infer<typeof reassignSchema>;

const ReassignStepDialog = ({ isOpen, setIsOpen, job, step }: { isOpen: boolean; setIsOpen: (open: boolean) => void; job: JobProgress; step: JobStep; }) => {
    const { reassignJobStep, getAssignableUsers } = useAppContext();
    const [popoverOpen, setPopoverOpen] = useState(false);

    const assignableUsers = useMemo(() => {
        return getAssignableUsers().filter(u => u.id !== step.assigneeId);
    }, [getAssignableUsers, step.assigneeId]);

    const form = useForm<ReassignFormValues>({
        resolver: zodResolver(reassignSchema),
        defaultValues: { newAssigneeId: '', comment: '' },
    });

    const onSubmit = (data: ReassignFormValues) => {
        reassignJobStep(job.id, step.id, data.newAssigneeId, data.comment);
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Reassign Step: {step.name}</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>New Assignee</Label>
                        <Controller
                            name="newAssigneeId"
                            control={form.control}
                            render={({ field }) => (
                                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" className="w-full justify-between">
                                            {field.value ? assignableUsers.find(u => u.id === field.value)?.name : "Select new assignee..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search users..." />
                                            <CommandList>
                                                <CommandEmpty>No users found.</CommandEmpty>
                                                <CommandGroup>
                                                    {assignableUsers.map(user => (
                                                        <CommandItem
                                                            key={user.id}
                                                            value={user.name}
                                                            onSelect={() => {
                                                                form.setValue('newAssigneeId', user.id);
                                                                setPopoverOpen(false);
                                                            }}
                                                        >
                                                            <Check className={cn("mr-2 h-4 w-4", user.id === field.value ? "opacity-100" : "opacity-0")} />
                                                            {user.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            )}
                        />
                        {form.formState.errors.newAssigneeId && <p className="text-xs text-destructive">{form.formState.errors.newAssigneeId.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="comment">Reason for Reassignment</Label>
                        <Textarea id="comment" {...form.register('comment')} />
                        {form.formState.errors.comment && <p className="text-xs text-destructive">{form.formState.errors.comment.message}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <Button type="submit">Confirm Reassignment</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};


export default function ViewJobProgressDialog({ isOpen, setIsOpen, job: initialJob }: ViewJobProgressDialogProps) {
    const { user, users, jobProgress, updateJobStepStatus, addJobStepComment } = useAppContext();
    const [completingStepId, setCompletingStepId] = useState<string | null>(null);
    const [reassigningStep, setReassigningStep] = useState<JobStep | null>(null);

    const job = useMemo(() => {
        return jobProgress.find(j => j.id === initialJob.id) || initialJob;
    }, [jobProgress, initialJob]);

    const creator = users.find(u => u.id === job.creatorId);

    const handleAcknowledge = (stepId: string) => {
        updateJobStepStatus(job.id, stepId, 'Acknowledged');
    };

    return (
        <>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{job.title}</DialogTitle>
                    <DialogDescription>Created by {creator?.name} on {format(parseISO(job.createdAt), 'PPP')}</DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-1 -mx-6 px-6">
                    <div className="relative pl-6">
                        <div className="absolute left-10 top-2 bottom-2 w-0.5 bg-border -translate-x-1/2"></div>
                        
                        <div className="space-y-8">
                            {job.steps.map((step, index) => {
                                const assignee = users.find(u => u.id === step.assigneeId);
                                const isCurrentUserAssignee = user?.id === step.assigneeId;
                                const isPreviousStepCompleted = index === 0 || job.steps[index - 1].status === 'Completed';
                                const canAct = isCurrentUserAssignee && isPreviousStepCompleted;
                                const canReassign = canAct && (step.status === 'Pending' || step.status === 'Acknowledged');
                                const StatusIcon = statusConfig[step.status].icon;
                                
                                return (
                                    <div key={step.id} className="relative flex items-start">
                                        <div className={cn("absolute left-10 top-2 w-5 h-5 rounded-full flex items-center justify-center -translate-x-1/2", statusConfig[step.status].color.replace('text-', 'bg-').replace('-500', '-100 dark:bg-opacity-30'))}>
                                            <StatusIcon className={cn("h-3 w-3", statusConfig[step.status].color)} />
                                        </div>
                                        <div className="ml-10 w-full pl-6 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-semibold">{step.name}</p>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                                        <span>Assigned to:</span>
                                                        <Avatar className="h-5 w-5"><AvatarImage src={assignee?.avatar}/><AvatarFallback>{assignee?.name?.[0]}</AvatarFallback></Avatar>
                                                        <span>{assignee?.name}</span>
                                                        {step.dueDate && <span>&middot; Due {format(parseISO(step.dueDate), 'dd MMM')}</span>}
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className="capitalize">{statusConfig[step.status].label}</Badge>
                                            </div>
                                            
                                            {step.description && <p className="text-sm text-muted-foreground p-2 bg-muted/50 rounded-md">{step.description}</p>}
                                            
                                            {step.acknowledgedAt && !step.completedAt && <p className="text-xs text-muted-foreground mt-1">Acknowledged: {formatDistanceToNow(parseISO(step.acknowledgedAt), { addSuffix: true })}</p>}
                                            {step.completedAt && <p className="text-xs text-green-600">Completed: {formatDistanceToNow(parseISO(step.completedAt), { addSuffix: true })} by {users.find(u => u.id === step.completedBy)?.name}</p>}

                                            <div className="flex items-center gap-2">
                                                {canAct && step.status === 'Pending' && <Button size="sm" onClick={() => handleAcknowledge(step.id)}>Acknowledge</Button>}
                                                {canAct && step.status === 'Acknowledged' && !completingStepId && (
                                                  <Button size="sm" onClick={() => setCompletingStepId(step.id)}>Complete Step</Button>
                                                )}
                                                {canReassign && (
                                                    <Button size="sm" variant="outline" onClick={() => setReassigningStep(step)}>
                                                        <UserRoundCog className="h-4 w-4 mr-2" />
                                                        Reassign
                                                    </Button>
                                                )}
                                            </div>

                                            {completingStepId === step.id && (
                                              <NextStepForm job={job} currentStep={step} onCancel={() => setCompletingStepId(null)} />
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        {reassigningStep && (
            <ReassignStepDialog
                isOpen={!!reassigningStep}
                setIsOpen={() => setReassigningStep(null)}
                job={job}
                step={reassigningStep}
            />
        )}
        </>
    )
}
