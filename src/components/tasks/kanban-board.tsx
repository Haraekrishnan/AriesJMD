
'use client';

import React, { useState } from 'react';
import type { Task, TaskStatus } from '@/lib/types';
import { useAppContext } from '@/contexts/app-provider';
import TaskCard from './task-card';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import EditTaskDialog from './edit-task-dialog';
import { isPast } from 'date-fns';
import { ScrollArea } from '../ui/scroll-area';

type BoardColumn = 'To Do' | 'In Progress' | 'Completed' | 'Overdue';

const columns: BoardColumn[] = ['To Do', 'In Progress', 'Completed', 'Overdue'];

const statusMap: Record<BoardColumn, TaskStatus | null> = {
  'To Do': 'To Do',
  'In Progress': 'In Progress',
  'Completed': 'Done',
  'Overdue': null, 
};

const columnColors: Record<BoardColumn, string> = {
    'To Do': 'border-t-blue-500',
    'In Progress': 'border-t-yellow-500',
    'Completed': 'border-t-green-500',
    'Overdue': 'border-t-red-500',
}

export function KanbanBoard({ tasks, overdueTasks }: { tasks: Task[], overdueTasks: Task[] }) {
  const { user, requestTaskStatusChange } = useAppContext();
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, column: BoardColumn) => {
    e.preventDefault();
    if (!draggedTask) return;
    
    const newStatus = statusMap[column];
    if (!newStatus) { 
        setDraggedTask(null);
        return;
    }

    const task = tasks.find(t => t.id === draggedTask) || overdueTasks.find(t => t.id === draggedTask);
    if (!task) return;
    
    const comment = `Status changed to ${newStatus} via drag and drop.`;
    requestTaskStatusChange(task.id, newStatus, comment);
    
    setDraggedTask(null);
  };
  
  const getTasksForColumn = (column: BoardColumn) => {
      if (column === 'Overdue') return overdueTasks.filter(t => t.status !== 'Pending Approval');;
      const status = statusMap[column] as TaskStatus;
      // Exclude overdue tasks from regular columns
      if (column === 'To Do' || column === 'In Progress') {
        return tasks.filter(t => t.status === status && !isPast(new Date(t.dueDate)));
      }
      return tasks.filter(t => t.status === status);
  }

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full flex-1">
        {columns.map(column => {
          const columnTasks = getTasksForColumn(column);
          return (
          <div
            key={column}
            className="flex flex-col bg-card rounded-lg border overflow-hidden" // Added overflow-hidden
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column)}
          >
            <div className={cn("font-bold p-4 shrink-0 bg-card rounded-t-lg border-t-4", columnColors[column])}>
                <h3 className="flex items-center gap-2 text-base">
                    <span>{column}</span>
                    <Badge variant="secondary" className="text-sm">{columnTasks.length}</Badge>
                </h3>
            </div>
            <ScrollArea className="flex-1">
                <div className="space-y-4 p-4 pt-2">
                {columnTasks.length > 0 ? (
                    columnTasks.map(task => (
                        <div key={task.id} draggable={column !== 'Overdue'} onDragStart={(e) => handleDragStart(e, task.id)}>
                            <TaskCard task={task} onClick={() => openEditDialog(task)} />
                        </div>
                    ))
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm pt-20">
                        No tasks here.
                    </div>
                )}
                </div>
            </ScrollArea>
          </div>
        )})}
      </div>
      
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
