
'use client';
import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Send, Eye, Trash2 } from 'lucide-react';
import type { LogbookRequest, Comment } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogClose, DialogTitle, DialogDescription, DialogHeader, DialogFooter, DialogContent } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';

const statusVariant: { [key in LogbookRequest['status']]: 'default' | 'secondary' | 'destructive' | 'success' } = {
  'Pending': 'secondary',
  'Completed': 'success',
  'Rejected': 'destructive',
};

const RequestDetailsDialog = ({ request, isOpen, onOpenChange, onAction, onComment }: {
  request: LogbookRequest;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAction: (requestId: string, status: 'Completed' | 'Rejected', comment: string) => void;
  onComment: (requestId: string, text: string, notify?: boolean) => void;
}) => {
    const { user, users, manpowerProfiles, can } = useAppContext();
    const [comment, setComment] = useState('');
    const [rejectionComment, setRejectionComment] = useState('');
    const { toast } = useToast();

    const employee = manpowerProfiles.find(p => p.id === request.manpowerId);
    const requester = users.find(u => u.id === request.requesterId);
    const commentsArray = Array.isArray(request.comments) ? request.comments : (request.comments ? Object.values(request.comments) : []);
    
    const isApprover = can.manage_logbook;

    const handleConfirmAction = (status: 'Completed' | 'Rejected') => {
        if (status === 'Rejected' && !rejectionComment.trim()) {
            toast({ title: "Comment required for rejection.", variant: "destructive" });
            return;
        }
        onAction(request.id, status, rejectionComment);
        onOpenChange(false);
    };

    const handleAddComment = () => {
      if (!comment.trim()) return;
      onComment(request.id, comment, true);
      setComment('');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Logbook Request Details</DialogTitle>
                    <DialogDescription>For {employee?.name}, requested by {requester?.name}.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {request.remarks && <p className="text-sm italic p-2 bg-muted rounded-md">"{request.remarks}"</p>}
                    <div className="space-y-2">
                        <Label>Comment History</Label>
                        <ScrollArea className="h-32 rounded-md border p-2">
                            <div className="space-y-3">
                                {commentsArray.length > 0 ? commentsArray.map((c, i) => {
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
                                }) : <p className="text-xs text-muted-foreground text-center py-4">No comments yet.</p>}
                            </div>
                        </ScrollArea>
                    </div>
                     <div className="relative pt-2">
                        <Textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Add a comment..."
                            className="pr-10 text-sm"
                            rows={2}
                        />
                        <Button
                            type="button"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-[-50%]"
                            onClick={handleAddComment}
                            disabled={!comment.trim()}
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <DialogFooter className="flex-col sm:flex-row sm:justify-between items-center w-full">
                  <div>
                    {isApprover && request.status === 'Pending' && (
                        <div className="flex gap-2">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="destructive">Reject</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Reject Request?</AlertDialogTitle>
                                        <AlertDialogDescription>Please provide a comment for rejecting this request.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <Textarea value={rejectionComment} onChange={(e) => setRejectionComment(e.target.value)} placeholder="Rejection reason..." />
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleConfirmAction('Rejected')}>Confirm Rejection</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                            <Button size="sm" onClick={() => handleConfirmAction('Completed')}>Approve</Button>
                        </div>
                    )}
                  </div>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">Close</Button>
                  </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const RequestsTable = ({ requests }: { requests: LogbookRequest[] }) => {
    const { user, manpowerProfiles, users, updateLogbookRequestStatus, addLogbookRequestComment, markLogbookRequestAsViewed, deleteLogbookRequest } = useAppContext();
    const { toast } = useToast();
    const [viewingRequest, setViewingRequest] = useState<LogbookRequest | null>(null);

    const handleAction = (requestId: string, status: 'Completed' | 'Rejected', comment: string) => {
        updateLogbookRequestStatus(requestId, status, comment);
        toast({ title: `Request ${status}` });
    };

    const handleView = (request: LogbookRequest) => {
        if (request.requesterId === user?.id && !request.viewedBy[user!.id]) {
            markLogbookRequestAsViewed(request.id);
        }
        setViewingRequest(request);
    };

    if (requests.length === 0) {
        return <p className="text-sm text-muted-foreground p-4 text-center">No requests in this category.</p>;
    }
    
    return (
      <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map(req => {
              const employee = manpowerProfiles.find(p => p.id === req.manpowerId);
              const requester = users.find(u => u.id === req.requesterId);
              const isMyRequest = req.requesterId === user?.id;
              const hasUnread = isMyRequest && !req.viewedBy[user!.id] && req.status !== 'Pending';
              
              return (
                <TableRow key={req.id} className={hasUnread ? "font-bold bg-blue-50 dark:bg-blue-900/20" : ""}>
                    <TableCell className="font-medium">{employee?.name || 'Unknown'}</TableCell>
                    <TableCell>{requester?.name || 'Unknown'}</TableCell>
                    <TableCell>{format(parseISO(req.requestDate), 'dd MMM yyyy')}</TableCell>
                    <TableCell>
                        <Badge variant={statusVariant[req.status]}>{req.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-2">
                       <Button variant="outline" size="sm" onClick={() => handleView(req)}>
                           <Eye className="mr-2 h-4 w-4" /> View
                           {hasUnread && <div className="ml-2 h-2 w-2 rounded-full bg-blue-500"></div>}
                       </Button>
                       {user?.role === 'Admin' && (
                           <AlertDialog>
                               <AlertDialogTrigger asChild>
                                   <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4"/></Button>
                               </AlertDialogTrigger>
                               <AlertDialogContent>
                                   <AlertDialogHeader><AlertDialogTitle>Delete Request?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                   <AlertDialogFooter>
                                       <AlertDialogCancel>Cancel</AlertDialogCancel>
                                       <AlertDialogAction onClick={() => deleteLogbookRequest(req.id)}>Delete</AlertDialogAction>
                                   </AlertDialogFooter>
                               </AlertDialogContent>
                           </AlertDialog>
                       )}
                    </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        {viewingRequest && (
            <RequestDetailsDialog
                isOpen={!!viewingRequest}
                onOpenChange={() => setViewingRequest(null)}
                request={viewingRequest}
                onAction={handleAction}
                onComment={addLogbookRequestComment}
            />
        )}
      </>
    );
};

export default function LogbookRequests() {
  const { user, can, logbookRequests, myLogbookRequestUpdates } = useAppContext();

  const { pendingRequests, myRequests } = useMemo(() => {
    if (!user) return { pendingRequests: [], myRequests: [] };
    
    const pending = (can.manage_logbook)
        ? logbookRequests.filter(r => r.status === 'Pending').sort((a,b) => parseISO(b.requestDate).getTime() - parseISO(a.requestDate).getTime())
        : [];
    
    const my = logbookRequests.filter(r => r.requesterId === user.id).sort((a,b) => parseISO(b.requestDate).getTime() - parseISO(a.requestDate).getTime());

    return { pendingRequests: pending, myRequests: my };
  }, [logbookRequests, can.manage_logbook, user]);

  const showTabs = can.manage_logbook && myRequests.length > 0;
  
  if (pendingRequests.length === 0 && myRequests.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logbook Requests</CardTitle>
        <CardDescription>
            {showTabs ? 'Manage pending requests and view your own requests.' : (can.manage_logbook ? 'Review and action these requests.' : 'Track the status of your logbook requests.')}
        </CardDescription>
      </CardHeader>
      <CardContent>
          {showTabs ? (
            <Tabs defaultValue="pending">
              <TabsList>
                <TabsTrigger value="pending">
                    Pending for me
                    {pendingRequests.length > 0 && <Badge className="ml-2">{pendingRequests.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="my-requests">
                    My Requests
                    {myLogbookRequestUpdates > 0 && <Badge variant="destructive" className="ml-2">{myLogbookRequestUpdates}</Badge>}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="pending" className="mt-4"><RequestsTable requests={pendingRequests} /></TabsContent>
              <TabsContent value="my-requests" className="mt-4"><RequestsTable requests={myRequests} /></TabsContent>
            </Tabs>
          ) : (
            <RequestsTable requests={can.manage_logbook ? pendingRequests : myRequests} />
          )}
      </CardContent>
    </Card>
  );
}

    