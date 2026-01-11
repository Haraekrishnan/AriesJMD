
'use client';
import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { useTask } from '@/contexts/task-provider';
import { KanbanBoard } from '@/components/tasks/kanban-board';
import CreateTaskDialog from '@/components/tasks/create-task-dialog';
import TaskFilters, { type TaskFilters as FiltersType } from '@/components/tasks/task-filters';
import { Button } from '@/components/ui/button';
import { Bell, History, Edit } from 'lucide-react';
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
import { formatDistanceToNow, isWithinInterval, startOfMonth, endOfMonth, getMonth, getYear, parseISO } from 'date-fns';

export default function TasksPage() {
  const { user, users, can, getVisibleUsers } = useAuth();
  const { tasks, pendingTaskApprovalCount, myNewTaskCount, myPendingTaskRequestCount } = useTask();
  
  const [filters, setFilters] = useState<FiltersType>({
    status: 'all',
    priority: 'all',
    assigneeId: 'all',
    dateRange: undefined,
    month: 'all',
    showMyTasksOnly: false,
  });

  const [isPendingApprovalDialogOpen, setIsPendingApprovalDialogOpen] = useState(false);
  const [isMyRequestsDialogOpen, setIsMyRequestsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const tasksAwaitingMyApproval = useMemo(() => {
    if (!user) return [];
    // Show tasks where I am the creator/approver and there's a pending statusRequest
    return tasks.filter(task => 
      task.creatorId === user.id &&
      task.statusRequest?.status === 'Pending'
    );
  }, [tasks, user]);
  
  const mySubmittedTasks = useMemo(() => {
    if (!user) return [];
    return tasks.filter(task => {
      // A submission request by me that's still pending
      const isMySubmittedTask = task.statusRequest?.requestedBy === user.id && task.statusRequest?.status === 'Pending';
      // Returned tasks to me (explicit returned state)
      const isReturnedToMe = task.assigneeIds?.includes(user.id) && task.approvalState === 'returned';
      // Also include tasks where I requested completion and the statusRequest still present
      const isAwaitingCompletionApproval = task.statusRequest?.requestedBy === user.id && task.statusRequest?.status === 'Pending';
      return isMySubmittedTask || isReturnedToMe || isAwaitingCompletionApproval;
    });
  }, [tasks, user]);

  const visibleTasks = useMemo(() => {
    if (!user) return [];
    if (user.role === 'Manager' || user.role === 'Admin') {
        return tasks;
    }
    const visibleUserIds = new Set(getVisibleUsers().map(u => u.id));
    return tasks.filter(task => {
      // Show a task if any of its assignees are visible to the current user
      return task.assigneeIds && task.assigneeIds.some(id => visibleUserIds.has(id));
    });
  }, [tasks, user, getVisibleUsers]);

  const filteredTasks = useMemo(() => {
    return visibleTasks.filter(task => {
      // If there's a pending statusRequest for completion, show it only to approver/requester.
      if (task.statusRequest?.status === 'Pending') {
        const isApprover = task.creatorId === user?.id;
        const isRequester = task.statusRequest?.requestedBy === user?.id;
        if (isApprover || isRequester) {
            return true; // Always show these tasks regardless of other filters
        }
        return false;
      }
      
      const { status, priority, dateRange, showMyTasksOnly, assigneeId, month } = filters;

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
        const taskMonth = getMonth(taskDate) + 1;
        const taskYear = getYear(taskDate);
        const currentYear = getYear(new Date());

        // For completed tasks, they must be in the selected month
        if(task.status === 'Done') {
            if(task.completionDate) {
              const completionDate = parseISO(task.completionDate);
              monthMatch = (getMonth(completionDate) + 1).toString() === month;
            } else {
               monthMatch = false;
            }
        }
        // For other tasks, they are always included regardless of month, unless a date range filter is also active
        else if (!dateRange?.from) {
            monthMatch = true;
        } else {
             monthMatch = (getMonth(taskDate) + 1).toString() === month && taskYear === currentYear;
        }
      }

      // Final logic adjustment: if a date range is picked, it overrides the month filter for non-completed tasks
      if (dateRange?.from && task.status !== 'Done') {
          monthMatch = true; // Date range takes precedence
      } else if (task.status !== 'Done') {
          monthMatch = true; // Always show active tasks unless filtered by date range
      }


      return statusMatch && priorityMatch && dateMatch && monthMatch;
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

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Task Board</h1>
            <p className="text-muted-foreground">Drag and drop tasks to change their status, or use filters to generate a report.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <ReportDownloads tasks={filteredTasks} />
              <Button variant={myPendingTaskRequestCount > 0 ? "secondary" : "outline"} onClick={() => setIsMyRequestsDialogOpen(true)}>
                  <History className="mr-2 h-4 w-4" />
                  My Requests
                  {myPendingTaskRequestCount > 0 && (
                    <span className="ml-2 bg-primary text-primary-foreground h-6 w-6 rounded-full flex items-center justify-center text-xs">
                        {myPendingTaskRequestCount}
                    </span>
                  )}
              </Button>
              <Button variant={pendingTaskApprovalCount > 0 ? "secondary" : "outline"} onClick={() => setIsPendingApprovalDialogOpen(true)}>
                  <Bell className="mr-2 h-4 w-4" />
                  Pending Approvals
                  {pendingTaskApprovalCount > 0 && (
                    <span className="ml-2 bg-primary text-primary-foreground h-6 w-6 rounded-full flex items-center justify-center text-xs">
                        {pendingTaskApprovalCount}
                    </span>
                  )}
              </Button>
              {can.manage_tasks && <CreateTaskDialog />}
          </div>
        </div>
        <div className='mb-4'>
          <TaskFilters onFiltersChange={setFilters} initialFilters={filters} />
        </div>
        <KanbanBoard tasks={kanbanTasks.regular} overdueTasks={kanbanTasks.overdue} />
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
                         <div key={task.id} className="border p-3 rounded-lg flex justify-between items-center">
                           <div>
                               <p className="font-semibold">{task.title}</p>
                               <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <Badge>From: {assignee?.name}</Badge>
                                {lastComment && (
                                   <span className='text-xs'>- {formatDistanceToNow(new Date(lastComment.date), { addSuffix: true })}</span>
                                )}
                               </div>
                           </div>
                           <Button variant="secondary" size="sm" onClick={() => openEditDialog(task)}><Edit className="mr-2 h-3 w-3" />View</Button>
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
                          <div key={task.id} className="border p-3 rounded-lg flex justify-between items-center">
                            <div>
                                <p className="font-semibold">{task.title}</p>
                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                {task.approvalState === 'returned' ? <Badge variant="destructive">Returned</Badge> : <Badge>Pending</Badge>}
                                <span>with {approver?.name || 'approver'}</span>
                                {lastComment && (
                                    <span className='text-xs'>- {formatDistanceToNow(new Date(lastComment.date), { addSuffix: true })}</span>
                                )}
                                </div>
                            </div>
                            <Button variant="secondary" size="sm" onClick={() => openEditDialog(task)}><Edit className="mr-2 h-3 w-3" />View</Button>
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