'use client';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppContext } from '@/hooks/use-app-context';
import type { Task } from '@/types';
import { format } from 'date-fns';
import { Clock, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  isDialog?: boolean;
}

export default function TaskCard({ task, onClick, isDialog = false }: TaskCardProps) {
  const { users } = useAppContext();
  const assignee = users.find(u => u.id === task.assigneeId);
  const creator = users.find(u => u.id === task.creatorId);

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'High': return 'destructive';
      case 'Medium': return 'secondary';
      case 'Low': return 'default';
      default: return 'outline';
    }
  };
  
  const dueDate = new Date(task.dueDate);
  const isOverdue = dueDate < new Date() && task.status !== 'Done' && task.status !== 'Completed';

  if (isDialog) {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{task.title}</CardTitle>
                <Badge variant={getPriorityVariant(task.priority)}>{task.priority}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{task.description}</p>
            <div className="text-xs text-muted-foreground">Due: {format(new Date(task.dueDate), 'PPP')}</div>

            <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Assignee:</span>
                    {assignee && <Avatar className="h-6 w-6"><AvatarImage src={assignee.avatar} /><AvatarFallback>{assignee.name.charAt(0)}</AvatarFallback></Avatar>}
                    <span>{assignee?.name}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Creator:</span>
                    <span>{creator?.name}</span>
                </div>
            </div>
        </div>
    )
  }

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <CardHeader className="p-4 pb-2">
        <div className='flex justify-between items-start'>
            <CardTitle className="text-base font-semibold leading-tight">
              {task.title}
            </CardTitle>
            <Badge variant={getPriorityVariant(task.priority)}>{task.priority}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
          <Clock className="h-4 w-4" />
          <span className={cn(isOverdue && 'text-destructive font-semibold')}>
              Due {format(dueDate, 'MMM dd')}
          </span>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          {assignee && (
             <Avatar className="h-7 w-7">
                <AvatarImage src={assignee.avatar} />
                <AvatarFallback>{assignee.name.charAt(0)}</AvatarFallback>
            </Avatar>
          )}
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <MessageSquare className="h-4 w-4" />
            <span>{task.comments?.length || 0}</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
