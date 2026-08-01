
'use client';
import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { useTask } from '@/contexts/task-provider';
import { KanbanBoard } from '@/components/tasks/kanban-board';
import CreateTaskDialog from '@/components/tasks/create-task-dialog';
import TaskFilters, { type TaskFilters as FiltersType } from '@/components/tasks/task-filters';
import { Button } from '@/components/ui/button';
import { Bell, History, Edit, LayoutGrid, List, Archive, CheckCircle2, FolderArchive, Search as SearchIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import EditTaskDialog from '@/components/tasks/edit-task-dialog';
import type { Task, Role } from '@/lib/types';
import ReportDownloads from '@/components/reports/report-downloads';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, isWithinInterval, startOfMonth, endOfMonth, getMonth, getYear, parseISO, isSameYear } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TaskOverviewTable from '@/components/tasks/task-overview-table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function TasksPage() {
  const { user, users, can, getVisibleUsers } = useAuth();
  const { tasks, pendingTaskApprovalCount, myNewTaskCount, myPendingTaskRequestCount } = useTask();
  
  const [viewMode, setViewMode] = useState<'kanban' | 'overview'>('kanban');
  const [isArchiveView, setIsArchiveView] = useState(false);

  const [filters, setFilters] = useState<FiltersType>({
    status: 'all',
    priority: 'all',
    assigneeId: 'all',
    dateRange: undefined,
    month: 'all',
    showMyTasksOnly: false,
    year: new Date().getFullYear().toString(),
    search: '',
    includeArchived: false,
  });

  const [isPendingApprovalDialogOpen, setIsPendingApprovalDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const tasksAwaitingMyApproval = useMemo(() => {
    if (!user) return [];
    return tasks.filter(task => 
      task.creatorId === user.id &&
      task.statusRequest?.status === 'Pending' &&
      !task.isArchived
    );
  }, [tasks, user]);
  
  const visibleTasksPool = useMemo(() => {
    if (!user) return [];
    
    const highLevelRoles: Role[] = ['Admin', 'Manager', 'Project Coordinator'];
    const hasFullView = highLevelRoles.includes(user.role);
    const visibleUserIds = new Set(getVisibleUsers().map(u => u.id));
    
    return tasks.filter(task => {
      if (hasFullView) return true;
      const isAssignee = task.assigneeIds && task.assigneeIds.some(id => visibleUserIds.has(id));
      const isCreator = task.creatorId === user.id;
      const isApprover = task.approverId === user.id;
      return isAssignee || isCreator || isApprover;
    });
  }, [tasks, user, getVisibleUsers]);

  const filteredTasks = useMemo(() => {
    return visibleTasksPool.filter(task => {
      const { status, priority, dateRange, showMyTasksOnly, assigneeId, month, year, search } = filters;

      // 1. Archive Logic:
      if (isArchiveView) {
        if (!task.isArchived) return false;
      } else {
        if (task.isArchived && !search) return false;
      }

      // 2. Search Filter (Title, Description, ID)
      if (search) {
          const term = search.toLowerCase();
          const matchesTitle = (task.title || '').toLowerCase().includes(term);
          const matchesDesc = (task.description || '').toLowerCase().includes(term);
          const matchesId = (task.id || '').toLowerCase().includes(term);
          if (!matchesTitle && !matchesDesc && !matchesId) return false;
      }

      if (assigneeId !== 'all' && !task.assigneeIds?.includes(assigneeId)) {
        return false;
      }

      if (showMyTasksOnly) {
          if (!user || !task.assigneeIds?.includes(user.id)) return false;
      }
      
      let statusMatch = status === 'all' || task.status === status;
      if (status !== 'all' && task.status !== status) {
          statusMatch = false;
      }
      
      const priorityMatch = priority === 'all' || task.priority === priority;
      
      let dateMatch = true;
      if (dateRange?.from) {
        const taskDate = new Date(task.dueDate);
        const fromDate = dateRange.from;
        const toDate = dateRange.to || new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate(), 23, 59, 59);
        dateMatch = taskDate >= fromDate && taskDate <= toDate;
      }
      
      let monthMatch = true;
      if(month !== 'all') {
        const taskDate = new Date(task.dueDate);
        if(task.status === 'Done') {
            if(task.completionDate) {
              const completionDate = parseISO(task.completionDate);
              monthMatch = (getMonth(completionDate) + 1).toString() === month;
            } else {
               monthMatch = false;
            }
        }
        else if (!dateRange?.from) {
            monthMatch = true;
        } else {
             monthMatch = (getMonth(taskDate) + 1).toString() === month && getYear(taskDate).toString() === year;
        }
      }

      if (dateRange?.from && task.status !== 'Done') {
          monthMatch = true; 
      } else if (task.status !== 'Done' && month === 'all') {
          monthMatch = true; 
      }
      
      const yearMatch = year === 'all' || isSameYear(new Date(task.dueDate), new Date(parseInt(year), 0, 1));

      return statusMatch && priorityMatch && dateMatch && monthMatch && yearMatch;
    });
  }, [visibleTasksPool, filters, user, isArchiveView]);


  const kanbanTasks = useMemo(() => {
      const regularBoardTasks = filteredTasks.filter(t => !t.isArchived);
      const overdueTasks = regularBoardTasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'Done' && t.status !== 'Pending Approval');
      const overdueTaskIds = new Set(overdueTasks.map(t => t.id));
      const regularTasks = regularBoardTasks.filter(t => !overdueTaskIds.has(t.id));
      return { overdue: overdueTasks, regular: regularTasks };
  }, [filteredTasks]);

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
  };

  const isSearching = !!filters.search;
  const effectiveViewMode = (isSearching || isArchiveView) ? 'overview' : viewMode;

  return (
    <>
      <div className="flex flex-col h-full space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {isArchiveView ? 'Task Archives' : 'Task Management'}
            </h1>
            <p className="text-muted-foreground text-sm font-medium">
              {isArchiveView 
                ? 'Reviewing historical records. This view is locked to list mode for efficiency.'
                : isSearching 
                ? 'Displaying filtered results across active and archived tasks.' 
                : 'Monitor active workflows, track progress, and coordinate tasks.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
              <ReportDownloads tasks={filteredTasks} />
              
              {!isSearching && !isArchiveView && (
                <div className="flex bg-muted p-1 rounded-lg border mr-2 shadow-sm">
                  <Button 
                      variant={effectiveViewMode === 'kanban' ? 'secondary' : 'ghost'} 
                      size="sm" 
                      className="h-8 text-[10px] font-black uppercase tracking-widest"
                      onClick={() => setViewMode('kanban')}
                  >
                      <LayoutGrid className="mr-2 h-3.5 w-3.5" /> KANBAN
                  </Button>
                  <Button 
                      variant={effectiveViewMode === 'overview' ? 'secondary' : 'ghost'} 
                      size="sm" 
                      className="h-8 text-[10px] font-black uppercase tracking-widest"
                      onClick={() => setViewMode('overview')}
                  >
                      <List className="mr-2 h-3.5 w-3.5" /> OVERVIEW
                  </Button>
                </div>
              )}

              <Button 
                variant={isArchiveView ? "secondary" : "outline"} 
                onClick={() => setIsArchiveView(!isArchiveView)} 
                className="h-9 font-bold text-xs shadow-sm"
              >
                  <Archive className="mr-2 h-4 w-4" />
                  {isArchiveView ? 'Back to Board' : 'View Archive'}
              </Button>

              <Button variant={pendingTaskApprovalCount > 0 ? "secondary" : "outline"} onClick={() => setIsPendingApprovalDialogOpen(true)} className="h-9 font-bold text-xs shadow-sm">
                  <Bell className="mr-2 h-4 w-4" />
                  Pending Approvals
                  {pendingTaskApprovalCount > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 min-w-[1.25rem] justify-center p-0">{pendingTaskApprovalCount}</Badge>
                  )}
              </Button>
              {can.manage_tasks && !isArchiveView && <CreateTaskDialog />}
          </div>
        </div>

        <TaskFilters onFiltersChange={setFilters} initialFilters={filters} />

        {effectiveViewMode === 'kanban' ? (
            <KanbanBoard tasks={kanbanTasks.regular} overdueTasks={kanbanTasks.overdue} />
        ) : (
            <TaskOverviewTable tasks={filteredTasks} onEditTask={openEditDialog} />
        )}
      </div>
      
      <Dialog open={isPendingApprovalDialogOpen} onOpenChange={setIsPendingApprovalDialogOpen}>
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>Tasks Awaiting Your Approval</DialogTitle>
                <DialogDescription>
                    Review these tasks and approve or return them to the assignee.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] p-1">
                 <div className="p-4 space-y-4">
                    {tasksAwaitingMyApproval.length > 0 ? tasksAwaitingMyApproval.map(task => {
                       const assignee = users.find(u => u.id === task.statusRequest?.requestedBy);
                       const lastComment = task.comments && task.comments.length > 0 ? task.comments[task.comments.length - 1] : null;
                       return (
                         <div key={task.id} className="border p-3 rounded-lg flex justify-between items-center bg-card shadow-sm hover:bg-muted/30 transition-colors">
                           <div>
                               <p className="font-bold text-sm uppercase tracking-tight">{task.title}</p>
                               <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-1 uppercase font-black tracking-widest">
                                <span className="bg-primary/10 text-primary px-1.5 rounded">FROM: {assignee?.name}</span>
                                {lastComment && (
                                   <span>&middot; {formatDistanceToNow(new Date(lastComment.date), { addSuffix: true })}</span>
                                )}
                               </div>
                           </div>
                           <Button variant="secondary" size="sm" onClick={() => openEditDialog(task)} className="font-bold h-8 text-[11px]">VIEW</Button>
                         </div>
                       )
                    }) : <p className="text-muted-foreground text-center py-8">No tasks are awaiting your approval.</p>}
                </div>
            </ScrollArea>
        </DialogContent>
      </Dialog>
      
       {editingTask && (
        <EditTaskDialog 
            isOpen={!!editingTask} 
            setIsOpen={() => setEditingTask(null)} 
            task={editingTask} 
        />
      )}
    </>
  );
}
