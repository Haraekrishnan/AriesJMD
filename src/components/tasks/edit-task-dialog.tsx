'use client';
import { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, MessageSquare, Paperclip, Send } from 'lucide-react';
import { useAppContext } from '@/hooks/use-app-context';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Task, Priority, TaskStatus, User } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface EditTaskDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  task: Task;
  onTaskUpdate: (task: Task) => void;
}

export default function EditTaskDialog({ isOpen, setIsOpen, task, onTaskUpdate }: EditTaskDialogProps) {
  const { user, users, updateTask } = useAppContext();
  const { toast } = useToast();

  const [description, setDescription] = useState(task.description);
  const [assigneeId, setAssigneeId] = useState(task.assigneeId);
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date(task.dueDate));
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [comment, setComment] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);

  const canEdit = useMemo(() => user?.id === task.creatorId || user?.role === 'Admin' || user?.role === 'Manager', [user, task]);
  const isAssignee = useMemo(() => task.assigneeId === user?.id, [task, user]);

  const canApprove = useMemo(() => {
    if (!user) return false;
    const assignee = users.find(u => u.id === task.assigneeId);
    if (!assignee) return false;
    return task.creatorId === user.id || assignee.supervisorId === user.id;
  }, [user, users, task]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0]);
    }
  };
  
  const addComment = (text: string) => {
    if (!text.trim()) return;
    const newComment = {
        id: `c-${Date.now()}`,
        userId: user!.id,
        text,
        date: new Date().toISOString(),
    };
    onTaskUpdate({ ...task, comments: [...(task.comments || []), newComment] });
    setComment('');
  };

  const handleUpdate = () => {
    const updatedTask = {
      ...task,
      description,
      assigneeId,
      assigneeIds: [assigneeId],
      dueDate: dueDate!.toISOString(),
      priority,
      status,
    };
    onTaskUpdate(updatedTask);
    toast({ title: 'Task Updated' });
    setIsOpen(false);
  };
  
  const handleApproval = (isApproved: boolean, approvalComment: string) => {
    let updatedTask: Task;
    if (isApproved) {
        updatedTask = {
            ...task,
            status: task.pendingStatus || 'Completed',
            approvalState: 'approved',
            pendingStatus: undefined,
            completionDate: new Date().toISOString(),
        }
    } else {
        updatedTask = {
            ...task,
            status: task.previousStatus || 'In Progress',
            approvalState: 'returned',
            pendingStatus: undefined,
        }
    }
     if (approvalComment.trim()) {
        const newComment = { id: `c-${Date.now()}`, userId: user!.id, text: approvalComment, date: new Date().toISOString() };
        updatedTask.comments.push(newComment);
    }
    onTaskUpdate(updatedTask);
    setIsOpen(false);
  }

  const handleAttachmentAndComplete = () => {
    if (!attachment) {
        toast({ variant: 'destructive', title: 'Attachment Required', description: 'Please upload an attachment to complete this task.' });
        return;
    }
     const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        onTaskUpdate({ 
            ...task, 
            status: 'Pending Approval',
            pendingStatus: 'Completed',
            previousStatus: task.status,
            attachment: { name: attachment.name, url }
        });
        toast({ title: 'Task Submitted for Approval' });
        setIsOpen(false);
      };
      reader.readAsDataURL(attachment);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{task.title}</DialogTitle>
          <DialogDescription>
            Created by {users.find(u => u.id === task.creatorId)?.name}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
          <div className="md:col-span-2 space-y-4">
             <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} readOnly={!canEdit} className="min-h-[100px]"/>
            </div>
            
            <div className="space-y-2">
              <Label>Comments</Label>
              <ScrollArea className="h-48 w-full rounded-md border p-4">
                {task.comments?.length > 0 ? task.comments.map(c => {
                   const commentUser = users.find(u => u.id === c.userId);
                   return(
                     <div key={c.id} className="flex items-start gap-2 text-sm mb-4">
                        <Avatar className='h-7 w-7'><AvatarImage src={commentUser?.avatar} /><AvatarFallback>{commentUser?.name.charAt(0)}</AvatarFallback></Avatar>
                        <div className='flex-1'>
                            <div className='bg-muted p-2 rounded-md'>
                                <div className='flex justify-between items-baseline'>
                                    <p className="font-semibold text-xs">{commentUser?.name}</p>
                                    <p className='text-xs text-muted-foreground'>{format(new Date(c.date), 'dd MMM, hh:mm a')}</p>
                                </div>
                                <p className="text-foreground/80 mt-1">{c.text}</p>
                            </div>
                        </div>
                      </div>
                   )
                }) : <p className='text-sm text-muted-foreground text-center py-8'>No comments yet.</p>}
              </ScrollArea>
              <div className="flex gap-2">
                <Input placeholder="Add a comment..." value={comment} onChange={e => setComment(e.target.value)} />
                <Button size="icon" onClick={() => addComment(comment)} disabled={!comment.trim()}><Send/></Button>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
             <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(val: TaskStatus) => setStatus(val)} disabled={!canEdit}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                    <SelectItem value="To Do">To Do</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assignee</Label>
               <Select value={assigneeId} onValueChange={setAssigneeId} disabled={!canEdit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
                <Label>Due Date</Label>
                <Popover>
                    <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !dueDate && 'text-muted-foreground')} disabled={!canEdit}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, 'PPP') : <span>Pick a date</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
                    </PopoverContent>
                </Popover>
            </div>
            <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(val: Priority) => setPriority(val)} disabled={!canEdit}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            {task.requiresAttachmentForCompletion && (
                <div className="space-y-2">
                    <Label>Attachment</Label>
                    {task.attachment ? (
                        <Button asChild variant="outline" className='w-full'><a href={task.attachment.url} download={task.attachment.name}><Paperclip className='mr-2'/>{task.attachment.name}</a></Button>
                    ) : isAssignee ? (
                       <Input type="file" onChange={handleFileChange} />
                    ) : <p className='text-sm text-muted-foreground'>Not attached yet.</p>}
                </div>
            )}
          </div>
        </div>
        <DialogFooter className="pt-4 border-t">
          {task.status === 'Pending Approval' && canApprove ? (
            <div className='flex justify-end gap-2 w-full'>
              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="destructive">Return</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Return Task</AlertDialogTitle><AlertDialogDescription>Add a comment explaining why this task is being returned.</AlertDialogDescription></AlertDialogHeader>
                  <Textarea id="return-comment" placeholder="Your comment..."/>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleApproval(false, (document.getElementById('return-comment') as HTMLTextAreaElement).value)}>Return Task</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <AlertDialog>
                <AlertDialogTrigger asChild><Button>Approve</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Approve Task Completion</AlertDialogTitle><AlertDialogDescription>The task will be marked as Completed.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleApproval(true, "Approved")}>Approve</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : isAssignee && task.requiresAttachmentForCompletion && !task.attachment ? (
            <Button onClick={handleAttachmentAndComplete}>Submit with Attachment</Button>
          ) : canEdit ? (
            <Button onClick={handleUpdate}>Save Changes</Button>
          ) : <Button onClick={() => setIsOpen(false)}>Close</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
