'use client';
import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { usePlanner } from '@/contexts/planner-provider';
import { useGeneral } from '@/contexts/general-provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { Bell, CheckCircle } from 'lucide-react';
import type { JobProgress, Timesheet, Role, DocumentMovement } from '@/lib/types';

interface PendingActionsDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onViewJob: (job: JobProgress) => void;
  onViewTimesheet: (timesheet: Timesheet) => void;
  onViewDocument: (doc: DocumentMovement) => void;
}

export default function PendingActionsDialog({ isOpen, setIsOpen, onViewJob, onViewTimesheet, onViewDocument }: PendingActionsDialogProps) {
  const { user, users } = useAuth();
  const { jobProgress, timesheets, documentMovements } = usePlanner();
  const { projects } = useGeneral();
  
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
        <DialogContent className="max-w-2xl h-full max-h-[85vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl font-bold">My Actionable Items</DialogTitle>
            <DialogDescription className="text-sm">
              These items are awaiting your acknowledgment or next action.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="jms" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="flex w-full justify-start h-auto p-1 bg-muted/50 overflow-x-auto whitespace-nowrap">
              <TabsTrigger value="jms" className="flex-1 text-[10px] sm:text-xs py-2 px-3 font-bold uppercase tracking-wider">
                <Bell className="mr-1.5 h-3 w-3 sm:h-3.5 sm:w-3.5" />
                JMS ({pendingJms.length})
              </TabsTrigger>
              <TabsTrigger value="timesheets" className="flex-1 text-[10px] sm:text-xs py-2 px-3 font-bold uppercase tracking-wider">
                TS ({pendingTimesheets.length})
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex-1 text-[10px] sm:text-xs py-2 px-3 font-bold uppercase tracking-wider">
                DOCS ({pendingDocuments.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="jms" className="flex-1 overflow-hidden mt-2">
              <ScrollArea className="h-full pr-3">
                <div className="space-y-2 p-1">
                  {pendingJms.length > 0 ? pendingJms.map(job => {
                    const project = projects.find(p => p.id === job.projectId);
                    const locationText = [project?.name, job.plantUnit].filter(Boolean).join(' / ');
                    return (
                      <div key={job.id} className="border p-3 rounded-lg flex justify-between items-center cursor-pointer hover:bg-muted/50 bg-card transition-colors shadow-sm" onClick={() => onViewJob(job)}>
                        <div className="min-w-0 pr-4">
                          <p className="font-bold text-sm truncate uppercase">{locationText || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground truncate">{job.title}</p>
                        </div>
                        <Badge variant="secondary" className="shrink-0 font-mono text-[10px]">
                          {format(parseISO(job.lastUpdated), 'dd MMM')}
                        </Badge>
                      </div>
                    )
                  }) : (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-60">
                        <CheckCircle className="h-10 w-10 mb-2" />
                        <p className="text-sm font-bold uppercase tracking-widest">No pending JMS steps</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="timesheets" className="flex-1 overflow-hidden mt-2">
              <ScrollArea className="h-full pr-3">
                <div className="space-y-2 p-1">
                  {pendingTimesheets.length > 0 ? pendingTimesheets.map(ts => (
                    <div key={ts.id} className="border p-3 rounded-lg flex justify-between items-center cursor-pointer hover:bg-muted/50 bg-card transition-colors shadow-sm" onClick={() => onViewTimesheet(ts)}>
                       <div className="min-w-0 pr-4">
                        <p className="font-bold text-sm truncate uppercase">{projects.find(p => p.id === ts.projectId)?.name} - {ts.plantUnit}</p>
                        <p className="text-[10px] text-muted-foreground truncate">FROM: {users.find(u => u.id === ts.submitterId)?.name?.toUpperCase()}</p>
                      </div>
                       <Badge variant="secondary" className="shrink-0 font-mono text-[10px]">
                        {format(parseISO(ts.submissionDate), 'dd MMM')}
                       </Badge>
                    </div>
                  )) : (
                     <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-60">
                        <CheckCircle className="h-10 w-10 mb-2" />
                        <p className="text-sm font-bold uppercase tracking-widest">No pending timesheets</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="documents" className="flex-1 overflow-hidden mt-2">
              <ScrollArea className="h-full pr-3">
                <div className="space-y-2 p-1">
                  {pendingDocuments.length > 0 ? pendingDocuments.map(doc => (
                    <div key={doc.id} className="border p-3 rounded-lg flex justify-between items-center cursor-pointer hover:bg-muted/50 bg-card transition-colors shadow-sm" onClick={() => onViewDocument(doc)}>
                      <div className="min-w-0 pr-4">
                        <p className="font-bold text-sm truncate uppercase">{doc.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate">FROM: {users.find(u => u.id === doc.creatorId)?.name?.toUpperCase()}</p>
                      </div>
                      <Badge variant={doc.status === 'Returned' ? 'destructive' : 'secondary'} className="shrink-0 text-[9px] font-black tracking-tighter">
                        {doc.status.toUpperCase()}
                      </Badge>
                    </div>
                  )) : (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-60">
                        <CheckCircle className="h-10 w-10 mb-2" />
                        <p className="text-sm font-bold uppercase tracking-widest">No pending documents</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4 pt-4 border-t">
            <Button variant="outline" className="w-full font-bold uppercase tracking-widest text-xs h-11" onClick={() => setIsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}
