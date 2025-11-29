
'use client';

import { useState, useMemo, useEffect, MouseEvent, useRef } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, CheckCircle, XCircle, Truck, Edit, Check, Trash2, Settings, AlertTriangle, Save, MessagesSquare, ShieldX, Send, Undo2, MessageSquare } from 'lucide-react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import type { PpeRequest, PpeRequestStatus, ManpowerProfile, Comment, InternalRequestItemStatus } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent } from '@/components/ui/dropdown-menu';
import EditPpeRequestDialog from './EditPpeRequestDialog';
import { Card, CardContent, CardFooter, CardHeader } from '../ui/card';
import { Paperclip, Upload, ZoomIn, ZoomOut, Download } from 'lucide-react';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

interface PpeRequestTableProps {
  requests: PpeRequest[];
}

const statusVariant: Record<PpeRequestStatus, 'default' | 'secondary' | 'destructive' | 'success'> = {
  Pending: 'secondary',
  Approved: 'default',
  Issued: 'success',
  Rejected: 'destructive',
  Disputed: 'destructive',
};

const itemStatusVariant: Record<InternalRequestItemStatus, 'default' | 'secondary' | 'destructive' | 'success'> = {
    Pending: 'secondary',
    Approved: 'default',
    Issued: 'success',
    Rejected: 'destructive',
};

