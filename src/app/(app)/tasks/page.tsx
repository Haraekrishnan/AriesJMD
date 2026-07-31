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
  const [isMyRequestsDialogOpen, setIsMyRequestsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const tasksAwaitingMyApproval = useMemo(() => {
    if (!user) return [];
    return tasks.filter(task => 
      task.creatorId === user.id &&
      task.statusRequest?.status === 'Pending' &&
      !task.isArchived
    );
  }, [tasks, user]);
  
  const mySubmittedTasks = useMemo(() => {
    if (!user) return [];
    return tasks.filter(task => {
      if (task.isArchived) return false;
      const isMySubmittedTask = task.statusRequest?.requestedBy === user.id && task.statusRequest?.status === 'Pending';
      const isReturnedToMe = task.assigneeIds?.includes(user.id) && task.approvalState === 'returned';
      return isMySubmittedTask || isReturnedToMe;
    });
  }, [tasks, user]);

  const visibleTasks = useMemo(() => {
    if (!user) return [];
    
    const highLevelRoles: Role[] = ['Admin', 'Manager', 'Project Coordinator'];
    const hasFullView = highLevelRoles.includes(user.role);
    
    const visibleUserIds = new Set(getVisibleUsers().map(u => u.id));
    
    return tasks.filter(task => {
      // Logic: If 'includeArchived' is false, only show active tasks.
      // If 'includeArchived' is true, show BOTH active and archived.
      if (!filters.includeArchived && task.isArchived) {
          return false;
      }

      if (hasFullView) return true;
      
      // Permission check
      return task.assigneeIds && task.assigneeIds.some(id => visibleUserIds.has(id));
    });
  }, [tasks, user, getVisibleUsers, filters.includeArchived]);

  const filteredTasks = useMemo(() => {
    return visibleTasks.filter(task => {
      const { status, priority, dateRange, showMyTasksOnly, assigneeId, month, year, search, includeArchived } = filters;

      // 1. Archive Logic:
      // If includeArchived is ON, but NO search term is present, we still only show active tasks on the board/main list
      // unless we are in the Overview's archived section.
      // Actually, to make searching work as requested:
      if (task.isArchived && !includeArchived) return false;

      // 2. Search Filter (Title, Description, ID)
      if (search) {
          const term = search.toLowerCase();
          const matchesTitle = (task.title || '').toLowerCase().includes(term);
          const matchesDesc = (task.description || '').toLowerCase().includes(term);
          const matchesId = (task.id || '').toLowerCase().includes(term);
          if (!matchesTitle && !matchesDesc && !matchesId) return false;
      }

      // If there's a pending statusRequest for completion, show it only to approver/requester.
      if (task.statusRequest?.status === 'Pending') {
        const isApprover = task.creatorId === user?.id;
        const isRequester = task.statusRequest?.requestedBy === user?.id;
        if (isApprover || isRequester) {
            return true; 
        }
        return false;
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
  }, [visibleTasks, filters, user]);


  const kanbanTasks = useMemo(() => {
      const regularBoardTasks = filteredTasks.filter(t => t.status !== 'Pending Approval');
      const overdueTasks = regularBoardTasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'Done');
      const overdueTaskIds = new Set(overdueTasks.map(t => t.id));
      const regularTasks = regularBoardTasks.filter(t => !overdueTaskIds.has(t.id));
      return { overdue: overdueTasks, regular: regularTasks };
  }, [filteredTasks]);

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const effectiveViewMode = filters.includeArchived ? 'overview' : viewMode;

  return (
    <>
      <div className="flex flex-col h-full space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {filters.includeArchived ? 'Task Archives' : 'Task Management'}
            </h1>
            <p className="text-muted-foreground text-sm font-medium">
              {filters.includeArchived 
                ? 'Searching through historical records and archived workflows.' 
                : 'Monitor active workflows, track progress, and coordinate tasks.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
              <ReportDownloads tasks={filteredTasks} />
              
              {!filters.includeArchived && (
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

              <div className="flex items-center gap-3 px-3 py-1.5 bg-muted/40 rounded-lg border border-dashed mr-2 shadow-sm">
                <div className="flex items-center gap-2">
                    <FolderArchive className={cn("h-4 w-4", filters.includeArchived ? "text-primary" : "text-slate-400")} />
                    <Label htmlFor="archive-view" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Archived Tasks</Label>
                </div>
                <Switch 
                    id="archive-view" 
                    checked={filters.includeArchived} 
                    onCheckedChange={(checked) => handleFilterChange('includeArchived', checked)} 
                />
              </div>

              <Button variant={myPendingTaskRequestCount > 0 ? "secondary" : "outline"} onClick={() => setIsMyRequestsDialogOpen(true)} className="h-9 font-bold text-xs shadow-sm">
                  <History className="mr-2 h-4 w-4" />
                  My Requests
                  {myPendingTaskRequestCount > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 min-w-[1.25rem] justify-center p-0">{myPendingTaskRequestCount}</Badge>
                  )}
              </Button>
              <Button variant={pendingTaskApprovalCount > 0 ? "secondary" : "outline"} onClick={() => setIsPendingApprovalDialogOpen(true)} className="h-9 font-bold text-xs shadow-sm">
                  <Bell className="mr-2 h-4 w-4" />
                  Pending Approvals
                  {pendingTaskApprovalCount > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 min-w-[1.25rem] justify-center p-0">{pendingTaskApprovalCount}</Badge>
                  )}
              </Button>
              {can.manage_tasks && !filters.includeArchived && <CreateTaskDialog />}
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
      
      <Dialog open={isMyRequestsDialogOpen} onOpenChange={setIsMyRequestsDialogOpen}>
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>My Pending Requests</DialogTitle>
                <DialogDescription>
                    These are tasks you've submitted that are awaiting approval or have been returned for modification.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] p-1">
                <div className="p-4 space-y-4">
                    {mySubmittedTasks.length > 0 ? mySubmittedTasks.map(task => {
                        const approver = users.find(u => u.id === task.creatorId);
                        const lastComment = task.comments && task.comments.length > 0 ? task.comments[task.comments.length - 1] : null;
                        return (
                          <div key={task.id} className="border p-3 rounded-lg flex justify-between items-center bg-card shadow-sm hover:bg-muted/30 transition-colors">
                            <div>
                                <p className="font-bold text-sm uppercase tracking-tight">{task.title}</p>
                                <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-1 uppercase font-black tracking-widest">
                                {task.approvalState === 'returned' ? <Badge variant="destructive" className="h-4 py-0 text-[9px] font-black">RETURNED</Badge> : <Badge className="h-4 py-0 text-[9px] font-black">PENDING</Badge>}
                                <span className="bg-muted px-1.5 rounded">WITH: {approver?.name || 'approver'}</span>
                                {lastComment && (
                                    <span>&middot; {formatDistanceToNow(new Date(lastComment.date), { addSuffix: true })}</span>
                                )}
                                </div>
                            </div>
                            <Button variant="secondary" size="sm" onClick={() => openEditDialog(task)} className="font-bold h-8 text-[11px]">VIEW</Button>
                          </div>
                        )
                    }) : <p className="text-muted-foreground text-center py-8">You have no tasks awaiting approval.</p>}
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
