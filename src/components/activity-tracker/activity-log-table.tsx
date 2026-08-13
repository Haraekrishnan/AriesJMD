'use client';

import { useAuth } from '@/contexts/auth-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow, parseISO } from 'date-fns';
import type { ActivityLog } from '@/lib/types';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';

interface ActivityLogTableProps {
  logs: ActivityLog[];
}

export default function ActivityLogTable({ logs }: ActivityLogTableProps) {
  const { users } = useAuth();

  if (logs.length === 0) {
    return <p className="text-muted-foreground text-center py-20 font-bold uppercase tracking-widest opacity-20">No activity logs recorded in the last 30 days.</p>;
  }

  return (
    <ScrollArea className="h-[calc(100vh-280px)]">
      <Table className="text-xs">
        <TableHeader className="bg-slate-50 sticky top-0 z-10">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[250px] font-black uppercase tracking-wider h-11">User Details</TableHead>
            <TableHead className="w-[150px] font-black uppercase tracking-wider h-11">Role</TableHead>
            <TableHead className="w-[200px] font-black uppercase tracking-wider h-11">Action Category</TableHead>
            <TableHead className="min-w-[300px] font-black uppercase tracking-wider h-11">Minute Details</TableHead>
            <TableHead className="text-right font-black uppercase tracking-wider h-11 px-6">Relative Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => {
            const logUser = users.find(u => u.id === log.userId);
            return (
              <TableRow key={log.id} className="hover:bg-blue-50/30">
                <TableCell>
                  {logUser && (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border">
                        <AvatarImage src={logUser.avatar} alt={logUser.name} />
                        <AvatarFallback className="font-bold text-[10px]">{logUser.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{logUser.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{logUser.email}</p>
                      </div>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                   <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest h-5 px-1.5 border-slate-300">
                      {logUser?.role || 'N/A'}
                   </Badge>
                </TableCell>
                <TableCell>
                  <p className="font-black text-[10px] uppercase text-blue-700 tracking-tight">{log.action}</p>
                </TableCell>
                <TableCell>
                   <p className="text-slate-600 font-medium leading-relaxed max-w-lg">
                    {log.details || <span className="italic text-slate-400">No additional details</span>}
                   </p>
                </TableCell>
                <TableCell className="text-right text-muted-foreground font-bold px-6">
                  {formatDistanceToNow(parseISO(log.timestamp), { addSuffix: true })}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
