

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, CheckCircle, XCircle, MessagesSquare, Edit, Trash2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import type { ManagementRequest, ManagementRequestStatus } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import EditManagementRequestDialog from './EditManagementRequestDialog';
import { Card, CardContent, CardFooter, CardHeader } from '../ui/card';

interface ManagementRequestTableProps {
  requests: ManagementRequest[];
}

const statusVariant: Record<ManagementRequestStatus, 'default' | 'secondary' | 'destructive'> = {
  Pending: 'secondary',
  Approved: 'default',
  Rejected: 'destructive',
};

const RequestCard = ({ req }: { req: ManagementRequest }) => {
    const { user, users, updateManagementRequestStatus, markManagementRequestAsViewed, deleteManagementRequest } = useAppContext();
    const [selectedRequest, setSelectedRequest] = useState<ManagementRequest | null>(null);
    const [editingRequest, setEditingRequest] = useState<ManagementRequest | null>(null);
    const [action, setAction] = useState<'Approved' | 'Rejected' | null>(null);
    const [comment, setComment] = useState('');
    const { toast } = useToast();
    
    const isRecipient = req.recipientId === user?.id;
    const isRequester = req.requesterId === user?.id;
    const hasUpdate = isRequester && !req.viewedByRequester;
    const commentsArray = Array.isArray(req.comments) ? req.comments : (req.comments ? Object.values(req.comments) : []);
    const canEdit = user?.role === 'Admin' || (isRecipient && req.status === 'Pending');

    const getName = (id: string) => users.find(u => u.id === id)?.name || 'Unknown';

    const handleActionClick = (req: ManagementRequest, act: 'Approved' | 'Rejected') => {
        setSelectedRequest(req);
        setAction(act);
        setComment('');
    };

    const handleConfirmAction = () => {
        if (!selectedRequest || !action) return;
        if (!comment.trim()) {
            toast({ title: 'Comment required', variant: 'destructive'});
            return;
        }

        updateManagementRequestStatus(selectedRequest.id, action, comment);
        toast({ title: `Request ${action}` });
        setSelectedRequest(null);
        setAction(null);
    }

    const handleDelete = (requestId: string) => {
        deleteManagementRequest(requestId);
        toast({ variant: 'destructive', title: 'Request Deleted' });
    };

    const handleAccordionToggle = (openValue: string) => {
        if (openValue === req.id && user?.id === req.requesterId && !req.viewedByRequester) {
            markManagementRequestAsViewed(req.id);
        }
    };

    return (
        <Card className={cn("relative", hasUpdate && "border-blue-500")}>
            {hasUpdate && <div className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" title="Unread update"></div>}
            <CardHeader className="p-4">
                <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{req.subject}</p>
                      <p className="text-sm text-muted-foreground">
                        {isRecipient ? `From: ${getName(req.requesterId)}` : `To: ${getName(req.recipientId)}`}
                      </p>
                      <p className="text-xs text-muted-foreground">{format(new Date(req.date), 'dd MMM yyyy')}</p>
                    </div>
                    <Badge variant={statusVariant[req.status]}>{req.status}</Badge>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                 <p className="text-sm mb-4 p-2 bg-muted rounded-md">{req.body}</p>
                 <Accordion type="single" collapsible className="w-full" onValueChange={() => handleAccordionToggle(req.id)}>
                    <AccordionItem value={req.id} className="border-none">
                        <AccordionTrigger className="p-0 text-xs text-blue-600 hover:no-underline">View Comment History</AccordionTrigger>
                        <AccordionContent className="pt-2 text-muted-foreground">
                            <div className="space-y-2">
                                {commentsArray.length > 0 ? commentsArray.map((c,i) => {
                                    const commentUser = users.find(u => u.id === c.userId);
                                    return (
                                        <div key={i} className="flex items-start gap-2">
                                            <Avatar className="h-6 w-6"><AvatarImage src={commentUser?.avatar} /><AvatarFallback>{commentUser?.name.charAt(0)}</AvatarFallback></Avatar>
                                            <div className="text-xs bg-background p-2 rounded-md w-full">
                                                <div className="flex justify-between items-baseline"><p className="font-semibold">{commentUser?.name}</p><p className="text-muted-foreground">{formatDistanceToNow(new Date(c.date), { addSuffix: true })}</p></div>
                                                <p className="text-foreground/80 mt-1 whitespace-pre-wrap">{c.text}</p>
                                            </div>
                                        </div>
                                    )
                                }) : <p className="text-xs text-muted-foreground">No comments yet.</p>}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
            <CardFooter className="p-2 bg-muted/50 flex justify-end gap-2">
                 {isRecipient && req.status === 'Pending' && (
                    <>
                        <Button size="sm" variant="outline" onClick={() => handleActionClick(req, 'Approved')}><CheckCircle className="mr-2 h-4 w-4" /> Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleActionClick(req, 'Rejected')}><XCircle className="mr-2 h-4 w-4" /> Reject</Button>
                    </>
                 )}
                 {canEdit && (
                    <Button variant="ghost" size="icon" onClick={() => setEditingRequest(req)}><Edit className="h-4 w-4" /></Button>
                 )}
                 {user?.role === 'Admin' && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                         <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>This action cannot be undone. This will permanently delete this management request.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(req.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                 )}
            </CardFooter>

            {selectedRequest && action && (
                <AlertDialog open={!!(selectedRequest && action)} onOpenChange={() => setSelectedRequest(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{action} Request?</AlertDialogTitle>
                            <AlertDialogDescription>Please provide a comment for this action.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <div>
                            <Label htmlFor="comment">Comment (Required)</Label>
                            <Textarea id="comment" value={comment} onChange={e => setComment(e.target.value)} />
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleConfirmAction}>{action}</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}

            {editingRequest && (
                <EditManagementRequestDialog 
                    isOpen={!!editingRequest} 
                    setIsOpen={() => setEditingRequest(null)}
                    request={editingRequest}
                />
            )}
        </Card>
    );
};

export default function ManagementRequestTable({ requests }: ManagementRequestTableProps) {
  const { activeRequests, completedRequests } = useMemo(() => {
    const active: ManagementRequest[] = [];
    const completed: ManagementRequest[] = [];
    requests.forEach(req => {
      if (req.status === 'Approved' || req.status === 'Rejected') {
        completed.push(req);
      } else {
        active.push(req);
      }
    });
    return { activeRequests: active, completedRequests: completed };
  }, [requests]);

  if (requests.length === 0) {
    return <p className="text-center py-10 text-muted-foreground">No requests found.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">Active Requests ({activeRequests.length})</h3>
        {activeRequests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeRequests.map(req => <RequestCard key={req.id} req={req} />)}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center p-4 border rounded-md">No active requests.</p>
        )}
      </div>
      {completedRequests.length > 0 && (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="completed-requests" className="border rounded-md">
            <AccordionTrigger className="p-4 bg-muted/50 hover:no-underline font-semibold text-lg">
              Completed & Rejected Requests ({completedRequests.length})
            </AccordionTrigger>
            <AccordionContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {completedRequests.map(req => <RequestCard key={req.id} req={req} />)}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}
