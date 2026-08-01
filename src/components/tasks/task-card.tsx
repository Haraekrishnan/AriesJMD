
'use client';
import { useAuth } from '@/contexts/auth-provider';
import type { Task } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { MessageSquare, Paperclip, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

export default function TaskCard({ task, onClick }: TaskCardProps) {
  const { user, users } = useAuth();
  
  const assignees = useMemo(() => users.filter(u => task.assigneeIds?.includes(u.id)), [users, task.assigneeIds]);

  const priorityColors: Record<string, string> = {
    High: 'bg-[#FF5E3A]',
    Medium: 'bg-[#FFB900]',
    Low: 'bg-[#10B981]',
  };

  const headerColors: Record<string, string> = {
      'To Do': 'bg-[#FFB900]/10',
      'In Progress': 'bg-[#10B981]/10',
      'Done': 'bg-[#2563EB]/10',
      'Pending Approval': 'bg-[#8B5CF6]/10',
  };

  const commentsCount = useMemo(() => {
    return Array.isArray(task.comments) ? task.comments.length : Object.values(task.comments || {}).length;
  }, [task.comments]);

  const hasUnreadUpdate = user && task.participants?.includes(user.id) && !task.viewedBy?.[user.id];

  // Logic to show a color block header for visual variety like the reference image
  const showVisualHeader = task.priority === 'High' || task.status === 'Pending Approval';
  const headerClass = task.priority === 'High' ? 'bg-[#FF5E3A]' : task.status === 'Pending Approval' ? 'bg-[#2563EB]' : '';

  return (
    <Card 
      onClick={onClick} 
      className="group cursor-pointer hover:shadow-lg transition-all duration-200 border-none overflow-hidden bg-white rounded-lg shadow-sm"
    >
      {showVisualHeader && <div className={cn("h-24 w-full flex items-center justify-center", headerClass)}>
          {task.priority === 'High' ? (
              <div className="bg-white/20 p-4 rounded-full"><Clock className="h-10 w-10 text-white" /></div>
          ) : (
              <div className="bg-white/20 p-4 rounded-full"><MessageSquare className="h-10 w-10 text-white" /></div>
          )}
      </div>}

      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start">
            <div className={cn("w-6 h-1.5 rounded-full", priorityColors[task.priority] || 'bg-slate-300')} />
            {hasUnreadUpdate && <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />}
        </div>

        <div className="space-y-1">
            <h4 className="text-sm font-black text-slate-800 leading-tight uppercase tracking-tight group-hover:text-primary transition-colors">
                {task.title}
            </h4>
            <p className="text-[11px] text-slate-500 font-medium line-clamp-2 leading-relaxed">
                {task.description}
            </p>
        </div>

        <div className="flex justify-between items-center pt-2">
            <div className="flex items-center gap-3 text-slate-400">
                {task.dueDate && (
                    <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider">
                        <Clock className="h-3 w-3" />
                        {format(parseISO(task.dueDate), 'MMM dd')}
                    </div>
                )}
                {commentsCount > 0 && (
                    <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider">
                        <MessageSquare className="h-3 w-3" />
                        {commentsCount}
                    </div>
                )}
                {task.link && (
                    <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider">
                        <Paperclip className="h-3 w-3" />
                        1
                    </div>
                )}
            </div>

            <div className="flex -space-x-2">
                <TooltipProvider>
                    {assignees.map((assignee) => (
                        <Tooltip key={assignee.id}>
                            <TooltipTrigger asChild>
                                <Avatar className="h-6 w-6 border-2 border-white ring-1 ring-slate-100 shadow-sm">
                                    <AvatarImage src={assignee.avatar} />
                                    <AvatarFallback className="text-[8px] font-black">{assignee.name[0]}</AvatarFallback>
                                </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="text-[10px] font-bold">{assignee.name}</p>
                            </TooltipContent>
                        </Tooltip>
                    ))}
                </TooltipProvider>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
