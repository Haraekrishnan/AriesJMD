

'use client';

import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, CheckCircle, XCircle, Truck, Paperclip } from 'lucide-react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import type { PpeRequest, PpeRequestStatus } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';


interface PpeRequestTableProps {
  requests: PpeRequest[];
}

const statusVariant: Record<PpeRequestStatus, 'default' | 'secondary' | 'destructive' | 'success'> = {
  Pending: 'secondary',
  Approved: 'default',
  Issued: 'success',
  Rejected: 'destructive',
};

export default function PpeRequestTable({ requests }: PpeRequestTableProps) {
  const { user, users, manpowerProfiles, projects, updatePpeRequestStatus, markPpeRequestAsViewed } = useAppContext();
  const [selectedRequest, setSelectedRequest] = useState<PpeRequest | null>(null);
  const [action, setAction] = useState<'Approved' | 'Rejected' | 'Issued' | null>(null);
  const [comment, setComment] = useState('');
  const { toast } = useToast();
  const [viewingAttachmentUrl, setViewingAttachmentUrl] = useState<string | null>(null);
  
  const isManager = useMemo(() => {
    if(!user) return false;
    return user.role === 'Manager' || user.role === 'Admin';
  }, [user]);
  
  const canIssue = useMemo(() => {
    if (!user) return false;
    const storeRoles = ['Store in Charge', 'Assistant Store Incharge', 'Admin'];
    return storeRoles.includes(user.role);
  }, [user]);

  const handleActionClick = (req: PpeRequest, act: 'Approved' | 'Rejected' | 'Issued') => {
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

    updatePpeRequestStatus(selectedRequest.id, action, comment);
    toast({ title: `Request ${action}` });
    setSelectedRequest(null);
    setAction(null);
  }
  
  const getManpowerProfile = (id: string) => manpowerProfiles.find(p => p.id === id);
  const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'N/A';
  const getProjectName = (id?: string) => id ? projects.find(p => p.id === id)?.name : 'N/A';
  const getRejoiningDate = (profile?: ReturnType<typeof getManpowerProfile>) => {
      if(!profile || !profile.leaveHistory) return 'N/A';
      const lastRejoin = profile.leaveHistory.filter(l => l.rejoinedDate).sort((a,b) => new Date(b.rejoinedDate!).getTime() - new Date(a.rejoinedDate!).getTime())[0];
      return lastRejoin?.rejoinedDate ? format(parseISO(lastRejoin.rejoinedDate), 'dd-MM-yyyy') : 'N/A';
  }

  const handleAccordionToggle = (req: PpeRequest) => {
    if (user?.id === req.requesterId && !req.viewedByRequester) {
        markPpeRequestAsViewed(req.id);
    }
  };

  if (requests.length === 0) {
    return <p className="text-center py-10 text-muted-foreground">No PPE requests found.</p>;
  }

  return (
    <>
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead></TableHead>
            <TableHead>Employee</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Requester</TableHead>
            <TableHead>Request</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map(req => {
              const manpower = getManpowerProfile(req.manpowerId);
              const requester = users.find(u => u.id === req.requesterId);
              const hasUpdate = user?.id === req.requesterId && !req.viewedByRequester;
              const canApprove = isManager && req.status === 'Pending';
              const canMarkAsIssued = canIssue && req.status === 'Approved';

              return (
                <TableRow key={req.id} className={cn(hasUpdate && "font-bold bg-blue-50 dark:bg-blue-900/20")}>
                <TableCell className="w-8">
                   {hasUpdate && <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" title="Unread update"></div>}
                </TableCell>
                <TableCell>
                  <Accordion type="single" collapsible className="w-full" onValueChange={() => handleAccordionToggle(req)}>
                    <AccordionItem value={req.id} className="border-none">
                      <AccordionTrigger className="p-0 hover:no-underline font-normal text-left">{manpower?.name}</AccordionTrigger>
                      <AccordionContent className="pt-4 text-muted-foreground">
                        <div className='mb-2 space-y-1 text-sm'>
                          <p><strong>Joining Date:</strong> {manpower?.joiningDate ? format(parseISO(manpower.joiningDate), 'dd-MM-yyyy') : 'N/A'}</p>
                          <p><strong>Rejoining Date:</strong> {getRejoiningDate(manpower)}</p>
                        </div>
                        <h4 className="font-semibold text-xs mb-2">PPE Issue History</h4>
                         {manpower?.ppeHistory && manpower.ppeHistory.length > 0 ? (
                           <ul className="list-disc pl-4 text-sm space-y-1">
                             {manpower.ppeHistory.map(item => (
                               <li key={item.id}>
                                {item.requestType} {item.ppeType} ({item.size}) issued on {format(parseISO(item.issueDate), 'dd-MM-yy')}
                                {item.remarks && <p className="text-muted-foreground text-xs italic">Requester: "{item.remarks}"</p>}
                                {item.storeComment && <p className="text-muted-foreground text-xs italic">Store: "{item.storeComment}"</p>}
                               </li>
                             ))}
                           </ul>
                         ) : <p className="text-xs">No previous PPE issued.</p>}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </TableCell>
                <TableCell>{getProjectName(manpower?.eic)}</TableCell>
                <TableCell>{requester?.name || 'N/A'}</TableCell>
                <TableCell>
                    <p>{req.requestType} {req.ppeType} {req.quantity ? `(x${req.quantity})` : ''}</p>
                    <p className="text-sm text-muted-foreground">Size: {req.size || 'N/A'}</p>
                    {req.remarks && <p className="text-xs text-muted-foreground italic">"{req.remarks}"</p>}
                     {req.attachmentUrl && (
                        <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => setViewingAttachmentUrl(req.attachmentUrl!)}>
                            <Paperclip className="mr-1 h-3 w-3" />View Attachment
                        </Button>
                    )}
                </TableCell>
                <TableCell>
                    <Badge variant={statusVariant[req.status]}>{req.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {canApprove && <DropdownMenuItem onClick={() => handleActionClick(req, 'Approved')}><CheckCircle className="mr-2 h-4 w-4" /> Approve</DropdownMenuItem>}
                            {canMarkAsIssued && <DropdownMenuItem onClick={() => handleActionClick(req, 'Issued')}><Truck className="mr-2 h-4 w-4" /> Mark as Issued</DropdownMenuItem>}
                            {isManager && req.status === 'Pending' && <DropdownMenuItem className="text-destructive" onClick={() => handleActionClick(req, 'Rejected')}><XCircle className="mr-2 h-4 w-4" /> Reject</DropdownMenuItem>}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
                </TableRow>
              )
          })}
        </TableBody>
      </Table>
    </div>

    <Dialog open={!!viewingAttachmentUrl} onOpenChange={() => setViewingAttachmentUrl(null)}>
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle>Attachment Viewer</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center p-4">
                {viewingAttachmentUrl && <img src={viewingAttachmentUrl} alt="Attachment" className="max-w-full max-h-[70vh] rounded-md" />}
            </div>
        </DialogContent>
    </Dialog>

    {selectedRequest && action && (
        <AlertDialog open={!!(selectedRequest && action)} onOpenChange={() => setSelectedRequest(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{action} PPE Request?</AlertDialogTitle>
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
