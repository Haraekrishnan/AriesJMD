'use client';

import { useMemo, useState } from 'react';
import { useAppContext } from '@/hooks/use-app-context';
import type { InternalRequest, User } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

type InternalRequestTableProps = {
  requests: InternalRequest[];
};

export default function InternalRequestTable({ requests }: InternalRequestTableProps) {
  const { user, users, can, approveInternalRequest, rejectInternalRequest, addInternalRequestComment } = useAppContext();
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const { toast } = useToast();

  const isApprover = useMemo(() => can.approve_store_requests, [can]);

  const toggleExpand = (requestId: string) => {
    setExpandedRequestId(expandedRequestId === requestId ? null : requestId);
  };

  const getStatusVariant = (status: InternalRequest['status']) => {
    switch (status) {
      case 'Pending':
        return 'secondary';
      case 'Approved':
        return 'default';
      case 'Rejected':
        return 'destructive';
      case 'Issued':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getUser = (userId: string): User | undefined => users.find(u => u.id === userId);

  const handleAddComment = (requestId: string) => {
    if (comment.trim() === '') return;
    addInternalRequestComment(requestId, comment);
    setComment('');
  };

  const handleApprovalAction = (
    requestId: string,
    action: 'approve' | 'reject',
    commentText?: string
  ) => {
    if (action === 'approve') {
      approveInternalRequest(requestId, commentText);
      toast({ title: 'Request Approved' });
    } else {
      if (!commentText) {
        toast({
          variant: 'destructive',
          title: 'Comment Required',
          description: 'A reason is required to reject a request.',
        });
        return;
      }
      rejectInternalRequest(requestId, commentText);
      toast({ title: 'Request Rejected', variant: 'destructive' });
    }
  };

  if (requests.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No internal requests found.</p>;
  }

  return (
    <div className="space-y-2">
      {requests.map(request => {
        const requester = getUser(request.requesterId);
        const approver = request.approverId ? getUser(request.approverId) : null;
        const isExpanded = expandedRequestId === request.id;
        const isOwner = user?.id === request.requesterId;
        const showActions = isApprover && request.status === 'Pending';
        const showCommentBox = isOwner || isApprover;
        
        return (
          <div key={request.id} className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50 hover:bg-muted/80 cursor-pointer" onClick={() => toggleExpand(request.id)}>
                <TableRow>
                  <TableHead>Requester</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approver</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="cursor-pointer" onClick={() => toggleExpand(request.id)}>
                  <TableCell>{requester?.name}</TableCell>
                  <TableCell>{format(new Date(request.date), 'dd MMM, yyyy')}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(request.status)}>{request.status}</Badge>
                  </TableCell>
                  <TableCell>{approver?.name || 'N/A'}</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {isExpanded && (
              <div className="p-4 bg-background">
                <h4 className="font-semibold mb-2">Requested Items:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm pl-4 mb-4">
                  {request.items.map((item, index) => (
                    <li key={index}>
                      {item.quantity}x {item.description}
                      {item.remarks && <span className="text-muted-foreground"> - {item.remarks}</span>}
                    </li>
                  ))}
                </ul>
                
                {request.comments && request.comments.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2">Comments:</h4>
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                      {request.comments.map(c => {
                         const commentUser = getUser(c.userId);
                         return(
                          <div key={c.id} className="flex items-start gap-2 text-sm">
                            <Avatar className='h-7 w-7'><AvatarImage src={commentUser?.avatar} /><AvatarFallback>{commentUser?.name.charAt(0)}</AvatarFallback></Avatar>
                            <div className='flex-1'>
                                <div className='bg-muted p-2 rounded-md'>
                                    <div className='flex justify-between items-baseline'>
                                        <p className="font-semibold text-xs">{commentUser?.name}</p>
                                        <p className='text-xs text-muted-foreground'>{format(new Date(c.date), 'dd MMM, hh:mm a')}</p>
                                    </div>
                                    <p className="text-foreground/80 mt-1">{c.text}</p>
                                </div>
                            </div>
                          </div>
                         )
                      })}
                    </div>
                  </div>
                )}
                
                {showCommentBox && (
                    <div className="flex gap-2 mb-4">
                        <Input
                        placeholder="Add a comment..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        />
                        <Button onClick={() => handleAddComment(request.id)} disabled={!comment.trim()}>
                        Send
                        </Button>
                    </div>
                )}

                {showActions && (
                  <div className="flex gap-2 justify-end pt-4 border-t">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">Reject</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reject Request?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Please provide a reason for rejecting this request. This will be added as a comment.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <Textarea
                          placeholder="Reason for rejection..."
                          id="rejection-comment"
                        />
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              const commentText = (document.getElementById('rejection-comment') as HTMLTextAreaElement).value;
                              handleApprovalAction(request.id, 'reject', commentText);
                            }}
                          >
                            Confirm Rejection
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <AlertDialog>
                       <AlertDialogTrigger asChild>
                          <Button>Approve</Button>
                       </AlertDialogTrigger>
                       <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Approve Request?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Do you want to add an optional comment with the approval?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <Textarea
                            placeholder="Optional comment..."
                            id="approval-comment"
                            />
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => {
                                const commentText = (document.getElementById('approval-comment') as HTMLTextAreaElement).value;
                                handleApprovalAction(request.id, 'approve', commentText);
                            }}>
                                Approve
                            </AlertDialogAction>
                          </AlertDialogFooter>
                       </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
