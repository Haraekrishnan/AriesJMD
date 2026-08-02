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
import { format, parseISO, isPast, endOfDay, isAfter, isValid } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { 
  Calendar, 
  Users, 
  Eye, 
  Archive, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  History, 
  AlertTriangle,
  ArrowRight,
  FolderArchive
} from 'lucide-react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface TaskOverviewTableProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
}

const getPriorityStyles = (p: string) => {
    switch (p) {
        case 'High': return 'text-rose-600 bg-rose-50 border-rose-200';
        case 'Medium': return 'text-orange-600 bg-orange-50 border-orange-200';
        default: return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    }
}

const getStatusColor = (s: string) => {
    switch (s) {
        case 'Done': return 'bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-sm';
        case 'In Progress': return 'bg-orange-500 hover:bg-orange-600 text-white border-none shadow-sm';
        case 'Pending Approval': return 'bg-blue-600 hover:bg-blue-700 text-white border-none shadow-sm';
        case 'To Do': return 'bg-slate-400 hover:bg-slate-500 text-white border-none shadow-sm';
        default: return 'bg-slate-200 text-slate-600';
    }
}

const TableSection = ({ title, icon: Icon, tasks, users, onEdit, isArchivedSection = false }: { title: string, icon: any, tasks: Task[], users: User[], onEdit: (t: Task) => void, isArchivedSection?: boolean }) => {
    if (tasks.length === 0) return null;

    return (
        <div className="space-y-4 mb-10">
            <div className="flex items-center gap-3 px-4">
                <Icon className={cn("h-4 w-4", isArchivedSection ? "text-slate-400" : "text-slate-600")} />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                    {title}
                </h3>
                <Badge variant="secondary" className="h-5 py-0 px-2 font-black text-[9px] bg-slate-100 text-slate-600 rounded-sm">
                    {tasks.length}
                </Badge>
            </div>
            <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
                <Table className="text-xs">
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="hover:bg-transparent border-b-2 border-slate-200">
                            <TableHead className="w-16 font-black text-slate-900 border-r uppercase tracking-wider text-center h-11">ID</TableHead>
                            <TableHead className="min-w-[300px] font-black text-slate-900 border-r uppercase tracking-wider h-11">Task Description</TableHead>
                            <TableHead className="w-[180px] font-black text-slate-900 border-r uppercase tracking-wider h-11">Timeline (Due Date)</TableHead>
                            <TableHead className="w-[160px] font-black text-slate-900 border-r uppercase tracking-wider h-11">Assignee(s)</TableHead>
                            <TableHead className="w-[120px] font-black text-slate-900 border-r text-center uppercase tracking-wider h-11">Priority</TableHead>
                            <TableHead className="w-[160px] font-black text-slate-900 border-r text-center uppercase tracking-wider h-11">Status</TableHead>
                            <TableHead className="w-[100px] text-right font-black text-slate-900 uppercase tracking-wider h-11">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tasks.map(task => {
                            const assignees = users.filter(u => task.assigneeIds?.includes(u.id));
                            const isOverdue = !task.isArchived && task.status !== 'Done' && task.status !== 'Pending Approval' && isAfter(new Date(), endOfDay(parseISO(task.dueDate)));
                            
                            return (
                                <TableRow key={task.id} className={cn(
                                    "group transition-colors",
                                    isArchivedSection ? "opacity-60 bg-slate-50/50" : "hover:bg-blue-50/30"
                                )}>
                                    <TableCell className="border-r font-mono text-[9px] text-slate-500 font-black uppercase text-center p-3">
                                        {(task.id || '').slice(-5).toUpperCase()}
                                    </TableCell>
                                    <TableCell className="border-r p-3">
                                        <div className="flex flex-col gap-0.5">
                                            <p className="font-bold text-xs uppercase tracking-tight text-slate-800 leading-tight">
                                                {task.title}
                                            </p>
                                            <p className="text-[9px] text-slate-400 line-clamp-1 italic font-medium">
                                                {task.description}
                                            </p>
                                        </div>
                                    </TableCell>
                                    <TableCell className="border-r p-3">
                                        <div className="flex items-center gap-2 font-bold text-slate-700 text-[10px]">
                                            <Calendar className={cn("h-3 w-3", isOverdue ? "text-rose-500" : "text-slate-400")} />
                                            {task.dueDate ? format(parseISO(task.dueDate), 'dd MMM yyyy') : 'N/A'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="border-r p-3">
                                        <div className="flex -space-x-1.5">
                                            <TooltipProvider>
                                                {assignees.map(a => (
                                                    <Tooltip key={a.id}>
                                                        <TooltipTrigger asChild>
                                                            <Avatar className="h-7 w-7 border-2 border-white shadow-sm ring-1 ring-slate-200">
                                                                <AvatarImage src={a.avatar} />
                                                                <AvatarFallback className="text-[8px] font-black">{a.name[0]}</AvatarFallback>
                                                            </Avatar>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p className="font-bold text-[10px]">{a.name}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                ))}
                                            </TooltipProvider>
                                            {assignees.length > 3 && (
                                                <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black border-2 border-white ring-1 ring-slate-200">
                                                    +{assignees.length - 3}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="border-r text-center p-3">
                                        <Badge variant="outline" className={cn(
                                            "text-[8px] font-black uppercase tracking-[0.1em] h-5 px-2 border-2", 
                                            getPriorityStyles(task.priority)
                                        )}>
                                            {task.priority}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="border-r text-center p-3">
                                        <Badge className={cn(
                                            "text-[8px] font-black uppercase tracking-[0.1em] h-5 px-2 min-w-[100px] justify-center rounded-sm", 
                                            getStatusColor(task.status)
                                        )}>
                                            {task.status === 'Done' ? 'COMPLETED' : (task.status || 'TO DO').toUpperCase()}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right p-3">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-7 px-2 font-black text-[9px] uppercase tracking-widest text-blue-600 hover:text-blue-700 hover:bg-blue-100/50" 
                                            onClick={() => onEdit(task)}
                                        >
                                            <Eye className="h-3 w-3 mr-1.5" /> DETAILS
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
    
    const isOverdue = (dueDateStr: string) => {
        const dueDate = parseISO(dueDateStr);
        if (!isValid(dueDate)) return false;
        return isAfter(new Date(), endOfDay(dueDate));
    };

    // A task is only calculated as overdue if it's NOT completed and NOT under review
    const overdue = active.filter(t => 
        t.status !== 'Done' && 
        t.status !== 'Pending Approval' && 
        isOverdue(t.dueDate)
    );
    
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
                icon={FolderArchive} 
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
