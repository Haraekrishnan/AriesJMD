'use client';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useMemo } from 'react';
import { useAppContext } from '@/hooks/use-app-context';
import KanbanColumn from './kanban-column';
import type { Task, TaskStatus } from '@/types';

const KANBAN_COLUMNS: TaskStatus[] = ['To Do', 'In Progress', 'Completed', 'Overdue'];

interface KanbanBoardProps {
  tasks: Task[];
  overdueTasks: Task[];
  onEditTask: (task: Task) => void;
}

export function KanbanBoard({ tasks, overdueTasks, onEditTask }: KanbanBoardProps) {
  const { updateTask } = useAppContext();

  const columns = useMemo(() => {
    const columnMap = new Map<TaskStatus, Task[]>();
    KANBAN_COLUMNS.forEach(status => columnMap.set(status, []));

    tasks.forEach(task => {
      const column = columnMap.get(task.status);
      if (column) {
        column.push(task);
      }
    });
    
    if (overdueTasks.length > 0) {
        columnMap.set('Overdue', overdueTasks);
    }

    return columnMap;
  }, [tasks, overdueTasks]);
  
  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) {
      return;
    }

    const task = tasks.find(t => t.id === draggableId);
    if (!task) return;
    
    const newStatus = destination.droppableId as TaskStatus;

    if (newStatus === 'Completed') {
        updateTask({
            ...task,
            status: 'Pending Approval',
            pendingStatus: 'Completed',
            previousStatus: task.status
        });
    } else {
        updateTask({ ...task, status: newStatus });
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start flex-1">
        {KANBAN_COLUMNS.map(status => {
           if (status === 'Overdue' && overdueTasks.length === 0) return null;
           return (
            <KanbanColumn key={status} status={status} tasks={columns.get(status) || []} onEditTask={onEditTask} />
           )
        })}
      </div>
    </DragDropContext>
  );
}
