
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
import { format, parseISO, differenceInDays } from 'date-fns';
import { Bell, CheckCircle, Clock } from 'lucide-react';
import type { JobProgress, Timesheet, Role, DocumentMovement } from '@/lib/types';
import { cn } from '@/lib/utils';

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
    }).sort((a,b) => parseISO(b.lastUpdated).getTime() - parseISO(a.lastUpdated).getTime());
  }, [user, jobProgress]);

  const pendingTimesheets = useMemo(() => {
    if (!user) return [];
    return timesheets.filter(ts => {
        const isRecipientAction = ts.submittedToId === user.id && (ts.status === 'Pending' || ts.status === 'Acknowledged');
        const isOfficeAction = (ts.status === 'Sent To Office' && canAcknowledgeOffice);
        const isSubmitterAction = (ts.status === 'Rejected' && ts.submitterId === user.id);
        return isRecipientAction || isOfficeAction || isSubmitterAction;
    }).sort((a,b) => parseISO(b.submissionDate).getTime() - parseISO(a.submissionDate).getTime());
  }, [user, timesheets, canAcknowledgeOffice]);

  const pendingDocuments = useMemo(() => {
    if (!user) return [];
    return documentMovements.filter(doc => doc.assigneeId === user.id && (doc.status === 'Pending' || doc.status === 'Returned' || doc.status === 'Acknowledged'))
        .sort((a,b) => parseISO(b.lastUpdated).getTime() - parseISO(a.lastUpdated).getTime());
  }, [user, documentMovements]);


  return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl h-full max-h-[85vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl font-bold">My Actionable Items</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              These items are awaiting your acknowledgment or next action.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="jms" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="flex w-full justify-start h-auto p-1 bg-muted/50 overflow-x-auto whitespace-nowrap scrollbar-hide">
              <TabsTrigger value="jms" className="flex-1 text-[10px] sm:text-xs py-2 px-3 font-black uppercase tracking-widest min-w-[80px]">
                <Bell className="mr-1.5 h-3 w-3" />
                JMS ({pendingJms.length})
              </TabsTrigger>
              <TabsTrigger value="timesheets" className="flex-1 text-[10px] sm:text-xs py-2 px-3 font-black uppercase tracking-widest min-w-[80px]">
                TS ({pendingTimesheets.length})
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex-1 text-[10px] sm:text-xs py-2 px-3 font-black uppercase tracking-widest min-w-[80px]">
                DOCS ({pendingDocuments.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="jms" className="flex-1 overflow-hidden mt-2">
              <ScrollArea className="h-full pr-3">
                <div className="space-y-3 p-1">
                  {pendingJms.length > 0 ? pendingJms.map(job => {
                    const project = projects.find(p => p.id === job.projectId);
                    const locationText = [project?.name, job.plantUnit].filter(Boolean).join(' / ');
                    const daysElapsed = differenceInDays(new Date(), parseISO(job.lastUpdated));
                    const dateVariant = daysElapsed >= 3 ? "destructive" : daysElapsed >= 2 ? "warning" : "secondary";

                    return (
                      <div key={job.id} className="border p-3 rounded-lg flex justify-between items-center cursor-pointer hover:bg-muted/50 bg-card transition-colors shadow-sm" onClick={() => onViewJob(job)}>
                        <div className="min-w-0 pr-4 flex-1">
                          <p className="font-bold text-sm truncate uppercase leading-tight">{locationText || 'N/A'}</p>
                          <p className="text-[11px] text-muted-foreground truncate font-medium mb-1.5">{job.title}</p>
                          {job.jmsNo && (
                            <Badge variant="outline" className="h-4 py-0 px-1.5 text-[9px] font-black border-blue-200 text-blue-700 bg-blue-50 tracking-tighter">
                                JMS: {job.jmsNo}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                            <Badge variant={dateVariant} className="font-black text-[10px] h-5 min-w-[55px] justify-center shadow-sm">
                                {format(parseISO(job.lastUpdated), 'dd MMM')}
                            </Badge>
                            {daysElapsed >= 2 && (
                                <span className={cn("text-[8px] font-black uppercase tracking-tighter", daysElapsed >= 3 ? "text-red-600" : "text-orange-600")}>
                                    {daysElapsed}D DELAY
                                </span>
                            )}
                        </div>
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
                <div className="space-y-3 p-1">
                  {pendingTimesheets.length > 0 ? pendingTimesheets.map(ts => {
                    const tsDays = differenceInDays(new Date(), parseISO(ts.submissionDate));
                    const tsDateVariant = tsDays >= 3 ? "destructive" : tsDays >= 2 ? "warning" : "secondary";
                    
                    return (
                        <div key={ts.id} className="border p-3 rounded-lg flex justify-between items-center cursor-pointer hover:bg-muted/50 bg-card transition-colors shadow-sm" onClick={() => onViewTimesheet(ts)}>
                           <div className="min-w-0 pr-4 flex-1">
                            <p className="font-bold text-sm truncate uppercase leading-tight">{projects.find(p => p.id === ts.projectId)?.name} - {ts.plantUnit}</p>
                            <p className="text-[10px] text-muted-foreground truncate uppercase font-black tracking-widest mt-1">
                                FROM: {users.find(u => u.id === ts.submitterId)?.name}
                            </p>
                            <Badge variant="outline" className="h-4 mt-1.5 text-[9px] font-bold">QTY: {ts.numberOfTimesheets}</Badge>
                          </div>
                           <div className="flex flex-col items-end gap-1 shrink-0">
                                <Badge variant={tsDateVariant} className="font-black text-[10px] h-5 min-w-[55px] justify-center shadow-sm">
                                    {format(parseISO(ts.submissionDate), 'dd MMM')}
                                </Badge>
                                {tsDays >= 2 && (
                                    <span className={cn("text-[8px] font-black uppercase tracking-tighter", tsDays >= 3 ? "text-red-600" : "text-orange-600")}>
                                        {tsDays}D DELAY
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                  }) : (
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
                <div className="space-y-3 p-1">
                  {pendingDocuments.length > 0 ? pendingDocuments.map(doc => {
                    const docDays = differenceInDays(new Date(), parseISO(doc.lastUpdated));
                    const isReturned = doc.status === 'Returned';
                    const docDateVariant = isReturned ? 'destructive' : (docDays >= 3 ? "destructive" : docDays >= 2 ? "warning" : "secondary");
                    
                    return (
                        <div key={doc.id} className="border p-3 rounded-lg flex justify-between items-center cursor-pointer hover:bg-muted/50 bg-card transition-colors shadow-sm" onClick={() => onViewDocument(doc)}>
                          <div className="min-w-0 pr-4 flex-1">
                            <p className="font-bold text-sm truncate uppercase leading-tight">{doc.title}</p>
                            <p className="text-[10px] text-muted-foreground truncate uppercase font-black tracking-widest mt-1">
                                FROM: {users.find(u => u.id === doc.creatorId)?.name}
                            </p>
                            <div className="mt-1.5 flex items-center gap-2">
                                <Badge variant={isReturned ? 'destructive' : 'outline'} className="shrink-0 text-[9px] font-black tracking-widest h-4 py-0">
                                    {doc.status.toUpperCase()}
                                </Badge>
                                {isReturned && <span className="text-[8px] font-bold text-red-600 animate-pulse">ACTION REQ.</span>}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                                <Badge variant={docDateVariant} className="font-black text-[10px] h-5 min-w-[55px] justify-center shadow-sm">
                                    {format(parseISO(doc.lastUpdated), 'dd MMM')}
                                </Badge>
                                {docDays >= 2 && (
                                    <span className={cn("text-[8px] font-black uppercase tracking-tighter", docDays >= 3 ? "text-red-600" : "text-orange-600")}>
                                        {docDays}D DELAY
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                  }) : (
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
            <Button variant="outline" className="w-full font-black uppercase tracking-widest text-[10px] h-12 shadow-sm" onClick={() => setIsOpen(false)}>
              CLOSE INTERFACE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}
