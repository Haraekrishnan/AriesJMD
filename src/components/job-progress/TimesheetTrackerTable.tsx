
'use client';

import { useMemo, useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAppContext } from '@/contexts/app-provider';
import { useToast } from '@/hooks/use-toast';
import type { Comment, Timesheet, TimesheetStatus } from '@/lib/types';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { Building, CheckCircle, UserCheck, XCircle, Send, MessageSquare, Trash2, Eye } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

const statusVariantMap: { [key in TimesheetStatus]: 'default' | 'secondary' | 'destructive' | 'success' } = {
  'Pending': 'secondary',
  'Acknowledged': 'default',
  'Sent To Office': 'default',
  'Office Acknowledged': 'success',
  'Rejected': 'destructive',
};

const TimelineItem = ({ icon: Icon, title, actorName, date, children }: { icon: React.ElementType, title: string, actorName?: string, date?: string, children?: React.ReactNode }) => {
    if (!actorName || !date) {
        return (
             <div className="flex gap-4">
                <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted border">
                        <Icon className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                </div>
                <div>
                    <p className="font-semibold text-muted-foreground/50">{title}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex gap-4">
            <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                {children && <div className="h-full min-h-[2rem] w-px bg-border my-1" />}
            </div>
            <div>
                <p className="font-semibold">{title}</p>
                <p className="text-xs text-muted-foreground">
                    by {actorName} on {format(parseISO(date), 'dd MMM, yyyy')}
                </p>
            </div>
        </div>
    );
};


export default function TimesheetTrackerTable({ timesheets }: { timesheets: Timesheet[] }) {
  const { user, users, projects, updateTimesheetStatus, deleteTimesheet } = useAppContext();
  const { toast } = useToast();
  const [rejectionInfo, setRejectionInfo] = useState<{ timesheet: Timesheet, action: 'Reject' | 'Reopen' } | null>(null);
  const [reason, setReason] = useState('');
  const [comments, setComments] = useState<Record<string, string>>({});

  const canAcknowledgeOffice = useMemo(() => {
    if (!user) return false;
    return ['Admin', 'Document Controller', 'Project Coordinator'].includes(user.role);
  }, [user]);

  const handleRejectClick = (timesheet: Timesheet, action: 'Reject' | 'Reopen') => {
      setRejectionInfo({ timesheet, action });
  };
  
  const handleConfirmRejection = () => {
      if (!rejectionInfo || !reason.trim()) {
          toast({ title: "A reason is required.", variant: 'destructive' });
          return;
      }
      updateTimesheetStatus(rejectionInfo.timesheet.id, 'Rejected', reason);
      setRejectionInfo(null);
      setReason('');
  };

  const getAction = (timesheet: Timesheet) => {
    const isRecipient = timesheet.submittedToId === user?.id;

    switch (timesheet.status) {
      case 'Pending':
        if (isRecipient) {
          return <Button size="sm" onClick={() => updateTimesheetStatus(timesheet.id, 'Acknowledged', 'Acknowledged by recipient.')}>Acknowledge</Button>;
        }
        return null;
      case 'Acknowledged':
        if (isRecipient) {
          return <Button size="sm" onClick={() => updateTimesheetStatus(timesheet.id, 'Sent To Office')}>Send to Office</Button>;
        }
        return null;
      case 'Sent To Office':
        if (canAcknowledgeOffice) {
            return (
                <div className="flex flex-col items-center gap-2">
                    <Button size="sm" onClick={() => updateTimesheetStatus(timesheet.id, 'Office Acknowledged', 'Acknowledged by office.')}>Acknowledge Receipt</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleRejectClick(timesheet, 'Reject')}>Reject</Button>
                </div>
            );
        }
        return null;
      case 'Office Acknowledged':
         if (canAcknowledgeOffice) {
            return <Button size="sm" variant="outline" onClick={() => handleRejectClick(timesheet, 'Reopen')}>Reopen/Query</Button>
         }
         return null;
      case 'Rejected':
        if (isRecipient) {
            return (
                <div className="space-y-2 w-full text-left">
                    <Label htmlFor={`comment-${timesheet.id}`} className="text-xs">Reply to query</Label>
                    <Textarea
                        id={`comment-${timesheet.id}`}
                        placeholder="Add your reply..."
                        value={comments[timesheet.id] || ''}
                        onChange={(e) => setComments(prev => ({...prev, [timesheet.id]: e.target.value}))}
                        rows={2}
                    />
                    <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                            const commentText = comments[timesheet.id]?.trim();
                            if (!commentText) {
                                toast({ title: "Reply is required to re-acknowledge.", variant: 'destructive'});
                                return;
                            }
                            updateTimesheetStatus(timesheet.id, 'Acknowledged', commentText);
                            setComments(prev => ({...prev, [timesheet.id]: ''}));
                        }}
                        disabled={!comments[timesheet.id]?.trim()}
                    >
                        Reply & Re-Acknowledge
                    </Button>
                </div>
            );
        }
        return null;
      default:
        return null;
    }
  };

  const sortedTimesheets = useMemo(() => {
    return [...timesheets].sort((a, b) => parseISO(b.submissionDate).getTime() - parseISO(a.submissionDate).getTime());
  }, [timesheets]);
  
  if (sortedTimesheets.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No timesheets found for this period.</p>;
  }

  return (
    <>
      <Accordion type="multiple" className="w-full space-y-2">
        {sortedTimesheets.map(ts => {
          const submitter = users.find(u => u.id === ts.submitterId);
          const project = projects.find(p => p.id === ts.projectId);
          const acknowledgedBy = users.find(u => u.id === ts.acknowledgedById);
          const sentToOfficeBy = users.find(u => u.id === ts.sentToOfficeById);
          const officeAcknowledgedBy = users.find(u => u.id === ts.officeAcknowledgedById);
          const rejectedBy = users.find(u => u.id === ts.rejectedById);
          const commentsArray = Array.isArray(ts.comments) ? ts.comments : (ts.comments ? Object.values(ts.comments) : []);
          
          return (
            <AccordionItem key={ts.id} value={ts.id} className="border rounded-lg bg-card">
              <AccordionTrigger className="p-4 hover:no-underline">
                <div className="flex justify-between w-full items-center">
                  <div className="text-left">
                    <p className="font-semibold">{project?.name} - {ts.plantUnit}</p>
                    <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <span>Period: {format(parseISO(ts.startDate), 'dd/MM/yy')} - {format(parseISO(ts.endDate), 'dd/MM/yy')}</span>
                        <Badge variant="outline">Sheets: {ts.numberOfTimesheets}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pr-4">
                    <Badge variant={statusVariantMap[ts.status]}>{ts.status}</Badge>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr,200px] gap-4 pt-4 border-t">
                      <div className="space-y-0">
                          <TimelineItem icon={Send} title="Submitted" actorName={submitter?.name} date={ts.submissionDate}>
                            {ts.status !== 'Rejected' && <div className="h-full min-h-[2rem] w-px bg-border my-1" />}
                          </TimelineItem>
                          {ts.status === 'Rejected' ? (
                            <TimelineItem icon={XCircle} title="Rejected" actorName={rejectedBy?.name} date={ts.rejectedDate}>
                                {ts.rejectionReason && <p className="text-xs text-muted-foreground mt-1 pl-10">Reason: {ts.rejectionReason}</p>}
                            </TimelineItem>
                          ) : (
                            <>
                              <TimelineItem icon={UserCheck} title="Acknowledged" actorName={acknowledgedBy?.name} date={ts.acknowledgedDate}>
                                <div className="h-full min-h-[2rem] w-px bg-border my-1" />
                              </TimelineItem>
                              <TimelineItem icon={Building} title="Sent to Office" actorName={sentToOfficeBy?.name} date={ts.sentToOfficeDate}>
                                <div className="h-full min-h-[2rem] w-px bg-border my-1" />
                              </TimelineItem>
                              <TimelineItem icon={CheckCircle} title="Office Acknowledged" actorName={officeAcknowledgedBy?.name} date={ts.officeAcknowledgedDate} />
                            </>
                          )}
                          {commentsArray.length > 0 && (
                            <Accordion type="single" collapsible className="w-full mt-2">
                                <AccordionItem value="comments" className="border-none">
                                    <AccordionTrigger className="p-0 text-xs text-blue-600 hover:no-underline"><div className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> View Comments ({commentsArray.length})</div></AccordionTrigger>
                                    <AccordionContent className="pt-2">
                                        <ScrollArea className="h-32">
                                            <div className="space-y-2 pr-4">
                                                {commentsArray.map((c, i) => {
                                                    const commentUser = users.find(u => u.id === c.userId);
                                                    return (
                                                        <div key={i} className="flex items-start gap-2">
                                                            <Avatar className="h-6 w-6"><AvatarImage src={commentUser?.avatar} /><AvatarFallback>{commentUser?.name.charAt(0)}</AvatarFallback></Avatar>
                                                            <div className="text-xs bg-background p-2 rounded-md w-full border">
                                                                <div className="flex justify-between items-baseline"><p className="font-semibold">{commentUser?.name}</p><p className="text-muted-foreground">{formatDistanceToNow(parseISO(c.date), { addSuffix: true })}</p></div>
                                                                <p className="text-foreground/80 mt-1 whitespace-pre-wrap">{c.text}</p>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </ScrollArea>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                          )}
                      </div>
                      <div className="flex flex-col items-center justify-center gap-4 p-4 bg-muted/50 rounded-md">
                          <h4 className="font-semibold text-sm">Next Action</h4>
                          {getAction(ts) || <p className="text-sm text-muted-foreground text-center">No action required from you.</p>}
                           {user?.role === 'Admin' && (
                               <AlertDialog>
                                   <AlertDialogTrigger asChild><Button variant="link" size="sm" className="text-destructive mt-4">Delete</Button></AlertDialogTrigger>
                                   <AlertDialogContent>
                                       <AlertDialogHeader><AlertDialogTitle>Delete this timesheet?</AlertDialogTitle><AlertDialogDescription>This action is permanent and cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                       <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteTimesheet(ts.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                   </AlertDialogContent>
                               </AlertDialog>
                           )}
                      </div>
                  </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
      {rejectionInfo && (
        <AlertDialog open={!!rejectionInfo} onOpenChange={() => setRejectionInfo(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{rejectionInfo.action} Timesheet?</AlertDialogTitle>
                    <AlertDialogDescription>Please provide a reason. This action will be logged in the comment history.</AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-2">
                    <Label htmlFor="rejection-reason">Reason</Label>
                    <Textarea id="rejection-reason" value={reason} onChange={e => setReason(e.target.value)} />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setReason('')}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmRejection}>Confirm {rejectionInfo.action}</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )}
    </>
  );
}
