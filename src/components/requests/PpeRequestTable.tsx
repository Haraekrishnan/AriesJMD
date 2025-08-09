
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, CheckCircle, XCircle, Paperclip, Edit, Check, Trash2, Settings } from 'lucide-react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import type { PpeRequest, PpeRequestStatus, ManpowerProfile, Comment } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import EditPpeRequestDialog from './EditPpeRequestDialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';


interface PpeRequestTableProps {
  requests: PpeRequest[];
}

const statusVariant: Record<PpeRequestStatus, 'default' | 'secondary' | 'destructive' | 'success'> = {
  Pending: 'secondary',
  Approved: 'default',
  Issued: 'success',
  Rejected: 'destructive',
};

const RequestRow = ({ req }: { req: PpeRequest }) => {
    const { user, users, manpowerProfiles, projects, updatePpeRequestStatus, markPpeRequestAsViewed, deletePpeRequest, deletePpeAttachment, ppeStock } = useAppContext();
    const [selectedRequest, setSelectedRequest] = useState<PpeRequest | null>(null);
    const [editingRequest, setEditingRequest] = useState<PpeRequest | null>(null);
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
        const storeRoles = ['Store in Charge', 'Assistant Store Incharge', 'Admin', 'Project Coordinator'];
        return storeRoles.includes(user.role);
    }, [user]);

    const handleActionClick = (req: PpeRequest, act: 'Approved' | 'Rejected' | 'Issued') => {
        setSelectedRequest(req);
        setAction(act);
        setComment('');
    };

    const handleConfirmAction = () => {
        if (!selectedRequest || !action) return;
        if (!comment.trim() && action !== 'Approved') {
            toast({ title: 'Comment required', variant: 'destructive'});
            return;
        }

        updatePpeRequestStatus(selectedRequest.id, action, comment);
        toast({ title: `Request ${action}` });
        setSelectedRequest(null);
        setAction(null);
    }
    
    const handleEditClick = (req: PpeRequest) => {
        setEditingRequest(req);
    };

    const handleDeleteRequest = (reqId: string) => {
        deletePpeRequest(reqId);
        toast({ variant: 'destructive', title: 'Request Deleted' });
    }

    const handleDeleteAttachment = (reqId: string) => {
        deletePpeAttachment(reqId);
        toast({ variant: 'destructive', title: 'Attachment Deleted' });
    }

    const getManpowerProfile = (id: string) => manpowerProfiles.find(p => p.id === id);
    const getRequesterName = (id: string) => users.find(u => u.id === id)?.name || 'N/A';
    const getProjectName = (id?: string) => id ? projects.find(p => p.id === id)?.name : 'N/A';
    
    const getRejoiningDate = (profile?: ManpowerProfile) => {
        if(!profile || !profile.leaveHistory) return 'N/A';
        const lastRejoin = profile.leaveHistory.filter(l => l.rejoinedDate).sort((a,b) => new Date(b.rejoinedDate!).getTime() - new Date(a.rejoinedDate!).getTime())[0];
        return lastRejoin?.rejoinedDate ? format(parseISO(lastRejoin.rejoinedDate), 'dd-MM-yy') : 'N/A';
    }

    const getStockInfo = (req: PpeRequest): string => {
        if (req.ppeType === 'Safety Shoes') {
        const stock = ppeStock.find(s => s.id === 'safetyShoes');
        return `Current Stock: ${stock?.quantity || 0}`;
        }
        if (req.ppeType === 'Coverall') {
        const stock = ppeStock.find(s => s.id === 'coveralls');
        const sizeStock = stock?.sizes?.[req.size] || 0;
        return `Stock (Size ${req.size}): ${sizeStock}`;
        }
        return 'Stock info unavailable';
    };

    const manpower = getManpowerProfile(req.manpowerId);
    const requester = users.find(u => u.id === req.requesterId);
    const hasUpdate = user?.id === req.requesterId && !req.viewedByRequester;
    const canApprove = isManager && req.status === 'Pending';
    const canMarkAsIssued = canIssue && req.status === 'Approved';
    
    const sortedHistory = useMemo(() => {
        if (!manpower?.ppeHistory) return [];
        return [...manpower.ppeHistory].sort((a,b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
    }, [manpower?.ppeHistory]);

    const lastIssue = sortedHistory[0];
    const previousIssues = sortedHistory.slice(1);
    const commentsArray = Array.isArray(req.comments) ? req.comments : (req.comments ? Object.values(req.comments) : []);

    const handleAccordionToggle = (openValue: string) => {
        if (openValue === req.id && user?.id === req.requesterId && !req.viewedByRequester) {
            markPpeRequestAsViewed(req.id);
        }
    };

    return (
        <>
        <TableRow className={cn(hasUpdate && "font-bold bg-blue-50 dark:bg-blue-900/20")}>
            <TableCell className="w-8">
                {hasUpdate && <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" title="Unread update"></div>}
            </TableCell>
            <TableCell>
                <p className="font-semibold">{manpower?.name}</p>
                 <div className="text-xs text-muted-foreground space-y-1 mt-1">
                    <p><strong>Join:</strong> {manpower?.joiningDate ? format(parseISO(manpower.joiningDate), 'dd-MM-yy') : 'N/A'}</p>
                    <p><strong>Rejoin:</strong> {getRejoiningDate(manpower)}</p>
                </div>
            </TableCell>
             <TableCell>
                {lastIssue ? (
                    <div className="text-xs">
                        <p>{lastIssue.requestType} {lastIssue.ppeType} ({lastIssue.size})</p>
                        <p>on {format(parseISO(lastIssue.issueDate), 'dd-MM-yy')}</p>
                         {previousIssues.length > 0 && (
                            <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="history" className="border-none">
                                    <AccordionTrigger className="p-0 text-xs text-blue-600 hover:no-underline">View {previousIssues.length} previous</AccordionTrigger>
                                    <AccordionContent className="pt-2">
                                        <ul className="list-disc pl-4 text-xs space-y-1">
                                            {previousIssues.map(item => (
                                            <li key={item.id}>
                                                {item.requestType} {item.ppeType} ({item.size}) on {format(parseISO(item.issueDate), 'dd-MM-yy')}
                                            </li>
                                            ))}
                                        </ul>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                         )}
                    </div>
                ) : (
                     <p className="text-xs text-muted-foreground">No history</p>
                )}
            </TableCell>
            <TableCell>
                <p>{getProjectName(manpower?.eic)}</p>
                <p className="text-xs text-muted-foreground">by {requester?.name || 'N/A'}</p>
            </TableCell>
            <TableCell>
                <p>{req.requestType} {req.ppeType}</p>
                <p className="text-sm text-muted-foreground">Size: {req.size || 'N/A'}</p>
                {req.quantity && <p className="text-sm text-muted-foreground">Qty: {req.quantity}</p>}
                {req.attachmentUrl && (
                    <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => setViewingAttachmentUrl(req.attachmentUrl!)}>
                        <Paperclip className="mr-1 h-3 w-3" />View Attachment
                    </Button>
                )}
            </TableCell>
            <TableCell className="max-w-[200px]">
                <Accordion type="single" collapsible className="w-full" onValueChange={() => handleAccordionToggle(req.id)}>
                    <AccordionItem value={req.id} className="border-none">
                        <AccordionTrigger className="p-0 hover:no-underline font-normal text-left text-xs text-muted-foreground">
                            <span className="truncate">{commentsArray[commentsArray.length-1]?.text || 'No comments'}</span>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2">
                            <div className="space-y-2">
                              {commentsArray.length > 0 ? commentsArray.map((c,i) => {
                                  const commentUser = users.find(u => u.id === c.userId);
                                  return (
                                      <div key={i} className="flex items-start gap-2">
                                          <Avatar className="h-6 w-6"><AvatarImage src={commentUser?.avatar} /><AvatarFallback>{commentUser?.name.charAt(0)}</AvatarFallback></Avatar>
                                          <div className="text-xs bg-muted p-2 rounded-md w-full">
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
            </TableCell>
            <TableCell>
                <Badge variant={statusVariant[req.status]}>{req.status}</Badge>
                {canApprove && (
                    <p className="text-xs text-muted-foreground mt-1">{getStockInfo(req)}</p>
                )}
            </TableCell>
            <TableCell className="text-right">
                <div className="flex gap-2 justify-end items-center">
                    {canApprove && (
                        <>
                            <Button size="sm" onClick={() => handleActionClick(req, 'Approved')}><CheckCircle className="mr-2 h-4 w-4" /> Approve</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleActionClick(req, 'Rejected')}><XCircle className="mr-2 h-4 w-4" /> Reject</Button>
                        </>
                    )}
                    {canMarkAsIssued && (
                        <Button size="sm" onClick={() => handleActionClick(req, 'Issued')}><Check className="mr-2 h-4 w-4" /> Issue</Button>
                    )}
                    {user?.role === 'Admin' && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><Settings className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onSelect={() => handleEditClick(req)} disabled={req.status !== 'Pending'}>
                                    <Edit className="mr-2 h-4 w-4" /> Edit Request
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleDeleteRequest(req.id)} disabled={req.status !== 'Pending'} className="text-destructive focus:text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Request
                                </DropdownMenuItem>
                                {req.attachmentUrl && (
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger><Paperclip className="mr-2 h-4 w-4" />Attachment</DropdownMenuSubTrigger>
                                        <DropdownMenuPortal>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem onSelect={() => setViewingAttachmentUrl(req.attachmentUrl!)}>View Attachment</DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => handleDeleteAttachment(req.id)} className="text-destructive focus:text-destructive">Delete Attachment</DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuPortal>
                                    </DropdownMenuSub>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </TableCell>
        </TableRow>
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
                        <AlertDialogDescription>Please provide a comment for this action. {action === 'Approved' && '(Optional)'}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div>
                        <Label htmlFor="comment">Comment</Label>
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
        <EditPpeRequestDialog 
            isOpen={!!editingRequest}
            setIsOpen={() => setEditingRequest(null)}
            request={editingRequest}
        />
        )}
        </>
    );
};

export default function PpeRequestTable({ requests }: PpeRequestTableProps) {
    const { user, markPpeRequestAsViewed } = useAppContext();
    const [isCompletedOpen, setIsCompletedOpen] = useState(false);

    const { activeRequests, completedRequests } = useMemo(() => {
        const active: PpeRequest[] = [];
        const completed: PpeRequest[] = [];
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
                    markPpeRequestAsViewed(req.id);
                }
            });
        }
    }, [isCompletedOpen, completedRequests, user, markPpeRequestAsViewed]);


    if (requests.length === 0) {
        return <p className="text-center py-10 text-muted-foreground">No PPE requests found.</p>;
    }

    return (
        <div className="space-y-4">
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead></TableHead>
                            <TableHead className="w-[15%]">Employee</TableHead>
                            <TableHead>PPE Issue History</TableHead>
                            <TableHead>Project</TableHead>
                            <TableHead>Request</TableHead>
                            <TableHead className="w-[15%]">Comments</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {activeRequests.map(req => <RequestRow key={req.id} req={req} />)}
                        {activeRequests.length === 0 && (
                            <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No active requests.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            
            {completedRequests.length > 0 && (
                 <Accordion type="single" collapsible className="w-full" onValueChange={(value) => setIsCompletedOpen(!!value)}>
                    <AccordionItem value="completed-requests" className="border rounded-md">
                        <AccordionTrigger className="p-4 bg-muted/50 hover:no-underline">
                           Completed & Rejected Requests ({completedRequests.length})
                        </AccordionTrigger>
                        <AccordionContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead></TableHead>
                                        <TableHead className="w-[15%]">Employee</TableHead>
                                        <TableHead>PPE Issue History</TableHead>
                                        <TableHead>Project</TableHead>
                                        <TableHead>Request</TableHead>
                                        <TableHead className="w-[15%]">Comments</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {completedRequests.map(req => <RequestRow key={req.id} req={req} />)}
                                </TableBody>
                            </Table>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            )}
        </div>
    );
}
