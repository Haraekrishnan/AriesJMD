'use client';

import { useMemo } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/app-provider';
import type { Timesheet, TimesheetStatus } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { CheckCircle, Send, Building, UserCheck } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

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
    <Accordion type="multiple" className="w-full space-y-2">
      {sortedTimesheets.map(ts => {
        const submitter = users.find(u => u.id === ts.submitterId);
        const recipient = users.find(u => u.id === ts.submittedToId);
        const project = projects.find(p => p.id === ts.projectId);
        const acknowledgedBy = users.find(u => u.id === ts.acknowledgedById);
        const sentToOfficeBy = users.find(u => u.id === ts.sentToOfficeById);
        const officeAcknowledgedBy = users.find(u => u.id === ts.officeAcknowledgedById);
        
        return (
          <AccordionItem key={ts.id} value={ts.id} className="border rounded-lg bg-card">
            <AccordionTrigger className="p-4 hover:no-underline">
              <div className="flex justify-between w-full items-center">
                <div className="text-left">
                  <p className="font-semibold">{project?.name} - {ts.plantUnit}</p>
                  <p className="text-sm text-muted-foreground">
                    Period: {format(parseISO(ts.startDate), 'dd/MM/yy')} - {format(parseISO(ts.endDate), 'dd/MM/yy')}
                  </p>
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
                           <div className="h-full min-h-[2rem] w-px bg-border my-1" />
                        </TimelineItem>
                        <TimelineItem icon={UserCheck} title="Acknowledged by Recipient" actorName={acknowledgedBy?.name} date={ts.acknowledgedDate}>
                           <div className="h-full min-h-[2rem] w-px bg-border my-1" />
                        </TimelineItem>
                         <TimelineItem icon={Building} title="Sent to Office" actorName={sentToOfficeBy?.name} date={ts.sentToOfficeDate}>
                           <div className="h-full min-h-[2rem] w-px bg-border my-1" />
                        </TimelineItem>
                        <TimelineItem icon={CheckCircle} title="Office Acknowledged" actorName={officeAcknowledgedBy?.name} date={ts.officeAcknowledgedDate} />
                    </div>
                    <div className="flex flex-col items-center justify-center gap-4 p-4 bg-muted/50 rounded-md">
                        <h4 className="font-semibold text-sm">Next Action</h4>
                        {getAction(ts) || <p className="text-sm text-muted-foreground text-center">No action required from you.</p>}
                    </div>
                </div>
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  );
}