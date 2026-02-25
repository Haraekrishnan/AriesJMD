
'use client';
import { useMemo, useState } from 'react';
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
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import {
  Building,
  CheckCircle,
  MessageSquare,
  Send,
  Trash2,
  UserCheck,
  XCircle,
  Edit,
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
      <div className={`pt-1 ${isPending ? 'text-muted-foreground/50' : ''}`}>
        <p className="font-semibold">{title}</p>
        {!isPending && (
            <p className="text-xs text-muted-foreground">
                by {actorName} on {format(parseISO(date), 'dd MMM, yyyy')}
            </p>
        )}
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
  const [comments, setComments] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);

  const canAcknowledgeOffice = useMemo(() => {
    if (!user) return false;
    return ['Admin', 'Document Controller', 'Project Coordinator'].includes(
      user.role
    );
  }, [user]);

  const submitter = users.find((u) => u.id === timesheet.submitterId);
  const acknowledgedBy = users.find(
    (u) => u.id === timesheet.acknowledgedById
  );
  const sentToOfficeBy = users.find(
    (u) => u.id === timesheet.sentToOfficeById
  );
  const officeAcknowledgedBy = users.find(
    (u) => u.id === timesheet.officeAcknowledgedById
  );
  const rejectedBy = users.find((u) => u.id === timesheet.rejectedById);
  const commentsArray = Array.isArray(timesheet.comments)
    ? timesheet.comments
    : timesheet.comments
    ? Object.values(timesheet.comments)
    : [];

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

    if (isAdmin && timesheet.status !== 'Rejected') {
        return (
            <Button size="sm" className="w-full" onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" /> Edit / Reassign
            </Button>
        );
    }
    
    switch (timesheet.status) {
      case 'Pending':
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
        if (isRecipient) {
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
            </div>
          );
        }
        return null;
      case 'Acknowledged':
        if (isRecipient) {
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
        return null;
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
        return null;
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
        return null;
      case 'Rejected':
        if (isSubmitter) {
          return (
            <div className="space-y-2 w-full text-left">
              <Label htmlFor={`comment-${timesheet.id}`} className="text-xs">
                Reply to query
              </Label>
              <Textarea
                id={`comment-${timesheet.id}`}
                placeholder="Add your reply..."
                value={comments[timesheet.id] || ''}
                onChange={(e) =>
                  setComments((prev) => ({
                    ...prev,
                    [timesheet.id]: e.target.value,
                  }))
                }
                rows={2}
              />
              <Button
                size="sm"
                className="w-full"
                onClick={() => {
                  const commentText = comments[timesheet.id]?.trim();
                  if (!commentText) {
                    toast({
                      title: 'Reply is required to re-acknowledge.',
                      variant: 'destructive',
                    });
                    return;
                  }
                  updateTimesheetStatus(
                    timesheet.id,
                    'Acknowledged',
                    commentText
                  );
                  setComments((prev) => ({ ...prev, [timesheet.id]: '' }));
                  setIsOpen(false);
                }}
                disabled={!comments[timesheet.id]?.trim()}
              >
                Reply & Re-Acknowledge
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" className="w-full">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete & Start New
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Delete this submission?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. You will need to create a
                      new timesheet submission.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        deleteTimesheet(timesheet.id);
                        setIsOpen(false);
                      }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          );
        }
        return null;
      default:
        return null;
    }
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
              <TimelineItem
                icon={Send}
                title="Submitted"
                actorName={submitter?.name}
                date={timesheet.submissionDate}
              />
               <TimelineItem
                icon={UserCheck}
                title="Acknowledged"
                actorName={acknowledgedBy?.name}
                date={timesheet.acknowledgedDate}
              />
               <TimelineItem
                icon={Building}
                title="Sent to Office"
                actorName={sentToOfficeBy?.name}
                date={timesheet.sentToOfficeDate}
              />
              {timesheet.status === 'Rejected' ? (
                <TimelineItem
                  icon={XCircle}
                  title="Rejected"
                  actorName={rejectedBy?.name}
                  date={timesheet.rejectedDate}
                  isLast={true}
                />
              ) : (
                 <TimelineItem
                    icon={CheckCircle}
                    title="Office Acknowledged"
                    actorName={officeAcknowledgedBy?.name}
                    date={timesheet.officeAcknowledgedDate}
                    isLast={true}
                  />
              )}

              {commentsArray.length > 0 && (
                <Accordion type="single" collapsible className="w-full mt-2">
                  <AccordionItem value="comments" className="border-none">
                    <AccordionTrigger className="p-0 text-xs text-blue-600 hover:no-underline">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> View Comments (
                        {commentsArray.length})
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2">
                      <ScrollArea className="h-32">
                        <div className="space-y-2 pr-4">
                          {commentsArray.map((c, i) => {
                            const commentUser = users.find(
                              (u) => u.id === c.userId
                            );
                            return (
                              <div key={i} className="flex items-start gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={commentUser?.avatar} />
                                  <AvatarFallback>
                                    {commentUser?.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="text-xs bg-background p-2 rounded-md w-full border">
                                  <div className="flex justify-between items-baseline">
                                    <p className="font-semibold">
                                      {commentUser?.name}
                                    </p>
                                    <p className="text-muted-foreground">
                                      {formatDistanceToNow(
                                        parseISO(c.date),
                                        { addSuffix: true }
                                      )}
                                    </p>
                                  </div>
                                  <p className="text-foreground/80 mt-1 whitespace-pre-wrap">
                                    {c.text}
                                  </p>
                                </div>
                              </div>
                            );
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
        />
      )}
    </>
  );
}
