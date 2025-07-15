'use client';

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import type { ActivityLog } from '@/types';
import { format } from 'date-fns';
import { useAppContext } from '@/hooks/use-app-context';

type ActivityLogTableProps = {
  logs: ActivityLog[];
};

export default function ActivityLogTable({ logs }: ActivityLogTableProps) {
  const { users } = useAppContext();

  const getUserName = (userId: string) => {
    return users.find(u => u.id === userId)?.name || 'Unknown User';
  };

  if (logs.length === 0) {
    return <p className="text-muted-foreground text-center py-4">No activity logs found.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Details</TableHead>
          <TableHead className="text-right">Timestamp</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => (
          <TableRow key={log.id}>
            <TableCell>{getUserName(log.userId)}</TableCell>
            <TableCell className="font-medium">{log.action}</TableCell>
            <TableCell>{log.details}</TableCell>
            <TableCell className="text-right">{format(new Date(log.timestamp), 'dd MMM yyyy, hh:mm a')}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
