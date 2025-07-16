

'use client';

import { useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, CheckCircle, XCircle, MessagesSquare, Edit } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import type { ManagementRequest, ManagementRequestStatus } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


interface ManagementRequestTableProps {
  requests: ManagementRequest[];
}

const statusVariant: Record<ManagementRequestStatus, 'default' | 'secondary' | 'destructive'> = {
  Pending: 'secondary',
  Approved: 'default',
  Rejected: 'destructive',
};

export default function ManagementRequestTable({ requests }: ManagementRequestTableProps) {
  const { user, users, updateManagementRequestStatus, markManagementRequestAsViewed } = useAppContext();
  const [selectedRequest, setSelectedRequest] = useState<ManagementRequest | null>(null);
  const [action, setAction] = useState<'Approved' | 'Rejected' | null>(null);
  const [comment, setComment] = useState('');
  const { toast } = useToast();
  
  const getName = (id: string) => users.find(u => u.id === id)?.name || 'Unknown';
  const getAvatar = (id: string) => users.find(u => u.id === id)?.avatar;

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
    toast({ title: `Request ${action}d` });
    setSelectedRequest(null);
    setAction(null);
  }

  const handleAccordionToggle = (req: ManagementRequest) => {
    if (user?.id === req.requesterId && !req.viewedByRequester) {
        markManagementRequestAsViewed(req.id);
    }
  };

  if (requests.length === 0) {
    return <p className="text-center py-10 text-muted-foreground">No requests found.</p>;
  }

  return (
    <>
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead></TableHead>
            <TableHead>From/To</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Subject & Details</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map(req => {
              const isRecipient = req.recipientId === user?.id;
              const isRequester = req.requesterId === user?.id;
              const hasUpdate = isRequester && !req.viewedByRequester;
              const commentsArray = Array.isArray(req.comments) ? req.comments : [];

              return (
                <TableRow key={req.id} className={cn(hasUpdate && "font-bold bg-blue-50 dark:bg-blue-900/20")}>
                <TableCell className="w-8">
                   {hasUpdate && <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" title="Unread update"></div>}
                </TableCell>
                <TableCell>
                    {isRecipient ? `From: ${getName(req.requesterId)}` : `To: ${getName(req.recipientId)}`}
                </TableCell>
                <TableCell>{format(new Date(req.date), 'dd MMM yyyy')}</TableCell>
                <TableCell className="max-w-xs">
                    <Accordion type="single" collapsible className="w-full" onValueChange={() => handleAccordionToggle(req)}>
                        <AccordionItem value={req.id} className="border-none">
                            <AccordionTrigger className="p-0 hover:no-underline font-normal text-left">{req.subject}</AccordionTrigger>
                            <AccordionContent className="pt-2 text-muted-foreground">
                                <p className="text-sm mb-4 p-2 bg-muted rounded-md">{req.body}</p>
                                <h4 className="font-semibold text-xs mb-2">Comment History</h4>
                                <div className="space-y-2">
                                  {commentsArray.length > 0 ? commentsArray.map((c,i) => {
                                      const commentUser = users.find(u => u.id === c.userId);
                                      return (
                                          <div key={i} className="flex items-start gap-2">
                                              <Avatar className="h-6 w-6"><AvatarImage src={commentUser?.avatar} /><AvatarFallback>{commentUser?.name.charAt(0)}</AvatarFallback></Avatar>
                                              <div className="text-xs bg-background p-2 rounded-md w-full">
                                                  <div className="flex justify-between items-baseline"><p className="font-semibold">{commentUser?.name}</p><p className="text-muted-foreground">{formatDistanceToNow(new Date(c.date), { addSuffix: true })}</p></div>
                                                  <p className="text-foreground/80 mt-1">{c.text}</p>
                                              </div>
                                          </div>
                                      )
                                  }) : <p className="text-xs text-muted-foreground">No comments yet.</p>}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </TableCell>
                <TableCell>
                    <Badge variant={statusVariant[req.status]}>{req.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                    {isRecipient && req.status === 'Pending' && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleActionClick(req, 'Approved')}><CheckCircle className="mr-2 h-4 w-4" /> Approve</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleActionClick(req, 'Rejected')}><XCircle className="mr-2 h-4 w-4" /> Reject</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </TableCell>
                </TableRow>
              )
          })}
        </TableBody>
      </Table>
    </div>

    {selectedRequest && action && (
        <AlertDialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
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
    </>
  );
}
