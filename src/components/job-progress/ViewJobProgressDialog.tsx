
'use client';

import { useMemo, useState } from 'react';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { JOB_PROGRESS_STEPS, JobProgressStepName } from '@/lib/types';


const statusConfig: { [key in JobStepStatus]: { icon: React.ElementType, color: string, label: string } } = {
  'Not Started': { icon: Circle, color: 'text-gray-400', label: 'Not Started' },
  'Pending': { icon: Clock, color: 'text-yellow-500', label: 'Pending' },
  'Acknowledged': { icon: Clock, color: 'text-blue-500', label: 'In Progress' },
  'Completed': { icon: CheckCircle, color: 'text-green-500', label: 'Completed' },
  'Skipped': { icon: XCircle, color: 'text-gray-500', label: 'Skipped' },
};

const nextStepSchema = z.object({
  name: z.enum(JOB_PROGRESS_STEPS, { required_error: 'Step name is required' }),
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

const ReassignStepDialog = ({ isOpen, setIsOpen, job, step }: { isOpen: boolean; setIsOpen: (open: boolean) => void; job: JobProgress; step: JobStep; }) => {
    const { reassignJobStep, getAssignableUsers } = useAppContext();
    const [popoverOpen, setPopoverOpen] = useState(false);

    const assignableUsers = useMemo(() => {
        return getAssignableUsers().filter(u => u.id !== step.assigneeId);
    }, [getAssignableUsers, step.assigneeId]);

    const form = useForm<{newAssigneeId: string; comment: string;}>({
        resolver: zodResolver(z.object({
            newAssigneeId: z.string().min(1, 'Please select a new assignee.'),
            comment: z.string().min(1, 'A reason for reassignment is required.'),
        })),
        defaultValues: { newAssigneeId: '', comment: '' },
    });

    const onSubmit = (data: {newAssigneeId: string; comment: string;}) => {
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

const AddNextStepForm = ({ job, currentStep, onCancel, onSave }: { job: JobProgress; currentStep: JobStep; onCancel: () => void; onSave: () => void; }) => {
    const { addAndCompleteStep, completeJobAsFinalStep, users } = useAppContext();
    const [completionComment, setCompletionComment] = useState('');
    const form = useForm<z.infer<typeof nextStepSchema>>({
        resolver: zodResolver(nextStepSchema),
    });
    
    const assignableUsers = useMemo(() => {
        return users.filter(u => u.role !== 'Manager');
    }, [users]);

    const watchedStepName = form.watch('name');

    const handleFormSubmit = (data: z.infer<typeof nextStepSchema>) => {
        if (data.name === 'Hard Copy submitted') {
            completeJobAsFinalStep(job.id, currentStep.id, completionComment);
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
    const { user, users, jobProgress, updateJobStepStatus, addJobStepComment, reopenJob, assignJobStep, can, markJobStepAsFinal, completeJobAsFinalStep } = useAppContext();
    const [reassigningStep, setReassigningStep] = useState<JobStep | null>(null);
    const [newAssigneeId, setNewAssigneeId] = useState<string>('');
    const [showNextStepForm, setShowNextStepForm] = useState<string | null>(null);
    const { toast } = useToast();

    const job = useMemo(() => {
        return jobProgress.find(j => j.id === initialJob.id) || initialJob;
    }, [jobProgress, initialJob]);

    const creator = users.find(u => u.id === job.creatorId);

    const canReopenJob = useMemo(() => {
        if (!user || !job) return false;
        const canReopenRoles: Role[] = ['Admin', 'Project Coordinator', 'Document Controller'];
        return (canReopenRoles.includes(user.role) || user.id === job.creatorId) && job.status === 'Completed';
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
                                
                                const isCreatorOrAdmin = user?.id === job.creatorId || user?.role === 'Admin';
                                const canMarkAsFinal = isCreatorOrAdmin && step.status !== 'Completed' && job.status !== 'Completed';

                                const isStepUnassigned = !step.assigneeId;
                                const canAssign = isCreatorOrAdmin && isStepUnassigned && step.status === 'Pending';
                                
                                return (
                                    <div key={step.id} className="relative flex items-start">
                                        <div className={cn("absolute left-10 top-2 w-5 h-5 rounded-full flex items-center justify-center -translate-x-1/2", statusConfig[step.status].color.replace('text-', 'bg-').replace('-500', '-100 dark:bg-opacity-30'))}>
                                            <StatusIcon className={cn("h-3 w-3", statusConfig[step.status].color)} />
                                        </div>
                                        <div className="ml-10 w-full pl-6 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div className="font-semibold flex items-center gap-2">
                                                    {step.name}
                                                    {step.isFinalStep && <Badge variant="destructive">Final Step</Badge>}
                                                </div>
                                                <Badge variant="outline" className="capitalize">{statusConfig[step.status].label}</Badge>
                                            </div>
                                            
                                            {assignee ? (
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                                    <span>Assigned to:</span>
                                                    <Avatar className="h-5 w-5"><AvatarImage src={assignee?.avatar}/><AvatarFallback>{assignee?.name?.[0]}</AvatarFallback></Avatar>
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
                                                            {canMarkAsFinal && !step.isFinalStep && (
                                                                <Button size="sm" variant="outline" onClick={() => markJobStepAsFinal(job.id, step.id)}>
                                                                    <Milestone className="mr-2 h-4 w-4" /> Mark as Final Step
                                                                </Button>
                                                            )}
                                                            <Button size="sm" onClick={() => setShowNextStepForm(step.id)}>
                                                                <CheckCircle className="mr-2 h-4 w-4"/> Complete This Step
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
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline"><Undo2 className="mr-2 h-4 w-4"/>Reopen Job</Button>
                            </AlertDialogTrigger>
                             <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Reopen this JMS?</AlertDialogTitle>
                                    <AlertDialogDescription>This will set the job back to "In Progress" and reactivate the final step. Are you sure?</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => reopenJob(job.id)}>Confirm Reopen</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
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
        </>
    )
}
