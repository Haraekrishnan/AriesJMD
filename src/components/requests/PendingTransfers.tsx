

'use client';
import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { ThumbsUp, ThumbsDown, SendToBack, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '../ui/textarea';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui/dropdown-menu';
import type { InventoryTransferRequest } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

export default function PendingTransfers() {
  const { user, inventoryTransferRequests, approveInventoryTransferRequest, rejectInventoryTransferRequest, users, projects, can, acknowledgeTransfer, disputeInventoryTransfer, allCompletedTransferRequests, deleteInventoryTransferRequest } = useAppContext();
  const { toast } = useToast();
  const [rejectionRequestId, setRejectionRequestId] = useState<string | null>(null);
  const [disputeRequestId, setDisputeRequestId] = useState<string | null>(null);
  const [rejectionComment, setRejectionComment] = useState('');

  const { forApproval, forAcknowledgement, myActiveRequests } = useMemo(() => {
    if (!user) return { forApproval: [], forAcknowledgement: [], myActiveRequests: [] };
    
    const forApproval: InventoryTransferRequest[] = [];
    const forAcknowledgement: InventoryTransferRequest[] = [];
    const myActiveRequests: InventoryTransferRequest[] = [];

    inventoryTransferRequests.forEach(req => {
      if (can.approve_store_requests && (req.status === 'Pending' || req.status === 'Disputed')) {
        forApproval.push(req);
      }
      
      const isDestinationSupervisor = user.role === 'Supervisor' && user.projectId === req.toProjectId;
      const wasRequestedByMe = req.requesterId === user.id;

      if (req.status === 'Approved' && (isDestinationSupervisor || wasRequestedByMe)) {
        forAcknowledgement.push(req);
      }

      if (req.requesterId === user.id && (req.status === 'Pending' || req.status === 'Approved' || req.status === 'Disputed')) {
          myActiveRequests.push(req);
      }
    });

    return { 
        forApproval, 
        forAcknowledgement, 
        myActiveRequests,
    };
  }, [inventoryTransferRequests, user, can.approve_store_requests]);

  if (forApproval.length === 0 && forAcknowledgement.length === 0 && myActiveRequests.length === 0 && allCompletedTransferRequests.length === 0) {
    return null;
  }
  
  const handleReject = () => {
    if (rejectionRequestId && rejectionComment) {
        rejectInventoryTransferRequest(rejectionRequestId, rejectionComment);
        setRejectionRequestId(null);
        setRejectionComment('');
    }
  };

  const handleDispute = () => {
    if (disputeRequestId && rejectionComment) {
        disputeInventoryTransfer(disputeRequestId, rejectionComment);
        setDisputeRequestId(null);
        setRejectionComment('');
    }
  };

  const handleDelete = (id: string) => {
    deleteInventoryTransferRequest(id);
    toast({ title: 'Transfer Deleted', description: 'The transfer record has been removed.', variant: 'destructive' });
  };

  return (
    <Card className="border-blue-500">
      <CardHeader>
        <CardTitle>Inventory Transfers</CardTitle>
        <CardDescription>Track and manage item transfers between projects.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {forApproval.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Awaiting Store Approval</h4>
            {forApproval.map(req => {
              const requester = users.find(u => u.id === req.requesterId);
              const fromProject = projects.find(p => p.id === req.fromProjectId);
              const toProject = projects.find(p => p.id === req.toProjectId);
              const requestedBy = req.requestedById ? users.find(u => u.id === req.requestedById) : null;
              const isDisputed = req.status === 'Disputed';
              const comments = Array.isArray(req.comments) ? req.comments : Object.values(req.comments || {});

              return (
                <div key={req.id} className={`p-4 border rounded-lg ${isDisputed ? 'bg-destructive/10' : 'bg-muted/50'}`}>
                  {isDisputed && <Badge variant="destructive" className="mb-2">DISPUTED</Badge>}
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm">
                        <span className="font-semibold">{requester?.name || 'Unknown User'}</span> requests to transfer {req.items.length} item(s)
                        from <span className="font-semibold">{fromProject?.name}</span> to <span className="font-semibold">{toProject?.name}</span>.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Submitted {formatDistanceToNow(parseISO(req.requestDate), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive" onClick={() => setRejectionRequestId(req.id)}>
                                    <ThumbsDown className="mr-2 h-4 w-4" /> Reject
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Reject Transfer?</AlertDialogTitle>
                                    <AlertDialogDescription>Please provide a reason for rejecting this transfer request.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="py-2">
                                    <Label htmlFor="rejection-comment">Comment</Label>
                                    <Textarea id="rejection-comment" value={rejectionComment} onChange={e => setRejectionComment(e.target.value)} />
                                </div>
                                <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setRejectionRequestId(null)}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleReject}>Confirm Rejection</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="sm">
                                    <ThumbsUp className="mr-2 h-4 w-4" /> Approve...
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={e => e.preventDefault()}>Approve Transfer</DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Approve Transfer?</AlertDialogTitle>
                                            <AlertDialogDescription>This will move {req.items.length} item(s) to {toProject?.name} pending supervisor acknowledgement. This action is final.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => approveInventoryTransferRequest(req, false)}>Confirm Approval</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                {req.reason === 'For TP certification' && (
                                 <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={e => e.preventDefault()}>Approve &amp; Send to TP</DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Approve &amp; Create TP List?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will move the items and automatically create a new, one-time editable TP Certification list.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => approveInventoryTransferRequest(req, true)}>Confirm &amp; Create List</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>

                    </div>
                  </div>
                  <div className="mt-2 text-sm">
                    <p><strong>Reason:</strong> {req.reason} {requestedBy ? ` by ${requestedBy.name}` : ''}</p>
                    {req.remarks && <p><strong>Remarks:</strong> {req.remarks}</p>}
                    <p className="font-medium mt-2">Items:</p>
                    <ul className="list-disc list-inside text-xs text-muted-foreground">
                      {req.items.map(item => (
                        <li key={item.itemId}>{item.name} (SN: {item.serialNumber})</li>
                      ))}
                    </ul>
                     <Accordion type="single" collapsible className="w-full mt-2">
                        <AccordionItem value="comments" className="border-none">
                            <AccordionTrigger className="p-0 text-xs text-blue-600 hover:no-underline">View Comment History</AccordionTrigger>
                            <AccordionContent className="pt-2 text-muted-foreground">
                                <div className="space-y-2">
                                {comments.length > 0 ? comments.map((c,i) => {
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
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {forAcknowledgement.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Awaiting Your Acknowledgement</h4>
            {forAcknowledgement.map(req => {
              const requester = users.find(u => u.id === req.requesterId);
              const fromProject = projects.find(p => p.id === req.fromProjectId);
              const toProject = projects.find(p => p.id === req.toProjectId);
               const requestedBy = req.requestedById ? users.find(u => u.id === req.requestedById) : null;
              
              return (
                <div key={req.id} className="p-4 border rounded-lg bg-muted/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm">
                        <span className="font-semibold">{requester?.name}</span> transferred {req.items.length} item(s)
                        from <span className="font-semibold">{fromProject?.name}</span> to <span className="font-semibold">{toProject?.name}</span>.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Approved {req.approvalDate ? formatDistanceToNow(parseISO(req.approvalDate), { addSuffix: true }) : ''}
                      </p>
                    </div>
                     <div className="flex items-center gap-2">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive" onClick={() => setDisputeRequestId(req.id)}>
                                    <AlertTriangle className="mr-2 h-4 w-4" /> Dispute
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Dispute Transfer?</AlertDialogTitle>
                                    <AlertDialogDescription>Please provide a reason for disputing this transfer (e.g., items not received).</AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="py-2">
                                    <Label htmlFor="dispute-comment">Comment</Label>
                                    <Textarea id="dispute-comment" value={rejectionComment} onChange={e => setRejectionComment(e.target.value)} />
                                </div>
                                <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setDisputeRequestId(null)}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDispute}>Submit Dispute</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <Button size="sm" onClick={() => acknowledgeTransfer(req.id)}>
                            <CheckCircle className="mr-2 h-4 w-4" /> Acknowledge Receipt
                        </Button>
                    </div>
                  </div>
                  <div className="mt-2 text-sm">
                    <p><strong>Reason:</strong> {req.reason} {requestedBy ? ` by ${requestedBy.name}` : ''}</p>
                    <p className="font-medium mt-2">Items:</p>
                    <ul className="list-disc list-inside text-xs text-muted-foreground">
                      {req.items.map(item => (
                        <li key={item.itemId}>{item.name} (SN: {item.serialNumber})</li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {myActiveRequests.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">My Active Requests</h4>
            {myActiveRequests.map(req => {
                const toProject = projects.find(p => p.id === req.toProjectId);
                const fromProject = projects.find(p => p.id === req.fromProjectId);
                const requestedBy = req.requestedById ? users.find(u => u.id === req.requestedById) : null;
                const approver = req.approverId ? users.find(u => u.id === req.approverId) : null;
                const statusVariant = req.status === 'Disputed' || req.status === 'Rejected' ? 'destructive' : req.status === 'Approved' ? 'default' : 'secondary';
              return (
                <div key={req.id} className="p-4 border rounded-lg bg-muted/50">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-semibold">Transfer to {toProject?.name}</p>
                            <p className="text-xs text-muted-foreground">From: {fromProject?.name} &middot; Submitted {formatDistanceToNow(parseISO(req.requestDate), { addSuffix: true })}</p>
                        </div>
                        <Badge variant={statusVariant}>{req.status}</Badge>
                    </div>
                     <div className="mt-2 text-sm space-y-1">
                        <p><strong>Reason:</strong> {req.reason} {requestedBy ? ` (for ${requestedBy.name})` : ''}</p>
                        {req.remarks && <p><strong>Remarks:</strong> {req.remarks}</p>}
                        {approver && <p className="text-xs text-muted-foreground">Last action by {approver.name} {req.approvalDate ? formatDistanceToNow(parseISO(req.approvalDate), { addSuffix: true }) : ''}</p>}
                        <p className="font-medium mt-2">Items:</p>
                        <ul className="list-disc list-inside text-xs text-muted-foreground">
                            {req.items.map(item => (
                                <li key={item.itemId}>{item.name} (SN: {item.serialNumber})</li>
                            ))}
                        </ul>
                    </div>
                </div>
              );
            })}
          </div>
        )}

        {allCompletedTransferRequests.length > 0 && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="completed-transfers" className="border rounded-md">
              <AccordionTrigger className="p-4 bg-muted/50 hover:no-underline font-semibold text-sm">
                Transfer History ({allCompletedTransferRequests.length})
              </AccordionTrigger>
              <AccordionContent className="p-4">
                <div className="space-y-2">
                  {allCompletedTransferRequests.map(req => {
                    const fromProject = projects.find(p => p.id === req.fromProjectId);
                    const toProject = projects.find(p => p.id === req.toProjectId);
                    const statusVariant = req.status === 'Completed' ? 'success' : 'destructive';
                    return (
                        <Accordion key={req.id} type="single" collapsible className="w-full border rounded-sm">
                            <AccordionItem value={req.id} className="border-none">
                                <div className="flex justify-between items-center p-2">
                                  <AccordionTrigger className="p-0 text-sm hover:no-underline flex-1">
                                      <div className="flex justify-between items-center w-full">
                                          <p>
                                              Transfer from <span className="font-semibold">{fromProject?.name}</span> to <span className="font-semibold">{toProject?.name}</span>
                                          </p>
                                      </div>
                                  </AccordionTrigger>
                                  <div className="flex items-center gap-2 pl-4">
                                    <Badge variant={statusVariant}>{req.status}</Badge>
                                    {user?.role === 'Admin' && (
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive/80">
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Delete History Item?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this record from history. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(req.id)}>Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    )}
                                  </div>
                                </div>
                                <AccordionContent className="p-2 border-t">
                                    <ul className="list-disc list-inside text-xs text-muted-foreground">
                                    {req.items.map(item => (
                                        <li key={item.itemId}>{item.name} (SN: {item.serialNumber})</li>
                                    ))}
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

      </CardContent>
    </Card>
  );
}
