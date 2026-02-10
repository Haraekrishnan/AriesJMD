

'use client';

import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/app-provider';
import type { Timesheet, TimesheetStatus } from '@/lib/types';
import { format, parseISO } from 'date-fns';

const statusVariantMap: { [key in TimesheetStatus]: 'default' | 'secondary' | 'destructive' | 'success' } = {
  'Pending': 'secondary',
  'Acknowledged': 'default',
  'Sent To Office': 'success',
  'Office Acknowledged': 'success',
  'Rejected': 'destructive',
};

export default function TimesheetTrackerTable() {
  const { user, users, projects, timesheets, updateTimesheetStatus } = useAppContext();

  const canAcknowledgeOffice = useMemo(() => {
    if (!user) return false;
    return ['Admin', 'Document Controller', 'Project Coordinator'].includes(user.role);
  }, [user]);

  const sortedTimesheets = useMemo(() => {
    if (!timesheets) return [];
    return [...timesheets].sort((a, b) => parseISO(b.submissionDate).getTime() - parseISO(a.submissionDate).getTime());
  }, [timesheets]);
  
  if (sortedTimesheets.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No timesheets submitted yet.</p>;
  }
  
  const getAction = (timesheet: Timesheet) => {
    const isRecipient = timesheet.submittedToId === user?.id;

    switch (timesheet.status) {
      case 'Pending':
        if (isRecipient) {
          return <Button size="sm" onClick={() => updateTimesheetStatus(timesheet.id, 'Acknowledged')}>Acknowledge</Button>;
        }
        return null;
      case 'Acknowledged':
        if (isRecipient) {
          return <Button size="sm" onClick={() => updateTimesheetStatus(timesheet.id, 'Sent To Office')}>Send to Office</Button>;
        }
        return null;
      case 'Sent To Office':
        if (canAcknowledgeOffice) {
          return <Button size="sm" onClick={() => updateTimesheetStatus(timesheet.id, 'Office Acknowledged')}>Acknowledge Office Receipt</Button>;
        }
        return null;
      default:
        return null;
    }
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Submitted By</TableHead>
            <TableHead>Recipient</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTimesheets.map(ts => {
            const submitter = users.find(u => u.id === ts.submitterId);
            const recipient = users.find(u => u.id === ts.submittedToId);
            
            return (
              <TableRow key={ts.id}>
                <TableCell className="font-medium">{submitter?.name || 'Unknown'}</TableCell>
                <TableCell>{recipient?.name || 'Unknown'}</TableCell>
                <TableCell>{format(parseISO(ts.startDate), 'dd/MM/yy')} - {format(parseISO(ts.endDate), 'dd/MM/yy')}</TableCell>
                <TableCell>
                  <Badge variant={statusVariantMap[ts.status]}>{ts.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                    {getAction(ts)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
