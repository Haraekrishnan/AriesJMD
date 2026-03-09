'use client';
import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import type { JobProgress, Timesheet, Role, DocumentMovement } from '@/lib/types';
import { JobProgressTable } from './JobProgressTable';

interface PendingActionsDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onViewJob: (job: JobProgress) => void;
  onViewTimesheet: (timesheet: Timesheet) => void;
  onViewDocument: (doc: DocumentMovement) => void;
}

export default function PendingActionsDialog({ isOpen, setIsOpen, onViewJob, onViewTimesheet, onViewDocument }: PendingActionsDialogProps) {
  const { user, jobProgress, timesheets, users, projects, documentMovements } = useAppContext();
  
  const canAcknowledgeOffice = useMemo(() => {
    if (!user) return false;
    return ['Admin', 'Document Controller', 'Project Coordinator'].includes(user.role);
  }, [user]);

  const pendingJms = useMemo(() => {
    if (!user) return [];
    return jobProgress.filter(job => {
        if (job.status === 'Completed') return false;
        return job.steps.some(step => 
            step.assigneeId === user.id && 
            (step.status === 'Pending' || step.isReturned || step.status === 'Acknowledged')
        )
    });
  }, [user, jobProgress]);

  const pendingTimesheets = useMemo(() => {
    if (!user) return [];
    return timesheets.filter(ts => {
        const isRecipientAction = ts.submittedToId === user.id && (ts.status === 'Pending' || ts.status === 'Acknowledged');
        const isOfficeAction = (ts.status === 'Sent To Office' && canAcknowledgeOffice);
        const isSubmitterAction = (ts.status === 'Rejected' && ts.submitterId === user.id);
        return isRecipientAction || isOfficeAction || isSubmitterAction;
    });
  }, [user, timesheets, canAcknowledgeOffice]);

  const pendingDocuments = useMemo(() => {
    if (!user) return [];
    return documentMovements.filter(doc => doc.assigneeId === user.id && (doc.status === 'Pending' || doc.status === 'Returned' || doc.status === 'Acknowledged'));
  }, [user, documentMovements]);


  return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl h-full max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>My Actionable Items</DialogTitle>
            <DialogDescription>
              These items are awaiting your acknowledgment or next action.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="jms" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="jms">Pending JMS ({pendingJms.length})</TabsTrigger>
              <TabsTrigger value="timesheets">Pending Timesheets ({pendingTimesheets.length})</TabsTrigger>
              <TabsTrigger value="documents">Documents ({pendingDocuments.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="jms" className="flex-1 overflow-auto mt-2">
              <ScrollArea className="h-full">
                <div className="space-y-2 p-1">
                  {pendingJms.length > 0 ? pendingJms.map(job => {
                    const project = projects.find(p => p.id === job.projectId);
                    const locationText = [project?.name, job.plantUnit].filter(Boolean).join(' / ');
                    return (
                      <div key={job.id} className="border p-3 rounded-lg flex justify-between items-center cursor-pointer hover:bg-muted/50" onClick={() => onViewJob(job)}>
                        <div>
                          <p className="font-semibold">{locationText || 'N/A'}</p>
                          <p className="text-sm text-muted-foreground">{job.title}</p>
                        </div>
                        <Badge>{format(parseISO(job.lastUpdated), 'dd MMM')}</Badge>
                      </div>
                    )
                  }) : (
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
            <TabsContent value="documents" className="flex-1 overflow-auto mt-2">
              <ScrollArea className="h-full">
                <div className="space-y-2 p-1">
                  {pendingDocuments.length > 0 ? pendingDocuments.map(doc => (
                    <div key={doc.id} className="border p-3 rounded-lg flex justify-between items-center cursor-pointer hover:bg-muted/50" onClick={() => onViewDocument(doc)}>
                      <div>
                        <p className="font-semibold">{doc.title}</p>
                        <p className="text-sm text-muted-foreground">From: {users.find(u => u.id === doc.creatorId)?.name}</p>
                      </div>
                      <Badge variant={doc.status === 'Returned' ? 'destructive' : 'secondary'}>{doc.status}</Badge>
                    </div>
                  )) : (
                    <p className="text-muted-foreground text-center py-8">No pending documents.</p>
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