const RequestCard = ({ req }: { req: PpeRequest }) => {
    const { user, users, manpowerProfiles, projects, updatePpeRequestStatus, addPpeRequestComment, markPpeRequestAsViewed, deletePpeRequest, deletePpeAttachment, ppeStock, resolvePpeDispute } = useAppContext();
    const [selectedRequest, setSelectedRequest] = useState<PpeRequest | null>(null);
    const [editingRequest, setEditingRequest] = useState<PpeRequest | null>(null);
    const [action, setAction] = useState<'Approved' | 'Rejected' | 'Issued' | 'Disputed' | 'Query' | null>(null);
    const [itemAction, setItemAction] = useState<{ item: PpeRequest, status: PpeRequestStatus } | null>(null);
    const [comment, setComment] = useState('');
    const [isActionConfirmOpen, setIsActionConfirmOpen] = useState(false);
    const [newComment, setNewComment] = useState('');
    const { toast } = useToast();
    const [viewingAttachmentUrl, setViewingAttachmentUrl] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [isPanning, setIsPanning] = useState(false);
    const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
    const [translate, setTranslate] = useState({ x: 0, y: 0 });
    const imageContainerRef = useRef<HTMLDivElement>(null);

    const isManager = useMemo(() => {
        if(!user) return false;
        return user.role === 'Manager' || user.role === 'Admin';
    }, [user]);

    const canIssue = useMemo(() => {
        if (!user) return false;
        const storeRoles = ['Store in Charge', 'Assistant Store Incharge', 'Admin', 'Project Coordinator'];
        return storeRoles.includes(user.role);
    }, [user]);
    
    const handleActionClick = (req: PpeRequest, act: 'Approved' | 'Rejected' | 'Issued' | 'Disputed' | 'Query') => {
        setSelectedRequest(req);
        setAction(act);
        setComment(act === 'Disputed' ? 'I have not received the issued item. Please investigate.' : '');
    };

    const handleConfirmAction = (confirmedAction?: 'Approved' | 'Rejected' | 'Issued' | 'Disputed') => {
        const finalAction = confirmedAction || action;
        if (!selectedRequest || !finalAction) return;

        if (finalAction === 'Query') {
            if (!comment.trim()) {
                toast({ title: 'Comment required for a query.', variant: 'destructive'});
                return;
            }
            addPpeRequestComment(selectedRequest.id, comment, true); // Send notification
            toast({ title: 'Query Sent' });
        } else {
            if (!comment.trim() && (finalAction === 'Rejected' || finalAction === 'Disputed')) {
                 toast({ title: 'Comment required', variant: 'destructive'});
                 return;
            }
            updatePpeRequestStatus(selectedRequest.id, finalAction, comment);
        }
        
        setSelectedRequest(null);
        setAction(null);
        setComment('');
    }
    
    const handleEditClick = (req: PpeRequest) => {
        setEditingRequest(req);
    };

    const handleDeleteRequest = (reqId: string) => {
        deletePpeRequest(reqId);
        toast({ variant: 'destructive', title: 'Request Deleted' });
    };

    const handleDeleteAttachment = (reqId: string) => {
        deletePpeAttachment(reqId);
        toast({ variant: 'destructive', title: 'Attachment Deleted' });
    }

    const manpower = manpowerProfiles.find(p => p.id === req.manpowerId);
    const isRequester = req.requesterId === user?.id;
    const hasUpdate = isRequester && !req.viewedByRequester;
    const canApprove = isManager && req.status === 'Pending';
    const canMarkAsIssued = canIssue && req.status === 'Approved';
    const canDispute = isRequester && req.status === 'Issued';
    
    const lastIssue = useMemo(() => {
      if (!manpower?.ppeHistory) return null;
      const historyArray = Array.isArray(manpower.ppeHistory) ? manpower.ppeHistory : Object.values(manpower.ppeHistory);
      return historyArray
        .filter(h => h && h.ppeType === req.ppeType)
        .sort((a,b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())[0];
    }, [manpower, req.ppeType]);

    const commentsArray = Array.isArray(req.comments) ? req.comments : (req.comments ? Object.values(req.comments) : []);
    
    const handleAccordionToggle = (openValue: string) => {
        if (openValue === req.id && user?.id === req.requesterId && !req.viewedByRequester) {
            markPpeRequestAsViewed(req.id);
        }
    };
    
    const stockInfo = useMemo(() => {
        if (!selectedRequest) return 'N/A';
        const stockItem = ppeStock.find(s => s.id === (selectedRequest.ppeType === 'Coverall' ? 'coveralls' : 'safetyShoes'));
        return selectedRequest.ppeType === 'Coverall' && stockItem && 'sizes' in stockItem && stockItem.sizes
            ? `${stockItem.sizes[selectedRequest.size] || 0} in stock`
            : (stockItem && 'quantity' in stockItem ? `${stockItem.quantity || 0} in stock` : 'N/A');
    }, [selectedRequest, ppeStock]);
    
    const employeeForSelectedRequest = useMemo(() => {
        if (!selectedRequest) return null;
        return manpowerProfiles.find(p => p.id === selectedRequest.manpowerId);
    }, [selectedRequest, manpowerProfiles]);

    const canEditRequest = user?.role === 'Admin' || (isRequester && req.status === 'Pending');

    const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
        if (zoom <= 1) return;
        e.preventDefault();
        setIsPanning(true);
        setStartPosition({
            x: e.clientX - translate.x,
            y: e.clientY - translate.y,
        });
    };

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (!isPanning || !imageContainerRef.current) return;
        e.preventDefault();
        const x = e.clientX - startPosition.x;
        const y = e.clientY - startPosition.y;
        setTranslate({ x, y });
    };
    
    const handleMouseUpOrLeave = () => {
        setIsPanning(false);
    };

    const isPdf = viewingAttachmentUrl && viewingAttachmentUrl.toLowerCase().endsWith('.pdf');

    return (
        <Card className={cn("relative flex flex-col", hasUpdate && "border-blue-500")}>
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
                
                {(req.remarks || req.newRequestJustification) && (
                    <p className="text-xs italic text-muted-foreground bg-muted p-2 rounded-md">
                        {req.newRequestJustification ? `Justification: ${req.newRequestJustification}` : `Remarks: ${req.remarks}`}
                    </p>
                )}
                
                {req.attachmentUrl && (
                    <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => setViewingAttachmentUrl(req.attachmentUrl!)}>
                        <Paperclip className="mr-1 h-3 w-3" />View Attachment
                    </Button>
                )}
                
                {lastIssue && (
                    <div className="text-xs text-muted-foreground">
                        Last Issue: {format(parseISO(lastIssue.issueDate), 'dd-MM-yy')}
                    </div>
                )}

                <Accordion type="single" collapsible className="w-full" onValueChange={() => handleAccordionToggle(req.id)}>
                    <AccordionItem value={req.id} className="border-none">
                        <AccordionTrigger className="p-0 text-xs text-blue-600 hover:no-underline">View Comment History</AccordionTrigger>
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
            </CardContent>
            <CardFooter className="p-2 bg-muted/50 flex justify-end gap-2 mt-auto">
                 {canApprove && req.status === 'Pending' && (
                    <>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button size="icon" variant="ghost" onClick={() => handleActionClick(req, 'Query')}><MessageSquare className="h-4 w-4" /></Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Query</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <Button size="sm" variant="destructive" onClick={() => handleActionClick(req, 'Rejected')}><XCircle className="mr-2 h-4 w-4" /> Reject</Button>
                        <Button size="sm" onClick={() => handleActionClick(req, 'Approved')}><CheckCircle className="mr-2 h-4 w-4" /> Approve</Button>
                    </>
                 )}
                 {canMarkAsIssued && req.status === 'Approved' && (
                    <Button size="sm" onClick={() => handleActionClick(req, 'Issued')}><Check className="mr-2 h-4 w-4" /> Issue</Button>
                 )}
                 {canDispute && (
                    <Button size="sm" variant="destructive" onClick={() => handleActionClick(req, 'Disputed')}><AlertTriangle className="mr-2 h-4 w-4" /> Dispute</Button>
                 )}
                 {canIssue && req.status === 'Disputed' && (
                    <div className="flex gap-2">
                        <Button size="sm" onClick={() => resolvePpeDispute(req.id, 'reissue', 'Dispute accepted. Item will be re-issued.')}>Re-issue</Button>
                        <Button size="sm" variant="outline" onClick={() => resolvePpeDispute(req.id, 'reverse', 'Dispute rejected. Item confirmed as issued.')}>Confirm Issued</Button>
                    </div>
                 )}
                 {(user?.role === 'Admin' || (isRequester && req.status === 'Pending')) && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><Settings className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onSelect={() => handleEditClick(req)} disabled={!canEditRequest}>
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

            <Dialog open={!!viewingAttachmentUrl} onOpenChange={() => { setViewingAttachmentUrl(null); setZoom(1); setTranslate({x: 0, y: 0}); }}>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Attachment Viewer</DialogTitle>
                         <div className="flex items-center gap-2">
                            {!isPdf && (
                                <>
                                    <Button variant="outline" size="icon" onClick={() => setZoom(z => z + 0.2)}><ZoomIn className="h-4 w-4" /></Button>
                                    <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.max(0.2, z - 0.2))}><ZoomOut className="h-4 w-4" /></Button>
                                </>
                            )}
                            <a href={viewingAttachmentUrl || ''} download target="_blank" rel="noopener noreferrer">
                                <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Download</Button>
                            </a>
                        </div>
                    </DialogHeader>
                     <div 
                      ref={imageContainerRef}
                      className="flex-1 overflow-auto flex items-center justify-center p-4 bg-muted/50 rounded-md"
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUpOrLeave}
                      onMouseLeave={handleMouseUpOrLeave}
                    >
                        {viewingAttachmentUrl && (
                             isPdf ? (
                                <object data={viewingAttachmentUrl} type="application/pdf" width="100%" height="100%">
                                    <p>It appears you don't have a PDF plugin for this browser. You can <a href={viewingAttachmentUrl} className="text-blue-600 hover:underline">click here to download the PDF file.</a></p>
                                </object>
                            ) : (
                                <img 
                                    src={viewingAttachmentUrl} 
                                    alt="Attachment" 
                                    className={cn("transition-transform duration-200", isPanning ? 'cursor-grabbing' : 'cursor-grab')}
                                    style={{
                                        transform: `scale(${zoom}) translate(${translate.x}px, ${translate.y}px)`,
                                        maxWidth: zoom > 1 ? 'none' : '100%',
                                        maxHeight: zoom > 1 ? 'none' : '100%',
                                        objectFit: 'contain'
                                    }}
                                />
                            )
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {selectedRequest && action && (
                <AlertDialog open={!!(selectedRequest && action)} onOpenChange={() => setSelectedRequest(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{action} Request?</AlertDialogTitle>
                            <AlertDialogDescription>Please review the details before confirming.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="space-y-4 text-sm">
                             <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 p-2 border rounded-md">
                                <div className="font-semibold">Employee:</div>
                                <div>{employeeForSelectedRequest?.name || 'N/A'}</div>
                                
                                <div className="font-semibold">Item:</div>
                                <div>{selectedRequest.ppeType}</div>
                                
                                <div className="font-semibold">Size & Quantity:</div>
                                <div>{selectedRequest.size}, Qty: {selectedRequest.quantity}</div>
                                
                                <div className="font-semibold">Request Type:</div>
                                <div>
                                    <Badge variant={selectedRequest.requestType === 'Replacement' ? 'destructive' : 'success'}>
                                        {selectedRequest.requestType}
                                    </Badge>
                                </div>
                                
                                <div className="font-semibold">Eligibility:</div>
                                <div className={cn(selectedRequest.eligibility?.eligible ? "text-green-600" : "text-destructive")}>
                                    {selectedRequest.eligibility?.reason || 'N/A'}
                                </div>

                                <div className="font-semibold">Stock Availability:</div>
                                <div>{stockInfo}</div>

                                <div className="font-semibold">Last Issue Date:</div>
                                <div>{lastIssue ? format(parseISO(lastIssue.issueDate), 'dd-MM-yyyy') : 'N/A'}</div>

                                <div className="font-semibold col-span-2 mt-2">Justification / Remarks:</div>
                                <div className="col-span-2 text-muted-foreground">{selectedRequest.newRequestJustification || selectedRequest.remarks || 'Nil'}</div>

                                 {selectedRequest.attachmentUrl && (
                                    <>
                                        <div className="font-semibold">Attachment:</div>
                                        <div>
                                            <button onClick={() => setViewingAttachmentUrl(selectedRequest.attachmentUrl!)} className="text-blue-600 hover:underline">
                                                View Attached File
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="comment">Comment {action === 'Rejected' || action === 'Disputed' ? '(Required)' : '(Optional)'}</Label>
                                <Textarea id="comment" value={comment} onChange={e => setComment(e.target.value)} />
                            </div>
                        </div>
                        <AlertDialogFooter>
                           <Button variant="outline" onClick={() => setSelectedRequest(null)}>Cancel</Button>
                           {action !== 'Rejected' && (
                               <Button variant="destructive" onClick={() => handleConfirmAction('Rejected')}>Reject</Button>
                           )}
                           <Button onClick={() => handleConfirmAction()}>{action === 'Issued' ? 'Confirm Issued' : `Confirm ${action}`}</Button>
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
               Completed &amp; Rejected Requests ({completedRequests.length})
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

    