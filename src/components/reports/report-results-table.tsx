'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAppContext } from '@/contexts/app-provider';
import type { Task } from '@/lib/types';
import { format } from 'date-fns';

interface ReportResultsTableProps {
  tasks: Task[];
}

export default function ReportResultsTable({ tasks }: ReportResultsTableProps) {
  const { users } = useAppContext();

  const getAssignee = (id: string) => users.find(u => u.id === id);

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'High': return 'destructive';
      case 'Medium': return 'secondary';
      case 'Low': return 'default';
      default: return 'outline';
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="font-semibold">No tasks found</p>
        <p>Try adjusting your filters to see results.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task Title</TableHead>
            <TableHead>Assignee</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Due Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map(task => {
            const assignee = getAssignee(task.assigneeIds[0]); // Assuming one assignee for simplicity in reports
            return (
              <TableRow key={task.id}>
                <TableCell className="font-medium">{task.title}</TableCell>
                <TableCell>
                  {assignee && (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={assignee.avatar} alt={assignee.name} />
                        <AvatarFallback>{assignee.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span>{assignee.name}</span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{task.status}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getPriorityVariant(task.priority)}>{task.priority}</Badge>
                </TableCell>
                <TableCell>{format(new Date(task.dueDate), 'dd MMM, yyyy')}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
