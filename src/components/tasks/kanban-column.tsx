'use client';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import KanbanCard from './kanban-card';
import type { Task, TaskStatus } from '@/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onEditTask: (task: Task) => void;
}

const statusConfig = {
  'To Do': { title: 'To Do', color: 'bg-blue-500' },
  'In Progress': { title: 'In Progress', color: 'bg-yellow-500' },
  'Completed': { title: 'Completed', color: 'bg-green-500' },
  'Overdue': { title: 'Overdue', color: 'bg-red-500' },
  'Done': { title: 'Completed', color: 'bg-green-500' },
  'In Review': { title: 'In Review', color: 'bg-purple-500' },
  'Pending Approval': { title: 'Pending Approval', color: 'bg-orange-500' },
};


export default function KanbanColumn({ status, tasks, onEditTask }: KanbanColumnProps) {
  const config = statusConfig[status];

  return (
    <Card className="flex flex-col max-h-full">
      <CardHeader className="p-4 border-b">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className={cn("h-2.5 w-2.5 rounded-full", config.color)}></span>
          {config.title}
          <span className="ml-auto text-sm font-normal text-muted-foreground bg-muted h-6 w-6 flex items-center justify-center rounded-full">
            {tasks.length}
          </span>
        </CardTitle>
      </CardHeader>
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <ScrollArea className="flex-1">
            <CardContent
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                "p-4 space-y-4 min-h-[100px] transition-colors",
                snapshot.isDraggingOver && "bg-accent"
              )}
            >
              {tasks.map((task, index) => (
                <Draggable key={task.id} draggableId={task.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <KanbanCard task={task} onEdit={() => onEditTask(task)} />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </CardContent>
          </ScrollArea>
        )}
      </Droppable>
    </Card>
  );
}
