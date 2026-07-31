'use client';

import React, { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-provider';
import type { Task, User } from '@/lib/types';
import { format, parseISO, isPast } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Calendar, Users, Eye, Archive, ShieldCheck, Clock, CheckCircle2, History, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';

interface TaskOverviewTableProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
}

const getPriorityColor = (p: string) => {
    switch (p) {
        case 'High': return 'text-rose-600 bg-rose-50 border-rose-200';
        case 'Medium': return 'text-amber-600 bg-amber-50 border-amber-200';
        default: return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    }
}

const getStatusColor = (s: string) => {
    switch (s) {
        case 'Done': return 'bg-emerald-500 text-white';
        case 'In Progress': return 'bg-amber-500 text-white';
        case 'Pending Approval': return 'bg-blue-600 text-white';
        default: return 'bg-slate-500 text-white';
    }
}

const TableSection = ({ title, icon: Icon, tasks, users, onEdit, isArchivedSection = false }: { title: string, icon: any, tasks: Task[], users: User[], onEdit: (t: Task) => void, isArchivedSection?: boolean }) => {
    if (tasks.length === 0) return null;

    return (
        <div className="space-y-4 mb-10">
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.3em] text-slate-500 px-4">
                <Icon className="h-4 w-4" />
                {title}
                <Badge variant="secondary" className="ml-2 h-5 py-0 px-2 font-black text-[10px]">{tasks.length}</Badge>
            </h3>
            <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
                <Table className="text-xs">
                    <TableHeader className="bg-muted/50">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="w-10 font-bold text-black border-r">ID</TableHead>
                            <TableHead className="min-w-[250px] font-bold text-black border-r">TASK DESCRIPTION</TableHead>
                            <TableHead className="w-[180px] font-bold text-black border-r">TIMELINE (DUE DATE)</TableHead>
                            <TableHead className="w-[200px] font-bold text-black border-r">ASSIGNEE(S)</TableHead>
                            <TableHead className="w-[120px] font-bold text-black border-r text-center">PRIORITY</TableHead>
                            <TableHead className="w-[150px] font-bold text-black border-r text-center">STATUS</TableHead>
                            <TableHead className="w-[100px] text-right">ACTION</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tasks.map(task => {
                            const assignees = users.filter(u => task.assigneeIds?.includes(u.id));
                            return (
                                <TableRow key={task.id} className={cn(isArchivedSection && "opacity-60 bg-muted/10")}>
                                    <TableCell className="border-r font-mono text-[10px] text-muted-foreground uppercase text-center">{task.id.slice(-4)}</TableCell>
                                    <TableCell className="border-r">
                                        <div className="flex flex-col gap-0.5">
                                            <p className="font-bold text-sm uppercase tracking-tight">{task.title}</p>
                                            <p className="text-[10px] text-muted-foreground line-clamp-1 italic">{task.description}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell className="border-r font-bold text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                            {format(parseISO(task.dueDate), 'dd MMM yyyy')}
                                        </div>
                                    </TableCell>
                                    <TableCell className="border-r">
                                        <div className="flex -space-x-2">
                                            {assignees.map(a => (
                                                <TooltipProvider key={a.id}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Avatar className="h-7 w-7 border-2 border-background ring-1 ring-slate-200">
                                                                <AvatarImage src={a.avatar} />
                                                                <AvatarFallback className="text-[10px] font-black">{a.name[0]}</AvatarFallback>
                                                            </Avatar>
                                                        </TooltipTrigger>
                                                        <TooltipContent><p className="font-bold text-xs">{a.name}</p></TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ))}
                                            {assignees.length > 3 && <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-black border-2 border-background">+{assignees.length - 3}</div>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="border-r text-center">
                                        <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest h-5 px-2", getPriorityColor(task.priority))}>
                                            {task.priority}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="border-r text-center">
                                        <Badge className={cn("text-[9px] font-black uppercase tracking-widest h-5 px-2 border-none", getStatusColor(task.status))}>
                                            {task.status === 'Done' ? 'COMPLETED' : task.status.toUpperCase()}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" className="h-8 px-3 font-black text-[10px] uppercase tracking-wider text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => onEdit(task)}>
                                            <Eye className="h-3.5 w-3.5 mr-1.5" /> DETAILS
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default function TaskOverviewTable({ tasks, onEditTask }: TaskOverviewTableProps) {
  const { users } = useAuth();

  const sections = useMemo(() => {
    const archived = tasks.filter(t => t.isArchived);
    const active = tasks.filter(t => !t.isArchived);
    
    const overdue = active.filter(t => t.status !== 'Done' && isPast(parseISO(t.dueDate)));
    const remaining = active.filter(t => !overdue.includes(t));
    const inProgress = remaining.filter(t => t.status !== 'Done');
    const completed = remaining.filter(t => t.status === 'Done');

    return { overdue, inProgress, completed, archived };
  }, [tasks]);

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <ScrollArea className="flex-1 pr-4 -mr-4">
        <div className="py-2">
            <TableSection 
                title="Immediate Action / Overdue" 
                icon={AlertTriangle} 
                tasks={sections.overdue} 
                users={users} 
                onEdit={onEditTask} 
            />
            <TableSection 
                title="Active Projects / In Progress" 
                icon={Clock} 
                tasks={sections.inProgress} 
                users={users} 
                onEdit={onEditTask} 
            />
            <TableSection 
                title="Recently Finalized" 
                icon={CheckCircle2} 
                tasks={sections.completed} 
                users={users} 
                onEdit={onEditTask} 
            />
            <TableSection 
                title="Archived Task Records" 
                icon={History} 
                tasks={sections.archived} 
                users={users} 
                onEdit={onEditTask} 
                isArchivedSection={true}
            />
        </div>
      </ScrollArea>
    </div>
  );
}