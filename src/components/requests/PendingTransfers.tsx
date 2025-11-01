

'use client';
import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ThumbsUp, ThumbsDown, SendToBack } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '../ui/textarea';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui/dropdown-menu';

export default function PendingTransfers() {
  const { inventoryTransferRequests, approveInventoryTransferRequest, rejectInventoryTransferRequest, users, projects, can } = useAppContext();
  const [rejectionRequestId, setRejectionRequestId] = useState<string | null>(null);
  const [rejectionComment, setRejectionComment] = useState('');

  const pendingRequests = useMemo(() => {
    return inventoryTransferRequests.filter(req => req.status === 'Pending');
  }, [inventoryTransferRequests]);

  if (!can.approve_store_requests || pendingRequests.length === 0) {
    return null;
  }
  
  const handleReject = () => {
    if (rejectionRequestId && rejectionComment) {
        rejectInventoryTransferRequest(rejectionRequestId, rejectionComment);
        setRejectionRequestId(null);
        setRejectionComment('');
    }
  };

  return (
    <Card className="border-blue-500">
      <CardHeader>
        <CardTitle>Pending Inventory Transfers</CardTitle>
        <CardDescription>Review and approve or reject the item transfer requests below.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingRequests.map(req => {
          const requester = users.find(u => u.id === req.requesterId);
          const fromProject = projects.find(p => p.id === req.fromProjectId);
          const toProject = projects.find(p => p.id === req.toProjectId);

          return (
            <div key={req.id} className="p-4 border rounded-lg bg-muted/50">
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
                                        <AlertDialogDescription>This will move {req.items.length} item(s) to {toProject?.name}. This action is final.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => approveInventoryTransferRequest(req, false)}>Confirm Approval</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={e => e.preventDefault()} disabled={req.reason !== 'For TP certification'}>
                                        <SendToBack className="mr-2 h-4 w-4"/> Approve &amp; Send to TP
                                    </DropdownMenuItem>
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
                        </DropdownMenuContent>
                    </DropdownMenu>

                 </div>
              </div>
              <div className="mt-2 text-sm">
                <p><strong>Reason:</strong> {req.reason}</p>
                {req.remarks && <p><strong>Remarks:</strong> {req.remarks}</p>}
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
      </CardContent>
    </Card>
  );
}
