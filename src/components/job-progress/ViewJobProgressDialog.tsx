
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import type { JobProgress, JobStep, JobStepStatus, Task, User, Role } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { format, parseISO, formatDistanceToNow, isValid } from 'date-fns';
import { CheckCircle, Clock, Circle, XCircle, Send, PlusCircle, UserRoundCog, Check, ChevronsUpDown, Milestone, Edit, Undo2 } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { JOB_PROGRESS_STEPS, REOPEN_JOB_STEPS } from '@/lib/types';


const statusConfig: { [key in JobStepStatus]: { icon: React.ElementType, color: string, label: string } } = {
  'Not Started': { icon: Circle, color: 'text-gray-400', label: 'Not Started' },
  'Pending': { icon: Clock, color: 'text-yellow-500', label: 'Pending' },
  'Acknowledged': { icon: Clock, color: 'text-blue-500', label: 'In Progress' },
  'Completed': { icon: CheckCircle, color: 'text-green-500', label: 'Completed' },
  'Skipped': { icon: XCircle, color: 'text-gray-500', label: 'Skipped' },
};

const reopenSchema = z.object({
  reason: z.string().min(10, "A detailed reason for reopening is required."),
  newStepName: z.string().min(1, "A name for the new step is required."),
  otherStepName: z.string().optional(),
  newStepAssigneeId: z.string().min(1, "An assignee for the new step is required."),
}).refine(data => {
    if (data.newStepName === 'Others') {
        return data.otherStepName && data.otherStepName.length > 0;
    }
    return true;
}, {
    message: "Please specify the step name when selecting 'Others'.",
    path: ["otherStepName"],
});


type ReopenFormValues = z.infer<typeof reopenSchema>;

