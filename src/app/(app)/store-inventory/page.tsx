

'use client';
import { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Upload, AlertTriangle, ChevronsUpDown, CheckCircle } from 'lucide-react';
import InventoryTable from '@/components/inventory/InventoryTable';
import AddItemDialog from '@/components/inventory/AddItemDialog';
import ImportItemsDialog from '@/components/inventory/ImportItemsDialog';
import InventoryFilters from '@/components/inventory/InventoryFilters';
import type { InventoryItem, CertificateRequest, Role } from '@/lib/types';
import { isAfter, isBefore, addDays, parseISO } from 'date-fns';
import ViewCertificateRequestDialog from '@/components/inventory/ViewCertificateRequestDialog';
import InventorySummary from '@/components/inventory/InventorySummary';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import InventoryReportDownloads from '@/components/inventory/InventoryReportDownloads';

export default function StoreInventoryPage() {
    const { user, users, roles, inventoryItems, projects, certificateRequests, acknowledgeFulfilledRequest, markFulfilledRequestsAsViewed } = useAppContext();
    const [isAddItemOpen, setIsAddItemOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [viewingCertRequest, setViewingCertRequest] = useState<CertificateRequest | null>(null);
    const [view, setView] = useState<'list' | 'summary'>('list');

    const [filters, setFilters] = useState({
        name: 'all',
        status: 'all',
        projectId: 'all',
        search: ''
    });

    const canManageInventory = useMemo(() => {
        if (!user) return false;
        const userRole = roles.find(r => r.name === user.role);
        return userRole?.permissions.includes('manage_inventory') ?? false;
    }, [user, roles]);

    const filteredItems = useMemo(() => {
      const privilegedRoles: Role[] = ['Admin', 'Manager', 'Store in Charge', 'Assistant Store Incharge'];
      const isPrivileged = user ? privilegedRoles.includes(user.role) : false;

      return inventoryItems.filter(item => {
        const { name, status, projectId, search } = filters;
        if (name !== 'all' && item.name !== name) return false;
        if (search && !item.serialNumber.toLowerCase().includes(search.toLowerCase())) return false;
        
        if (projectId !== 'all' && item.projectId !== projectId) return false;
        
        const now = new Date();
        const inspectionDueDate = item.inspectionDueDate ? parseISO(item.inspectionDueDate) : null;
        const tpInspectionDueDate = item.tpInspectionDueDate ? parseISO(item.tpInspectionDueDate) : null;

        const inspectionExpired = inspectionDueDate && isAfter(now, inspectionDueDate);
        const tpInspectionExpired = tpInspectionDueDate && isAfter(now, tpInspectionDueDate);

        if (status !== 'all') {
            if (status === 'Inspection Expired') {
                if (!inspectionExpired) return false;
            } else if (status === 'TP Expired') {
                if (!tpInspectionExpired) return false;
            } else {
                if (item.status !== status) return false;
            }
        }
        
        if (!isPrivileged && user?.projectId && item.projectId !== user.projectId) {
          return false;
        }

        return true;
      });
    }, [inventoryItems, filters, user, roles]);

    const summaryData = useMemo(() => {
        const data: {[itemName: string]: {[projectId: string]: number, total: number}} = {};
        filteredItems.forEach(item => {
            if (!data[item.name]) {
                data[item.name] = { total: 0 };
                projects.forEach(p => {
                    data[item.name][p.id] = 0;
                });
            }
            data[item.name][item.projectId] = (data[item.name][item.projectId] || 0) + 1;
            data[item.name].total += 1;
        });
        return Object.entries(data).map(([name, counts]) => ({ name, ...counts }));
    }, [filteredItems, projects]);

    const pendingCertRequestsForMe = useMemo(() => canManageInventory ? certificateRequests.filter(req => req.status === 'Pending' && req.itemId) : [], [certificateRequests, canManageInventory]);
    const myCertRequests = useMemo(() => certificateRequests.filter(req => req.requesterId === user?.id && req.itemId), [certificateRequests, user]);
    
    const myFulfilledCertRequests = useMemo(() => {
      if (!user) return [];
      return certificateRequests.filter(req => 
        req.requesterId === user.id && 
        req.status === 'Completed' && 
        !req.viewedByRequester && 
        req.itemId
      );
    }, [certificateRequests, user]);

    useEffect(() => {
        if (myFulfilledCertRequests.length > 0) {
            markFulfilledRequestsAsViewed('store');
        }
    }, [myFulfilledCertRequests, markFulfilledRequestsAsViewed]);


    const inventoryNotifications = useMemo(() => {
        const now = new Date();
        const thirtyDaysFromNow = addDays(now, 30);
        const notifications: { message: string, item: InventoryItem }[] = [];

        inventoryItems.forEach(item => {
            if (item.inspectionDueDate) {
                const inspectionDueDate = parseISO(item.inspectionDueDate);
                if (isBefore(inspectionDueDate, now)) {
                    notifications.push({ message: `Inspection expired on ${inspectionDueDate.toLocaleDateString()}`, item });
                } else if (isBefore(inspectionDueDate, thirtyDaysFromNow)) {
                    notifications.push({ message: `Inspection due on ${inspectionDueDate.toLocaleDateString()}`, item });
                }
            }
            if (item.tpInspectionDueDate) {
                 const tpInspectionDueDate = parseISO(item.tpInspectionDueDate);
                 if (isBefore(tpInspectionDueDate, now)) {
                    notifications.push({ message: `TP Inspection expired on ${tpInspectionDueDate.toLocaleDateString()}`, item });
                } else if (isBefore(tpInspectionDueDate, thirtyDaysFromNow)) {
                    notifications.push({ message: `TP Inspection due on ${tpInspectionDueDate.toLocaleDateString()}`, item });
                }
            }
        });

        return notifications;
    }, [inventoryItems]);

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Store Inventory</h1>
                    <p className="text-muted-foreground">Manage and track all equipment and items.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={() => setView(v => v === 'list' ? 'summary' : 'list')} variant="outline"><ChevronsUpDown className="mr-2 h-4 w-4" />{view === 'list' ? 'View Summary' : 'View List'}</Button>
                    {canManageInventory && (
                        <>
                            <Button onClick={() => setIsImportOpen(true)} variant="outline"><Upload className="mr-2 h-4 w-4" /> Import</Button>
                            <Button onClick={() => setIsAddItemOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button>
                        </>
                    )}
                </div>
            </div>

            {canManageInventory && inventoryNotifications.length > 0 && (
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive"/>Action Required</CardTitle>
                        <CardDescription>The following items require attention for upcoming or past due dates.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {inventoryNotifications.map((n, i) => (
                                <div key={i} className="text-sm p-2 bg-amber-50 dark:bg-amber-900/20 rounded-md">
                                    <span className="font-semibold">{n.item.name} (SN: {n.item.serialNumber})</span>: {n.message}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
            
            {myFulfilledCertRequests.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Fulfilled Certificate Requests</CardTitle>
                        <CardDescription>Your recent certificate requests have been fulfilled. Please acknowledge them to clear them from this list.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {myFulfilledCertRequests.map(req => {
                            const item = inventoryItems.find(i => i.id === req.itemId);
                            const subject = item ? `${item.name} (SN: ${item.serialNumber})` : 'Unknown';
                            const lastComment = req.comments?.[req.comments.length - 1];
                            const fulfiller = users.find(u => u.id === lastComment?.userId);
                            return (
                                <div key={req.id} className="p-3 border rounded-lg bg-muted/50 flex justify-between items-center">
                                    <div className="flex-1">
                                        <p className="font-semibold">{req.requestType} for {subject}</p>
                                        {lastComment && (
                                          <div className="flex items-start gap-2 mt-2">
                                              <Avatar className="h-7 w-7"><AvatarImage src={fulfiller?.avatar} /><AvatarFallback>{fulfiller?.name.charAt(0)}</AvatarFallback></Avatar>
                                              <div className="bg-background p-2 rounded-md w-full text-sm">
                                                  <div className="flex justify-between items-baseline"><p className="font-semibold text-xs">{fulfiller?.name}</p><p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(lastComment.date), { addSuffix: true })}</p></div>
                                                  <p className="text-foreground/80 mt-1">{lastComment.text}</p>
                                              </div>
                                          </div>
                                        )}
                                    </div>
                                    <Button size="sm" variant="outline" onClick={() => acknowledgeFulfilledRequest(req.id)} className="ml-4 shrink-0">
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Acknowledge
                                    </Button>
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>
            )}
            
            {canManageInventory && pendingCertRequestsForMe.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Pending Certificate Requests</CardTitle>
                        <CardDescription>Review and action these certificate requests.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         {pendingCertRequestsForMe.map(req => {
                            const requester = users.find(u => u.id === req.requesterId);
                            const item = inventoryItems.find(i => i.id === req.itemId);
                            const subject = item ? `${item.name} (SN: ${item.serialNumber})` : 'Unknown';

                            return (
                                <div key={req.id} className="p-4 border rounded-lg flex justify-between items-center">
                                    <div><p><span className="font-semibold">{requester?.name}</span> requests a <span className="font-semibold">{req.requestType}</span></p><p className="text-sm text-muted-foreground">For: {subject}</p></div>
                                    <Button size="sm" onClick={() => setViewingCertRequest(req)}>Review Request</Button>
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>
            )}
            
             {myCertRequests.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>My Certificate Requests</CardTitle>
                        <CardDescription>Status of your submitted certificate requests.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         {myCertRequests.map(req => {
                            const item = inventoryItems.find(i => i.id === req.itemId);
                            const subject = item ? `${item.name} (SN: ${item.serialNumber})` : 'Unknown';
                            return (
                                <div key={req.id} className="p-4 border rounded-lg flex justify-between items-center">
                                    <div><p><span className="font-semibold">{req.requestType}</span> for <span className="font-semibold">{subject}</span></p><p className="text-sm text-muted-foreground">Submitted {formatDistanceToNow(new Date(req.requestDate), { addSuffix: true })}</p></div>
                                    <Badge variant={req.status === 'Completed' ? 'default' : req.status === 'Rejected' ? 'destructive' : 'secondary'}>{req.status}</Badge>
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                   <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
                     {view === 'list' ? (
                        <InventoryFilters onApplyFilters={setFilters} />
                     ) : <CardTitle>Inventory Summary</CardTitle>}
                     <InventoryReportDownloads items={filteredItems} isSummary={view === 'summary'} summaryData={summaryData} />
                   </div>
                </CardHeader>
                <CardContent>
                    {view === 'list' ? <InventoryTable items={filteredItems} /> : <InventorySummary items={filteredItems} />}
                </CardContent>
            </Card>

            <AddItemDialog isOpen={isAddItemOpen} setIsOpen={setIsAddItemOpen} />
            <ImportItemsDialog isOpen={isImportOpen} setIsOpen={setIsImportOpen} />
            {viewingCertRequest && ( <ViewCertificateRequestDialog request={viewingCertRequest} isOpen={!!viewingCertRequest} setIsOpen={() => setViewingCertRequest(null)} /> )}
        </div>
    );
}

    