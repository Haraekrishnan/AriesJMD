
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
import { Bell, CheckCircle, Clock, FileText } from 'lucide-react';
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
        <DialogContent className="max-w-2xl w-[95vw] h-full max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2 shrink-0">
            <DialogTitle className="text-xl font-bold tracking-tight">My Actionable Items</DialogTitle>
            <DialogDescription className="text-xs font-medium text-slate-500">
              These items are awaiting your acknowledgment or next action.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="jms" className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 shrink-0">
                <TabsList className="flex w-full h-auto p-1 bg-muted/50 rounded-lg">
                <TabsTrigger value="jms" className="flex-1 text-[11px] sm:text-xs py-2 px-1 font-bold uppercase tracking-tight data-[state=active]:shadow-sm">
                    JMS ({pendingJms.length})
                </TabsTrigger>
                <TabsTrigger value="timesheets" className="flex-1 text-[11px] sm:text-xs py-2 px-1 font-bold uppercase tracking-tight data-[state=active]:shadow-sm">
                    TS ({pendingTimesheets.length})
                </TabsTrigger>
                <TabsTrigger value="documents" className="flex-1 text-[11px] sm:text-xs py-2 px-1 font-bold uppercase tracking-tight data-[state=active]:shadow-sm">
                    DOCS ({pendingDocuments.length})
                </TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="jms" className="flex-1 overflow-hidden mt-2 p-0">
              <ScrollArea className="h-full px-6">
                <div className="space-y-3 pb-6">
                  {pendingJms.length > 0 ? pendingJms.map(job => {
                    const project = projects.find(p => p.id === job.projectId);
                    const locationText = [project?.name, job.plantUnit].filter(Boolean).join(' / ');
                    const daysElapsed = differenceInDays(new Date(), parseISO(job.lastUpdated));
                    
                    const borderColor = daysElapsed >= 3 ? "border-l-rose-500" : daysElapsed >= 2 ? "border-l-orange-400" : "border-l-blue-400";
                    const dateColor = daysElapsed >= 3 ? "text-rose-600" : daysElapsed >= 2 ? "text-orange-600" : "text-blue-600";

                    return (
                      <div 
                        key={job.id} 
                        className={cn(
                            "border border-l-4 rounded-lg flex justify-between items-center cursor-pointer hover:bg-muted/30 bg-card transition-colors shadow-sm p-3",
                            borderColor
                        )} 
                        onClick={() => onViewJob(job)}
                      >
                        <div className="min-w-0 pr-4 flex-1">
                          <p className="font-bold text-xs sm:text-sm truncate uppercase text-slate-900">{locationText || 'N/A'}</p>
                          <p className="text-[10px] text-slate-500 truncate font-bold mb-2 uppercase">{job.title}</p>
                          <div className="flex items-center gap-2">
                            {job.jmsNo && (
                                <Badge variant="outline" className="h-5 py-0 px-2 text-[9px] font-black border-blue-200 text-blue-700 bg-blue-50 tracking-tighter">
                                    JMS: {job.jmsNo}
                                </Badge>
                            )}
                            <div className={cn("text-[10px] font-black uppercase flex items-center gap-1", dateColor)}>
                                <Clock className="h-3 w-3" />
                                {format(parseISO(job.lastUpdated), 'dd MMM')}
                                {daysElapsed > 0 && <span className="opacity-70 ml-1">({daysElapsed}D)</span>}
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="shrink-0 text-slate-300">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  }) : (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-30">
                        <CheckCircle className="h-10 w-10 mb-2" />
                        <p className="text-xs font-bold uppercase tracking-widest">No pending JMS steps</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="timesheets" className="flex-1 overflow-hidden mt-2 p-0">
              <ScrollArea className="h-full px-6">
                <div className="space-y-3 pb-6">
                  {pendingTimesheets.length > 0 ? pendingTimesheets.map(ts => {
                    const tsDays = differenceInDays(new Date(), parseISO(ts.submissionDate));
                    const borderColor = tsDays >= 3 ? "border-l-rose-500" : tsDays >= 2 ? "border-l-orange-400" : "border-l-blue-400";
                    
                    return (
                        <div 
                            key={ts.id} 
                            className={cn(
                                "border border-l-4 rounded-lg flex justify-between items-center cursor-pointer hover:bg-muted/30 bg-card transition-colors shadow-sm p-3",
                                borderColor
                            )} 
                            onClick={() => onViewTimesheet(ts)}
                        >
                           <div className="min-w-0 pr-4 flex-1">
                            <p className="font-bold text-xs sm:text-sm truncate uppercase text-slate-900">
                                {projects.find(p => p.id === ts.projectId)?.name} - {ts.plantUnit}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate uppercase font-bold mt-1">
                                FROM: {users.find(u => u.id === ts.submitterId)?.name}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                                <Badge variant="outline" className="h-4 text-[9px] font-black border-slate-200">QTY: {ts.numberOfTimesheets}</Badge>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                    Sub: {format(parseISO(ts.submissionDate), 'dd MMM')}
                                </span>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                        </div>
                    );
                  }) : (
                     <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-30">
                        <CheckCircle className="h-10 w-10 mb-2" />
                        <p className="text-xs font-bold uppercase tracking-widest">No pending timesheets</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="documents" className="flex-1 overflow-hidden mt-2 p-0">
              <ScrollArea className="h-full px-6">
                <div className="space-y-3 pb-6">
                  {pendingDocuments.length > 0 ? pendingDocuments.map(doc => {
                    const docDays = differenceInDays(new Date(), parseISO(doc.lastUpdated));
                    const isReturned = doc.status === 'Returned';
                    const borderColor = isReturned ? "border-l-rose-600" : (docDays >= 3 ? "border-l-rose-500" : "border-l-blue-400");
                    
                    return (
                        <div 
                            key={doc.id} 
                            className={cn(
                                "border border-l-4 rounded-lg flex justify-between items-center cursor-pointer hover:bg-muted/30 bg-card transition-colors shadow-sm p-3",
                                borderColor
                            )} 
                            onClick={() => onViewDocument(doc)}
                        >
                          <div className="min-w-0 pr-4 flex-1">
                            <p className="font-bold text-xs sm:text-sm truncate uppercase text-slate-900">{doc.title}</p>
                            <p className="text-[10px] text-slate-500 truncate uppercase font-bold mt-1">
                                FROM: {users.find(u => u.id === doc.creatorId)?.name}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                                <Badge variant={isReturned ? 'destructive' : 'outline'} className="shrink-0 text-[9px] font-black tracking-widest h-4 py-0">
                                    {doc.status.toUpperCase()}
                                </Badge>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                    {format(parseISO(doc.lastUpdated), 'dd MMM')}
                                </span>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                        </div>
                    );
                  }) : (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-30">
                        <CheckCircle className="h-10 w-10 mb-2" />
                        <p className="text-xs font-bold uppercase tracking-widest">No pending documents</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <DialogFooter className="p-4 border-t shrink-0">
            <Button variant="outline" className="w-full font-black uppercase tracking-widest text-[10px] h-11" onClick={() => setIsOpen(false)}>
              CLOSE INTERFACE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}

const ChevronRight = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m9 18 6-6-6-6"/></svg>
);
