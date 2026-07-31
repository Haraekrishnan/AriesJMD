
'use client';
import * as React from "react";
import { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/auth-provider';
import { useTask } from '@/contexts/task-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { 
  Calendar as CalendarIcon, 
  Send, 
  ThumbsUp, 
  ThumbsDown, 
  Trash2, 
  MessageSquare,
  Archive,
  History,
  Link as LinkIcon
} from 'lucide-react';
import type { Task, TaskStatus, Role } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

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

export default function EditTaskDialog({ isOpen, setIsOpen, task }: EditTaskDialogProps) {
  const { user, users } = useAuth();
  const { 
    tasks, updateTask, deleteTask, archiveTask, unarchiveTask,
    requestTaskStatusChange, approveTaskStatusChange, returnTaskStatusChange, 
    addComment, markTaskAsViewed 
  } = useTask();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState('');

  const taskToDisplay = useMemo(() => tasks.find(t => t.id === task.id) || task, [tasks, task]);

  const creator = useMemo(() => users.find(u => u.id === taskToDisplay.creatorId), [users, taskToDisplay.creatorId]);
  const assignees = useMemo(() => users.filter(u => taskToDisplay.assigneeIds?.includes(u.id)), [users, taskToDisplay.assigneeIds]);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
  });

  const isAdmin = user?.role === 'Admin';
  const isCreator = user?.id === taskToDisplay.creatorId;
  const isApprover = isCreator || isAdmin;
  const canEditCoreFields = (isCreator || isAdmin) && !taskToDisplay.isArchived;
  const isCompleted = taskToDisplay.status === 'Done';

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
    try {
      let commentText = newComment.trim();
      if (!commentText) {
          if (newStatus === 'In Progress') commentText = 'Task started.';
          else if (newStatus === 'Done') commentText = 'Task submitted for completion.';
      }
      await requestTaskStatusChange(taskToDisplay.id, newStatus, commentText);
      setNewComment('');
      if (newStatus !== 'In Progress') setIsOpen(false);
      toast({ title: 'Status Requested' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Update failed' });
    }
  };
  
  const handleApprovalAction = (action: 'approve' | 'return') => {
    if (!newComment.trim()) {
        toast({ variant: 'destructive', title: 'Comment required for feedback.' });
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
    updateTask({ ...taskToDisplay, ...data, dueDate: data.dueDate.toISOString() });
    toast({ title: 'Task Metadata Updated' });
    setIsOpen(false);
  };

  const handleDeleteTask = () => {
    deleteTask(taskToDisplay.id);
    setIsOpen(false);
  };

  const handleArchiveTask = () => {
    archiveTask(taskToDisplay.id);
    setIsOpen(false);
  };

  const handleRestoreTask = () => {
    unarchiveTask(taskToDisplay.id);
    setIsOpen(false);
  };

  const isAssignee = useMemo(() => user?.id && taskToDisplay.assigneeIds?.includes(user.id), [user, taskToDisplay]);
  const mySubtask = useMemo(() => user && taskToDisplay.subtasks?.[user.id], [user, taskToDisplay]);
  const commentsArray = useMemo(() => {
    const list = Array.isArray(taskToDisplay.comments) 
      ? taskToDisplay.comments 
      : Object.values(taskToDisplay.comments || {});
    return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [taskToDisplay.comments]);

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#64748B] mb-2 block">
      {children}
    </Label>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-4xl flex flex-col max-h-[98vh] p-0 overflow-hidden border-none shadow-2xl bg-white">
        <DialogHeader className="p-6 pb-2 bg-[#F8FAFC] border-b">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <DialogTitle className="text-lg font-black uppercase tracking-tight text-slate-900">
                TASK DETAILS: {taskToDisplay.title}
              </DialogTitle>
              <div className="flex items-center gap-2 text-xs text-[#64748B] font-medium">
                Assigned by <span className="font-bold text-slate-700">{creator?.name}</span> to <span className="font-bold text-slate-700">{assignees.map(a => a.name).join(', ')}</span>.
                <Badge variant="outline" className="font-mono text-[9px] font-bold px-2 py-0.5 bg-[#E9F0FE] text-[#2563EB] border-[#D1E1FF] rounded-md tracking-wider">
                  ID: {taskToDisplay.id}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-0 flex-1 overflow-hidden">
          {/* LEFT COLUMN */}
          <ScrollArea className="h-full border-r bg-white">
            <div className="p-6 space-y-6">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <SectionLabel>Title</SectionLabel>
                  <Input {...form.register('title')} disabled={!canEditCoreFields} className="font-bold text-xs h-9 border-[#E2E8F0] focus-visible:ring-primary/10" />
                </div>
                
                <div>
                  <SectionLabel>Description</SectionLabel>
                  <div className="p-3 text-xs min-h-[8rem] border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] whitespace-pre-wrap leading-relaxed">
                    {taskToDisplay.description}
                  </div>
                </div>

                <div>
                  <SectionLabel>Reference Link</SectionLabel>
                  {taskToDisplay.link ? (
                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-[#E2E8F0] bg-white text-[11px] font-medium">
                      <span className="truncate max-w-[200px] text-slate-500">{taskToDisplay.link}</span>
                      <Button asChild variant="link" size="sm" className="h-auto p-0 font-bold">
                        <a href={taskToDisplay.link} target="_blank" rel="noopener noreferrer">Open Link</a>
                      </Button>
                    </div>
                  ) : (
                    <p className="text-[11px] font-medium text-slate-400 italic px-1">No link provided.</p>
                  )}
                </div>

                <div>
                  <SectionLabel>Assignee Status</SectionLabel>
                  <div className="space-y-1.5 rounded-xl border border-[#E2E8F0] p-2 bg-[#F8FAFC]">
                    {assignees.map(assignee => {
                      const subtask = taskToDisplay.subtasks?.[assignee.id];
                      const isDone = subtask?.status === 'Done';
                      return (
                        <div key={assignee.id} className="flex justify-between items-center text-[10px] p-1.5 rounded-lg bg-white border border-[#E2E8F0] shadow-sm">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6 border-2 border-white shadow-sm">
                              <AvatarImage src={assignee.avatar} />
                              <AvatarFallback className="text-[7px] font-bold">{assignee.name[0]}</AvatarFallback>
                            </Avatar>
                            <span className="font-bold text-slate-700">{assignee.name}</span>
                          </div>
                          <Badge className={cn("text-[8px] font-black h-4 px-1.5 tracking-wider border-none", isDone ? "bg-[#10B981] text-white" : "bg-[#E2E8F0] text-[#64748B]")}>
                            {(subtask?.status || 'To Do').toUpperCase()}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <SectionLabel>Deadline</SectionLabel>
                    <div className="flex items-center gap-2 p-2 border border-[#E2E8F0] rounded-lg bg-white text-xs font-bold text-slate-700 h-9 shadow-sm">
                      <CalendarIcon className="h-3.5 w-3.5 text-[#94A3B8]" />
                      {format(new Date(taskToDisplay.dueDate), 'dd-MM-yyyy')}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Priority</SectionLabel>
                    <div className="h-9 border border-[#E2E8F0] rounded-lg bg-white flex items-center justify-center text-[10px] font-black uppercase tracking-widest shadow-sm">
                      {taskToDisplay.priority}
                    </div>
                  </div>
                </div>
                
                {canEditCoreFields && (
                  <Button type="submit" className="w-full h-11 font-black uppercase tracking-widest bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl shadow-lg shadow-blue-500/10 text-xs">
                    UPDATE TASK METADATA
                  </Button>
                )}
              </form>
            </div>
          </ScrollArea>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col h-full bg-[#F8FAFC]">
            <div className="p-6 flex-1 flex flex-col min-h-0">
              <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#64748B] flex items-center gap-2 mb-4">
                <MessageSquare className="h-4 w-4" /> INTERACTION & HISTORY
              </h3>
              
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-5">
                  {commentsArray.map((comment, index) => {
                    const author = users.find(u => u.id === comment.userId);
                    return (
                      <div key={index} className="flex items-start gap-3 group animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <Avatar className="h-8 w-8 border-2 border-white shadow-sm shrink-0">
                          <AvatarImage src={author?.avatar} />
                          <AvatarFallback className="font-bold text-xs">{author?.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex justify-between items-center px-1">
                            <p className="font-black text-[9px] uppercase text-[#2563EB] tracking-tight">{author?.name}</p>
                            <p className="text-[8px] font-bold text-slate-400 italic">
                              {formatDistanceToNow(new Date(comment.date), { addSuffix: true })}
                            </p>
                          </div>
                          <div className="bg-white p-2.5 rounded-2xl rounded-tl-none border border-[#E2E8F0] shadow-sm">
                            <p className="text-xs font-bold text-slate-700 leading-relaxed">
                              {comment.text}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {commentsArray.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center opacity-10 pt-20">
                      <MessageSquare className="h-12 w-12 mb-2" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">No activity logged</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="pt-4 mt-auto">
                {taskToDisplay.status === 'Pending Approval' && isApprover && (
                  <div className='grid grid-cols-2 gap-3 mb-4'>
                    <Button onClick={() => handleApprovalAction('approve')} className="bg-[#10B981] hover:bg-[#059669] font-black h-10 text-[10px] tracking-widest text-white">
                      <ThumbsUp className="mr-2 h-4 w-4" /> APPROVE TASK
                    </Button>
                    <Button onClick={() => handleApprovalAction('return')} className="bg-[#EF4444] hover:bg-[#DC2626] font-black h-10 text-[10px] tracking-widest text-white">
                      <ThumbsDown className="mr-2 h-4 w-4" /> RETURN
                    </Button>
                  </div>
                )}
                
                {isAssignee && !isCompleted && taskToDisplay.status !== 'Pending Approval' && !taskToDisplay.isArchived && (
                  <div className="mb-4">
                    <Button 
                      onClick={() => handleRequestStatusChange(mySubtask?.status === 'To Do' ? 'In Progress' : 'Done')} 
                      className="w-full h-11 font-black uppercase tracking-widest bg-[#2563EB] hover:bg-[#1D4ED8] shadow-lg shadow-blue-500/10 text-xs"
                    >
                      {mySubtask?.status === 'To Do' ? 'START TASK SESSION' : 'SUBMIT FOR COMPLETION'}
                    </Button>
                  </div>
                )}

                <div className="relative bg-white border border-[#E2E8F0] rounded-xl p-1.5 shadow-sm">
                  <Textarea 
                    value={newComment} 
                    onChange={(e) => setNewComment(e.target.value)} 
                    placeholder="Add a comment or status update..." 
                    className="min-h-[60px] pr-10 border-none focus-visible:ring-0 font-bold text-xs bg-transparent"
                  />
                  <Button 
                    size="icon" 
                    className="absolute right-2 bottom-2 h-7 w-7 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] shadow-md transition-transform active:scale-95" 
                    onClick={handleAddComment} 
                    disabled={!newComment.trim()}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-white border-t flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex gap-2 w-full sm:w-auto">
            {isAdmin && !taskToDisplay.isArchived && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-[#EF4444] font-black text-[9px] uppercase tracking-widest hover:bg-rose-50 px-2 h-8">
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> DELETE FOREVER
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Task Permanently?</AlertDialogTitle>
                    <AlertDialogDescription>This will remove all history and comments. This action cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteTask} className="bg-destructive text-white">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            
            {taskToDisplay.status === 'Done' && !taskToDisplay.isArchived && (
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-[#64748B] font-black text-[9px] uppercase tracking-widest hover:bg-slate-100 px-3 h-8"
                    onClick={handleArchiveTask}
                >
                    <Archive className="mr-1.5 h-3.5 w-3.5" /> MOVE TO ARCHIVE
                </Button>
            )}

            {taskToDisplay.isArchived && (isCreator || isAdmin) && (
                <Button 
                    variant="default" 
                    size="sm" 
                    className="bg-[#2563EB] hover:bg-[#1D4ED8] font-black text-[9px] uppercase tracking-widest h-8"
                    onClick={handleRestoreTask}
                >
                    <History className="mr-1.5 h-3.5 w-3.5" /> RESTORE TO BOARD
                </Button>
            )}
          </div>
          <Button variant="outline" onClick={() => setIsOpen(false)} className="font-black text-[9px] uppercase tracking-widest h-8 px-5 border-[#E2E8F0] text-slate-600 hover:bg-slate-50 w-full sm:w-auto">
            CLOSE DETAILS
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
