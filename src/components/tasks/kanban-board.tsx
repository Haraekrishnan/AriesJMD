
'use client';

import React, { useState } from 'react';
import type { Task, TaskStatus } from '@/lib/types';
import { useTask } from '@/contexts/task-provider';
import TaskCard from './task-card';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import EditTaskDialog from './edit-task-dialog';
import { isPast, parseISO } from 'date-fns';
import { ScrollArea } from '../ui/scroll-area';

type BoardColumn = 'To Do' | 'In Progress' | 'In Review' | 'Completed' | 'Overdue';

const columns: BoardColumn[] = ['To Do', 'In Progress', 'In Review', 'Completed', 'Overdue'];

const statusMap: Record<BoardColumn, TaskStatus | null> = {
  'To Do': 'To Do',
  'In Progress': 'In Progress',
  'In Review': 'Pending Approval',
  'Completed': 'Done',
  'Overdue': null, 
};

export function KanbanBoard({ tasks, overdueTasks }: { tasks: Task[], overdueTasks: Task[] }) {
  const { requestTaskStatusChange } = useTask();
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

    // Prevent dragging into In Review manually - it should happen via submission
    if (newStatus === 'Pending Approval') {
        setDraggedTask(null);
        return;
    }
    
    const comment = `Status changed to ${newStatus} via drag and drop.`;
    requestTaskStatusChange(task.id, newStatus, comment);
    
    setDraggedTask(null);
  };
  
  const getTasksForColumn = (column: BoardColumn) => {
      if (column === 'Overdue') return overdueTasks.filter(t => t.status !== 'Pending Approval' && t.status !== 'Done');
      
      const status = statusMap[column] as TaskStatus;
      if (column === 'To Do' || column === 'In Progress') {
        return tasks.filter(t => t.status === status && !isPast(parseISO(t.dueDate)));
      }
      return tasks.filter(t => t.status === status);
  }

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 h-full flex-1">
        {columns.map(column => {
          const columnTasks = getTasksForColumn(column);
          return (
          <div
            key={column}
            className="flex flex-col bg-[#EBEDF0] rounded-xl overflow-hidden border shadow-sm"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column)}
          >
            <div className="p-4 shrink-0 flex items-center justify-between border-b bg-[#EBEDF0]/50">
                <h3 className="font-black text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    {column}
                </h3>
                <Badge variant="secondary" className="h-5 px-2 font-black text-[9px] bg-white text-slate-600 rounded-sm shadow-sm border-none">
                    {columnTasks.length}
                </Badge>
            </div>
            <ScrollArea className="flex-1">
                <div className="space-y-4 p-4 pt-4">
                {columnTasks.length > 0 ? (
                    columnTasks.map(task => (
                        <div key={task.id} draggable={column !== 'Overdue' && column !== 'In Review'} onDragStart={(e) => handleDragStart(e, task.id)}>
                            <TaskCard task={task} onClick={() => openEditDialog(task)} />
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 opacity-20">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">No Tasks</p>
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
