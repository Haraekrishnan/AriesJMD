

'use client';
import { useMemo, useState, useEffect, useCallback, useRef, MouseEvent } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import type { JobProgress, JobStep, JobStepStatus, Task, User, Role, Comment, ApprovalState, Subtask } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { CheckCircle, Clock, Circle, Send, PlusCircle, UserRoundCog, Check, ChevronsUpDown, Milestone, Edit, Undo2, X, MessageSquare, Trash2, ArrowRight, ArrowUp, ArrowDown, XCircle } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { DatePickerInput } from '../ui/date-picker-input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { JOB_PROGRESS_STEPS, REOPEN_JOB_STEPS } from '@/lib/types';
import ReturnStepDialog from './ReturnStepDialog';
import ReassignStepDialog from './ReassignStepDialog';


const statusConfig: { [key in JobStepStatus]: { icon?: React.ElementType, color: string, label: string } } = {
  'Not Started': { icon: Circle, color: 'text-gray-400', label: 'Not Started' },
  'Pending': { icon: Clock, color: 'text-yellow-500', label: 'Pending' },
  'Acknowledged': { color: 'text-blue-500', label: 'In Progress' },
  'Completed': { icon: CheckCircle, color: 'text-green-500', label: 'Completed' },
  'Skipped': { icon: XCircle, color: 'text-gray-500', label: 'Skipped' },
};

const jobDetailsSchema = z.object({
    title: z.string().min(3, 'JMS title is required'),
    projectId: z.string().min(1, 'Project is required'),
    plantUnit: z.string().optional(),
    workOrderNo: z.string().optional(),
    foNo: z.string().optional(),
    jmsNo: z.string().optional(),
    amount: z.coerce.number().optional(),
    dateFrom: z.date().optional().nullable(),
    dateTo: z.date().optional().nullable(),
});
type JobDetailsFormValues = z.infer<typeof jobDetailsSchema>;

const unassignedSteps: string[] = [];

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
    const { users } = useAppContext();
    const [popoverOpen, setPopoverOpen] = useState(false);

    const assignableUsers = useMemo(() => {
        return users.filter(u => u.role !== 'Manager');
    }, [users]);

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