const ReopenJobDialog = ({ isOpen, setIsOpen, job, reopenJob }: { isOpen: boolean; setIsOpen: (open: boolean) => void; job: JobProgress; reopenJob: (jobId: string, reason: string, newStepName: string, newStepAssigneeId: string) => void; }) => {
    const { getAssignableUsers } = useAppContext();
    const [popoverOpen, setPopoverOpen] = useState(false);

    const assignableUsers = useMemo(() => {
        return getAssignableUsers().filter(u => u.role !== 'Manager');
    }, [getAssignableUsers]);

    const form = useForm<ReopenFormValues>({
        resolver: zodResolver(reopenSchema),
        defaultValues: { reason: '', newStepName: '', otherStepName: '', newStepAssigneeId: '' }
    });

    const watchedStepName = form.watch('newStepName');

    const onSubmit = (data: ReopenFormValues) => {
        const stepName = data.newStepName === 'Others' ? data.otherStepName! : data.newStepName;
        reopenJob(job.id, data.reason, stepName, data.newStepAssigneeId);
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>Reopen JMS: {job.title}</DialogTitle>
                    <DialogDescription>Provide a reason for reopening and create a new initial step.</DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="reason">Reason for Reopening</Label>
                        <Textarea id="reason" {...form.register('reason')} />
                        {form.formState.errors.reason && <p className="text-xs text-destructive">{form.formState.errors.reason.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="newStepName">New Step Name</Label>
                        <Controller
                            name="newStepName"
                            control={form.control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a step..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {REOPEN_JOB_STEPS.map(step => (
                                            <SelectItem key={step} value={step}>{step}</SelectItem>
                                        ))}
                                        <SelectItem value="Others">Others (Specify)</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {form.formState.errors.newStepName && <p className="text-xs text-destructive">{form.formState.errors.newStepName.message}</p>}
                    </div>

                    {watchedStepName === 'Others' && (
                         <div className="space-y-2">
                            <Label htmlFor="otherStepName">Specify Step Name</Label>
                            <Input id="otherStepName" {...form.register('otherStepName')} />
                            {form.formState.errors.otherStepName && <p className="text-xs text-destructive">{form.formState.errors.otherStepName.message}</p>}
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label>Assign New Step To</Label>
                        <Controller
                            name="newStepAssigneeId"
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
                                                                form.setValue('newStepAssigneeId', user.id);
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
                         {form.formState.errors.newStepAssigneeId && <p className="text-xs text-destructive">{form.formState.errors.newStepAssigneeId.message}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <Button type="submit">Reopen and Add Step</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

const reassignSchema = z.object({
    newAssigneeId: z.string().min(1, "Please select a new assignee."),
    comment: z.string().min(10, "A comment is required for reassignment."),
  });
  
type ReassignFormValues = z.infer<typeof reassignSchema>;
  
const ReassignStepDialog = ({ isOpen, setIsOpen, job, step }: { isOpen: boolean; setIsOpen: (open: boolean) => void; job: JobProgress; step: JobStep; }) => {
    const { getAssignableUsers, reassignJobStep } = useAppContext();
    const { toast } = useToast();
    const [popoverOpen, setPopoverOpen] = useState(false);

    const assignableUsers = useMemo(() => {
        return getAssignableUsers();
    }, [getAssignableUsers]);

    const form = useForm<ReassignFormValues>({
        resolver: zodResolver(reassignSchema),
        defaultValues: { newAssigneeId: '', comment: '' }
    });

    const onSubmit = (data: ReassignFormValues) => {
        reassignJobStep(job.id, step.id, data.newAssigneeId, data.comment);
        toast({ title: "Step Reassigned", description: `The step has been reassigned.` });
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>Reassign Step: {step.name}</DialogTitle>
                    <DialogDescription>Select a new assignee for this step.</DialogDescription>
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
                        <Label htmlFor="comment">Comment</Label>
                        <Textarea id="comment" {...form.register('comment')} />
                        {form.formState.errors.comment && <p className="text-xs text-destructive">{form.formState.errors.comment.message}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <Button type="submit">Reassign Step</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

const nextStepSchema = z.object({
  name: z.string({ required_error: 'Step name is required' }).min(1, 'Step name is required'),
  assigneeId: z.string().optional(),
  description: z.string().optional(),
  dueDate: z.date().optional().nullable(),
}).refine(data => {
    if (data.name !== 'Hard Copy submitted') {
        return !!data.assigneeId;
    }
    return true;
}, {
    message: 'Assignee is required for this step.',
    path: ['assigneeId'],
});

const AddNextStepForm = ({ job, currentStep, onCancel, onSave }: { job: JobProgress; currentStep: JobStep; onCancel: () => void; onSave: () => void; }) => {
    const { addAndCompleteStep, completeJobAsFinalStep, getAssignableUsers, users } = useAppContext();
    const [completionComment, setCompletionComment] = useState('');
    const form = useForm<z.infer<typeof nextStepSchema>>({
        resolver: zodResolver(nextStepSchema),
    });
    
    const assignableUsers = useMemo(() => {
        return getAssignableUsers().filter(u => u.role !== 'Manager');
    }, [getAssignableUsers]);

    const watchedStepName = form.watch('name');

    const handleFormSubmit = (data: z.infer<typeof nextStepSchema>) => {
        if (data.name === 'Hard Copy submitted') {
            completeJobAsFinalStep(job.id, currentStep.id, completionComment || 'Hard copy submitted and job finalized.');
        } else {
            addAndCompleteStep(job.id, currentStep.id, completionComment, undefined, undefined, {
                ...data,
                dueDate: data.dueDate?.toISOString() || null,
            });
        }
        onSave();
    };

    return (
        <div className="p-4 border rounded-md mt-2 bg-muted/20">
            <h5 className="font-semibold text-sm mb-2">Complete This Step</h5>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-3">
                <div className="space-y-1">
                    <Label className="text-xs">Completion Notes (Optional)</Label>
                    <Textarea value={completionComment} onChange={e => setCompletionComment(e.target.value)} rows={2} />
                </div>
                 <div className="space-y-1">
                    <Label className="text-xs">Next Step Name</Label>
                     <Controller
                        name="name"
                        control={form.control}
                        render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                            <SelectValue placeholder="Select next step" />
                            </SelectTrigger>
                            <SelectContent>
                            {JOB_PROGRESS_STEPS.map(step => (
                                <SelectItem key={step} value={step}>{step}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        )}
                    />
                     {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
                </div>
                {watchedStepName !== 'Hard Copy submitted' && (
                    <>
                        <div className="space-y-1">
                            <Label className="text-xs">Assign To</Label>
                            <Controller
                                name="assigneeId"
                                control={form.control}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger><SelectValue placeholder="Select user..." /></SelectTrigger>
                                        <SelectContent>
                                            {assignableUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {form.formState.errors.assigneeId && <p className="text-xs text-destructive">{form.formState.errors.assigneeId.message}</p>}
                        </div>
                         <div className="space-y-1">
                            <Label className="text-xs">Description (Optional)</Label>
                            <Textarea {...form.register('description')} rows={2}/>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Due Date (Optional)</Label>
                            <Controller name="dueDate" control={form.control} render={({ field }) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />} />
                        </div>
                    </>
                )}
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
                    <Button type="submit" size="sm">
                        {watchedStepName === 'Hard Copy submitted' ? 'Finalize & Complete Job' : 'Complete & Assign Next Step'}
                    </Button>
                </div>
            </form>
        </div>
    );
};


interface ViewJobProgressDialogProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    job: JobProgress;
}

export default function ViewJobProgressDialog({ isOpen, setIsOpen, job: initialJob }: ViewJobProgressDialogProps) {
    const { user, users, projects, jobProgress, updateJobStepStatus, addJobStepComment, reopenJob, assignJobStep, can, markJobStepAsFinal, completeJobAsFinalStep, reassignJobStep } = useAppContext();
    const [reassigningStep, setReassigningStep] = useState<JobStep | null>(null);
    const [newAssigneeId, setNewAssigneeId] = useState<string>('');
    const [showNextStepForm, setShowNextStepForm] = useState<string | null>(null);
    const [isReopenDialogOpen, setIsReopenDialogOpen] = useState(false);
    const { toast } = useToast();

    const job = useMemo(() => {
        return jobProgress.find(j => j.id === initialJob.id) || initialJob;
    }, [jobProgress, initialJob]);

    const creator = users.find(u => u.id === job.creatorId);
    const project = projects.find(p => p.id === job.projectId);

    const canReopenJob = useMemo(() => {
        if (!user || !job) return false;
        const canReopenRoles: Role[] = ['Admin', 'Project Coordinator', 'Document Controller'];
        return (canReopenRoles.includes(user.role) || user.id === job.creatorId) && job.status === 'Completed';
    }, [user, job]);
    
    const isAuthorizedToFinalize = useMemo(() => {
        if (!user || job.status === 'Completed') return false;
        const canFinalizeRoles: Role[] = ['Admin', 'Project Coordinator', 'Document Controller'];
        return canFinalizeRoles.includes(user.role) || user.id === job.creatorId;
    }, [user, job]);

    return (
        <>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col" onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <DialogTitle>JMS Details: {job.title}</DialogTitle>
                            <DialogDescription>Created by {creator?.name} on {format(parseISO(job.createdAt), 'PPP')}</DialogDescription>
                        </div>
                        <Badge variant={job.status === 'Completed' ? 'success' : 'secondary'}>{job.status}</Badge>
                    </div>
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-2">
                        <div><span className="font-semibold">Project:</span> {project?.name || 'N/A'}</div>
                        <div><span className="font-semibold">WO No:</span> {job.workOrderNo || 'N/A'}</div>
                        <div><span className="font-semibold">FO No:</span> {job.foNo || 'N/A'}</div>
                        <div><span className="font-semibold">Amount:</span> {job.amount ? new Intl.NumberFormat('en-IN').format(job.amount) : 'N/A'}</div>
                        <div><span className="font-semibold">From:</span> {job.dateFrom ? format(parseISO(job.dateFrom), 'dd-MM-yy') : 'N/A'}</div>
                        <div><span className="font-semibold">To:</span> {job.dateTo ? format(parseISO(job.dateTo), 'dd-MM-yy') : 'N/A'}</div>
                    </div>
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
                                const canReassign = (isCurrentUserAssignee || user?.role === 'Admin') && (step.status === 'Pending' || step.status === 'Acknowledged');
                                const StatusIcon = statusConfig[step.status].icon;
                                const canFinalize = (isAuthorizedToFinalize || isCurrentUserAssignee) && step.status === 'Acknowledged';
                                const isStepUnassigned = !step.assigneeId;
                                const canAssign = (user?.id === job.creatorId || user?.role === 'Admin') && isStepUnassigned && step.status === 'Pending';
                                
                                return (
                                    <div key={step.id} className="relative flex items-start">
                                        <div className={cn("absolute left-10 top-2 w-5 h-5 rounded-full flex items-center justify-center -translate-x-1/2", statusConfig[step.status].color.replace('text-', 'bg-').replace('-500', '-100 dark:bg-opacity-30'))}>
                                            <StatusIcon className={cn("h-3 w-3", statusConfig[step.status].color)} />
                                        </div>
                                        <div className="ml-10 w-full pl-6 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div className="font-semibold flex items-center gap-2">
                                                    {step.name}
                                                </div>
                                                <Badge variant="outline" className="capitalize">{statusConfig[step.status].label}</Badge>
                                            </div>
                                            
                                            {assignee ? (
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                                    <span>Assigned to:</span>
                                                    <Avatar className="h-5 w-5"><AvatarImage src={assignee?.avatar} /><AvatarFallback>{assignee?.name?.[0]}</AvatarFallback></Avatar>
                                                    <span>{assignee?.name}</span>
                                                    {step.dueDate && <span>&middot; Due {format(parseISO(step.dueDate), 'dd MMM')}</span>}
                                                </div>
                                             ) : (
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    Unassigned
                                                </div>
                                             )}

                                            {step.description && <p className="text-sm text-muted-foreground p-2 bg-muted/50 rounded-md">{step.description}</p>}
                                            
                                            {step.acknowledgedAt && !step.completedAt && <p className="text-xs text-blue-600">Acknowledged: {formatDistanceToNow(parseISO(step.acknowledgedAt), { addSuffix: true })}</p>}
                                            {step.completedAt && <p className="text-xs text-green-600">Completed: {formatDistanceToNow(parseISO(step.completedAt), { addSuffix: true })} by {users.find(u => u.id === step.completedBy)?.name}</p>}
                                            
                                            {canAssign && (
                                                <div className="mt-3 p-3 bg-background border rounded-md space-y-2">
                                                    <Label>Assign this step</Label>
                                                    <div className="flex gap-2">
                                                        <Select onValueChange={setNewAssigneeId} value={newAssigneeId}>
                                                            <SelectTrigger><SelectValue placeholder="Select user..." /></SelectTrigger>
                                                            <SelectContent>
                                                                {users.filter(u => u.role !== 'Manager').map(u => (
                                                                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <Button size="sm" disabled={!newAssigneeId} onClick={() => {
                                                            assignJobStep(job.id, step.id, newAssigneeId);
                                                            setNewAssigneeId('');
                                                        }}>Assign</Button>
                                                    </div>
                                                </div>
                                            )}

                                            {canAct && step.status === 'Pending' && (
                                                <Button size="sm" onClick={() => updateJobStepStatus(job.id, step.id, 'Acknowledged')}>Acknowledge</Button>
                                            )}

                                            {canAct && step.status === 'Acknowledged' && (
                                                showNextStepForm === step.id ? (
                                                    <AddNextStepForm 
                                                        job={job}
                                                        currentStep={step}
                                                        onCancel={() => setShowNextStepForm(null)}
                                                        onSave={() => setShowNextStepForm(null)}
                                                    />
                                                ) : (
                                                    <div className="flex justify-between items-center pt-3 border-t">
                                                        <Button size="sm" variant="outline" onClick={() => setReassigningStep(step)}>
                                                          <UserRoundCog className="h-4 w-4 mr-2"/> Reassign
                                                        </Button>
                                                         <div className="flex gap-2 items-center">
                                                            {canFinalize && !step.isFinalStep && (
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button size="sm" variant="secondary">Mark as Final & Complete</Button>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>Complete this Job?</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                This will mark this step and the entire JMS as completed. This is the final action for this workflow.
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                            <AlertDialogAction onClick={() => completeJobAsFinalStep(job.id, step.id, `Manually finalized by ${user?.name}`)}>
                                                                                Confirm Completion
                                                                            </AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            )}
                                                            <Button size="sm" onClick={() => setShowNextStepForm(step.id)}>
                                                                <CheckCircle className="mr-2 h-4 w-4"/> Complete & Add Next Step
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter className="justify-between">
                    {canReopenJob && (
                        <Button variant="outline" onClick={() => setIsReopenDialogOpen(true)}><Undo2 className="mr-2 h-4 w-4"/>Reopen Job</Button>
                    )}
                    <Button variant="secondary" onClick={() => setIsOpen(false)}>Close</Button>
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
        {isReopenDialogOpen && (
            <ReopenJobDialog
                isOpen={isReopenDialogOpen}
                setIsOpen={setIsReopenDialogOpen}
                job={job}
                reopenJob={reopenJob}
            />
        )}
        </>
    )
}
