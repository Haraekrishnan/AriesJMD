
'use client';
import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { ThumbsUp, ThumbsDown, SendToBack, CheckCircle, AlertTriangle, Trash2, FilePlus, UserCheck } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '../ui/textarea';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent } from '../ui/dropdown-menu';
import type { InventoryItem, InventoryTransferRequest, TpCertList, UTMachine } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import GenerateTpCertDialog from '../inventory/GenerateTpCertDialog';

export default function PendingTransfers() {
  const { user, inventoryTransferRequests, approveInventoryTransferRequest, rejectInventoryTransferRequest, users, projects, can, deleteInventoryTransferRequest, addTpCertList, disputeInventoryTransfer, acknowledgeTransfer, inventoryItems, utMachines, dftMachines, digitalCameras, anemometers, otherEquipments, laptopsDesktops, mobileSims } = useAppContext();
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

    inventoryTransferRequests.forEach(req => {
      if (can.approve_store_requests && req.status === 'Pending') {
        forApproval.push(req);
      }
      
      const isMyProject = user.projectIds?.includes(req.toProjectId) || user.role === 'Admin';
      const isRequester = req.requesterId === user.id;

      if (isMyProject && req.status === 'Approved') {
        myActiveRequests.push(req);
      }
      if (isRequester && (req.status === 'Pending' || req.status === 'Rejected' || req.status === 'Disputed')) {
        const existing = myActiveRequests.find(r => r.id === req.id);
        if (!existing) myActiveRequests.push(req);
      }

      if (req.status === 'Completed' || req.status === 'Rejected' || req.status === 'Disputed') {
          completed.push(req);
      }
    });

    return { 
        forApproval, 
        myActiveRequests: myActiveRequests.sort((a,b) => parseISO(b.requestDate).getTime() - parseISO(a.requestDate).getTime()),
        allCompletedRequests: completed.sort((a,b) => (b.approvalDate || b.requestDate).localeCompare(a.approvalDate || a.requestDate)),
    };
  }, [inventoryTransferRequests, user, can.approve_store_requests, projects]);

  if (forApproval.length === 0 && myActiveRequests.length === 0 && allCompletedRequests.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardDescription>There are no pending or active inventory transfers at the moment.</CardDescription>
            </CardHeader>
        </Card>
    );
  }

  const handleCreateTpList = (request: InventoryTransferRequest) => {
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
  };
  
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
            <h4 className="font-semibold text-sm">Awaiting Store Approval</h4>
            {forApproval.map(req => {
              const requester = users.find(u => u.id === req.requesterId);
              const fromProject = projects.find(p => p.id === req.fromProjectId);
              const toProject = projects.find(p => p.id === req.toProjectId);
              const requestedBy = req.requestedById ? users.find(u => u.id === req.requestedById) : null;
              const showTpOption = req.reason === 'For TP certification' || req.reason === 'Expired materials';

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
                    </div>
                  </div>
                  <div className="mt-2 text-sm">
                    <p><strong>Reason:</strong> {req.reason} {requestedBy ? ` by ${requestedBy.name}` : ''}</p>
                    {req.remarks && <p><strong>Remarks:</strong> {req.remarks}</p>}
                    <p className="font-medium mt-2">Items:</p>
                    <ul className="list-disc list-inside text-xs text-muted-foreground">
                      {req.items.map(item => {
                        const itemName = item.name || allItems.find(i => i.id === item.itemId)?.name || 'Unknown';
                        return (
                           <li key={item.itemId}>{itemName} (SN: {item.serialNumber}{item.ariesId ? `, ID: ${item.ariesId}` : ''})</li>
                        )
                      })}
                    </ul>
                  </div>
                </div>
              );
            })}
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
                                {req.items.map(item => (
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
            <AccordionItem value="completed-transfers" className="border rounded-md">
              <AccordionTrigger className="p-4 bg-muted/50 hover:no-underline font-semibold text-sm">
                Transfer History ({allCompletedRequests.length})
              </AccordionTrigger>
              <AccordionContent className="p-4 space-y-2">
                {allCompletedRequests.map(req => {
                  const fromProject = projects.find(p => p.id === req.fromProjectId);
                  const toProject = projects.find(p => p.id === req.toProjectId);
                  const statusVariant = req.status === 'Completed' ? 'success' : 'destructive';
                  const showTpOption = (req.reason === 'For TP certification' || req.reason === 'Expired materials') && req.status === 'Completed';
                  return (
                    <Accordion key={req.id} type="single" collapsible>
                        <AccordionItem value={req.id} className="border rounded-sm">
                           <div className="flex justify-between items-center p-2">
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
                                    {showTpOption && (
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
                                                <AlertDialogHeader><AlertDialogTitle>Delete this transfer record?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(req.id)}>Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </div>
                           </div>
                           <AccordionContent className="p-4 pt-0">
                             <ul className="list-disc list-inside text-xs text-muted-foreground bg-muted p-2 rounded-md">
                                {req.items.map(item => (
                                    <li key={item.itemId}>{item.name} (SN: {item.serialNumber})</li>
                                ))}
                            </ul>
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
