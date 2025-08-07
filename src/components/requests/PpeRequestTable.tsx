
'use client';

import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, CheckCircle, XCircle } from 'lucide-react';
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

  const isManager = useMemo(() => {
    if(!user) return false;
    return user.role === 'Manager' || user.role === 'Admin';
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
            <TableHead>Joining Date</TableHead>
            <TableHead>Rejoining Date</TableHead>
            <TableHead>Request</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map(req => {
              const manpower = getManpowerProfile(req.manpowerId);
              const hasUpdate = user?.id === req.requesterId && !req.viewedByRequester;
              const commentsArray = Array.isArray(req.comments) ? req.comments : [];
              const canAct = isManager && (req.status === 'Pending' || req.status === 'Approved');
              
              const size = req.ppeType === 'Coverall' ? manpower?.coverallSize : manpower?.shoeSize;

              return (
                <TableRow key={req.id} className={cn(hasUpdate && "font-bold bg-blue-50 dark:bg-blue-900/20")}>
                <TableCell className="w-8">
                   {hasUpdate && <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" title="Unread update"></div>}
                </TableCell>
                <TableCell>{manpower?.name}</TableCell>
                <TableCell>{getProjectName(manpower?.eic)}</TableCell>
                <TableCell>{manpower?.joiningDate ? format(parseISO(manpower.joiningDate), 'dd-MM-yyyy') : 'N/A'}</TableCell>
                <TableCell>{getRejoiningDate(manpower)}</TableCell>
                <TableCell>
                    <p>{req.requestType} {req.ppeType}</p>
                    <p className="text-sm text-muted-foreground">Size: {size || 'N/A'}</p>
                </TableCell>
                <TableCell>
                    <Badge variant={statusVariant[req.status]}>{req.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {canAct && req.status === 'Pending' && <DropdownMenuItem onClick={() => handleActionClick(req, 'Approved')}><CheckCircle className="mr-2 h-4 w-4" /> Approve</DropdownMenuItem>}
                            {canAct && req.status === 'Approved' && <DropdownMenuItem onClick={() => handleActionClick(req, 'Issued')}><CheckCircle className="mr-2 h-4 w-4" /> Mark as Issued</DropdownMenuItem>}
                            {canAct && req.status === 'Pending' && <DropdownMenuItem className="text-destructive" onClick={() => handleActionClick(req, 'Rejected')}><XCircle className="mr-2 h-4 w-4" /> Reject</DropdownMenuItem>}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
                </TableRow>
              )
          })}
        </TableBody>
      </Table>
    </div>

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
