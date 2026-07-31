
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
  Bell,
  Send, 
  ThumbsUp, 
  ThumbsDown, 
  Trash2, 
  MessageSquare,
  History,
  User,
  Users
} from 'lucide-react';
import type { Task, TaskStatus, Role } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { DatePickerInput } from "../ui/date-picker-input";

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
    tasks, updateTask, deleteTask,
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
  const isCompleted = taskToDisplay.status === 'Done' || taskToDisplay.status === 'Completed';

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
          else if (newStatus === 'Done') commentText = 'Task completed.';
      }
      await requestTaskStatusChange(taskToDisplay.id, newStatus, commentText);
      setNewComment('');
      toast({ title: 'Task Updated' });
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
    toast({ title: 'Task Updated' });
  };

  const handleDeleteTask = () => {
    deleteTask(taskToDisplay.id);
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-4xl flex flex-col max-h-[95vh] p-0 overflow-hidden bg-[#F1F3F9]">
        <DialogHeader className="p-6 pb-2 bg-white border-b relative">
          <DialogTitle className="text-xl font-bold text-slate-800">
            Task Details: {taskToDisplay.title}
          </DialogTitle>
          <DialogDescription className="text-xs font-medium text-slate-400 mt-1">
            Assigned by <span className="font-bold text-slate-600">{creator?.name}</span> to <span className="font-bold text-slate-600">{assignees.map(a => a.name).join(', ')}</span>.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 pt-4">
            {/* Approval Banner */}
            {taskToDisplay.status === 'Pending Approval' && (
              <div className="bg-[#EBF5FF] border border-[#D1E9FF] rounded-lg p-4 mb-6 flex items-start gap-3 shadow-sm">
                <div className="text-[#2563EB] mt-1"><Bell className="h-5 w-5" /></div>
                <div>
                    <h4 className="font-bold text-[#1E40AF] text-sm leading-none">Approval Pending</h4>
                    <p className="text-xs text-[#2563EB] mt-1 font-medium">This task is awaiting final approval from the creator.</p>
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-10">
              {/* Left Column: Task Meta */}
              <form id="task-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700">Title</Label>
                  <Input {...form.register('title')} className="bg-white border-slate-300 font-medium" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700">Description</Label>
                  <Textarea {...form.register('description')} rows={4} className="bg-white border-slate-300 font-medium min-h-[120px]" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700">Attachment</Label>
                  <Input {...form.register('link')} placeholder="None" className="bg-white border-slate-300" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700">Assignee(s)</Label>
                  <div className="p-2 border border-slate-300 rounded-md min-h-[42px] flex flex-wrap gap-2 bg-[#F8FAFC]">
                    {assignees.map(a => (
                      <Badge key={a.id} variant="secondary" className="h-6 px-3 bg-slate-200 text-slate-700 border-none rounded-sm font-bold text-[11px]">
                        {a.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700">Assignee Status</Label>
                  <div className="space-y-2">
                    {assignees.map(a => {
                      const sub = taskToDisplay.subtasks?.[a.id];
                      const status = sub?.status || 'To Do';
                      return (
                        <div key={a.id} className="flex justify-between items-center p-2.5 border border-slate-300 rounded-md bg-white shadow-sm">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border-2 border-slate-100">
                                <AvatarImage src={a.avatar} />
                                <AvatarFallback>{a.name[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-bold text-slate-700">{a.name}</span>
                          </div>
                          <Badge className={cn(
                              "h-6 px-3 rounded-full text-[11px] font-black tracking-tight",
                              status === 'Done' ? "bg-[#10B981] hover:bg-[#10B981] text-white" : "bg-slate-100 text-slate-500"
                          )}>
                            {status.toUpperCase()}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-slate-700">Due Date</Label>
                    <Controller
                      name="dueDate"
                      control={form.control}
                      render={({ field }) => (
                        <DatePickerInput value={field.value} onChange={field.onChange} />
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-slate-700">Priority</Label>
                    <Controller
                      name="priority"
                      control={form.control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="bg-white border-slate-300"><SelectValue /></SelectTrigger>
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

                <Button type="submit" className="w-full bg-[#2563EB] hover:bg-blue-700 text-white font-bold h-11 rounded-lg shadow-lg shadow-blue-500/10">
                  Save Changes
                </Button>
              </form>

              {/* Right Column: Feed */}
              <div className="flex flex-col h-full">
                <h3 className="font-bold text-lg text-slate-800 mb-5">Comments & Activity</h3>
                <ScrollArea className="flex-1 pr-4 min-h-[300px]">
                  <div className="space-y-6">
                    {commentsArray.map(c => {
                      const author = users.find(u => u.id === c.userId);
                      return (
                        <div key={c.id} className="flex gap-4 group">
                          <Avatar className="h-10 w-10 border-2 border-white shadow-sm shrink-0">
                            <AvatarImage src={author?.avatar} />
                            <AvatarFallback>{author?.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 bg-white p-4 rounded-xl shadow-sm border border-slate-100 relative">
                            <div className="flex justify-between items-baseline mb-1">
                              <span className="font-black text-[#1E3A8A] text-[13px]">{author?.name}</span>
                              <span className="text-[10px] text-slate-400 font-medium italic">
                                {formatDistanceToNow(new Date(c.date), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 font-medium leading-relaxed">{c.text}</p>
                          </div>
                        </div>
                      )
                    })}
                    {commentsArray.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 opacity-20 text-slate-500">
                            <MessageSquare className="h-12 w-12 mb-2" />
                            <p className="text-sm font-bold uppercase tracking-widest">No activity yet</p>
                        </div>
                    )}
                  </div>
                </ScrollArea>

                <div className="mt-8 pt-6 border-t border-slate-200 space-y-4">
                  <div className="relative">
                    <Textarea 
                      placeholder="Add a comment... (required for status changes)" 
                      className="bg-white border-2 border-slate-100 pr-12 min-h-[90px] text-sm font-medium focus-visible:ring-blue-100 transition-all placeholder:text-slate-400" 
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                    />
                    <Button 
                        size="icon" 
                        className="absolute right-3 bottom-3 h-8 w-8 rounded-full bg-[#A5B4FC] hover:bg-blue-600 text-white shadow-md transition-all active:scale-95" 
                        onClick={handleAddComment} 
                        disabled={!newComment.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>

                  {taskToDisplay.status === 'Pending Approval' && isApprover && (
                    <div className="grid grid-cols-2 gap-4">
                      <Button className="bg-[#10B981] hover:bg-[#059669] text-white font-bold h-11 rounded-lg" onClick={() => handleApprovalAction('approve')}>
                        <ThumbsUp className="mr-2 h-4 w-4" /> Approve
                      </Button>
                      <Button className="bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold h-11 rounded-lg" onClick={() => handleApprovalAction('return')}>
                        <ThumbsDown className="mr-2 h-4 w-4" /> Return
                      </Button>
                    </div>
                  )}

                  {isAssignee && !isCompleted && taskToDisplay.status !== 'Pending Approval' && (
                    <Button className="w-full bg-[#2563EB] hover:bg-blue-700 text-white font-bold h-12 rounded-lg text-sm tracking-wide" onClick={() => handleRequestStatusChange(mySubtask?.status === 'To Do' ? 'In Progress' : 'Done')}>
                      {mySubtask?.status === 'To Do' ? 'Start Task' : 'Submit for Final Approval'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 bg-white border-t flex flex-row justify-between items-center w-full">
            <div className="flex gap-2">
                {isAdmin && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="bg-[#EF4444] hover:bg-red-700 h-10 px-5">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Task
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Permanently?</AlertDialogTitle>
                                <AlertDialogDescription>This action will wipe all history and comments. It cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteTask} className="bg-destructive text-white">Confirm Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
            <Button variant="outline" onClick={() => setIsOpen(false)} className="h-10 px-8 font-bold border-2 hover:bg-slate-50 transition-colors">
                Close
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
