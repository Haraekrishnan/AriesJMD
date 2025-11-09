
'use client';
import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

export default function LogbookRequests() {
  const { user, can, logbookRequests, manpowerProfiles, users, updateLogbookRequestStatus } = useAppContext();

  const pendingRequests = useMemo(() => {
    if (!can.manage_logbook) return [];
    return logbookRequests.filter(r => r.status === 'Pending');
  }, [logbookRequests, can.manage_logbook]);

  if (!can.manage_logbook || pendingRequests.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Logbook Requests</CardTitle>
        <CardDescription>Review and action these requests.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingRequests.map(req => {
              const employee = manpowerProfiles.find(p => p.id === req.manpowerId);
              const requester = users.find(u => u.id === req.requesterId);
              return (
                <TableRow key={req.id}>
                  <TableCell>{employee?.name}</TableCell>
                  <TableCell>{requester?.name}</TableCell>
                  <TableCell>{formatDistanceToNow(parseISO(req.requestDate), { addSuffix: true })}</TableCell>
                  <TableCell>{req.remarks}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" onClick={() => updateLogbookRequestStatus(req.id, 'Completed')}>Approve</Button>
                    <Button size="sm" variant="destructive" onClick={() => updateLogbookRequestStatus(req.id, 'Rejected')}>Reject</Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
