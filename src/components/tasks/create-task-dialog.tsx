
'use client';
import { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { PlusCircle } from 'lucide-react';
import type { Role } from '@/lib/types';

const roleHierarchy: Record<Role, number> = {
  'Team Member': 0,
  'Junior Supervisor': 1,
  'Junior HSE': 1,
  'Assistant Store Incharge': 1,
  'Supervisor': 2,
  'HSE': 2,
  'Store in Charge': 2,
  'Manager': 3,
  'Admin': 4,
};

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  assigneeId: z.string().min(1, 'Please select an assignee'),
  dueDate: z.string().min(1, 'Due date is required'),
  priority: z.enum(['Low', 'Medium', 'High']),
});

type TaskFormValues = z.infer<typeof taskSchema>;

export default function CreateTaskDialog() {
  const { user, createTask, getVisibleUsers } = useAppContext();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      assigneeId: '',
      priority: 'Medium',
    },
  });

  const allVisibleUsers = useMemo(() => getVisibleUsers(), [getVisibleUsers]);

  const assignableUsers = useMemo(() => {
    if (!user) return [];
    if (user.role === 'Admin' || user.role === 'Manager') {
      return allVisibleUsers;
    }
    
    const userRoleLevel = roleHierarchy[user.role];

    return allVisibleUsers.filter(assignee => {
      const assigneeRoleLevel = roleHierarchy[assignee.role];
      return assignee.id === user.id || assigneeRoleLevel < userRoleLevel;
    });
  }, [user, allVisibleUsers]);

  const onSubmit = (data: TaskFormValues) => {
    createTask(data);
    toast({
      title: 'Task Created',
      description: `Task "${data.title}" has been created and assigned.`,
    });
    setIsOpen(false);
    form.reset();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>Fill in the details below to create a new task.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...form.register('title')} />
            {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...form.register('description')} />
            {form.formState.errors.description && <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Controller
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                    <SelectContent>
                      {assignableUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.assigneeId && <p className="text-xs text-destructive">{form.formState.errors.assigneeId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Controller
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
          
          <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input id="dueDate" type="date" {...form.register('dueDate')} />
              {form.formState.errors.dueDate && <p className="text-xs text-destructive">{form.formState.errors.dueDate.message}</p>}
          </div>


          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Create Task</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
