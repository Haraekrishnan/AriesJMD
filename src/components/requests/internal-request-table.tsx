

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, CheckCircle, XCircle, Truck, Edit, Check, Trash2, Settings, AlertTriangle, Save, MessagesSquare, ShieldX, Send, Undo2 } from 'lucide-react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import type { InternalRequest, InternalRequestStatus, Comment, InternalRequestItem, InternalRequestItemStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Card, CardContent, CardFooter, CardHeader } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui/dropdown-menu';

interface InternalRequestTableProps {
  requests: InternalRequest[];
}

const statusVariant: Record<InternalRequestStatus, 'default' | 'secondary' | 'destructive' | 'outline' | 'success'> = {
  Pending: 'secondary',
  Approved: 'default',
  Issued: 'success',
  Rejected: 'destructive',
  'Partially Issued': 'outline',
  'Partially Approved': 'outline',
  Disputed: 'destructive'
};

const itemStatusVariant: Record<InternalRequestItemStatus, 'default' | 'secondary' | 'destructive' | 'success'> = {
    Pending: 'secondary',
    Approved: 'default',
    Issued: 'success',
    Rejected: 'destructive',
};

const RequestCard = ({ req }: { req: InternalRequest }) => {
    const { user, users, roles, updateInternalRequestStatus, updateInternalRequestItemStatus, markInternalRequestAsViewed, deleteInternalRequest, forceDeleteInternalRequest, acknowledgeInternalRequest, addInternalRequestComment } = useAppContext();
    const [action, setAction] = useState<InternalRequestStatus | null>(null);
    const [itemAction, setItemAction] = useState<{ item: InternalRequestItem, status: InternalRequestItemStatus } | null>(null);
    const [comment, setComment] = useState('');
    const [isActionConfirmOpen, setIsActionConfirmOpen] = useState(false);
    const [newComment, setNewComment] = useState('');
    const { toast } = useToast();
    
    const canApprove = useMemo(() => {
        if (!user) return false;
        const userRole = roles.find(r => r.name === user.role);
        return userRole?.permissions.includes('approve_store_requests');
    }, [user, roles]);

    const handleBulkActionClick = (act: InternalRequestStatus) => {
        setAction(act);
        setIsActionConfirmOpen(true);
    };
    
    const handleItemActionClick = (item: InternalRequestItem, status: InternalRequestItemStatus) => {
        const needsComment = status === 'Rejected' || status === 'Issued';
        if (needsComment) {
            setItemAction({ item, status });
            setIsActionConfirmOpen(true);
        } else {
            // Directly update status without a comment dialog
            updateInternalRequestItemStatus(req.id, item.id, status, `Status changed to ${status}.`);
            toast({ title: `Item status updated to ${status}` });
        }
    };

    const handleConfirmAction = () => {
        if (action) { // Bulk action
            if (!req || !action) return;
            if (!comment.trim() && action !== 'Approved') {
                toast({ title: 'Comment required', variant: 'destructive'});
                return;
            }
            updateInternalRequestStatus(req.id, action, comment);
            toast({ title: `All items updated to ${action}` });
        } else if (itemAction) { // Single item action
            if (!comment.trim() && (itemAction.status === 'Rejected' || itemAction.status === 'Issued')) {
                 toast({ title: 'Comment required', variant: 'destructive'});
                 return;
            }
            updateInternalRequestItemStatus(req.id, itemAction.item.id, itemAction.status, comment);
            toast({ title: `Item status updated to ${itemAction.status}` });
        }
        
        setIsActionConfirmOpen(false);
        setComment('');
        setAction(null);
        setItemAction(null);
    }
    
    const handleAddComment = () => {
        if (!newComment.trim() || !user) return;
        addInternalRequestComment(req.id, newComment);
        setNewComment('');
    };

    const handleDelete = (requestId: string) => {
        deleteInternalRequest(requestId);
    };
    
    const handleForceDelete = (requestId: string) => {
        forceDeleteInternalRequest(requestId);
    };

    const handleAccordionToggle = (openValue: string) => {
        if (openValue === req.id && user?.id === req.requesterId && !req.viewedByRequester) {
            markInternalRequestAsViewed(req.id);
        }
    };
    
    const requester = users.find(u => u.id === req.requesterId);
    const hasUpdate = user?.id === req.requesterId && !req.viewedByRequester;
    const canBulkApprove = canApprove && (req.status === 'Pending' || req.status === 'Partially Approved');
    const canBulkIssue = canApprove && (req.status === 'Approved' || req.status === 'Partially Approved');
    const canClaimIssue = user?.id === req.requesterId && req.status === 'Issued';
    
    const commentsArray = Array.isArray(req.comments) ? req.comments : (req.comments ? Object.values(req.comments) : []);
    const needsAcknowledgement = user?.id === req.requesterId && req.status === 'Issued' && !req.acknowledgedByRequester;
    const canDelete = user?.role === 'Admin' || (user?.id === req.requesterId && ['Pending', 'Rejected'].includes(req.status));

    const canAddComments = user?.role === 'Admin' || canApprove;

    return (
        <>
            <Card className={cn("relative flex flex-col", hasUpdate && "border-blue-500")}>
                {hasUpdate && <div className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" title="Unread update"></div>}
                <CardHeader className="p-4">
                    <div className="flex justify-between items-start">
                        <div>
                        <p className="font-semibold">{requester?.name || 'Unknown User'}</p>
                        <p className="text-sm text-muted-foreground">ID: {req.id ? req.id.slice(-6) : 'N/A'} &middot; {req.date ? format(parseISO(req.date), 'dd MMM yyyy') : 'No date'}</p>
                        </div>
                        {needsAcknowledgement ? (
                        <Button size="sm" onClick={() => acknowledgeInternalRequest(req.id)}>Acknowledge</Button>
                        ) : (
                        <Badge variant={statusVariant[req.status]}>{req.status}</Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 flex-1 overflow-hidden">
                    <ScrollArea className="h-full pr-2">
                        <div className="space-y-2">
                            {(req.items || []).map((item, index) => (
                                <div key={item.id || index} className="grid grid-cols-[1fr,auto] items-center gap-2 text-sm p-2 rounded-md bg-muted/50">
                                    <div>
                                        <p>{item.quantity} {item.unit} - {item.description}</p>
                                        {item.remarks && <p className="text-xs italic text-muted-foreground">"{item.remarks}"</p>}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Badge variant={itemStatusVariant[item.status] || 'secondary'} className="h-5">{item.status}</Badge>
                                        {canApprove && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onSelect={() => handleItemActionClick(item, 'Approved')} disabled={item.status === 'Approved'}><CheckCircle className="mr-2 h-4 w-4 text-green-600"/>Approve</DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => handleItemActionClick(item, 'Issued')} disabled={item.status !== 'Approved'}><Truck className="mr-2 h-4 w-4 text-blue-600"/>Issue</DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => handleItemActionClick(item, 'Rejected')} disabled={item.status === 'Rejected'} className="text-destructive focus:text-destructive"><XCircle className="mr-2 h-4 w-4"/>Reject</DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => handleItemActionClick(item, 'Pending')} disabled={item.status === 'Pending'}><Undo2 className="mr-2 h-4 w-4"/>Set to Pending</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Accordion type="single" collapsible className="w-full mt-2" onValueChange={() => handleAccordionToggle(req.id)}>
                            <AccordionItem value={req.id} className="border-none">
                                <AccordionTrigger className="p-0 text-xs text-blue-600 hover:no-underline">View Comment History</AccordionTrigger>
                                <AccordionContent className="pt-2 text-muted-foreground">
                                <h4 className="font-semibold text-xs mb-2">Comment History</h4>
                                <div className="space-y-2">
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
                                    }) : <p className="text-xs text-muted-foreground">No comments yet.</p>}
                                </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </ScrollArea>
                </CardContent>
                <CardFooter className="p-2 bg-muted/50 flex flex-col items-stretch gap-2">
                    {canAddComments && (
                        <div className="relative px-2 pb-2">
                            <Textarea
                                placeholder="Add a comment..."
                                className="text-xs pr-10 bg-background"
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                            />
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7"
                                onClick={handleAddComment}
                                disabled={!newComment.trim()}
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                    <div className="flex flex-wrap justify-end gap-2 px-2">
                        {canApprove && (
                            <>
                                <Button size="sm" variant="outline" onClick={() => handleBulkActionClick('Approved')} disabled={!canBulkApprove}><CheckCircle className="mr-2 h-4 w-4" /> Approve All</Button>
                                <Button size="sm" variant="secondary" onClick={() => handleBulkActionClick('Issued')} disabled={!canBulkIssue}><Truck className="mr-2 h-4 w-4" /> Issue All</Button>
                                <Button size="sm" variant="destructive" onClick={() => handleBulkActionClick('Rejected')}><XCircle className="mr-2 h-4 w-4" /> Reject All</Button>
                            </>
                        )}
                        {canClaimIssue && (
                            <Button size="sm" variant="destructive" onClick={() => handleBulkActionClick('Disputed')}><AlertTriangle className="mr-2 h-4 w-4" /> Claim Issue</Button>
                        )}
                        {canDelete && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>This action cannot be undone. This will permanently delete this store request.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(req.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                         {user?.role === 'Admin' && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive h-8 w-8"><ShieldX className="h-4 w-4" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Force Delete Request?</AlertDialogTitle>
                                        <AlertDialogDescription>This will permanently delete the request from the database, bypassing regular permissions. Use this only for corrupted or bugged entries.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleForceDelete(req.id)}>Force Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                </CardFooter>

                 <AlertDialog open={isActionConfirmOpen} onOpenChange={setIsActionConfirmOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{action || itemAction?.status} {itemAction ? 'Item?' : 'All Items?'}</AlertDialogTitle>
                            <AlertDialogDescription>Please provide a comment for this action. This will apply to {itemAction ? 'this item' : 'all applicable items in the request'}.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <div>
                            <Label htmlFor="comment">Comment {action !== 'Approved' && itemAction?.status !== 'Approved' && itemAction?.status !== 'Pending' && '(Required)'}</Label>
                            <Textarea id="comment" value={comment} onChange={e => setComment(e.target.value)} />
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleConfirmAction}>{action || itemAction?.status}</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </Card>
        </>
    )
}

export default function InternalRequestTable({ requests }: InternalRequestTableProps) {
  const { user, markInternalRequestAsViewed } = useAppContext();
  const [isCompletedOpen, setIsCompletedOpen] = useState(false);

  const { activeRequests, completedRequests } = useMemo(() => {
    const active: InternalRequest[] = [];
    const completed: InternalRequest[] = [];
    requests.forEach(req => {
      if (req.status === 'Issued' || req.status === 'Rejected') {
        completed.push(req);
      } else {
        active.push(req);
      }
    });
    return { activeRequests: active, completedRequests: completed };
  }, [requests]);

  useEffect(() => {
    if (isCompletedOpen && user) {
        completedRequests.forEach(req => {
            if (req.requesterId === user.id && !req.viewedByRequester) {
                markInternalRequestAsViewed(req.id);
            }
        });
    }
  }, [isCompletedOpen, completedRequests, user, markInternalRequestAsViewed]);


  if (requests.length === 0) {
    return <p className="text-center py-10 text-muted-foreground">No requests found.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">Active Requests ({activeRequests.length})</h3>
        {activeRequests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeRequests.map((req, index) => <RequestCard key={req.id || index} req={req} />)}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center p-4 border rounded-md">No active requests.</p>
        )}
      </div>
      {completedRequests.length > 0 && (
        <Accordion type="single" collapsible className="w-full" onValueChange={(value) => setIsCompletedOpen(!!value)}>
          <AccordionItem value="completed-requests" className="border rounded-md">
            <AccordionTrigger className="p-4 bg-muted/50 hover:no-underline font-semibold text-lg">
              Completed & Rejected Requests ({completedRequests.length})
            </AccordionTrigger>
            <AccordionContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {completedRequests.map((req, index) => <RequestCard key={req.id || index} req={req} />)}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}
