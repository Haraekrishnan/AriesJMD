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
        title: (taskToDisplay.title || ''),
        description: (taskToDisplay.description || ''),
        assigneeIds: taskToDisplay.assigneeIds || [],
        dueDate: taskToDisplay.dueDate ? new Date(taskToDisplay.dueDate) : new Date(),
        priority: taskToDisplay.priority || 'Medium',
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
    <Label className="text-xs font-black uppercase tracking-[0.2em] text-[#64748B] mb-2 block">
      {children}
    </Label>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-4xl flex flex-col max-h-[98vh] p-0 overflow-hidden border-none shadow-2xl bg-white rounded-2xl">
        <DialogHeader className="p-6 pb-5 bg-[#F8FAFC] border-b">
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900 leading-tight">
                {taskToDisplay.title}
              </DialogTitle>
              <div className="flex items-center gap-3 text-[11px] text-[#64748B] font-bold uppercase tracking-wide">
                <span className="flex items-center gap-1.5">BY <span className="font-black text-slate-800">{creator?.name}</span></span>
                <span className="text-slate-300">|</span>
                <Badge variant="outline" className="font-mono text-[10px] font-black px-2 py-0.5 bg-[#E9F0FE] text-[#2563EB] border-[#D1E1FF] rounded-sm tracking-wider">
                  ID: {taskToDisplay.id}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-0 flex-1 overflow-hidden">
          {/* LEFT COLUMN: Metadata */}
          <ScrollArea className="h-full border-r bg-white">
            <div className="p-6 space-y-8">
              <form id="task-metadata-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div>
                  <SectionLabel>Description</SectionLabel>
                  <div className="p-5 text-sm font-bold min-h-[9rem] border-2 border-[#F1F5F9] rounded-xl bg-[#F8FAFC] whitespace-pre-wrap leading-relaxed text-slate-800 shadow-inner">
                    {taskToDisplay.description}
                  </div>
                </div>

                <div>
                  <SectionLabel>Resource Attachments</SectionLabel>
                  {taskToDisplay.link ? (
                    <div className="flex items-center justify-between p-4 rounded-xl border-2 border-[#F1F5F9] bg-white text-sm font-black shadow-sm group hover:border-blue-200 transition-colors">
                      <span className="truncate max-w-[200px] text-slate-600">{taskToDisplay.link}</span>
                      <Button asChild variant="link" size="sm" className="h-auto p-0 font-black text-[#2563EB] hover:text-blue-800 uppercase text-[10px] tracking-widest">
                        <a href={taskToDisplay.link} target="_blank" rel="noopener noreferrer">OPEN LINK</a>
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs font-bold text-slate-400 italic px-1 uppercase tracking-widest opacity-60">No attachments provided.</p>
                  )}
                </div>

                <div>
                  <SectionLabel>Assignment Tracker</SectionLabel>
                  <div className="space-y-2 rounded-2xl border-2 border-[#F1F5F9] p-3 bg-[#F8FAFC]">
                    {assignees.map(assignee => {
                      const subtask = taskToDisplay.subtasks?.[assignee.id];
                      const isDone = subtask?.status === 'Done';
                      return (
                        <div key={assignee.id} className="flex justify-between items-center text-xs p-3 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border-2 border-white shadow-md ring-1 ring-slate-200">
                              <AvatarImage src={assignee.avatar} />
                              <AvatarFallback className="text-[10px] font-black">{assignee.name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <span className="font-black text-slate-900 tracking-tight">{assignee.name}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{assignee.role}</span>
                            </div>
                          </div>
                          <Badge className={cn("text-[10px] font-black h-5 px-2 tracking-wider border-none rounded-sm", isDone ? "bg-[#10B981] text-white" : "bg-[#E2E8F0] text-[#64748B]")}>
                            {(subtask?.status || 'To Do').toUpperCase()}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <SectionLabel>Target Deadline</SectionLabel>
                    <div className="flex items-center gap-3 p-3 border-2 border-[#F1F5F9] rounded-xl bg-white text-xs font-black text-slate-800 h-11 shadow-sm">
                      <CalendarIcon className="h-4 w-4 text-[#2563EB]" />
                      {taskToDisplay.dueDate ? format(parseISO(taskToDisplay.dueDate), 'dd MMMM yyyy') : 'NOT SET'}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Criticality</SectionLabel>
                    <div className="h-11 border-2 border-[#F1F5F9] rounded-xl bg-white flex items-center justify-center text-[10px] font-black uppercase tracking-[0.2em] shadow-sm">
                      <div className={cn("w-2 h-2 rounded-full mr-2", 
                        taskToDisplay.priority === 'High' ? "bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.5)]" : 
                        taskToDisplay.priority === 'Medium' ? "bg-orange-400" : "bg-emerald-400"
                      )} />
                      {taskToDisplay.priority}
                    </div>
                  </div>
                </div>
                
                {canEditCoreFields && (
                  <Button type="submit" form="task-metadata-form" className="w-full h-12 font-black uppercase tracking-[0.2em] bg-[#2563EB] hover:bg-[#1E40AF] rounded-xl shadow-lg shadow-blue-500/20 text-[11px] transition-all active:scale-[0.98]">
                    UPDATE TASK METADATA
                  </Button>
                )}
              </form>
            </div>
          </ScrollArea>

          {/* RIGHT COLUMN: Interaction */}
          <div className="flex flex-col h-full bg-[#F8FAFC]">
            <div className="p-6 flex-1 flex flex-col min-h-0">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#64748B] flex items-center gap-2 mb-6">
                <MessageSquare className="h-4 w-4" /> INTERACTION & LOGS
              </h3>
              
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-6">
                  {commentsArray.map((comment, index) => {
                    const author = users.find(u => u.id === comment.userId);
                    return (
                      <div key={index} className="flex items-start gap-3 group animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <Avatar className="h-9 w-9 border-2 border-white shadow-md shrink-0">
                          <AvatarImage src={author?.avatar} />
                          <AvatarFallback className="font-black text-xs">{author?.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex justify-between items-center px-1">
                            <p className="font-black text-[10px] uppercase text-[#2563EB] tracking-widest">{author?.name}</p>
                            <p className="text-[9px] font-bold text-slate-400 italic">
                              {formatDistanceToNow(new Date(comment.date), { addSuffix: true })}
                            </p>
                          </div>
                          <div className="bg-white p-4 rounded-2xl rounded-tl-none border-2 border-[#F1F5F9] shadow-sm">
                            <p className="text-sm font-bold text-slate-800 leading-relaxed">
                              {comment.text}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {commentsArray.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 pt-24 text-slate-400">
                      <MessageSquare className="h-14 w-14 mb-4" />
                      <p className="text-xs font-black uppercase tracking-[0.3em]">No activity logged</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="pt-6 mt-auto">
                {taskToDisplay.status === 'Pending Approval' && isApprover && (
                  <div className='grid grid-cols-2 gap-4 mb-5'>
                    <Button onClick={() => handleApprovalAction('approve')} className="bg-[#10B981] hover:bg-[#059669] font-black h-12 text-[10px] tracking-[0.2em] text-white rounded-xl shadow-lg shadow-emerald-500/10">
                      <ThumbsUp className="mr-2 h-4 w-4" /> APPROVE
                    </Button>
                    <Button onClick={() => handleApprovalAction('return')} className="bg-[#EF4444] hover:bg-[#DC2626] font-black h-12 text-[10px] tracking-[0.2em] text-white rounded-xl shadow-lg shadow-rose-500/10">
                      <ThumbsDown className="mr-2 h-4 w-4" /> RETURN
                    </Button>
                  </div>
                )}
                
                {isAssignee && !isCompleted && taskToDisplay.status !== 'Pending Approval' && !taskToDisplay.isArchived && (
                  <div className="mb-5">
                    <Button 
                      onClick={() => handleRequestStatusChange(mySubtask?.status === 'To Do' ? 'In Progress' : 'Done')} 
                      className="w-full h-12 font-black uppercase tracking-[0.2em] bg-[#2563EB] hover:bg-[#1E40AF] shadow-xl shadow-blue-500/20 text-[11px] rounded-xl transition-all active:scale-[0.98]"
                    >
                      {mySubtask?.status === 'To Do' ? 'INITIALIZE TASK SESSION' : 'SUBMIT WORK FOR APPROVAL'}
                    </Button>
                  </div>
                )}

                <div className="relative bg-white border-2 border-[#F1F5F9] rounded-2xl p-1.5 shadow-md focus-within:border-blue-200 transition-colors">
                  <Textarea 
                    value={newComment} 
                    onChange={(e) => setNewComment(e.target.value)} 
                    placeholder="Type update or comment..." 
                    className="min-h-[70px] pr-14 border-none focus-visible:ring-0 font-bold text-sm bg-transparent placeholder:text-slate-400"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                  />
                  <Button 
                    size="icon" 
                    className="absolute right-3 bottom-3 h-10 w-10 rounded-full bg-[#2563EB] hover:bg-[#1E40AF] shadow-lg transition-transform active:scale-90" 
                    onClick={handleAddComment} 
                    disabled={!newComment.trim()}
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-[#F8FAFC] border-t flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex gap-3 w-full sm:w-auto">
            {isAdmin && !taskToDisplay.isArchived && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-[#EF4444] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-rose-50 px-4 h-10 transition-colors">
                    <Trash2 className="mr-2 h-4 w-4" /> DELETE TASK
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-black uppercase tracking-tight">Delete Permanently?</AlertDialogTitle>
                    <AlertDialogDescription className="font-medium text-slate-500">
                      This action will wipe all history, comments, and attachments for this task. It cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="font-bold text-xs uppercase tracking-widest rounded-xl">KEEP TASK</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteTask} className="bg-destructive text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-red-700">DELETE FOREVER</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            
            {taskToDisplay.status === 'Done' && !taskToDisplay.isArchived && (
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-[#64748B] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-100 px-5 h-10 border-2 border-[#E2E8F0] rounded-xl bg-white"
                    onClick={handleArchiveTask}
                >
                    <Archive className="mr-2 h-4 w-4" /> MOVE TO ARCHIVE
                </Button>
            )}

            {taskToDisplay.isArchived && (isCreator || isAdmin) && (
                <Button 
                    variant="default" 
                    size="sm" 
                    className="bg-[#2563EB] hover:bg-[#1E40AF] font-black text-[10px] uppercase tracking-[0.2em] h-10 px-6 rounded-xl shadow-lg shadow-blue-500/20"
                    onClick={handleRestoreTask}
                >
                    <History className="mr-2 h-4 w-4" /> RESTORE TO ACTIVE BOARD
                </Button>
            )}
          </div>
          <Button variant="outline" onClick={() => setIsOpen(false)} className="font-black text-[10px] uppercase tracking-[0.2em] h-10 px-8 border-2 border-[#E2E8F0] text-slate-700 hover:bg-white bg-[#F8FAFC] w-full sm:w-auto shadow-sm rounded-xl">
            CLOSE INTERFACE
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
