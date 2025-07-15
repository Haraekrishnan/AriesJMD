'use client';
import { useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import type { Task } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, formatDistanceToNow } from 'date-fns';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { Edit } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

export default function TaskCard({ task, onClick }: TaskCardProps) {
  const { user, users, approveTask, returnTask } = useAppContext();
  
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

  const cardContent = (
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
  );
  
  return (
    <Card onClick={onClick} className="cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-4">
         {cardContent}
      </CardContent>
    </Card>
  );
}
