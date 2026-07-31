'use client';
import * as React from "react";
import { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { 
  CalendarIcon, 
  Send, 
  ThumbsUp, 
  ThumbsDown, 
  Paperclip, 
  Upload, 
  X, 
  CheckCircle, 
  Clock, 
  UserRoundCog, 
  Trash2, 
  ArrowRight, 
  Check, 
  ChevronsUpDown, 
  Download, 
  Archive, 
  MessageSquare, 
  Undo2 
} from 'lucide-react';
import type { Task, TaskStatus, Role, Comment, ApprovalState, Subtask } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { uploadFile } from '@/lib/storage';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  assigneeIds: z.array(z.string()).min(1, 'Please select at least one assignee'),
  dueDate: z.date({ required_error: 'Due date is required' }),
  priority: z.enum(['Low', 'Medium', 'High']),
  link: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface EditTaskDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  task: Task;
}

const urlRegex = /(https?:\/\/[^\s]+)/g;

const LinkifiedText = ({ text }: { text: string }) => {
  if (!text) return null;
  const parts = text.split(urlRegex);
  return (
    <>
      {parts.map((part, index) =>
        urlRegex.test(part) ? (
          <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
            {part}
          </a>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        )
      )}
    </>
  );
};

export default function EditTaskDialog({ isOpen, setIsOpen, task }: EditTaskDialogProps) {
  const { 
    user, users, tasks, updateTask, deleteTask, archiveTask, unarchiveTask, 
    requestTaskStatusChange, approveTaskStatusChange, returnTaskStatusChange, 
    addComment, markTaskAsViewed, requestTaskReassignment 
  } = useAppContext();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);

  const taskToDisplay = useMemo(() => tasks.find(t => t.id === task.id) || task, [tasks, task]);

  const creator = useMemo(() => users.find(u => u.id === taskToDisplay.creatorId), [users, taskToDisplay.creatorId]);
  const assignees = useMemo(() => users.filter(u => taskToDisplay.assigneeIds?.includes(u.id)), [users, taskToDisplay.assigneeIds]);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
  });

  const isCompleted = taskToDisplay.status === 'Done';
  const isArchived = !!taskToDisplay.isArchived;
  const isAdmin = user?.role === 'Admin';
  const isCreator = user?.id === taskToDisplay.creatorId;
  const isApprover = isCreator || isAdmin;
  
  const canEditCoreFields = (isCreator || isAdmin) && !isArchived;

  useEffect(() => {
    if (taskToDisplay && isOpen) {
      form.reset({
        title: taskToDisplay.title,
        description: taskToDisplay.description,
        assigneeIds: taskToDisplay.assigneeIds || [],
        dueDate: new Date(taskToDisplay.dueDate),
        priority: taskToDisplay.priority,
        link: taskToDisplay.link || '',
      });
      setNewComment('');
      setAttachment(null);
      markTaskAsViewed(taskToDisplay.id);
    }
  }, [taskToDisplay, form, isOpen, markTaskAsViewed]);

  const handleAddComment = () => {
    if (!newComment.trim() || !user) return;
    addComment(taskToDisplay.id, newComment);
    setNewComment('');
  };
  
  const handleRequestStatusChange = async (newStatus: TaskStatus) => {
    if (!user) return;
  
    const hasNewAttachment = !!attachment;
  
    let uploadedAttachment: { name: string; url: string } | undefined = undefined;
  
    try {
      if (hasNewAttachment) {
        toast({ title: 'Uploading file...', description: `Uploading ${attachment.name}.` });
        const url = await uploadFile(attachment, `tasks/${taskToDisplay.id}/${attachment.name}`);
        uploadedAttachment = { name: attachment.name, url };
        toast({ title: 'Upload Successful' });
      }
  
      let commentText = newComment.trim();
      if (!commentText) {
          if (newStatus === 'In Progress') commentText = 'Task session started.';
          else if (newStatus === 'Done') commentText = 'Task submitted for completion.';
      }
  
      await requestTaskStatusChange(taskToDisplay.id, newStatus, commentText, uploadedAttachment || taskToDisplay.attachment || undefined);
  
      setAttachment(null);
      setNewComment('');
      if (newStatus !== 'In Progress') setIsOpen(false);
  
      toast({ title: 'Status Requested', description: `Task submission logged as "${newStatus}".` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Update failed', description: 'Could not update task status.' });
    }
  };
  
  const handleApprovalAction = (action: 'approve' | 'return') => {
    if (!newComment.trim()) {
        toast({ variant: 'destructive', title: 'Comment required', description: 'Please provide feedback for the assignee.' });
        return;
    }
    if (action === 'approve') {
        approveTaskStatusChange(taskToDisplay.id, newComment);
        toast({ title: 'Task Approved' });
    } else {
        returnTaskStatusChange(taskToDisplay.id, newComment);
        toast({ title: 'Task Returned' });
    }
    setNewComment('');
    setIsOpen(false);
  };

  const onSubmit = (data: TaskFormValues) => {
    if (!user) return;
    updateTask({ ...taskToDisplay, ...data, dueDate: data.dueDate.toISOString() });
    toast({ title: 'Task Metadata Updated' });
    setIsOpen(false);
  };

  const handleManualArchive = () => {
    archiveTask(taskToDisplay.id);
    toast({ title: 'Task Moved to Archive' });
    setIsOpen(false);
  };

  const handleBringBack = () => {
    unarchiveTask(taskToDisplay.id);
    toast({ title: 'Task Restored', description: 'Moved back to active board.' });
    setIsOpen(false);
  };

  const handleDeleteTask = () => {
    deleteTask(taskToDisplay.id);
    setIsOpen(false);
  };

  const isAssignee = useMemo(() => user?.id && taskToDisplay.assigneeIds?.includes(user.id), [user, taskToDisplay]);
  const mySubtask = useMemo(() => user && taskToDisplay.subtasks?.[user.id], [user, taskToDisplay]);

  const commentsArray = Array.isArray(taskToDisplay.comments) 
    ? taskToDisplay.comments 
    : Object.values(taskToDisplay.comments || {});

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-4xl flex flex-col max-h-[95vh] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 pb-2 bg-muted/10 border-b">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-black uppercase tracking-tight">Task Details: {taskToDisplay.title}</DialogTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                  Assigned by <span className="font-bold text-foreground">{creator?.name}</span> to <span className="font-bold text-foreground">{assignees.map(a => a.name).join(', ')}</span>.
                  <Badge variant="outline" className="font-mono text-[10px] font-black tracking-widest text-primary border-primary/20 bg-primary/5">
                    ID: {taskToDisplay.id.toUpperCase()}
                  </Badge>
              </div>
            </div>
            {isArchived && <Badge variant="secondary" className="font-black uppercase tracking-widest bg-orange-100 text-orange-700">ARCHIVED</Badge>}
          </div>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-0 flex-1 overflow-hidden">
            {/* LEFT COLUMN: METADATA */}
            <ScrollArea className="h-full border-r">
                <div className="p-6 space-y-6">
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Title</Label>
                      <Input {...form.register('title')} disabled={!canEditCoreFields} className="font-bold text-lg h-11 focus-visible:ring-primary/20" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Description</Label>
                      <div className="p-4 text-sm min-h-[8rem] border-2 rounded-xl bg-slate-50 dark:bg-slate-900/40 whitespace-pre-wrap leading-relaxed shadow-inner">
                          <LinkifiedText text={taskToDisplay.description} />
                      </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Attachment</Label>
                        {taskToDisplay.link ? (
                             <div className="flex items-center justify-between p-3 rounded-xl border-2 bg-muted/20">
                                <span className="text-xs font-bold truncate max-w-[200px]">{taskToDisplay.link}</span>
                                <Button asChild variant="ghost" size="sm" className="h-8 font-bold text-primary">
                                    <a href={taskToDisplay.link} target="_blank" rel="noopener noreferrer">
                                        <Download className="mr-2 h-4 w-4" /> Open
                                    </a>
                                </Button>
                            </div>
                        ) : <p className="text-xs font-bold text-muted-foreground italic px-2">No attachment provided.</p>}
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Assignee Status</Label>
                        <div className="space-y-2 rounded-xl border-2 p-3 bg-slate-50/50">
                          {assignees.map(assignee => {
                            const subtask = taskToDisplay.subtasks?.[assignee.id];
                            return (
                              <div key={assignee.id} className="flex justify-between items-center text-xs p-2 rounded-lg bg-background border shadow-sm">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-7 w-7 border">
                                    <AvatarImage src={assignee.avatar} />
                                    <AvatarFallback className="text-[10px] font-bold">{assignee.name[0]}</AvatarFallback>
                                  </Avatar>
                                  <span className="font-bold">{assignee.name}</span>
                                </div>
                                <Badge className={cn("text-[10px] font-black h-5 px-2", subtask?.status === 'Done' ? "bg-emerald-500" : "bg-slate-200 text-slate-600")}>
                                    {(subtask?.status || 'To Do').toUpperCase()}
                                </Badge>
                              </div>
                            )
                          })}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Due Date</Label>
                        <div className="flex items-center gap-2 p-3 border-2 rounded-xl bg-white shadow-sm">
                            <CalendarIcon className="h-4 w-4 text-slate-400" />
                            <span className="text-sm font-bold">{format(new Date(taskToDisplay.dueDate), 'dd-MM-yyyy')}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Priority</Label>
                        <Badge variant="outline" className="h-10 w-full justify-center text-xs font-black uppercase tracking-widest border-2">
                            {taskToDisplay.priority}
                        </Badge>
                      </div>
                    </div>

                    {taskToDisplay.completionDate && (
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Completion Date</Label>
                            <div className="flex items-center gap-3 p-3 border-2 border-emerald-100 rounded-xl bg-emerald-50/50">
                                <CheckCircle className="h-5 w-5 text-emerald-500" />
                                <span className="text-sm font-black text-emerald-700">{format(new Date(taskToDisplay.completionDate), 'dd-MM-yyyy, p')}</span>
                            </div>
                        </div>
                    )}
                    
                    {canEditCoreFields && <Button type="submit" className="w-full h-11 font-black uppercase tracking-widest shadow-lg shadow-primary/20">Update Task Metadata</Button>}
                  </form>
                </div>
            </ScrollArea>

            {/* RIGHT COLUMN: CHAT */}
            <div className="flex flex-col h-full bg-slate-50/30 dark:bg-slate-900/10">
                <div className="p-6 flex-1 flex flex-col min-h-0">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2 mb-4">
                        <MessageSquare className="h-4 w-4" /> Interaction & History
                    </h3>
                    <ScrollArea className="flex-1 pr-4">
                        <div className="space-y-6">
                            {commentsArray.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((comment, index) => {
                                const commentUser = users.find(u => u.id === comment.userId);
                                return (
                                    <div key={index} className="flex items-start gap-3 group animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <Avatar className="h-9 w-9 border shadow-sm shrink-0">
                                            <AvatarImage src={commentUser?.avatar} />
                                            <AvatarFallback className="font-bold">{commentUser?.name[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="space-y-1.5 flex-1 min-w-0">
                                            <div className="flex justify-between items-center px-1">
                                                <p className="font-black text-[10px] uppercase text-blue-600 tracking-tight">{commentUser?.name}</p>
                                                <p className="text-[9px] font-bold text-slate-400 italic">{formatDistanceToNow(new Date(comment.date), { addSuffix: true })}</p>
                                            </div>
                                            <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none border-2 shadow-sm">
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed">
                                                    <LinkifiedText text={comment.text} />
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                            {commentsArray.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center opacity-20 pt-20">
                                    <MessageSquare className="h-12 w-12 mb-2" />
                                    <p className="text-xs font-black uppercase tracking-widest">No activity logged yet</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    <div className="pt-6 mt-auto">
                        {taskToDisplay.status === 'Pending Approval' && isApprover && (
                            <div className='grid grid-cols-2 gap-3 mb-4'>
                                <Button onClick={() => handleApprovalAction('approve')} className="bg-emerald-600 hover:bg-emerald-700 font-black h-11 text-[11px] tracking-widest"><ThumbsUp className="mr-2 h-4 w-4" /> APPROVE TASK</Button>
                                <Button onClick={() => handleApprovalAction('return')} variant="destructive" className="font-black h-11 text-[11px] tracking-widest"><ThumbsDown className="mr-2 h-4 w-4" /> RETURN TO ASSIGNEE</Button>
                            </div>
                        )}
                        
                        {!isArchived && isAssignee && !isCompleted && taskToDisplay.status !== 'Pending Approval' && (
                             <div className="mb-4">
                                <Button 
                                    onClick={() => handleRequestStatusChange(mySubtask?.status === 'To Do' ? 'In Progress' : 'Done')} 
                                    className="w-full h-11 font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                                >
                                    {mySubtask?.status === 'To Do' ? 'START TASK SESSION' : 'SUBMIT FOR COMPLETION'}
                                </Button>
                             </div>
                        )}

                        <div className="relative">
                            <Textarea 
                                value={newComment} 
                                onChange={(e) => setNewComment(e.target.value)} 
                                placeholder="Add a comment or status update..." 
                                className="min-h-[100px] pr-12 rounded-2xl border-2 focus-visible:ring-primary/20 font-bold text-sm"
                                disabled={isArchived && !isAdmin}
                            />
                            <Button 
                                type="button" 
                                size="icon" 
                                className="absolute right-3 bottom-3 h-9 w-9 bg-primary shadow-md hover:scale-105 transition-transform" 
                                onClick={handleAddComment} 
                                disabled={!newComment.trim()}
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <DialogFooter className="p-4 bg-muted/20 border-t flex justify-between items-center gap-4">
            <div className="flex gap-2">
              {isAdmin && !isArchived && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive font-black text-[10px] uppercase tracking-widest hover:bg-destructive/10">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Forever
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Task Permanently?</AlertDialogTitle>
                      <AlertDialogDescription>This action cannot be undone. All history and comments will be lost.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteTask} className="bg-destructive text-white">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              
              {isCompleted && !isArchived && (isCreator || isAdmin) && (
                  <Button variant="outline" size="sm" onClick={handleManualArchive} className="font-black text-[10px] uppercase tracking-widest border-2">
                      <Archive className="mr-2 h-3.5 w-3.5" /> Move to Archive
                  </Button>
              )}

              {isArchived && (isCreator || isAdmin) && (
                  <Button variant="outline" size="sm" onClick={handleBringBack} className="font-black text-[10px] uppercase tracking-widest border-2 border-primary text-primary">
                      <Undo2 className="mr-2 h-3.5 w-3.5" /> Bring Back (Reopen)
                  </Button>
              )}
            </div>
            <Button variant="secondary" onClick={() => setIsOpen(false)} className="font-black text-[10px] uppercase tracking-widest h-9 px-6">Close Details</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
