'use client';
import { useAuth } from '@/contexts/auth-provider';
import type { Task } from '@/lib/types';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

export default function TaskCard({ task, onClick }: TaskCardProps) {
  const { user, users } = useAuth();
  
  const assignees = useMemo(() => users.filter(u => task.assigneeIds?.includes(u.id)), [users, task.assigneeIds]);
  const creator = useMemo(() => users.find(u => u.id === task.creatorId), [users, task.creatorId]);

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'High': return 'destructive';
      case 'Medium': return 'secondary';
      case 'Low': return 'default';
      default: return 'outline';
    }
  };

  const hasUnreadUpdate = user && task.participants?.includes(user.id) && !task.viewedBy?.[user.id];

  return (
    <Card onClick={onClick} className="cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-bold uppercase tracking-tight">{task.title}</CardTitle>
              {hasUnreadUpdate && <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" title="Unread update"></div>}
            </div>
            <Badge variant={getPriorityVariant(task.priority)}>{task.priority}</Badge>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Due: {format(new Date(task.dueDate), 'PPP')}
        </div>

        <div className="space-y-3 pt-2 border-t">
            <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                    <Users className="h-3 w-3" /> Assigned Personnel
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {assignees.map(assignee => (
                        <div key={assignee.id} className="flex items-center gap-1.5 bg-muted/50 pr-2 rounded-full border shadow-sm h-7">
                            <Avatar className="h-6 w-6 border">
                                <AvatarImage src={assignee.avatar} />
                                <AvatarFallback className="text-[8px]">{assignee.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-[10px] font-bold text-foreground truncate max-w-[120px]">{assignee.name}</span>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="flex justify-between items-center text-[10px] pt-1">
                 <div className="flex items-center gap-1.5">
                    <span className="font-black text-slate-500 uppercase tracking-widest">Creator:</span>
                    <span className="font-bold text-primary">{creator?.name || 'Unknown'}</span>
                </div>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}