const AddNextStepForm = ({ job, currentStep, onCancel, onSave }: { job: JobProgress; currentStep: JobStep; onCancel: () => void; onSave: () => void; }) => {
    const { user, addAndCompleteStep, completeJobAsFinalStep, getAssignableUsers } = useAppContext();
    const [completionComment, setCompletionComment] = useState('');

    const assignableUsersForNextStep = useMemo(() => {
        if (!user) return [];
        return getAssignableUsers();
    }, [user, getAssignableUsers]);

    const nextStepSchema = useMemo(() => {
        return z.object({
          name: z.string({ required_error: 'Step name is required' }).min(1, 'Step name is required'),
          assigneeId: z.string().optional(),
          description: z.string().optional(),
          dueDate: z.date().optional().nullable(),
          jmsNo: z.string().optional(),
        }).refine(data => {
            if (unassignedSteps.includes(data.name) || data.name === 'JMS Hard copy submitted') {
                return true;
            }
            return !!data.assigneeId;
        }, {
            message: 'Assignee is required for this step.',
            path: ['assigneeId'],
        }).refine(data => {
            if (data.name === 'JMS no created') {
                return !!data.jmsNo && data.jmsNo.length > 0;
            }
            return true;
        }, {
            message: 'JMS No. is required for this step.',
            path: ['jmsNo'],
        });
    }, []);
    
    type NextStepFormValues = z.infer<typeof nextStepSchema>;
    
    const form = useForm<NextStepFormValues>({
        resolver: zodResolver(nextStepSchema),
    });

    useEffect(() => {
        form.reset();
    }, [currentStep, form]);
    
    const nextStepName = form.watch('name');
    
    const showJmsNoField = useMemo(() => {
        return nextStepName === 'JMS no created';
    }, [nextStepName]);

    const handleFormSubmit = (data: NextStepFormValues) => {
        if (data.name === 'JMS Hard copy submitted') {
            completeJobAsFinalStep(job.id, currentStep.id, completionComment || `Final step completed by ${user?.name}.`);
        } else {
            addAndCompleteStep(job.id, currentStep.id, completionComment, undefined, data.jmsNo ? { jmsNo: data.jmsNo } : undefined, {
                ...data,
                dueDate: data.dueDate?.toISOString() || null,
                assigneeId: data.assigneeId || null,
            });
        }
        onSave();
    };

    const completedStepNames = new Set(job.steps.filter(s => s.status === 'Completed').map(s => s.name));
    const availableNextSteps = JOB_PROGRESS_STEPS.filter(step => !completedStepNames.has(step));


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
                            {availableNextSteps.map(step => (
                                <SelectItem key={step} value={step}>{step}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        )}
                    />
                     {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
                </div>
                 
                 {nextStepName !== 'JMS Hard copy submitted' && (
                    <>
                         {showJmsNoField && (
                             <div className="space-y-1">
                                <Label className="text-xs">JMS No.</Label>
                                <Input {...form.register('jmsNo')} />
                                {form.formState.errors.jmsNo && <p className="text-xs text-destructive">{form.formState.errors.jmsNo.message}</p>}
                            </div>
                         )}
                         {nextStepName && !unassignedSteps.includes(nextStepName) && (
                            <div className="space-y-1">
                                <Label className="text-xs">Assign To</Label>
                                <Controller
                                    name="assigneeId"
                                    control={form.control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger><SelectValue placeholder="Select user..." /></SelectTrigger>
                                            <SelectContent>
                                                {assignableUsersForNextStep.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {form.formState.errors.assigneeId && <p className="text-xs text-destructive">{form.formState.errors.assigneeId.message}</p>}
                            </div>
                         )}
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
                        {nextStepName === 'JMS Hard copy submitted' ? 'Finalize JMS' : 'Complete & Assign Next Step'}
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
    const { user, users, projects, jobProgress, updateJobProgress, updateJobStep, updateJobStepStatus, addJobStepComment, reopenJob, assignJobStep, can, markJobStepAsFinal, completeJobAsFinalStep, reassignJobStep, returnJobStep, deleteJobProgress } = useAppContext();
    const [reassigningStep, setReassigningStep] = useState<JobStep | null>(null);
    const [returningStep, setReturningStep] = useState<JobStep | null>(null);
    const [newAssigneeId, setNewAssigneeId] = useState<string>('');
    const [showNextStepForm, setShowNextStepForm] = useState<string | null>(null);
    const [isReopenDialogOpen, setIsReopenDialogOpen] = useState(false);
    const [editingStepId, setEditingStepId] = useState<string | null>(null);
    const [editingStepName, setEditingStepName] = useState('');
    const [isEditingHeader, setIsEditingHeader] = useState(false);
    const { toast } = useToast();

    const job = useMemo(() => {
        return jobProgress.find(j => j.id === initialJob.id) || initialJob;
    }, [jobProgress, initialJob]);
    
    const viewingUser = useMemo(() => users.find(u => u.id === user?.id), [users, user]);

    const creator = users.find(u => u.id === job.creatorId);
    const project = projects.find(p => p.id === job.projectId);

    const form = useForm<JobDetailsFormValues>({
        resolver: zodResolver(jobDetailsSchema),
      });
    
      useEffect(() => {
        if (job) {
          form.reset({
            title: job.title,
            projectId: job.projectId,
            plantUnit: job.plantUnit || '',
            workOrderNo: job.workOrderNo || '',
            foNo: job.foNo || '',
            jmsNo: job.jmsNo || '',
            amount: job.amount || undefined,
            dateFrom: job.dateFrom ? parseISO(job.dateFrom) : null,
            dateTo: job.dateTo ? parseISO(job.dateTo) : null,
          });
        }
      }, [job, form, isOpen]);
    
      const onHeaderSubmit = (data: JobDetailsFormValues) => {
          updateJobProgress(job.id, {
              ...data,
              amount: data.amount || null,
              dateFrom: data.dateFrom?.toISOString() || null,
              dateTo: data.dateTo?.toISOString() || null,
          });
          setIsEditingHeader(false);
          toast({ title: 'JMS details updated.' });
      };

    const canEditJob = useMemo(() => {
      if (!user || !job) return false;
      const canEditRoles: Role[] = ['Admin', 'Project Coordinator', 'Document Controller'];
      return (canEditRoles.includes(user.role) || user.id === job.creatorId);
    }, [user, job]);
    
    const canReassign = useMemo(() => {
      if (!user || job.status === 'Completed') return false;
      const allowedRoles: Role[] = ['Admin', 'Project Coordinator', 'Document Controller'];
      return allowedRoles.includes(user.role);
    }, [user, job.status]);

    const canReopenJob = useMemo(() => {
        if (!user || !job) return false;
        const canReopenRoles: Role[] = ['Admin', 'Project Coordinator', 'Document Controller'];
        return (canReopenRoles.includes(user.role) || user.id === job.creatorId) && job.status === 'Completed';
    }, [user, job]);

    const handleEditStepClick = (step: JobStep) => {
        setEditingStepId(step.id);
        setEditingStepName(step.name);
    };

    const handleSaveStepName = (step: JobStep) => {
        if (editingStepName.trim() === '') {
            toast({ title: "Step name cannot be empty.", variant: "destructive" });
            return;
        }
        if (editingStepName !== step.name) {
            updateJobStep(job.id, step.id, { name: editingStepName });
            toast({ title: "Step name updated." });
        }
        setEditingStepId(null);
        setEditingStepName('');
    };
    
    return (
        <>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col" onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <form onSubmit={form.handleSubmit(onHeaderSubmit)}>
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <DialogTitle className="flex items-center gap-2">
                                    {isEditingHeader ? (
                                        <Input {...form.register('title')} className="text-2xl font-bold p-0 h-auto border-0 shadow-none focus-visible:ring-0" />
                                    ) : (
                                        `JMS Details: ${job.title}`
                                    )}
                                </DialogTitle>
                                <DialogDescription>Created by {creator?.name} on {format(parseISO(job.createdAt), 'PPP')}</DialogDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                {canEditJob && !isEditingHeader && (
                                    <Button type="button" variant="ghost" size="icon" onClick={() => setIsEditingHeader(true)}><Edit className="h-4 w-4" /></Button>
                                )}
                                <Badge variant={job.status === 'Completed' ? 'success' : 'secondary'}>{job.status}</Badge>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-2">
                            {isEditingHeader ? (
                                <>
                                    <div className="space-y-1"><Label>Project</Label><Controller name="projectId" control={form.control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>)}/></div>
                                    <div className="space-y-1"><Label>Plant/Unit</Label><Input {...form.register('plantUnit')} /></div>
                                    <div className="space-y-1"><Label>WO No</Label><Input {...form.register('workOrderNo')} /></div>
                                    <div className="space-y-1"><Label>FO No</Label><Input {...form.register('foNo')} /></div>
                                    <div className="space-y-1"><Label>JMS No</Label><Input {...form.register('jmsNo')} /></div>
                                    <div className="space-y-1"><Label>Amount</Label><Input type="number" {...form.register('amount')} /></div>
                                    <div className="space-y-1"><Label>From</Label><Controller name="dateFrom" control={form.control} render={({field}) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />} /></div>
                                    <div className="space-y-1"><Label>To</Label><Controller name="dateTo" control={form.control} render={({field}) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />} /></div>
                                </>
                            ) : (
                                <>
                                    <div><span className="font-semibold">Project:</span> {project?.name || 'N/A'}</div>
                                    <div><span className="font-semibold">Plant/Unit:</span> {job.plantUnit || 'N/A'}</div>
                                    <div><span className="font-semibold">WO No:</span> {job.workOrderNo || 'N/A'}</div>
                                    <div><span className="font-semibold">FO No:</span> {job.foNo || 'N/A'}</div>
                                    <div><span className="font-semibold">JMS No:</span> {job.jmsNo || 'N/A'}</div>
                                    <div><span className="font-semibold">Amount:</span> {job.amount ? new Intl.NumberFormat('en-IN').format(job.amount) : 'N/A'}</div>
                                    <div><span className="font-semibold">From:</span> {job.dateFrom ? format(parseISO(job.dateFrom), 'dd-MM-yy') : 'N/A'}</div>
                                    <div><span className="font-semibold">To:</span> {job.dateTo ? format(parseISO(job.dateTo), 'dd-MM-yy') : 'N/A'}</div>
                                </>
                            )}
                        </div>
                        {isEditingHeader && (
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="ghost" onClick={() => { setIsEditingHeader(false); form.reset(); }}>Cancel</Button>
                                <Button type="submit">Save Changes</Button>
                            </div>
                        )}
                    </form>
                </DialogHeader>
                 <ScrollArea className="flex-1 -mx-6 px-6">
                    <div className="relative p-6">
                        <div className="absolute left-10 top-0 bottom-0 w-0.5 bg-border -z-10" />
                        <div className="space-y-8">
                            {job.steps.map((step, index) => {
                                const assignee = users.find(u => u.id === step.assigneeId);
                                const Icon = statusConfig[step.status]?.icon || Circle;
                                const isEditingThisStep = editingStepId === step.id;
                                
                                const canPerformAction = (user?.id === step.assigneeId && step.status !== 'Completed') || (job.status !== 'Completed' && !step.assigneeId && (user?.projectIds?.includes(job.projectId || '') || can.manage_job_progress));

                                const canModifyStepName = (user?.role === 'Admin' || user?.id === job.creatorId) && job.status !== 'Completed';

                                const commentsArray = Array.isArray(step.comments)
                                  ? step.comments
                                  : Object.values(step.comments || {});

                                return (
                                    <div key={step.id} className="relative flex items-start gap-6">
                                        <div className="absolute left-[-11px] top-1 h-5 w-5 rounded-full bg-card border-2 border-primary flex items-center justify-center">
                                            <Icon className={cn("h-3 w-3", statusConfig[step.status]?.color)} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="p-4 border rounded-lg bg-card shadow-sm">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                          {isEditingThisStep ? (
                                                            <Input value={editingStepName} onChange={e => setEditingStepName(e.target.value)} className="h-8 text-base font-semibold" />
                                                          ) : (
                                                            <h4 className="font-semibold">{index + 1}. {step.name}</h4>
                                                          )}
                                                          {canModifyStepName && (
                                                            isEditingThisStep 
                                                              ? <Button size="icon" className="h-8 w-8" onClick={() => handleSaveStepName(step)}><Check className="h-4 w-4"/></Button>
                                                              : <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditStepClick(step)}><Edit className="h-4 w-4"/></Button>
                                                          )}
                                                        </div>
                                                        {step.description && <p className="text-sm text-muted-foreground mt-1">{step.description}</p>}
                                                    </div>
                                                     <Badge variant={step.isReturned ? 'destructive' : (statusConfig[step.status]?.label === 'Pending' ? 'warning' : 'secondary')} className="whitespace-nowrap">
                                                      {step.isReturned ? 'Returned' : statusConfig[step.status]?.label || step.status}
                                                    </Badge>
                                                </div>

                                                <div className="mt-3 pt-3 border-t text-sm">
                                                  <p className="flex items-center gap-2">
                                                    <strong>Assignee:</strong> 
                                                    {assignee ? (
                                                      <span className="flex items-center gap-1"><Avatar className="h-5 w-5"><AvatarImage src={assignee.avatar} /><AvatarFallback>{assignee.name.charAt(0)}</AvatarFallback></Avatar>{assignee.name}</span>
                                                    ) : 'Unassigned'}
                                                    {canReassign && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReassigningStep(step)}><UserRoundCog className="h-4 w-4 text-blue-600"/></Button>}
                                                  </p>
                                                  {step.dueDate && <p><strong>Due:</strong> {format(parseISO(step.dueDate), 'dd MMM yyyy')}</p>}
                                                </div>

                                                {step.isReturned && step.returnDetails && (
                                                    <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm">
                                                        <p className="font-semibold text-destructive flex items-center gap-2"><Undo2 className="h-4 w-4" /> Returned by {users.find(u => u.id === step.returnDetails!.returnedBy)?.name}</p>
                                                        <p className="text-destructive/90 mt-1">{step.returnDetails.reason}</p>
                                                        <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(parseISO(step.returnDetails.date), { addSuffix: true })}</p>
                                                    </div>
                                                )}

                                                <div className="mt-2 text-xs text-muted-foreground">
                                                  {step.acknowledgedAt && <p>Acknowledged: {formatDistanceToNow(parseISO(step.acknowledgedAt), { addSuffix: true })}</p>}
                                                  {step.completedAt && <p>Completed: {formatDistanceToNow(parseISO(step.completedAt), { addSuffix: true })} by {users.find(u => u.id === step.completedBy)?.name}</p>}
                                                </div>
                                                
                                                {commentsArray.length > 0 && (
                                                    <Accordion type="single" collapsible className="w-full mt-2 text-xs">
                                                        <AccordionItem value="comments" className="border-none">
                                                            <AccordionTrigger className="p-0 hover:no-underline text-blue-600"><div className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> View Comments ({commentsArray.length})</div></AccordionTrigger>
                                                            <AccordionContent className="pt-2">
                                                                <div className="space-y-2">
                                                                    {commentsArray.map((c, i) => {
                                                                        const commentUser = users.find(u => u.id === c.userId);
                                                                        return (
                                                                            <div key={i} className="flex items-start gap-2">
                                                                                <Avatar className="h-6 w-6"><AvatarImage src={commentUser?.avatar} /><AvatarFallback>{commentUser?.name.charAt(0)}</AvatarFallback></Avatar>
                                                                                <div className="text-xs bg-background p-2 rounded-md w-full border">
                                                                                    <div className="flex justify-between items-baseline"><p className="font-semibold">{commentUser?.name}</p><p className="text-muted-foreground">{formatDistanceToNow(new Date(c.date), { addSuffix: true })}</p></div>
                                                                                    <p className="text-foreground/80 mt-1 whitespace-pre-wrap">{c.text}</p>
                                                                                </div>
                                                                            </div>
                                                                        )
                                                                    })}
                                                                </div>
                                                            </AccordionContent>
                                                        </AccordionItem>
                                                    </Accordion>
                                                )}

                                                {showNextStepForm === step.id ? (
                                                    <AddNextStepForm job={job} currentStep={step} onCancel={() => setShowNextStepForm(null)} onSave={() => setShowNextStepForm(null)} />
                                                ) : (
                                                    <div className="flex justify-end gap-2 mt-4">
                                                        {canPerformAction && (
                                                            <>
                                                                {step.status === 'Pending' && <Button size="sm" onClick={() => updateJobStepStatus(job.id, step.id, 'Acknowledged', 'Acknowledged step.')}>Acknowledge</Button>}
                                                                {step.status === 'Acknowledged' && <Button size="sm" onClick={() => setShowNextStepForm(step.id)}>Complete Step</Button>}
                                                                <Button variant="outline" size="sm" onClick={() => setReturningStep(step)}>Return Step</Button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter className="justify-between">
                    <div className="flex gap-2">
                        {user?.role === 'Admin' && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete JMS</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>This will permanently delete this JMS and all its steps. This action cannot be undone.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => {
                                            deleteJobProgress(job.id);
                                            setIsOpen(false);
                                        }}>Confirm Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                        {canReopenJob && (
                            <Button variant="outline" onClick={() => setIsReopenDialogOpen(true)}><Undo2 className="mr-2 h-4 w-4"/>Reopen Job</Button>
                        )}
                    </div>
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
        {returningStep && (
            <ReturnStepDialog
                isOpen={!!returningStep}
                setIsOpen={() => setReturningStep(null)}
                job={job}
                step={returningStep}
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

    
