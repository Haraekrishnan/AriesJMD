

'use client';

import { useState, useMemo, useEffect, MouseEvent, useRef } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { useInventory } from '@/contexts/inventory-provider';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, CheckCircle, XCircle, Truck, Edit, Check, Trash2, Settings, AlertTriangle, Save, MessagesSquare, ShieldX, Send, Undo2, MessageSquare, CheckCheck } from 'lucide-react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import type { InternalRequest, InternalRequestStatus, Comment, InternalRequestItem, InternalRequestItemStatus } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardFooter, CardHeader } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import EditInternalRequestItemDialog from './EditInternalRequestItemDialog';

interface InternalRequestTableProps {
  requests: InternalRequest[];
  showAcknowledge?: boolean;
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

const RequestCard = ({ req, isCompletedSection = false, showAcknowledge = true }: { req: InternalRequest; isCompletedSection?: boolean; showAcknowledge?: boolean; }) => {
    const { user, users, can, roles } = useAuth();
    const {
        updateInternalRequestStatus, 
        updateInternalRequestItemStatus, 
        markInternalRequestAsViewed, 
        deleteInternalRequest, 
        forceDeleteInternalRequest, 
        acknowledgeInternalRequest, 
        addInternalRequestComment, 
        inventoryItems, 
        resolveInternalRequestDispute,
        consumableItems
    } = useInventory();
    const [selectedRequest, setSelectedRequest] = useState<InternalRequest | null>(null);
    const [editingItem, setEditingItem] = useState<InternalRequestItem | null>(null);
    const [action, setAction] = useState<'Approved' | 'Rejected' | 'Issued' | 'Disputed' | 'Query' | null>(null);
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

    const isRequester = req.requesterId === user?.id;
    
    const commentsArray = Array.isArray(req.comments) ? req.comments : (req.comments ? Object.values(req.comments) : []);

    const hasUnreadCommentForApprover = useMemo(() => {
        if (!canApprove || !user) return false;
        return commentsArray.some(c => c && c.userId === req.requesterId && !c.viewedBy?.[user.id]);
    }, [commentsArray, canApprove, user, req.requesterId]);
    
    const hasUnreadCommentForRequester = useMemo(() => {
      if (!isRequester || !user) return false;
      return commentsArray.some(c => c && c.userId !== user.id && !c.viewedBy?.[user.id]);
    }, [commentsArray, isRequester, user]);
    
    const hasUpdate = (isRequester && !req.viewedByRequester) || hasUnreadCommentForRequester;

    const canMarkAsCompleted = useMemo(() => {
        if (!canApprove) return false;
        // Check if there are NO items in 'Pending' or 'Approved' status
        return !req.items.some(item => item.status === 'Pending' || item.status === 'Approved');
    }, [canApprove, req.items]);

    const canBulkApprove = canApprove && (req.status === 'Pending' || req.status === 'Partially Approved');
    const canBulkIssue = canApprove && (req.status === 'Approved' || req.status === 'Partially Approved');
    const canDispute = isRequester && req.status === 'Issued';
    
    const handleItemActionClick = (item: InternalRequestItem, status: InternalRequestItemStatus) => {
        const needsComment = status === 'Rejected';

        if (status === 'Issued') {
            const stockItem = consumableItems.find(i => i.id === item.inventoryItemId);
            if (stockItem && stockItem.quantity !== undefined && stockItem.quantity < item.quantity) {
                toast({
                    variant: 'destructive',
                    title: 'Insufficient Stock',
                    description: `Cannot issue ${item.quantity} of ${item.description}. Only ${stockItem.quantity} available.`,
                });
                return; // Stop the action
            }
        }
    
        if (needsComment) {
            setItemAction({ item, status });
            setIsActionConfirmOpen(true);
        } else {
            updateInternalRequestItemStatus(req.id, item.id, status, `Status changed to ${status}.`);
            toast({ title: `Item status updated to ${status}` });
        }
    };

    const handleConfirmAction = () => {
        if (itemAction) { // Single item action
            if (!comment.trim() && itemAction.status === 'Rejected') {
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
        const shouldNotify = isRequester ? canApprove : true;
        addInternalRequestComment(req.id, newComment, shouldNotify);
        setNewComment('');
    };

    const handleDelete = (requestId: string) => {
        deleteInternalRequest(requestId);
    };
    
    const handleForceDelete = (requestId: string) => {
        forceDeleteInternalRequest(requestId);
    };

    const handleAccordionToggle = (openValue: string) => {
        if (openValue === req.id) {
            markInternalRequestAsViewed(req.id);
        }
    };
    
    const requester = users.find(u => u.id === req.requesterId);
    const isRejectedButActive = req.status === 'Rejected' && !req.acknowledgedByRequester;
    const needsAcknowledgement = user?.id === req.requesterId && (req.status === 'Issued' || req.status === 'Partially Issued' || isRejectedButActive) && !req.acknowledgedByRequester;
    const canEdit = user?.role === 'Admin' || (isRequester && req.status === 'Pending');

    const canAddComments = user?.role === 'Admin' || canApprove || isRequester;

    return (
        <>
            <Card className={cn("relative flex flex-col", (hasUpdate || hasUnreadCommentForApprover) && "border-blue-500")}>
                {(hasUpdate || hasUnreadCommentForApprover) && <div className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" title="Unread update"></div>}
                <CardHeader className="p-4">
                    <div className="flex justify-between items-start">
                        <div>
                        <p className="font-semibold">{requester?.name || 'Unknown User'}</p>
                        <p className="text-sm text-muted-foreground">ID: {req.id ? req.id.slice(-6) : 'N/A'} &middot; {req.date ? format(parseISO(req.date), 'dd MMM yyyy') : 'No date'}</p>
                        </div>
                        {showAcknowledge && needsAcknowledgement ? (
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
                                        <Badge variant={itemStatusVariant[item.status] || 'secondary'} className="h-5">{item.status || 'Pending'}</Badge>
                                        {canApprove && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onSelect={() => setEditingItem(item)}><Edit className="mr-2 h-4 w-4" />Edit Item</DropdownMenuItem>
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
                                <AccordionTrigger className="p-0 text-xs text-blue-600 hover:no-underline">
                                    <div className="flex items-center gap-1">
                                        <MessageSquare className="h-3 w-3" /> Comments ({commentsArray.length})
                                        {hasUnreadCommentForApprover && <div className="h-2 w-2 rounded-full bg-blue-500" title="Unread comment"></div>}
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-2 text-muted-foreground">
                                <h4 className="font-semibold text-xs mb-2">Comment History</h4>
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
                    </ScrollArea>
                </CardContent>
                <CardFooter className="p-2 bg-muted/50 flex flex-col items-stretch gap-2 mt-auto">
                    {canAddComments && (
                        <div className="relative px-2 pb-2">
                            <Textarea
                                placeholder="Add a comment or reply..."
                                className="text-xs pr-10 bg-background"
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                                rows={1}
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
                        {canDispute && (
                            <Button size="sm" variant="destructive" onClick={() => handleActionClick(req, 'Disputed')}><AlertTriangle className="mr-2 h-4 w-4" /> Dispute</Button>
                        )}
                        {canApprove && req.status === 'Disputed' && (
                            <div className="flex gap-2">
                                <Button size="sm" onClick={() => resolveInternalRequestDispute(req.id, 'reissue', 'Dispute accepted. Items will be re-issued.')}>Re-issue</Button>
                                <Button size="sm" variant="outline" onClick={() => resolveInternalRequestDispute(req.id, 'reverse', 'Dispute rejected. Items confirmed as issued.')}>Confirm Issued</Button>
                            </div>
                        )}
                        {(user?.role === 'Admin' || (isRequester && req.status === 'Pending')) && (
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive h-8 w-8"><Trash2 className="h-4 w-4"/></Button>
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
                        {canMarkAsCompleted && !isCompletedSection && (
                            <Button size="sm" onClick={() => updateInternalRequestStatus(req.id, 'Issued')}><CheckCheck className="mr-2 h-4 w-4"/>Mark as Completed</Button>
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
                            <Label htmlFor="comment">Comment {action === 'Rejected' || itemAction?.status === 'Rejected' ? '(Required)' : '(Optional)'}</Label>
                            <Textarea id="comment" value={comment} onChange={e => setComment(e.target.value)} />
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleConfirmAction()}>Confirm</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </Card>

            {editingItem && (
                <EditInternalRequestItemDialog
                    isOpen={!!editingItem}
                    setIsOpen={() => setEditingItem(null)}
                    request={req}
                    item={editingItem}
                />
            )}
        </>
    )
}

export default function InternalRequestTable({ requests, showAcknowledge = true }: InternalRequestTableProps) {
  const { user, markInternalRequestAsViewed } = useInventory();
  const [isCompletedOpen, setIsCompletedOpen] = useState(false);

  const { activeRequests, completedRequests } = useMemo(() => {
    const active: InternalRequest[] = [];
    const completed: InternalRequest[] = [];
    requests.forEach(req => {
      const isRejectedButActive = req.status === 'Rejected' && !req.acknowledgedByRequester;
      
      if (isRejectedButActive || !['Issued', 'Rejected'].includes(req.status)) {
        active.push(req);
      } else {
        completed.push(req);
      }
    });
    return { activeRequests: active, completedRequests: completed };
  }, [requests]);

  useEffect(() => {
    if (isCompletedOpen && user) {
        completedRequests.forEach(req => {
            const comments = Array.isArray(req.comments) ? req.comments : Object.values(req.comments || {});
            const hasUnread = comments.some(c => c.userId !== user.id && !c.viewedBy?.[user.id]);
            if (req.requesterId === user.id && (!req.acknowledgedByRequester || hasUnread)) {
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
            {activeRequests.map((req, index) => <RequestCard key={req.id || index} req={req} showAcknowledge={showAcknowledge} />)}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center p-4 border rounded-md">No active requests.</p>
        )}
      </div>
       {completedRequests.length > 0 && (
        <Accordion type="single" collapsible className="w-full" onValueChange={(value) => setIsCompletedOpen(!!value)}>
          <AccordionItem value="completed-requests" className="border rounded-md">
            <AccordionTrigger className="p-4 bg-muted/50 hover:no-underline font-semibold text-lg">
               Completed & Acknowledged Requests ({completedRequests.length})
            </AccordionTrigger>
            <AccordionContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {completedRequests.map((req, index) => <RequestCard key={req.id || index} req={req} isCompletedSection={true} showAcknowledge={showAcknowledge} />)}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
       )}
    </div>
  );
}
