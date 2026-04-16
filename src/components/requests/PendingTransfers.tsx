
'use client';
import { useMemo, useState, useCallback } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { ThumbsUp, ThumbsDown, SendToBack, CheckCircle, AlertTriangle, Trash2, FilePlus, UserCheck, FileDown, Edit, Search, MoreHorizontal } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent } from '../ui/dropdown-menu';
import type { InventoryItem, InventoryTransferRequest, TpCertList, UTMachine, Role, InventoryTransferRequestStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import GenerateTpCertDialog from '../inventory/GenerateTpCertDialog';
import TransferReportDownloads from './TransferReportDownloads';
import { Input } from '../ui/input';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { useInventory } from '@/contexts/inventory-provider';

interface PendingTransfersProps {
  onEditRequest: (request: InventoryTransferRequest) => void;
}

const statusVariant: Record<InventoryTransferRequestStatus, 'default' | 'secondary' | 'destructive' | 'success' | 'warning'> = {
  Pending: 'secondary',
  Approved: 'default',
  Issued: 'success',
  Completed: 'success',
  Disputed: 'warning',
  Rejected: 'destructive',
  'Partially Issued': 'default',
  'Partially Approved': 'default',
};

const RequestCard = ({ req, onEditRequest, isCompletedSection = false }: { req: InventoryTransferRequest; onEditRequest: (request: InventoryTransferRequest) => void; isCompletedSection?: boolean; }) => {
    const { user, users, can } = useAuth();
    const { projects } = useGeneral();
    const { approveInventoryTransferRequest, rejectInventoryTransferRequest, deleteInventoryTransferRequest, addTpCertList, resolveInternalRequestDispute, inventoryItems, utMachines, dftMachines, digitalCameras, anemometers, otherEquipments, laptopsDesktops, mobileSims, weldingMachines, walkieTalkies } = useInventory();
    const { toast } = useToast();
    const [rejectionRequestId, setRejectionRequestId] = useState<string | null>(null);
    const [comment, setComment] = useState('');

    const requester = users.find(u => u.id === req.requesterId);
    const fromProject = projects.find(p => p.id === req.fromProjectId);
    const toProject = projects.find(p => p.id === req.toProjectId);
    const requestedBy = req.requestedById ? users.find(u => u.id === req.requestedById) : null;
    const showTpOption = req.reason === 'For TP certification' || req.reason === 'Expired materials';
    const approver = req.approverId ? users.find(u => u.id === req.approverId) : null;
    const isRequester = req.requesterId === user?.id;

    const canEdit = useMemo(() => {
        if (!user) return false;
        if (req.status !== 'Pending') return false;

        const canEditRoles: Role[] = ['Admin', 'Project Coordinator'];
        if (canEditRoles.includes(user.role)) return true;

        return req.requesterId === user.id;
    }, [user, req]);
    
    const canDeleteHistory = user?.role === 'Admin' && isCompletedSection;

    const canApprove = useMemo(() => {
        if (!user) return false;
        return can.approve_store_requests;
    }, [user, can.approve_store_requests]);

    const handleDelete = () => {
        deleteInventoryTransferRequest(req.id);
    };

    const handleReject = () => {
        if (rejectionRequestId && comment) {
            rejectInventoryTransferRequest(rejectionRequestId, comment);
            setRejectionRequestId(null);
            setComment('');
            toast({ title: 'Transfer Request Rejected' });
        } else {
            toast({ title: 'Comment required for rejection.', variant: 'destructive' });
        }
    };
    
    const allItems = useMemo(() => [
        ...inventoryItems, ...utMachines, ...dftMachines, ...digitalCameras, 
        ...anemometers, ...otherEquipments, ...laptopsDesktops, ...mobileSims,
        ...weldingMachines, ...walkieTalkies
      ], [inventoryItems, utMachines, dftMachines, digitalCameras, anemometers, otherEquipments, laptopsDesktops, mobileSims, weldingMachines, walkieTalkies]);
      
    const itemSummary = req.items.reduce((acc, item) => {
        acc[item.name] = (acc[item.name] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    
    const sortedItems = [...req.items].sort((a,b) => a.name.localeCompare(b.name));

    return (
        <AccordionItem value={req.id} key={req.id} className="border rounded-lg bg-muted/50">
            <div className="flex justify-between items-center p-4">
                <AccordionTrigger className="p-0 hover:no-underline flex-1">
                    <div>
                        <p className="text-sm font-semibold">
                            Transfer from <span className="font-bold">{fromProject?.name}</span> to <span className="font-bold">{toProject?.name}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Requested by {requester?.name || 'Unknown'} &middot; {formatDistanceToNow(parseISO(req.requestDate), { addSuffix: true })}
                            (ID: ...{req.id.slice(-6)})
                        </p>
                    </div>
                </AccordionTrigger>
                <div className="flex items-center gap-2 pl-4">
                    <Badge variant={statusVariant[req.status]}>{req.status}</Badge>
                    {canEdit && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4"/></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onSelect={() => onEditRequest(req)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                {user?.role === 'Admin' && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                            </DropdownMenuItem>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Delete Transfer Request?</AlertDialogTitle><AlertDialogDescription>This action is permanent and cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleDelete}>Confirm Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    {canDeleteHistory && (
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                    <Trash2 className="h-4 w-4"/>
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently delete this request from history. This action cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete}>Confirm Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                    {canApprove && req.status === 'Pending' && (
                    <>
                        {showTpOption ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button size="sm"><ThumbsUp className="mr-2 h-4 w-4" /> Approve</Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onSelect={() => approveInventoryTransferRequest(req, false)}>Approve Transfer Only</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => approveInventoryTransferRequest(req, true)}>Approve & Create TP List</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <Button size="sm" onClick={() => approveInventoryTransferRequest(req, false)}>
                                <ThumbsUp className="mr-2 h-4 w-4" /> Approve
                            </Button>
                        )}
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive" onClick={() => setRejectionRequestId(req.id)}>
                                    <ThumbsDown className="mr-2 h-4 w-4" /> Reject
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Reject Transfer?</AlertDialogTitle><AlertDialogDescription>Please provide a reason for rejecting this transfer request.</AlertDialogDescription></AlertDialogHeader>
                                <div className="py-2"><Label htmlFor="rejection-comment">Comment</Label><Textarea id="rejection-comment" value={comment} onChange={e => setComment(e.target.value)} /></div>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleReject}>Confirm Rejection</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </>
                    )}
                    {req.status === 'Disputed' && can.approve_store_requests && (
                         <div className="flex gap-2">
                            <Button size="sm" onClick={() => resolveInternalRequestDispute(req.id, 'reissue', 'Dispute accepted. Items will be re-issued.')}>Re-issue</Button>
                            <Button size="sm" variant="outline" onClick={() => resolveInternalRequestDispute(req.id, 'reverse', 'Dispute rejected. Items confirmed as issued.')}>Confirm Issued</Button>
                        </div>
                    )}
                </div>
            </div>
            <AccordionContent className="p-4 pt-0">
                 <div className="text-xs space-y-2 mt-2 pt-2 border-t">
                    <div className="flex justify-between items-center">
                        <p><strong>Reason:</strong> {req.reason.replace(' as requested by', '')} {requestedBy ? ` by ${requestedBy.name}` : ''}</p>
                        <div className="flex items-center gap-2">
                            <TransferReportDownloads request={req} />
                            {canApprove && (req.status === 'Completed' || req.status === 'Issued') && showTpOption && (
                                <Button size="sm" variant="secondary" onClick={() => {
                                    const listData = {
                                        name: `From Transfer ${req.id.slice(-6)}`,
                                        date: new Date().toISOString().split('T')[0],
                                        items: req.items.map(item => ({
                                            materialName: item.name,
                                            manufacturerSrNo: item.serialNumber,
                                            itemId: item.itemId,
                                            itemType: item.itemType,
                                            ariesId: item.ariesId || null,
                                            chestCrollNo: (allItems.find(i => i.id === item.itemId) as any)?.chestCrollNo || null,
                                        })),
                                    };
                                    addTpCertList(listData);
                                    toast({ title: 'TP Certification List Created' });
                                }}>
                                    <FilePlus className="mr-2 h-4 w-4" /> Create TP List
                                </Button>
                            )}
                        </div>
                    </div>
                    {req.remarks && <p><strong>Remarks:</strong> {req.remarks}</p>}
                    
                    {(req.status === 'Completed' || req.status === 'Issued' || req.status === 'Rejected' || req.status === 'Disputed') && approver && (
                        <div className="text-xs mt-2 pt-2 text-muted-foreground">
                            <p>
                                <strong>{req.status} by:</strong> {approver.name}
                                {req.approvalDate && ` on ${format(parseISO(req.approvalDate), 'dd MMM, yyyy p')}`}
                            </p>
                            {req.status === 'Rejected' && <p className="italic text-destructive mt-1">Note: Rejection comments are not displayed due to a known issue.</p>}
                        </div>
                    )}

                    <div className="pt-1">
                        <p className="font-semibold">Item Summary:</p>
                        <p className="text-muted-foreground">{Object.entries(itemSummary).map(([name, count]) => `${name} (${count})`).join(' · ')}</p>
                    </div>
                    <Accordion type="single" collapsible>
                        <AccordionItem value="details" className="border-none">
                            <AccordionTrigger className="text-xs hover:no-underline p-0">Show Item Details</AccordionTrigger>
                            <AccordionContent>
                                <ul className="list-disc list-inside text-muted-foreground mt-1">
                                {sortedItems.map(item => {
                                    const itemName = item.name || allItems.find(i => i.id === item.itemId)?.name || 'Unknown';
                                    return (
                                    <li key={item.itemId}>{itemName} (SN: {item.serialNumber}{item.ariesId ? `, ID: ${item.ariesId}` : ''})</li>
                                    )
                                })}
                                </ul>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </AccordionContent>
        </AccordionItem>
    );
};

export default function PendingTransfers({ onEditRequest }: PendingTransfersProps) {
  const { user, can } = useAuth();
  const { inventoryTransferRequests } = useInventory();
  const [editingTpList, setEditingTpList] = useState<Partial<TpCertList> | null>(null);
  const [historySearchTerm, setHistorySearchTerm] = useState('');

  const { forApproval, myActiveRequests, allCompletedRequests } = useMemo(() => {
    if (!user) return { forApproval: [], myActiveRequests: [], allCompletedRequests: [] };
    
    const forApproval: InventoryTransferRequest[] = [];
    const myActiveRequests: InventoryTransferRequest[] = [];
    const completed: InventoryTransferRequest[] = [];
    
    const privilegedRoles: Role[] = ['Admin', 'Project Coordinator', 'Document Controller', 'Store in Charge', 'Assistant Store Incharge'];
    const isPrivileged = privilegedRoles.includes(user.role);

    inventoryTransferRequests.forEach(req => {
      const isMyProject = user.projectIds?.includes(req.fromProjectId) || user.projectIds?.includes(req.toProjectId);
      const isRequester = req.requesterId === user.id;

      const canViewPending = can.approve_store_requests || user.role === 'Assistant Store Incharge';
      if (canViewPending && (req.status === 'Pending' || req.status === 'Disputed')) {
        forApproval.push(req);
      }
      
      if ((isMyProject && req.status === 'Approved') || (isRequester && (req.status === 'Pending' || req.status === 'Rejected' || req.status === 'Disputed'))) {
        const existing = myActiveRequests.find(r => r.id === req.id);
        if (!existing) myActiveRequests.push(req);
      }

      const isCompletedOrRejected = req.status === 'Completed' || req.status === 'Issued' || req.status === 'Rejected' || req.status === 'Disputed';

      if (isCompletedOrRejected) {
          if (isPrivileged || isRequester || (isMyProject && req.fromProjectId !== req.toProjectId)) {
            const existing = completed.find(r => r.id === req.id);
            if (!existing) completed.push(req);
          }
      }
    });

    const sortFn = (a: InventoryTransferRequest, b: InventoryTransferRequest) => parseISO(b.requestDate).getTime() - parseISO(a.requestDate).getTime();

    return { 
        forApproval: forApproval.sort(sortFn), 
        myActiveRequests: myActiveRequests.sort(sortFn),
        allCompletedRequests: completed.sort((a,b) => (b.approvalDate || b.requestDate).localeCompare(a.approvalDate || a.requestDate)),
    };
  }, [inventoryTransferRequests, user, can.approve_store_requests]);
  
  const { inventoryItems } = useInventory();
  const filteredCompletedRequests = useMemo(() => {
    if (!historySearchTerm) {
        return allCompletedRequests;
    }
    const lowercasedTerm = historySearchTerm.toLowerCase();
    return allCompletedRequests.filter(req => 
        req.items.some(item => {
            const fullItem = inventoryItems.find(i => i.id === item.itemId);
            return (
                (item.serialNumber?.toLowerCase().includes(lowercasedTerm)) ||
                (item.ariesId?.toLowerCase().includes(lowercasedTerm)) ||
                ((fullItem as any)?.chestCrollNo?.toLowerCase().includes(lowercasedTerm))
            );
        })
    );
  }, [allCompletedRequests, historySearchTerm, inventoryItems]);
  

  if (forApproval.length === 0 && myActiveRequests.length === 0 && allCompletedRequests.length === 0) {
      return <p className="text-sm text-center text-muted-foreground p-4">No transfer requests to display.</p>
  }

  return (
    <>
    <CardContent className="space-y-4 p-0">
        {forApproval.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-sm">Awaiting Store Approval</h4>
            </div>
             <Accordion type="multiple" className="w-full space-y-2">
                {forApproval.map(req => <RequestCard key={req.id} req={req} onEditRequest={onEditRequest} />)}
            </Accordion>
          </div>
        )}

        {myActiveRequests.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">My Active Transfers</h4>
            <Accordion type="multiple" className="w-full space-y-2">
                {myActiveRequests.map(req => <RequestCard key={req.id} req={req} onEditRequest={onEditRequest} />)}
            </Accordion>
          </div>
        )}

        {allCompletedRequests.length > 0 && (
          <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="completed-transfers" className="border-none">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-md">
                      <AccordionTrigger className="p-0 hover:no-underline flex-1">
                          <span className="font-semibold text-lg">Transfer History</span>
                      </AccordionTrigger>
                  </div>
              <AccordionContent className="p-2 space-y-2">
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by Serial, Aries ID, or Chest Croll No..."
                        className="pl-9"
                        value={historySearchTerm}
                        onChange={(e) => setHistorySearchTerm(e.target.value)}
                    />
                </div>
                <Accordion type="multiple" className="w-full space-y-2">
                    {filteredCompletedRequests.map(req => <RequestCard key={req.id} req={req} onEditRequest={onEditRequest} isCompletedSection={true} />)}
                </Accordion>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
    </CardContent>
    {editingTpList && (
      <GenerateTpCertDialog 
        isOpen={!!editingTpList}
        setIsOpen={() => setEditingTpList(null)}
        listToCreate={editingTpList}
      />
    )}
    </>
  );
}
