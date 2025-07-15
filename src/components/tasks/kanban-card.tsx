'use client';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppContext } from '@/hooks/use-app-context';
import type { Task, User } from '@/types';
import { formatDistanceToNow, format } from 'date-fns';
import { Clock, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

interface KanbanCardProps {
  task: Task;
  onEdit: () => void;
  isDialog?: boolean;
}

export default function KanbanCard({ task, onEdit, isDialog=false }: KanbanCardProps) {
  const { users } = useAppContext();
  const assignee = users.find(u => u.id === task.assigneeId);
  
  const getPriorityClass = (priority: Task['priority']) => {
    switch (priority) {
      case 'High': return 'bg-destructive/20 border-destructive text-destructive-foreground';
      case 'Medium': return 'bg-yellow-500/20 border-yellow-500 text-yellow-700 dark:text-yellow-400';
      case 'Low': return 'bg-blue-500/20 border-blue-500 text-blue-700 dark:text-blue-400';
      default: return 'bg-muted';
    }
  };
  
  const dueDate = new Date(task.dueDate);
  const isOverdue = dueDate < new Date() && task.status !== 'Done' && task.status !== 'Completed';

  return (
    <Card className={cn("hover:shadow-md transition-shadow", isDialog && "border-none shadow-none")}>
      <CardHeader className="p-4 pb-2">
        <div className='flex justify-between items-start'>
            <CardTitle className="text-base font-semibold leading-tight cursor-pointer hover:underline" onClick={onEdit}>
              {task.title}
            </CardTitle>
            <Badge variant="outline" className={cn("shrink-0", getPriorityClass(task.priority))}>{task.priority}</Badge>
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
        {isDialog && (
            <Button size="sm" onClick={onEdit}>View Details</Button>
        )}
      </CardFooter>
    </Card>
  );
}
