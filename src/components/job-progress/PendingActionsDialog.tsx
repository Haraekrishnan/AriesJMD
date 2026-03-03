'use client';
import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import type { JobProgress, Timesheet, Role } from '@/lib/types';
import { JobProgressTable } from './JobProgressTable';

interface PendingActionsDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onViewJob: (job: JobProgress) => void;
  onViewTimesheet: (timesheet: Timesheet) => void;
}

export default function PendingActionsDialog({ isOpen, setIsOpen, onViewJob, onViewTimesheet }: PendingActionsDialogProps) {
  const { user, jobProgress, timesheets, users, projects } = useAppContext();
  
  const canAcknowledgeOffice = useMemo(() => {
    if (!user) return false;
    return ['Admin', 'Document Controller', 'Project Coordinator'].includes(user.role);
  }, [user]);

  const pendingJms = useMemo(() => {
    if (!user) return [];
    return jobProgress.filter(job => job.steps.some(step => step.assigneeId === user.id && (step.status === 'Pending' || step.isReturned)));
  }, [user, jobProgress]);

  const pendingTimesheets = useMemo(() => {
    if (!user) return [];
    return timesheets.filter(ts => {
        const isRecipientAction = (ts.status === 'Pending' && ts.submittedToId === user.id);
        const isOfficeAction = (ts.status === 'Sent To Office' && canAcknowledgeOffice);
        const isSubmitterAction = (ts.status === 'Rejected' && ts.submitterId === user.id);
        return isRecipientAction || isOfficeAction || isSubmitterAction;
    });
  }, [user, timesheets, canAcknowledgeOffice]);

  return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl h-full max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Pending Actions</DialogTitle>
            <DialogDescription>
              These items are waiting for your acknowledgment or action.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="jms" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="jms">Pending JMS ({pendingJms.length})</TabsTrigger>
              <TabsTrigger value="timesheets">Pending Timesheets ({pendingTimesheets.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="jms" className="flex-1 overflow-auto mt-2">
              <ScrollArea className="h-full">
                <div className="space-y-2 p-1">
                  {pendingJms.length > 0 ? pendingJms.map(job => (
                    <div key={job.id} className="border p-3 rounded-lg flex justify-between items-center cursor-pointer hover:bg-muted/50" onClick={() => onViewJob(job)}>
                      <div>
                        <p className="font-semibold">{job.title}</p>
                        <p className="text-sm text-muted-foreground">Project: {projects.find(p => p.id === job.projectId)?.name || 'N/A'}</p>
                      </div>
                      <Badge>{format(parseISO(job.lastUpdated), 'dd MMM')}</Badge>
                    </div>
                  )) : (
                    <p className="text-muted-foreground text-center py-8">No pending JMS steps.</p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="timesheets" className="flex-1 overflow-auto mt-2">
              <ScrollArea className="h-full">
                <div className="space-y-2 p-1">
                  {pendingTimesheets.length > 0 ? pendingTimesheets.map(ts => (
                    <div key={ts.id} className="border p-3 rounded-lg flex justify-between items-center cursor-pointer hover:bg-muted/50" onClick={() => onViewTimesheet(ts)}>
                       <div>
                        <p className="font-semibold">{projects.find(p => p.id === ts.projectId)?.name} - {ts.plantUnit}</p>
                        <p className="text-sm text-muted-foreground">From: {users.find(u => u.id === ts.submitterId)?.name}</p>
                      </div>
                       <Badge>{format(parseISO(ts.submissionDate), 'dd MMM')}</Badge>
                    </div>
                  )) : (
                     <p className="text-muted-foreground text-center py-8">No pending timesheets.</p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
          <DialogFooter className="mt-auto">
            <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}
