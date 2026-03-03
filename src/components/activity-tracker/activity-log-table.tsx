'use client';

import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import type { ActivityLog } from '@/lib/types';

interface ActivityLogTableProps {
  logs: ActivityLog[];
}

export default function ActivityLogTable({ logs }: ActivityLogTableProps) {
  const { users } = useAppContext();

  if (logs.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No activity logs to display.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Details</TableHead>
          <TableHead className="text-right">Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => {
          const logUser = users.find(u => u.id === log.userId);
          return (
            <TableRow key={log.id}>
              <TableCell>
                {logUser && (
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={logUser.avatar} alt={logUser.name} />
                      <AvatarFallback>{logUser.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{logUser.name}</p>
                      <p className="text-sm text-muted-foreground">{logUser.email}</p>
                    </div>
                  </div>
                )}
              </TableCell>
              <TableCell>
                <p className="font-medium">{log.action}</p>
              </TableCell>
              <TableCell>
                 <p className="text-sm text-muted-foreground">{log.details || 'N/A'}</p>
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
