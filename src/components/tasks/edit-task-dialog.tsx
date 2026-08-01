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
  Paperclip,
  History,
  Info,
  Activity
} from 'lucide-react';
import type { Task, TaskStatus, Role } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { DatePickerInput } from "../ui/date-picker-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
  'To Do': 'secondary',
  'In Progress': 'default',
  'In Review': 'warning',
  'Done': 'success',
  'Pending Approval': 'warning',
  'Overdue': 'destructive',
  'Completed': 'success',
};

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
  const [activeTab, setActiveTab] = useState('activity');

  const taskToDisplay = useMemo(() => tasks.find(t => t.id === task.id) || task, [tasks, task]);

  const creator = useMemo(() => users.find(u => u.id === taskToDisplay.creatorId), [users, taskToDisplay.creatorId]);
  const assignees = useMemo(() => users.filter(u => taskToDisplay.assigneeIds?.includes(u.id)), [users, taskToDisplay.assigneeIds]);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
  });

  const isAdmin = user?.role === 'Admin';
  const isCreator = user?.id === taskToDisplay.creatorId;
  const isCoordinator = user?.role === 'Project Coordinator';
  const isApprover = isCreator || isAdmin;
  const isCompleted = taskToDisplay.status === 'Done' || taskToDisplay.status === 'Completed';

  // Metadata update permission logic: only creator or managers
  const canEditMetadata = isAdmin || isCreator || isCoordinator;

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
      
      // Auto-switch to activity tab on mobile if user is assignee
      if (window.innerWidth < 768 && taskToDisplay.assigneeIds?.includes(user?.id || '')) {
          setActiveTab('activity');
      }
    }
  }, [taskToDisplay, form, isOpen, markTaskAsViewed, user?.id]);

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

  const shortId = useMemo(() => (taskToDisplay.id || '').slice(-6).toUpperCase(), [taskToDisplay.id]);

  const MetadataForm = (
      <div className="space-y-6">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Task Title</Label>
          <Input {...form.register('title')} disabled={!canEditMetadata} className="h-10 bg-slate-50 border-slate-200 font-bold text-slate-800 focus-visible:ring-primary/20" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Description</Label>
          <Textarea {...form.register('description')} disabled={!canEditMetadata} rows={5} className="bg-slate-50 border-slate-200 font-medium text-slate-700 leading-relaxed focus-visible:ring-primary/20" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Resource Attachments</Label>
          <div className="flex items-center gap-2">
              <Input {...form.register('link')} disabled={!canEditMetadata} placeholder="Add external link..." className="bg-slate-50 border-slate-200 text-xs italic" />
              {taskToDisplay.link && (
                  <Button asChild size="icon" variant="outline" className="shrink-0 h-10 w-10">
                      <a href={taskToDisplay.link} target="_blank" rel="noopener noreferrer"><Paperclip className="h-4 w-4"/></a>
                  </Button>
              )}
          </div>
        </div>

        <div className="space-y-1.5 pt-2">
          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Assignee Status Tracker</Label>
          <div className="space-y-2">
            {assignees.map(a => {
              const sub = taskToDisplay.subtasks?.[a.id];
              const status = sub?.status || 'To Do';
              return (
                <div key={a.id} className="flex justify-between items-center p-3 border border-slate-200 rounded-lg bg-white shadow-sm transition-all hover:border-slate-300">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border-2 border-slate-100 shadow-inner">
                        <AvatarImage src={a.avatar} />
                        <AvatarFallback className="font-black text-[10px]">{a.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-black text-slate-800 uppercase tracking-tight truncate">{a.name}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{a.role}</span>
                    </div>
                  </div>
                  <Badge className={cn(
                      "h-5 px-2 rounded-sm text-[9px] font-black tracking-widest uppercase border-none",
                      status === 'Done' ? "bg-[#10B981] text-white" : "bg-slate-100 text-slate-500"
                  )}>
                    {status}
                  </Badge>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Target Deadline</Label>
            <Controller
              name="dueDate"
              control={form.control}
              render={({ field }) => (
                <DatePickerInput value={field.value} onChange={field.onChange} disabled={!canEditMetadata} />
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Priority Level</Label>
            <Controller
              name="priority"
              control={form.control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} disabled={!canEditMetadata}>
                  <SelectTrigger className="h-10 bg-slate-50 border-slate-200 font-bold"><SelectValue /></SelectTrigger>
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

        {canEditMetadata && (
          <Button type="submit" form="task-form" className="w-full bg-[#2563EB] hover:bg-[#1E40AF] text-white font-black uppercase tracking-[0.2em] text-xs h-12 rounded-lg shadow-xl shadow-blue-500/20 mt-4">
              Update Task Metadata
          </Button>
        )}
      </div>
  );

  const InteractionFeed = (
      <div className="h-full flex flex-col min-h-[400px] md:min-h-0">
          <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-[11px] uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Interaction Log
              </h3>
              <Badge variant="outline" className="font-black text-[9px] h-5 border-slate-200 text-slate-400">{commentsArray.length} ENTRIES</Badge>
          </div>

          <div className="flex-1 min-h-0">
              <ScrollArea className="h-full pr-4">
              <div className="space-y-6 pb-4">
                  {commentsArray.map((c, index) => {
                  const author = users.find(u => u.id === c.userId);
                  return (
                      <div key={c.id || `comment-${index}`} className="flex gap-4">
                      <Avatar className="h-10 w-10 border-2 border-white shadow-sm shrink-0">
                          <AvatarImage src={author?.avatar} />
                          <AvatarFallback className="font-black text-xs">{author?.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1.5 min-w-0">
                          <div className="flex justify-between items-baseline gap-2">
                          <span className="font-black text-[#2563EB] text-[11px] uppercase tracking-wider truncate">{author?.name}</span>
                          <span className="text-[9px] text-slate-400 font-bold italic shrink-0">
                              {formatDistanceToNow(new Date(c.date), { addSuffix: true })}
                          </span>
                          </div>
                          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                              <p className="text-[13px] text-slate-700 font-medium leading-relaxed whitespace-pre-wrap break-words">{c.text}</p>
                          </div>
                      </div>
                      </div>
                  )
                  })}
                  {commentsArray.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-20 opacity-30 text-slate-400 text-center">
                          <History className="h-12 w-12 mb-3 stroke-[1px]" />
                          <p className="text-[10px] font-black uppercase tracking-[0.3em]">No interaction records found</p>
                      </div>
                  )}
              </div>
              </ScrollArea>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200 space-y-4 shrink-0">
            <div className="relative group">
              <Textarea 
                placeholder="Add an update or reply..." 
                className="bg-white border-2 border-slate-200 pr-14 min-h-[100px] text-sm font-bold focus-visible:ring-blue-100 transition-all placeholder:text-slate-300 rounded-xl" 
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
              />
              <Button 
                  size="icon" 
                  className="absolute right-3 bottom-3 h-9 w-9 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white shadow-lg transition-all active:scale-95" 
                  onClick={handleAddComment} 
                  disabled={!newComment.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {taskToDisplay.status === 'Pending Approval' && isApprover && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95">
                <Button className="bg-[#10B981] hover:bg-[#059669] text-white font-black uppercase tracking-widest text-[10px] h-12 rounded-lg shadow-lg shadow-emerald-500/20" onClick={() => handleApprovalAction('approve')}>
                  <ThumbsUp className="mr-2 h-4 w-4 shrink-0" /> Final Approve
                </Button>
                <Button className="bg-[#EF4444] hover:bg-[#DC2626] text-white font-black uppercase tracking-widest text-[10px] h-12 rounded-lg shadow-lg shadow-rose-500/20" onClick={() => handleApprovalAction('return')}>
                  <ThumbsDown className="mr-2 h-4 w-4 shrink-0" /> Return Back
                </Button>
              </div>
            )}

            {isAssignee && !isCompleted && taskToDisplay.status !== 'Pending Approval' && (
              <Button className="w-full bg-[#2563EB] hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] h-14 rounded-xl text-xs shadow-xl shadow-blue-500/20 transition-all active:scale-95" onClick={() => handleRequestStatusChange(mySubtask?.status === 'To Do' ? 'In Progress' : 'Done')}>
                {mySubtask?.status === 'To Do' ? 'START WORK STREAM' : 'SUBMIT FOR FINAL APPROVAL'}
              </Button>
            )}
          </div>
      </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-[95vw] md:max-w-5xl w-full h-[95vh] flex flex-col p-0 overflow-hidden bg-white">
        {/* --- HEADER --- */}
        <DialogHeader className="p-4 md:p-8 pb-4 bg-[#F8FAFC] border-b relative shrink-0">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-2">
              <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                      <div className="bg-[#E9F0FE] text-[#1E40AF] px-2 py-0.5 rounded font-mono font-bold text-[10px] border border-[#BFDBFE]">
                          ID: {shortId}
                      </div>
                      <DialogTitle className="text-lg md:text-2xl font-black text-slate-900 tracking-tight uppercase truncate max-w-full">
                          Task Details: {taskToDisplay.title}
                      </DialogTitle>
                  </div>
                  <DialogDescription className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Assigned by <span className="text-slate-600">{creator?.name}</span> to <span className="text-slate-600">{assignees.map(a => a.name).join(', ')}</span>
                  </DialogDescription>
              </div>
              <Badge variant={statusVariant[taskToDisplay.status]} className="h-7 px-4 rounded-sm font-black text-[10px] uppercase tracking-widest shadow-sm shrink-0">
                {taskToDisplay.status}
              </Badge>
          </div>
        </DialogHeader>

        {/* --- CONTENT AREA: Tabs for Mobile, Grid for Desktop --- */}
        <div className="flex-1 overflow-hidden relative">
            {/* Desktop View: Side-by-side */}
            <div className="hidden md:flex h-full">
                <div className="w-1/2 p-8 overflow-y-auto border-r bg-white">
                    {taskToDisplay.status === 'Pending Approval' && (
                        <div className="bg-[#EFF6FF] border-2 border-[#DBEAFE] rounded-lg p-4 mb-8 flex items-start gap-4 shadow-sm">
                            <div className="bg-white p-2 rounded-full shadow-sm text-[#2563EB] shrink-0"><Bell className="h-5 w-5" /></div>
                            <div>
                                <h4 className="font-black text-[#1E3A8A] text-[13px] leading-tight uppercase tracking-tight">Approval Pending</h4>
                                <p className="text-[11px] text-[#3B82F6] mt-1 font-bold">Awaiting final sign-off from the creator.</p>
                            </div>
                        </div>
                    )}
                    <form id="task-form" onSubmit={form.handleSubmit(onSubmit)}>
                        {MetadataForm}
                    </form>
                </div>
                <div className="w-1/2 p-8 overflow-hidden bg-[#F8FAFC]">
                    {InteractionFeed}
                </div>
            </div>

            {/* Mobile View: Tabs */}
            <div className="flex md:hidden h-full flex-col">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                    <TabsList className="grid w-full grid-cols-2 rounded-none bg-slate-100/50 border-b h-12 shrink-0">
                        <TabsTrigger value="info" className="font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white">
                            <Info className="mr-2 h-3.5 w-3.5" /> Info
                        </TabsTrigger>
                        <TabsTrigger value="activity" className="font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white relative">
                            <Activity className="mr-2 h-3.5 w-3.5" /> Activity
                            {commentsArray.length > 0 && (
                                <Badge variant="secondary" className="absolute top-1 right-1 h-4 min-w-[1rem] p-0 flex items-center justify-center text-[8px] bg-blue-600 text-white border-none">{commentsArray.length}</Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>
                    
                    <div className="flex-1 min-h-0 relative">
                        <TabsContent value="info" className="m-0 h-full overflow-y-auto p-4 bg-white">
                            {taskToDisplay.status === 'Pending Approval' && (
                                <div className="bg-[#EFF6FF] border-2 border-[#DBEAFE] rounded-lg p-3 mb-6 flex items-start gap-3 shadow-sm">
                                    <Bell className="h-4 w-4 text-[#2563EB] shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-[#3B82F6] font-black uppercase leading-tight">Approval Pending from creator.</p>
                                </div>
                            )}
                            <form id="task-form-mobile" onSubmit={form.handleSubmit(onSubmit)}>
                                {MetadataForm}
                            </form>
                        </TabsContent>
                        
                        <TabsContent value="activity" className="m-0 h-full p-4 bg-[#F8FAFC]">
                            {InteractionFeed}
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </div>

        {/* --- FOOTER --- */}
        <DialogFooter className="p-4 bg-[#F8FAFC] border-t flex flex-col sm:flex-row justify-between items-center w-full gap-4 px-4 md:px-8 shrink-0">
            <div className="flex gap-2 w-full sm:w-auto">
                {isAdmin && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" className="w-full sm:w-auto text-rose-500 hover:text-rose-700 hover:bg-rose-50 font-black uppercase tracking-widest text-[10px] h-10 px-6">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Forever
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Permanently?</AlertDialogTitle>
                                <AlertDialogDescription>This action will wipe all history and comments for this task. It cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteTask} className="bg-destructive text-white font-bold">Confirm Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
            <Button variant="outline" onClick={() => setIsOpen(false)} className="w-full sm:w-auto h-10 px-8 font-black uppercase tracking-[0.2em] border-2 text-[10px] hover:bg-white transition-all shadow-sm">
                Close Interface
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
