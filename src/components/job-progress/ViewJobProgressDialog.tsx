
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
import { CheckCircle, Clock, Circle, XCircle, Send, PlusCircle, UserRoundCog, Check, ChevronsUpDown, Milestone } from 'lucide-react';
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


const statusConfig: { [key in JobStepStatus]: { icon: React.ElementType, color: string, label: string } } = {
  'Not Started': { icon: Circle, color: 'text-gray-400', label: 'Not Started' },
  'Pending': { icon: Clock, color: 'text-yellow-500', label: 'Pending' },
  'Acknowledged': { icon: Clock, color: 'text-blue-500', label: 'In Progress' },
  'Completed': { icon: CheckCircle, color: 'text-green-500', label: 'Completed' },
  'Skipped': { icon: XCircle, color: 'text-gray-500', label: 'Skipped' },
};


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


interface ViewJobProgressDialogProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    job: JobProgress;
}

export default function ViewJobProgressDialog({ isOpen, setIsOpen, job: initialJob }: ViewJobProgressDialogProps) {
    const { user, users, jobProgress, updateJobStepStatus, addJobStepComment } = useAppContext();
    const [comment, setComment] = useState('');
    const [reassigningStep, setReassigningStep] = useState<JobStep | null>(null);

    const job = useMemo(() => {
        return jobProgress.find(j => j.id === initialJob.id) || initialJob;
    }, [jobProgress, initialJob]);

    const creator = users.find(u => u.id === job.creatorId);

    const handleAcknowledge = (stepId: string) => {
        updateJobStepStatus(job.id, stepId, 'Acknowledged');
    };
    
    const handleComplete = (stepId: string) => {
        updateJobStepStatus(job.id, stepId, 'Completed', comment);
        setComment('');
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
                                                    <p className="font-semibold flex items-center gap-2">
                                                        {step.name}
                                                        {step.milestone && <Badge variant="outline"><Milestone className="h-3 w-3 mr-1"/>{step.milestone}%</Badge>}
                                                    </p>
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
                                            
                                            {step.acknowledgedAt && !step.completedAt && <p className="text-xs text-blue-600">Acknowledged: {formatDistanceToNow(parseISO(step.acknowledgedAt), { addSuffix: true })}</p>}
                                            {step.completedAt && <p className="text-xs text-green-600">Completed: {formatDistanceToNow(parseISO(step.completedAt), { addSuffix: true })} by {users.find(u => u.id === step.completedBy)?.name}</p>}

                                            {canAct && step.status === 'Pending' && (
                                                <Button size="sm" onClick={() => handleAcknowledge(step.id)}>Acknowledge</Button>
                                            )}

                                            {canAct && step.status === 'Acknowledged' && (
                                                <div className="space-y-2 pt-2 border-t">
                                                     <div className="relative">
                                                        <Textarea 
                                                            value={comment}
                                                            onChange={e => setComment(e.target.value)}
                                                            placeholder="Add completion notes (optional)..." 
                                                            className="pr-10 text-sm"
                                                            rows={2}
                                                        />
                                                     </div>
                                                     <div className="flex justify-between">
                                                        <Button size="sm" variant="outline" onClick={() => setReassigningStep(step)}>
                                                          <UserRoundCog className="h-4 w-4 mr-2"/> Reassign
                                                        </Button>
                                                        <Button size="sm" onClick={() => handleComplete(step.id)}>Complete Step</Button>
                                                     </div>
                                                </div>
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
