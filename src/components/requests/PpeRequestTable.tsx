

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, CheckCircle, XCircle, Paperclip, Edit, Check, Trash2, Settings } from 'lucide-react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import type { PpeRequest, PpeRequestStatus, ManpowerProfile, Comment } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import EditPpeRequestDialog from './EditPpeRequestDialog';
import { Card, CardContent, CardFooter, CardHeader } from '../ui/card';

interface PpeRequestTableProps {
  requests: PpeRequest[];
}

const statusVariant: Record<PpeRequestStatus, 'default' | 'secondary' | 'destructive' | 'success'> = {
  Pending: 'secondary',
  Approved: 'default',
  Issued: 'success',
  Rejected: 'destructive',
};

const RequestCard = ({ req }: { req: PpeRequest }) => {
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

    const manpower = manpowerProfiles.find(p => p.id === req.manpowerId);
    const hasUpdate = user?.id === req.requesterId && !req.viewedByRequester;
    const canApprove = isManager && req.status === 'Pending';
    const canMarkAsIssued = canIssue && req.status === 'Approved';
    const lastIssue = useMemo(() => {
      if (!manpower?.ppeHistory) return null;
      const historyArray = Array.isArray(manpower.ppeHistory) ? manpower.ppeHistory : Object.values(manpower.ppeHistory);
      return historyArray
        .sort((a,b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())[0];
    }, [manpower]);

    const commentsArray = Array.isArray(req.comments) ? req.comments : (req.comments ? Object.values(req.comments) : []);
    
    const handleAccordionToggle = (openValue: string) => {
        if (openValue === req.id && user?.id === req.requesterId && !req.viewedByRequester) {
            markPpeRequestAsViewed(req.id);
        }
    };

    return (
        <Card className={cn("relative", hasUpdate && "border-blue-500")}>
            {hasUpdate && <div className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" title="Unread update"></div>}
            <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-semibold">{manpower?.name}</p>
                        <p className="text-sm text-muted-foreground">{projects.find(p => p.id === manpower?.eic)?.name}</p>
                    </div>
                    <Badge variant={statusVariant[req.status]}>{req.status}</Badge>
                </div>
                
                <div>
                    <p className="font-medium text-sm">{req.requestType} {req.ppeType}</p>
                    <p className="text-sm text-muted-foreground">Size: {req.size || 'N/A'}{req.quantity && `, Qty: ${req.quantity}`}</p>
                </div>
                
                {req.remarks && <p className="text-xs italic text-muted-foreground bg-muted p-2 rounded-md">"{req.remarks}"</p>}
                
                {lastIssue && (
                    <div className="text-xs text-muted-foreground">
                        Last Issue: {format(parseISO(lastIssue.issueDate), 'dd-MM-yy')}
                    </div>
                )}

                <Accordion type="single" collapsible className="w-full" onValueChange={() => handleAccordionToggle(req.id)}>
                    <AccordionItem value={req.id} className="border-none">
                        <AccordionTrigger className="p-0 text-xs text-blue-600 hover:no-underline">View Details & Comments</AccordionTrigger>
                        <AccordionContent className="pt-2 text-muted-foreground">
                            {req.attachmentUrl && (
                                <Button variant="link" size="sm" className="p-0 h-auto mb-2" onClick={() => setViewingAttachmentUrl(req.attachmentUrl!)}>
                                    <Paperclip className="mr-1 h-3 w-3" />View Attachment
                                </Button>
                            )}
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
            </CardContent>
            <CardFooter className="p-2 bg-muted/50 flex justify-end gap-2">
                 {isManager && req.status === 'Pending' && (
                    <>
                        <Button size="sm" onClick={() => handleActionClick(req, 'Approved')}><CheckCircle className="mr-2 h-4 w-4" /> Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleActionClick(req, 'Rejected')}><XCircle className="mr-2 h-4 w-4" /> Reject</Button>
                    </>
                 )}
                 {canIssue && req.status === 'Approved' && (
                    <Button size="sm" onClick={() => handleActionClick(req, 'Issued')}><Check className="mr-2 h-4 w-4" /> Issue</Button>
                 )}
                 {user?.role === 'Admin' && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><Settings className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onSelect={() => handleEditClick(req)} disabled={req.status !== 'Pending'}>
                                <Edit className="mr-2 h-4 w-4" /> Edit Request
                            </DropdownMenuItem>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                      <Trash2 className="mr-2 h-4 w-4" /> Delete Request
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>This action cannot be undone. This will permanently delete this PPE request.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteRequest(req.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
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
            </CardFooter>

            <Dialog open={!!viewingAttachmentUrl} onOpenChange={() => setViewingAttachmentUrl(null)}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader><DialogTitle>Attachment Viewer</DialogTitle></DialogHeader>
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
        </Card>
    )
}

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
            <div className="space-y-2">
                <h3 className="font-semibold text-lg">Active Requests ({activeRequests.length})</h3>
                {activeRequests.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {activeRequests.map(req => <RequestCard key={req.id} req={req} />)}
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
                                {completedRequests.map(req => <RequestCard key={req.id} req={req} />)}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
             )}
        </div>
    );
}
