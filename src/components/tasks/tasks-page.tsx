

'use client';
import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
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
import { Badge } from '../ui/badge';
import { formatDistanceToNow } from 'date-fns';

export default function TasksPage() {
  const { user, users, tasks, pendingTaskApprovalCount, myNewTaskCount, myPendingTaskRequestCount, can } = useAppContext();
  
  const [filters, setFilters] = useState<FiltersType>({
    status: 'all',
    priority: 'all',
    assigneeId: 'all',
    dateRange: undefined,
    showMyTasksOnly: false,
  });

  const [isPendingApprovalDialogOpen, setIsPendingApprovalDialogOpen] = useState(false);
  const [isMyRequestsDialogOpen, setIsMyRequestsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const tasksAwaitingMyApproval = useMemo(() => {
    if (!user) return [];
    return tasks.filter(task => {
        if (task.status !== 'Pending Approval' || !task.approverId) return false;
        return task.approverId === user.id;
    });
  }, [tasks, user]);
  
  const mySubmittedTasks = useMemo(() => {
    if (!user) return [];
    return tasks.filter(task => {
        return task.assigneeId === user.id && (task.status === 'Pending Approval' || task.approvalState === 'returned');
    });
  }, [tasks, user]);


  const filteredTasks = useMemo(() => {
    if (!user) return [];

    const mySubordinateIds = new Set(users.filter(u => u.supervisorId === user.id).map(u => u.id));
    const privilegedRoles: Role[] = ['Admin', 'Project Coordinator', 'Document Controller'];

    return tasks.filter(task => {
      // Don't show pending tasks on the main board
      if (task.status === 'Pending Approval') {
        return false;
      }
      
      const { status, priority, dateRange, showMyTasksOnly, assigneeId } = filters;

      if (assigneeId !== 'all' && !task.assigneeIds?.includes(assigneeId)) {
        return false;
      }

      if (showMyTasksOnly) {
          if (!task.assigneeIds?.includes(user.id)) return false;
      } else {
        if (assigneeId === 'all') { // Only apply visibility logic if not filtering by a specific assignee
          const isMyTask = task.assigneeIds?.includes(user.id);
          const isMySubordinatesTask = task.assigneeIds?.some(id => mySubordinateIds.has(id));
          
          if (!isMyTask && !isMySubordinatesTask && !privilegedRoles.includes(user.role)) {
              return false;
          }
        }
      }
      
      let statusMatch = status === 'all' || task.status === status;
      if (status === 'Completed' && task.status !== 'Done') {
          statusMatch = false;
      } else if (status !== 'all' && status !== 'Completed' && task.status !== status) {
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

      return statusMatch && priorityMatch && dateMatch;
    });
  }, [tasks, filters, user, users]);

  const kanbanTasks = useMemo(() => {
      const overdueTasks = filteredTasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'Done');
      const overdueTaskIds = new Set(overdueTasks.map(t => t.id));
      const regularTasks = filteredTasks.filter(t => !overdueTaskIds.has(t.id));
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
          <div className="flex items-center gap-2">
              <ReportDownloads tasks={filteredTasks} />
              {myPendingTaskRequestCount > 0 && (
                <Button variant="outline" onClick={() => setIsMyRequestsDialogOpen(true)}>
                    <History className="mr-2 h-4 w-4" />
                    My Requests
                    <span className="ml-2 bg-primary text-primary-foreground h-6 w-6 rounded-full flex items-center justify-center text-xs">
                        {myPendingTaskRequestCount}
                    </span>
                </Button>
              )}
              {pendingTaskApprovalCount > 0 && (
                <Button variant="outline" onClick={() => setIsPendingApprovalDialogOpen(true)}>
                    <Bell className="mr-2 h-4 w-4" />
                    Pending Approvals
                    <span className="ml-2 bg-primary text-primary-foreground h-6 w-6 rounded-full flex items-center justify-center text-xs">
                        {pendingTaskApprovalCount}
                    </span>
                </Button>
              )}
              {can.manage_tasks && <CreateTaskDialog />}
          </div>
        </div>
        <div className='mb-4'>
          <TaskFilters onApplyFilters={setFilters} initialFilters={filters}/>
        </div>
        <KanbanBoard tasks={kanbanTasks.regular} overdueTasks={kanbanTasks.overdue} />
      </div>
      
      <Dialog open={isPendingApprovalDialogOpen} onOpenChange={setIsPendingApprovalDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
                <DialogTitle>Tasks Awaiting Your Approval</DialogTitle>
                <DialogDescription>
                    Review these tasks and approve or return them to the assignee.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] p-1">
                <div className="p-4 space-y-4">
                    {tasksAwaitingMyApproval.length > 0 ? tasksAwaitingMyApproval.map(task => (
                        <div key={task.id} className="border p-4 rounded-lg">
                           <EditTaskDialog isOpen={true} setIsOpen={() => {}} task={task} />
                        </div>
                    )) : <p className="text-muted-foreground text-center">No tasks are awaiting your approval.</p>}
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
                        const approver = users.find(u => u.id === task.approverId);
                        return (
                          <div key={task.id} className="border p-3 rounded-lg flex justify-between items-center">
                            <div>
                                <p className="font-semibold">{task.title}</p>
                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                {task.approvalState === 'returned' ? <Badge variant="destructive">Returned</Badge> : <Badge>Pending</Badge>}
                                <span>with {approver?.name || 'approver'}</span>
                                <span className='text-xs'>- {formatDistanceToNow(new Date(task.comments[task.comments.length-1]?.date), { addSuffix: true })}</span>
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
