
'use client';
import { useMemo, useState, useCallback } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { ThumbsUp, ThumbsDown, SendToBack, CheckCircle, AlertTriangle, Trash2, FilePlus, UserCheck, FileDown } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent } from '../ui/dropdown-menu';
import type { InventoryItem, InventoryTransferRequest, TpCertList, UTMachine, Role } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import GenerateTpCertDialog from '../inventory/GenerateTpCertDialog';
import TransferReportDownloads from './TransferReportDownloads';

export default function PendingTransfers() {
  const { user, inventoryTransferRequests, approveInventoryTransferRequest, rejectInventoryTransferRequest, users, projects, can, deleteInventoryTransferRequest, addTpCertList, disputeInventoryTransfer, acknowledgeTransfer, inventoryItems, utMachines, dftMachines, digitalCameras, anemometers, otherEquipments, laptopsDesktops, mobileSims, resolveInternalRequestDispute } = useAppContext();
  const { toast } = useToast();
  const [rejectionRequestId, setRejectionRequestId] = useState<string | null>(null);
  const [disputeRequestId, setDisputeRequestId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [editingTpList, setEditingTpList] = useState<Partial<TpCertList> | null>(null);
  
    const allItems = useMemo(() => [
      ...inventoryItems, ...utMachines, ...dftMachines, ...digitalCameras, 
      ...anemometers, ...otherEquipments, ...laptopsDesktops, ...mobileSims
    ], [inventoryItems, utMachines, dftMachines, digitalCameras, anemometers, otherEquipments, laptopsDesktops, mobileSims]);

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

      if ((can.approve_store_requests || user.role === 'Assistant Store Incharge') && (req.status === 'Pending' || req.status === 'Disputed')) {
        forApproval.push(req);
      }
      
      if ((isMyProject && req.status === 'Approved') || (isRequester && (req.status === 'Pending' || req.status === 'Rejected' || req.status === 'Disputed'))) {
        const existing = myActiveRequests.find(r => r.id === req.id);
        if (!existing) myActiveRequests.push(req);
      }

      const isCompletedOrRejected = req.status === 'Completed' || req.status === 'Rejected' || req.status === 'Disputed';

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
  }, [inventoryTransferRequests, user, can.approve_store_requests, projects]);

  const canCreateTpList = useMemo(() => {
      if (!user) return false;
      const allowedRoles: Role[] = ['Admin', 'Project Coordinator', 'Document Controller', 'Store in Charge', 'Assistant Store Incharge'];
      return allowedRoles.includes(user.role);
  }, [user]);

  const handleCreateTpList = useCallback((request: InventoryTransferRequest) => {
    const listData = {
      name: `From Transfer ${request.id.slice(-6)}`,
      date: new Date().toISOString().split('T')[0],
      items: request.items.map(item => ({
        materialName: item.name,
        manufacturerSrNo: item.serialNumber,
        itemId: item.itemId,
        itemType: item.itemType,
        ariesId: item.ariesId || null,
        chestCrollNo: (item as any).chestCrollNo || null,
      })),
    };
    setEditingTpList(listData);
  }, []);
  
  const handleReject = () => {
    if (rejectionRequestId && comment) {
        rejectInventoryTransferRequest(rejectionRequestId, comment);
        setRejectionRequestId(null);
        setComment('');
        toast({ title: 'Transfer Request Rejected' });
    } else {
        toast({ title: 'Comment required for rejection.', variant: 'destructive'});
    }
  };

  const handleDispute = () => {
    if (disputeRequestId && comment) {
      disputeInventoryTransfer(disputeRequestId, comment);
      setDisputeRequestId(null);
      setComment('');
    } else {
      toast({ title: 'Comment required to raise a dispute.', variant: 'destructive'});
    }
  };

  const handleDelete = (id: string) => {
    deleteInventoryTransferRequest(id);
    toast({ title: 'Transfer Deleted', description: 'The transfer record has been removed.', variant: 'destructive' });
  };
  
  return (
    <>
    <CardContent className="space-y-4 p-0">
        {forApproval.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-sm">Awaiting Store Approval</h4>
              <TransferReportDownloads requests={forApproval} />
            </div>
             <Accordion type="multiple" className="w-full space-y-2">
                {forApproval.map(req => {
                  const requester = users.find(u => u.id === req.requesterId);
                  const fromProject = projects.find(p => p.id === req.fromProjectId);
                  const toProject = projects.find(p => p.id === req.toProjectId);
                  const requestedBy = req.requestedById ? users.find(u => u.id === req.requestedById) : null;
                  const showTpOption = req.reason === 'For TP certification' || req.reason === 'Expired materials';
                  
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
                                    </p>
                                </div>
                            </AccordionTrigger>
                            <div className="flex items-center gap-2 pl-4">
                                {can.approve_store_requests && req.status === 'Pending' && (
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
                                <p><strong>Reason:</strong> {req.reason} {requestedBy ? ` by ${requestedBy.name}` : ''}</p>
                                {req.remarks && <p><strong>Remarks:</strong> {req.remarks}</p>}
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
                })}
            </Accordion>
          </div>
        )}

        {myActiveRequests.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">My Active Transfers</h4>
            <Accordion type="multiple" className="w-full space-y-2">
                {myActiveRequests.map(req => {
                    const toProject = projects.find(p => p.id === req.toProjectId);
                    const fromProject = projects.find(p => p.id === req.fromProjectId);
                    const statusVariant = req.status === 'Disputed' || req.status === 'Rejected' ? 'destructive' : req.status === 'Approved' ? 'default' : 'secondary';
                    const sortedItems = [...req.items].sort((a,b) => a.name.localeCompare(b.name));
                return (
                    <AccordionItem value={req.id} key={req.id} className="border rounded-lg bg-muted/50">
                        <div className="flex justify-between items-center p-4">
                            <AccordionTrigger className="p-0 hover:no-underline flex-1">
                                <div className="flex justify-between items-center w-full">
                                    <div>
                                        <p className="font-semibold text-left">Transfer to {toProject?.name}</p>
                                        <p className="text-xs text-muted-foreground text-left">From: {fromProject?.name} &middot; {formatDistanceToNow(parseISO(req.requestDate), { addSuffix: true })}</p>
                                    </div>
                                    <Badge variant={statusVariant}>{req.status}</Badge>
                                </div>
                            </AccordionTrigger>
                            {user?.role === 'Admin' && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive ml-2"><Trash2 className="h-4 w-4"/></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Delete this transfer request?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(req.id)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                        </div>
                        <AccordionContent className="p-4 pt-0">
                            <ul className="list-disc list-inside text-xs text-muted-foreground bg-background p-2 rounded-md">
                                {sortedItems.map(item => (
                                    <li key={item.itemId}>{item.name} (SN: {item.serialNumber})</li>
                                ))}
                            </ul>
                        </AccordionContent>
                    </AccordionItem>
                );
                })}
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
                      <TransferReportDownloads requests={allCompletedRequests} />
                  </div>
              <AccordionContent className="p-2 space-y-2">
                {allCompletedRequests.map(req => {
                    const fromProject = projects.find(p => p.id === req.fromProjectId);
                    const toProject = projects.find(p => p.id === req.toProjectId);
                    const requester = users.find(u => u.id === req.requesterId);
                    const approver = users.find(u => u.id === req.approverId);
                    const requestedBy = req.requestedById ? users.find(u => u.id === req.requestedById) : null;
                    const statusVariant = req.status === 'Completed' ? 'success' : 'destructive';
                    const showTpOption = (req.reason === 'For TP certification' || req.reason === 'Expired materials') && req.status === 'Completed';

                    const itemSummary = req.items.reduce((acc, item) => {
                        acc[item.name] = (acc[item.name] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>);
                    
                    const sortedItems = [...req.items].sort((a,b) => a.name.localeCompare(b.name));

                    return (
                        <Accordion key={req.id} type="single" collapsible>
                            <AccordionItem value={req.id} className="border rounded-sm bg-card">
                               <div className="flex justify-between items-center p-3">
                                    <AccordionTrigger className="p-0 hover:no-underline flex-1">
                                        <div className="flex items-center gap-4">
                                            <div>
                                                <p className="text-sm">
                                                    Transfer from <span className="font-semibold">{fromProject?.name}</span> to <span className="font-semibold">{toProject?.name}</span>
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {format(parseISO(req.requestDate), 'dd MMM, yyyy')}
                                                </p>
                                            </div>
                                            <Badge variant={statusVariant}>{req.status}</Badge>
                                        </div>
                                    </AccordionTrigger>
                                    <div className="flex items-center gap-2">
                                        {showTpOption && canCreateTpList && (
                                            <Button size="xs" variant="outline" onClick={() => handleCreateTpList(req)}>
                                                <FilePlus className="mr-2 h-3 w-3" /> Create TP List
                                            </Button>
                                        )}
                                        {user?.role === 'Admin' && (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4"/></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete this transfer record?</AlertDialogTitle>
                                                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(req.id)}>Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                    </div>
                               </div>
                               <AccordionContent className="px-4 pb-3">
                                    <div className="text-xs space-y-2">
                                        <div className="p-3 rounded-md bg-muted">
                                            <p><strong>Requester:</strong> {requester?.name || 'N/A'}</p>
                                            <p><strong>Approver:</strong> {approver?.name || 'N/A'}</p>
                                            <p><strong>Reason:</strong> {req.reason.replace(' as requested by', '')} {requestedBy ? ` by ${requestedBy.name}` : ''}</p>
                                            {req.remarks && <p><strong>Remarks:</strong> {req.remarks}</p>}
                                            <div className="mt-2 pt-2 border-t">
                                                <p className="font-semibold">Item Summary:</p>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1">
                                                {Object.entries(itemSummary).map(([name, count]) => (
                                                    <span key={name}>{name} ({count})</span>
                                                ))}
                                                </div>
                                            </div>
                                        </div>
                                        <Accordion type="single" collapsible>
                                            <AccordionItem value="details" className="border-none">
                                                <AccordionTrigger className="text-xs hover:no-underline p-0">Show Item Details</AccordionTrigger>
                                                <AccordionContent>
                                                    <ul className="list-disc list-inside text-muted-foreground mt-1">
                                                        {sortedItems.map(item => (
                                                            <li key={item.itemId}>{item.name} (SN: {item.serialNumber})</li>
                                                        ))}
                                                    </ul>
                                                </AccordionContent>
                                            </AccordionItem>
                                        </Accordion>
                                    </div>
                               </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    );
                })}
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
