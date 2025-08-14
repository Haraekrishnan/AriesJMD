
'use client';
import { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, startOfDay } from 'date-fns';
import { CalendarIcon, Send, ThumbsUp, ThumbsDown, Paperclip, Upload, X, BellRing, CheckCircle, Clock, UserRoundCog, Trash2, ArrowRight, Check, ChevronsUpDown } from 'lucide-react';
import type { Task, Priority, TaskStatus, Role, Comment, ApprovalState } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import Link from 'next/link';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  assigneeIds: z.array(z.string()).min(1, 'At least one assignee is required'),
  dueDate: z.date({ required_error: 'Due date is required' }),
  priority: z.enum(['Low', 'Medium', 'High']),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface EditTaskDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  task: Task;
}

export default function EditTaskDialog({ isOpen, setIsOpen, task }: EditTaskDialogProps) {
  const { user, users, tasks, updateTask, deleteTask, getAssignableUsers, requestTaskStatusChange, approveTaskStatusChange, returnTaskStatusChange, addComment, markTaskAsViewed, acknowledgeReturnedTask, requestTaskReassignment } = useAppContext();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);

  const taskToDisplay = useMemo(() => tasks.find(t => t.id === task.id) || task, [tasks, task]);

  const creator = useMemo(() => users.find(u => u.id === taskToDisplay.creatorId), [users, taskToDisplay.creatorId]);
  const assignees = useMemo(() => users.filter(u => taskToDisplay.assigneeIds?.includes(u.id)), [users, taskToDisplay.assigneeIds]);
  const pendingAssignee = useMemo(() => users.find(u => u.id === taskToDisplay.pendingAssigneeId), [users, taskToDisplay.pendingAssigneeId]);


  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
  });

  const isCompleted = taskToDisplay.status === 'Done';
  const isAdmin = user?.role === 'Admin';
  const isCreator = user?.id === taskToDisplay.creatorId;
  
  const canEditCoreFields = isCreator || isAdmin;
  const canEditDueDate = isCreator || isAdmin;
  const canReassign = (user?.role === 'Admin' || user?.role === 'Project Coordinator' || user?.role === 'Supervisor' || user?.role === 'HSE' || user?.role === 'Store in Charge') && (!isCompleted || isAdmin);
  
  const assignableUsers = useMemo(() => {
    return getAssignableUsers().map(u => ({value: u.id, label: u.name}));
  }, [getAssignableUsers]);

  useEffect(() => {
    if (taskToDisplay && isOpen) {
      form.reset({
        title: taskToDisplay.title,
        description: taskToDisplay.description,
        assigneeIds: taskToDisplay.assigneeIds || [],
        dueDate: new Date(taskToDisplay.dueDate),
        priority: taskToDisplay.priority,
      });
      setNewComment('');
      setAttachment(null);
      markTaskAsViewed(taskToDisplay.id);
    }
  }, [taskToDisplay, form, isOpen, markTaskAsViewed]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0]);
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !user) return;
    addComment(taskToDisplay.id, newComment);
    setNewComment('');
  };
  
  const handleRequestStatusChange = (newStatus: TaskStatus) => {
    if (!newComment.trim()) {
      toast({ variant: 'destructive', title: 'Comment required', description: 'Please add a comment before changing the status.' });
      return;
    }

    if (newStatus === 'Completed' && taskToDisplay.requiresAttachmentForCompletion && !attachment && !taskToDisplay.attachment) {
      toast({ variant: 'destructive', title: 'Attachment required', description: 'This task requires a file attachment for completion.' });
      return;
    }

    let fileData: Task['attachment'] | undefined = undefined;
    if (attachment) {
        const reader = new FileReader();
        reader.onload = (e) => {
            fileData = {
                name: attachment.name,
                url: e.target?.result as string,
            };
            requestTaskStatusChange(taskToDisplay.id, newStatus, newComment, fileData);
            setNewComment('');
            if (setIsOpen) setIsOpen(false);
        };
        reader.readAsDataURL(attachment);
    } else {
        requestTaskStatusChange(taskToDisplay.id, newStatus, newComment);
        setNewComment('');
        if (setIsOpen) setIsOpen(false);
    }
    toast({ title: 'Status Change Requested', description: 'Your request has been sent for approval.' });
  };
  
  const handleApprovalAction = (action: 'approve' | 'return') => {
    if (!newComment.trim()) {
        toast({ variant: 'destructive', title: 'Comment required', description: 'Please provide a comment for your decision.' });
        return;
    }
    if (action === 'approve') {
        approveTaskStatusChange(taskToDisplay.id, newComment);
        // Toast is handled in the context provider
    } else {
        returnTaskStatusChange(taskToDisplay.id, newComment);
        toast({ title: 'Request Returned', description: 'The task has been returned to the assignee.' });
    }
    setNewComment('');
    if (setIsOpen) setIsOpen(false);
  };

  const onSubmit = (data: TaskFormValues) => {
    if (!user) return;
    
    const hasAssigneeChanged = JSON.stringify(data.assigneeIds.sort()) !== JSON.stringify(taskToDisplay.assigneeIds.sort());

    if (hasAssigneeChanged) {
        if (!newComment.trim()) {
            toast({ variant: 'destructive', title: 'Comment Required', description: 'A comment is required when reassigning a task.' });
            return;
        }

        const newAssigneeId = data.assigneeIds[0];
        const newAssignee = users.find(u => u.id === newAssigneeId);
        if (!newAssignee) return;
        
        requestTaskReassignment(task.id, newAssigneeId, newComment);
        toast({ title: 'Reassignment Requested', description: 'Your request has been sent for approval.' });

    } else { 
        const updatedData: Partial<Task> = {
            ...data,
            dueDate: data.dueDate.toISOString(),
        };

        if (isAdmin && isCompleted) {
            updatedData.status = 'To Do';
            updatedData.completionDate = undefined;
            updatedData.approvalState = 'none';
        }
        updateTask({ ...taskToDisplay, ...updatedData });
        toast({ title: 'Task Updated', description: `"${data.title}" has been successfully updated.` });
    }
    
    setNewComment('');
    if (setIsOpen) setIsOpen(false);
  };

  const handleDeleteTask = () => {
    deleteTask(taskToDisplay.id);
    if (setIsOpen) setIsOpen(false);
  };
  
  const isApprover = useMemo(() => {
    if (!user) return false;
    return user.id === taskToDisplay.approverId;
  }, [user, taskToDisplay]);


  const isAssignee = useMemo(() => user?.id && taskToDisplay.assigneeIds?.includes(user.id), [user, taskToDisplay]);

  const renderActionButtons = () => {
    if (taskToDisplay.status === 'Pending Approval') {
        if (isApprover) {
            return (
                <div className='flex gap-2'>
                    <Button onClick={() => handleApprovalAction('approve')} className="w-full bg-green-600 hover:bg-green-700"><ThumbsUp className="mr-2 h-4 w-4" /> Approve</Button>
                    <Button onClick={() => handleApprovalAction('return')} className="w-full" variant="destructive"><ThumbsDown className="mr-2 h-4 w-4" /> Return</Button>
                </div>
            )
        }
        return <p className='text-sm text-center text-muted-foreground p-2 bg-muted rounded-md'>Awaiting approval from {users.find(u => u.id === taskToDisplay.approverId)?.name || 'manager'}</p>
    }
    if (isAssignee && !isCompleted) {
        if (taskToDisplay.status === 'To Do') {
            return <Button onClick={() => handleRequestStatusChange('In Progress')} className="w-full">Start Progress</Button>
        }
        if (taskToDisplay.status === 'In Progress') {
            return <Button onClick={() => handleRequestStatusChange('Completed')} className="w-full">Request Completion</Button>
        }
    }
    return null;
  }

  const Wrapper = isOpen ? DialogContent : 'div';
  const wrapperProps = isOpen ? { className: "sm:max-w-4xl grid-rows-[auto,1fr,auto]" } : {};
  
  const commentsArray = Array.isArray(taskToDisplay.comments) 
    ? taskToDisplay.comments 
    : Object.values(taskToDisplay.comments || {});

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Wrapper {...wrapperProps}>
        <DialogHeader>
          <DialogTitle>Task Details: {taskToDisplay.title}</DialogTitle>
          <DialogDescription>
            Assigned by <span className='font-semibold'>{creator?.name}</span> to <span className='font-semibold'>{assignees.map(a => a.name).join(', ')}</span>.
          </DialogDescription>
          {taskToDisplay.status === 'Pending Approval' && taskToDisplay.pendingStatus && (
             <Alert variant="default" className="mt-2 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700">
                <BellRing className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertTitle className="text-blue-800 dark:text-blue-300">Status Change Request</AlertTitle>
                <AlertDescription className="text-blue-700 dark:text-blue-400">
                    {assignees.map(a => a.name).join(', ')} requests to change status from <Badge variant="secondary">{taskToDisplay.previousStatus}</Badge> <ArrowRight className="inline-block h-4 w-4 mx-1" /> <Badge variant="secondary">{taskToDisplay.pendingStatus}</Badge>. Please review comments.
                </AlertDescription>
            </Alert>
          )}
           {taskToDisplay.status === 'Pending Approval' && taskToDisplay.pendingAssigneeId && (
            <Alert variant="default" className="mt-2 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700">
                <UserRoundCog className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertTitle className="text-blue-800 dark:text-blue-300">Reassignment Request</AlertTitle>
                <AlertDescription className="text-blue-700 dark:text-blue-400">
                   Request to reassign task to <span className='font-semibold'>{pendingAssignee?.name}</span>. Please review comments and approve or return.
                </AlertDescription>
            </Alert>
          )}
           {isAssignee && taskToDisplay.approvalState === 'returned' && (
            <Alert variant="destructive" className="mt-2">
                <BellRing className="h-4 w-4" />
                <AlertTitle>Task Returned</AlertTitle>
                <AlertDescription>
                  This task was returned by the approver. Please see comments for details and resubmit.
                </AlertDescription>
            </Alert>
          )}
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-8 py-4 overflow-y-auto max-h-[70vh]">
            <div className="space-y-4 pr-4 border-r">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input {...form.register('title')} placeholder="Task title" disabled={!canEditCoreFields} />
                </div>
                
                <div>
                  <Label>Description</Label>
                  <Textarea {...form.register('description')} placeholder="Task description" rows={3} disabled={!canEditCoreFields}/>
                </div>

                <div>
                  <Label>Assignee(s)</Label>
                    <Controller
                        control={form.control}
                        name="assigneeIds"
                        render={({ field }) => (
                            <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-start h-auto min-h-10" disabled={!canReassign}>
                                <div className="flex flex-wrap gap-1">
                                    {field.value.length > 0 ? (
                                    field.value.map(id => {
                                        const user = assignableUsers.find(u => u.value === id);
                                        return <Badge key={id} variant="secondary">{user?.label}</Badge>
                                    })
                                    ) : (
                                    <span className="text-muted-foreground">Select assignees...</span>
                                    )}
                                </div>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                <CommandInput placeholder="Search users..." />
                                <CommandList>
                                    <CommandEmpty>No users found.</CommandEmpty>
                                    <CommandGroup>
                                    {assignableUsers.map(option => {
                                        const isSelected = field.value.includes(option.value);
                                        return (
                                        <CommandItem
                                            key={option.value}
                                            onSelect={() => {
                                            if (isSelected) {
                                                field.onChange(field.value.filter(id => id !== option.value));
                                            } else {
                                                field.onChange([...field.value, option.value]);
                                            }
                                            }}
                                        >
                                            <Check className={`mr-2 h-4 w-4 ${isSelected ? "opacity-100" : "opacity-0"}`} />
                                            {option.label}
                                        </CommandItem>
                                        );
                                    })}
                                    </CommandGroup>
                                </CommandList>
                                </Command>
                            </PopoverContent>
                            </Popover>
                        )}
                    />
                     {form.formState.errors.assigneeIds && <p className="text-xs text-destructive">{form.formState.errors.assigneeIds.message}</p>}
                </div>
                
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <Label>Due Date</Label>
                    <Controller control={form.control} name="dueDate"
                        render={({ field }) => (
                        <Popover>
                            <PopoverTrigger asChild disabled={!canEditDueDate}>
                            <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, 'dd-MM-yyyy') : <span>Pick a date</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                        </Popover>
                        )}
                    />
                  </div>

                  <div>
                    <Label>Priority</Label>
                    <Controller control={form.control} name="priority"
                        render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value} disabled={!canEditCoreFields}>
                            <SelectTrigger><SelectValue placeholder="Set priority" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Low">Low</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="High">High</SelectItem>
                            </SelectContent>
                        </Select>
                        )}
                    />
                  </div>
                </div>

                {taskToDisplay.completionDate && (
                    <div>
                        <Label>Completion Date</Label>
                        <div className="flex items-center gap-2 text-sm p-2 border rounded-md bg-muted">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span>{format(new Date(taskToDisplay.completionDate), 'dd-MM-yyyy, p')}</span>
                        </div>
                    </div>
                )}
                
                { (canEditCoreFields || canReassign) && <Button type="submit" className="w-full">Save Changes</Button> }
              </form>
            </div>

            <div className="flex flex-col gap-4">
                <h3 className="text-lg font-semibold">Comments & Activity</h3>
                <ScrollArea className="flex-1 h-64 pr-4 border-b">
                    <div className="space-y-4">
                        {commentsArray.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((comment, index) => {
                            const commentUser = users.find(u => u.id === comment.userId);
                            return (
                                <div key={index} className={cn("flex items-start gap-3")}>
                                    <Avatar className="h-8 w-8"><AvatarImage src={commentUser?.avatar} /><AvatarFallback>{commentUser?.name.charAt(0)}</AvatarFallback></Avatar>
                                    <div className="bg-muted p-3 rounded-lg w-full">
                                        <div className="flex justify-between items-center"><p className="font-semibold text-sm">{commentUser?.name}</p><p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(comment.date), { addSuffix: true })}</p></div>
                                        <p className="text-sm text-foreground/80 mt-1">{comment.text}</p>
                                    </div>
                                </div>
                            )
                        })}
                        {commentsArray.length === 0 && <p className="text-sm text-center text-muted-foreground py-4">No comments yet.</p>}
                    </div>
                </ScrollArea>
                {taskToDisplay.attachment && (
                  <div>
                    <Label>Attachment</Label>
                    <div className="mt-1 flex items-center justify-between p-2 rounded-md border text-sm">
                        <Link href={taskToDisplay.attachment.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline">
                            <Paperclip className="h-4 w-4"/><span>{taskToDisplay.attachment.name}</span>
                        </Link>
                    </div>
                  </div>
                )}
                {taskToDisplay.requiresAttachmentForCompletion && isAssignee && taskToDisplay.status === 'In Progress' && (
                  <div>
                    <Label>Attachment for Completion</Label>
                    {!attachment && !taskToDisplay.attachment &&
                      <div className="relative mt-1">
                        <Button asChild variant="outline" size="sm"><Label htmlFor="file-upload"><Upload className="mr-2"/>Upload File</Label></Button>
                        <Input id="file-upload" type="file" onChange={handleFileChange} className="hidden"/>
                      </div>
                    }
                    {attachment && (
                      <div className="mt-1 flex items-center justify-between p-2 rounded-md border text-sm">
                          <div className="flex items-center gap-2"><Paperclip className="h-4 w-4"/><span>{attachment.name}</span></div>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAttachment(null)}><X className="h-4 w-4"/></Button>
                      </div>
                    )}
                  </div>
                )}
                 <div className="relative">
                    <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment... (required for status changes)" className="pr-12"/>
                    <Button type="button" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8" onClick={handleAddComment} disabled={!newComment.trim()}><Send className="h-4 w-4" /></Button>
                </div>
                {renderActionButtons()}
            </div>
        </div>
        <DialogFooter className="justify-between">
            <div>
              {isAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete Task</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>This action cannot be undone. This will permanently delete the task "{taskToDisplay.title}".</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteTask}>Delete Task</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </Wrapper>
    </Dialog>
  );
}
