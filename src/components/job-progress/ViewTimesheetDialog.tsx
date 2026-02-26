
'use client';
import { useMemo, useState, useEffect } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useAppContext } from '@/contexts/app-provider';
import { useToast } from '@/hooks/use-toast';
import type { Comment, Timesheet, TimesheetStatus } from '@/lib/types';
import { format, formatDistanceToNow, parseISO, isAfter } from 'date-fns';
import {
  Building,
  CheckCircle,
  MessageSquare,
  Send,
  Trash2,
  UserCheck,
  XCircle,
  Edit,
  Undo2,
} from 'lucide-react';
import EditTimesheetDialog from './EditTimesheetDialog';

const statusVariantMap: Record<
  TimesheetStatus,
  'default' | 'secondary' | 'destructive' | 'success' | 'warning'
> = {
  Pending: 'warning',
  Acknowledged: 'default',
  'Sent To Office': 'default',
  'Office Acknowledged': 'success',
  Rejected: 'destructive',
};

const TimelineItem = ({
  icon: Icon,
  title,
  actorName,
  date,
  children,
  isLast = false,
}: {
  icon: React.ElementType;
  title: string;
  actorName?: string;
  date?: string;
  children?: React.ReactNode;
  isLast?: boolean;
}) => {
  const isPending = !actorName || !date;

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isPending ? 'bg-muted border' : 'bg-muted'}`}>
          <Icon className={`h-5 w-5 ${isPending ? 'text-muted-foreground/50' : 'text-muted-foreground'}`} />
        </div>
        {!isLast && <div className="h-full min-h-[2rem] w-px bg-border my-1" />}
      </div>
      <div className={`pt-1.5 flex-1 ${isPending ? 'text-muted-foreground/50' : ''}`}>
        <p className="font-semibold leading-none">{title}</p>
        {!isPending && (
            <p className="text-xs text-muted-foreground mt-0.5">
                by {actorName} on {format(parseISO(date), 'dd MMM, yyyy')}
            </p>
        )}
        {children}
      </div>
    </div>
  );
};

export default function ViewTimesheetDialog({
  isOpen,
  setIsOpen,
  timesheet,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  timesheet: Timesheet;
}) {
  const { user, users, projects, updateTimesheetStatus, deleteTimesheet, addTimesheetComment } =
    useAppContext();
  const { toast } = useToast();
  const [rejectionInfo, setRejectionInfo] = useState<{
    action: 'Reject' | 'Reopen';
  } | null>(null);
  const [reason, setReason] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const canAcknowledgeOffice = useMemo(() => {
    if (!user) return false;
    return ['Admin', 'Document Controller', 'Project Coordinator'].includes(
      user.role
    );
  }, [user]);

  const commentsArray = Array.isArray(timesheet.comments)
    ? timesheet.comments
    : timesheet.comments
    ? Object.values(timesheet.comments)
    : [];
    
    
  const timelineEvents = useMemo(() => {
    const events: any[] = [];
    const submitter = users.find(u => u.id === timesheet.submitterId);

    // 1. Initial Submission
    if (timesheet.submissionDate) {
        events.push({ type: 'Submitted', date: timesheet.submissionDate, actor: submitter, icon: Send });
    }
    
    // 2. Key Milestones from date fields
    if (timesheet.acknowledgedDate && timesheet.acknowledgedById) {
        events.push({ type: 'Acknowledged', date: timesheet.acknowledgedDate, actor: users.find(u => u.id === timesheet.acknowledgedById), icon: UserCheck });
    }
    if (timesheet.sentToOfficeDate && timesheet.sentToOfficeById) {
        events.push({ type: 'Sent To Office', date: timesheet.sentToOfficeDate, actor: users.find(u => u.id === timesheet.sentToOfficeById), icon: Building });
    }
    if (timesheet.officeAcknowledgedDate && timesheet.officeAcknowledgedById) {
        events.push({ type: 'Office Acknowledged', date: timesheet.officeAcknowledgedDate, actor: users.find(u => u.id === timesheet.officeAcknowledgedById), icon: CheckCircle });
    }

    // 3. Process comments for rejections and resubmissions
    commentsArray.forEach(comment => {
        if (!comment || !comment.text) return;

        if (comment.text.startsWith('Timesheet Rejected. Reason:')) {
            const reason = comment.text.replace('Timesheet Rejected. Reason:', '').trim();
            events.push({
                type: 'Rejected',
                date: comment.date,
                actor: users.find(u => u.id === comment.userId),
                icon: XCircle,
                comment: reason,
            });
        } else if (comment.text.includes('edited and resubmitted')) {
            events.push({
                type: 'Resubmitted',
                date: comment.date,
                actor: users.find(u => u.id === comment.userId),
                icon: Undo2,
            });
        }
    });
    
    // Sort all collected events by date
    return events.sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  }, [timesheet, users, commentsArray]);

  const lastEventType = timelineEvents.length > 0 ? timelineEvents[timelineEvents.length - 1].type : null;

  const pendingSteps = useMemo(() => {
    if (!lastEventType || lastEventType === 'Office Acknowledged' || lastEventType === 'Rejected') {
        return [];
    }
    
    const allWorkflowSteps = [
        { type: 'Acknowledged', icon: UserCheck, title: 'Acknowledge'},
        { type: 'Sent To Office', icon: Building, title: 'Send to Office' },
        { type: 'Office Acknowledged', icon: CheckCircle, title: 'Office Acknowledge' }
    ];

    let nextStepIndex = -1;
    if (lastEventType === 'Submitted' || lastEventType === 'Resubmitted') {
        nextStepIndex = 0; // Start from Acknowledge
    } else {
        const lastCompletedIndex = allWorkflowSteps.findIndex(s => s.type === lastEventType);
        if (lastCompletedIndex !== -1) {
            nextStepIndex = lastCompletedIndex + 1;
        }
    }

    return nextStepIndex !== -1 ? allWorkflowSteps.slice(nextStepIndex) : [];
  }, [lastEventType]);

  const handleActionClick = (action: 'Reject' | 'Reopen') => {
    setRejectionInfo({ action });
  };

  const handleConfirmRejection = () => {
    if (!rejectionInfo || !reason.trim()) {
      toast({ title: 'A reason is required.', variant: 'destructive' });
      return;
    }
    updateTimesheetStatus(timesheet.id, 'Rejected', reason);
    setRejectionInfo(null);
    setReason('');
    setIsOpen(false);
  };

  const getAction = () => {
    const isRecipient = timesheet.submittedToId === user?.id;
    const isSubmitter = timesheet.submitterId === user?.id;
    const isAdmin = user?.role === 'Admin';
    
    switch (timesheet.status) {
      case 'Pending':
        if (isRecipient || isAdmin) {
          return (
            <div className="flex flex-col items-center gap-2 w-full">
              <Button
                size="sm"
                className="w-full"
                onClick={() => {
                  updateTimesheetStatus(
                    timesheet.id,
                    'Acknowledged',
                    'Acknowledged by recipient.'
                  );
                  setIsOpen(false);
                }}
              >
                Acknowledge
              </Button>
               <Button
                size="sm"
                variant="destructive"
                className="w-full"
                onClick={() => handleActionClick('Reject')}
              >
                Reject
              </Button>
              {isAdmin && (
                 <Button size="sm" variant="outline" className="w-full" onClick={() => setIsEditing(true)}>
                    <Edit className="mr-2 h-4 w-4" /> Edit / Reassign
                </Button>
              )}
            </div>
          );
        }
        if (isSubmitter && !isRecipient) {
          return (
            <div className="flex flex-col items-center gap-2 w-full">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive" className="w-full">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Submission
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Submission?</AlertDialogTitle>
                    <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => {
                        deleteTimesheet(timesheet.id);
                        setIsOpen(false);
                    }}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          );
        }
        break;
      case 'Acknowledged':
        if (isRecipient || isAdmin) {
          return (
            <div className="flex flex-col items-center gap-2 w-full">
              <Button
                size="sm"
                className="w-full"
                onClick={() => {
                  updateTimesheetStatus(timesheet.id, 'Sent To Office');
                  setIsOpen(false);
                }}
              >
                Send to Office
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="w-full"
                onClick={() => handleActionClick('Reject')}
              >
                Reject
              </Button>
            </div>
          );
        }
        break;
      case 'Sent To Office':
        if (canAcknowledgeOffice) {
          return (
            <div className="flex flex-col items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  updateTimesheetStatus(
                    timesheet.id,
                    'Office Acknowledged',
                    'Acknowledged by office.'
                  );
                  setIsOpen(false);
                }}
              >
                Acknowledge Receipt
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleActionClick('Reject')}
              >
                Reject
              </Button>
            </div>
          );
        }
        break;
      case 'Office Acknowledged':
        if (canAcknowledgeOffice) {
          return (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleActionClick('Reopen')}
            >
              Reopen/Query
            </Button>
          );
        }
        break;
      case 'Rejected':
        if (isSubmitter) {
          return (
            <div className="flex flex-col items-center gap-2 w-full">
              <Button size="sm" className="w-full" onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" /> Edit & Resubmit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive" className="w-full">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Submission
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Submission?</AlertDialogTitle>
                    <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => {
                        deleteTimesheet(timesheet.id);
                        setIsOpen(false);
                    }}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          );
        }
        break;
      default:
        break;
    }
    
    return null;
  };

  const handleAddComment = () => {
    const text = newComment.trim();
    if (!text) return;
    addTimesheetComment(timesheet.id, text);
    setNewComment('');
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Timesheet Details</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-[1fr,200px] gap-4 pt-4 border-t">
          <div className="space-y-0">
              {timelineEvents.map((event, index) => (
                  <TimelineItem
                      key={index}
                      icon={event.icon}
                      title={event.type}
                      actorName={event.actor?.name}
                      date={event.date}
                      isLast={index === timelineEvents.length - 1 && pendingSteps.length === 0}
                  >
                      {event.comment && (
                          <div className="text-xs mt-1 p-2 bg-destructive/10 text-destructive-foreground rounded-md font-medium">
                              <strong>Reason:</strong> {event.comment}
                          </div>
                      )}
                  </TimelineItem>
              ))}
              {pendingSteps.map((step, index) => (
                  <TimelineItem
                      key={`pending-${index}`}
                      icon={step.icon}
                      title={step.title}
                      isLast={index === pendingSteps.length - 1}
                  />
              ))}
          </div>
            <div className="flex flex-col items-center justify-center gap-4 p-4 bg-muted/50 rounded-md">
              <h4 className="font-semibold text-sm">Next Action</h4>
              {getAction() || (
                <p className="text-sm text-muted-foreground text-center">
                  No action required from you.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {rejectionInfo && (
        <AlertDialog
          open={!!rejectionInfo}
          onOpenChange={() => setRejectionInfo(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {rejectionInfo.action} Timesheet?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Please provide a reason. This action will be logged in the
                comment history.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <Label htmlFor="rejection-reason">Reason</Label>
              <Textarea
                id="rejection-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setReason('')}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmRejection}>
                Confirm {rejectionInfo.action}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {isEditing && (
        <EditTimesheetDialog
          isOpen={isEditing}
          setIsOpen={setIsEditing}
          timesheet={timesheet}
          onSuccess={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
