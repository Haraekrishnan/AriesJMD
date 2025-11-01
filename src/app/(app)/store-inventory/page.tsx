

'use client';
import { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Upload, AlertTriangle, ChevronsUpDown, X, FilePen, FilePlus } from 'lucide-react';
import InventoryTable from '@/components/inventory/InventoryTable';
import AddItemDialog from '@/components/inventory/AddItemDialog';
import ImportItemsDialog from '@/components/inventory/ImportItemsDialog';
import InventoryFilters from '@/components/inventory/InventoryFilters';
import type { InventoryItem, CertificateRequest, Role } from '@/lib/types';
import { isAfter, isBefore, addDays, parseISO, isWithinInterval, subDays } from 'date-fns';
import ViewCertificateRequestDialog from '@/components/inventory/ViewCertificateRequestDialog';
import InventorySummary from '@/components/inventory/InventorySummary';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import InventoryReportDownloads from '@/components/inventory/InventoryReportDownloads';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsList, TabsContent, TabsTrigger } from '@/components/ui/tabs';
import BulkUpdateTpCertDialog from '@/components/inventory/BulkUpdateTpCertDialog';
import GenerateTpCertDialog from '@/components/inventory/GenerateTpCertDialog';

export default function StoreInventoryPage() {
    const { user, users, roles, inventoryItems, projects, certificateRequests, acknowledgeFulfilledRequest, markFulfilledRequestsAsViewed } = useAppContext();
    const [isAddItemOpen, setIsAddItemOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
    const [isGenerateCertOpen, setIsGenerateCertOpen] = useState(false);
    const [viewingCertRequest, setViewingCertRequest] = useState<CertificateRequest | null>(null);
    const [view, setView] = useState<'list' | 'summary'>('list');

    const [filters, setFilters] = useState({
        name: 'all',
        status: 'all',
        projectId: 'all',
        search: '',
        updatedDateRange: undefined,
    });

    const canManageInventory = useMemo(() => {
        if (!user) return false;
        const userRole = roles.find(r => r.name === user.role);
        return userRole?.permissions.includes('manage_inventory') ?? false;
    }, [user, roles]);

    const { generalItems, dailyConsumables, jobConsumables } = useMemo(() => {
        const general: InventoryItem[] = [];
        const daily: InventoryItem[] = [];
        const job: InventoryItem[] = [];
        inventoryItems.forEach(item => {
            if (item.category === 'Daily Consumable') {
                daily.push(item);
            } else if (item.category === 'Job Consumable') {
                job.push(item);
            } else {
                general.push(item);
            }
        });
        return { generalItems: general, dailyConsumables: daily, jobConsumables: job };
    }, [inventoryItems]);

    const filteredItems = useMemo(() => {
      const privilegedRoles: Role[] = ['Admin', 'Manager', 'Store in Charge', 'Assistant Store Incharge', 'Project Coordinator', 'Document Controller'];
      const isPrivileged = user ? privilegedRoles.includes(user.role) : false;

      return generalItems.filter(item => {
        const { name, status, projectId, search, updatedDateRange } = filters;
        if (name !== 'all' && item.name !== name) return false;
        if (search && !(item.serialNumber.toLowerCase().includes(search.toLowerCase()) || item.ariesId?.toLowerCase().includes(search.toLowerCase()) || item.chestCrollNo?.toLowerCase().includes(search.toLowerCase()))) {
            return false;
        }
        
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
            } else if (status === 'Not Verified') {
                if (!item.lastUpdated) return true; // Show items with no lastUpdated date
                const fifteenDaysAgo = subDays(now, 15);
                if (isBefore(parseISO(item.lastUpdated), fifteenDaysAgo)) return true; // Show items updated more than 15 days ago
                return false; // Hide items updated within the last 15 days
            } else {
                if (item.status !== status) return false;
            }
        }
        
        if (updatedDateRange?.from) {
            if (!item.lastUpdated) return false;
            const updatedDate = parseISO(item.lastUpdated);
            const from = updatedDateRange.from;
            const to = updatedDateRange.to || from;
            if (!isWithinInterval(updatedDate, { start: from, end: to })) {
                return false;
            }
        }

        if (!isPrivileged && user?.projectId && item.projectId !== user.projectId) {
          return false;
        }

        return true;
      });
    }, [generalItems, filters, user, roles]);

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
        req.itemId
      );
    }, [certificateRequests, user]);

    useEffect(() => {
        if (myFulfilledCertRequests.some(req => !req.viewedByRequester)) {
            markFulfilledRequestsAsViewed('store');
        }
    }, [myFulfilledCertRequests, markFulfilledRequestsAsViewed]);


    const inventoryNotifications = useMemo(() => {
        const now = new Date();
        const thirtyDaysFromNow = addDays(now, 30);
        const notifications: { message: string, item: InventoryItem }[] = [];

        generalItems.forEach(item => {
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
    }, [generalItems]);

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
                            <Button onClick={() => setIsGenerateCertOpen(true)} variant="outline"><FilePlus className="mr-2 h-4 w-4" /> Generate TP Cert List</Button>
                            <Button onClick={() => setIsBulkUpdateOpen(true)} variant="outline"><FilePen className="mr-2 h-4 w-4" /> Bulk Update TP Cert</Button>
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
                        <CardDescription>Status of your submitted certificate requests for store items.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {myCertRequests.map(req => {
                            const item = inventoryItems.find(i => i.id === req.itemId);
                            const subject = item ? `${item.name} (SN: ${item.serialNumber})` : 'Unknown';
                            const commentsArray = Array.isArray(req.comments) ? req.comments : Object.values(req.comments || {});
                            return (
                                <div key={req.id} className="p-3 border rounded-lg bg-muted/50">
                                    <Accordion type="single" collapsible>
                                        <AccordionItem value="item-1" className="border-b-0">
                                            <div className="flex justify-between items-start">
                                                <AccordionTrigger className="p-0 hover:no-underline flex-1 text-left">
                                                    <div>
                                                      <p className="font-semibold">{req.requestType} for {subject}</p>
                                                      <p className="text-sm text-muted-foreground">Submitted {formatDistanceToNow(new Date(req.requestDate), { addSuffix: true })}</p>
                                                    </div>
                                                </AccordionTrigger>
                                                <div className="flex items-center gap-2 pl-4">
                                                  <Badge variant={req.status === 'Completed' ? 'default' : req.status === 'Rejected' ? 'destructive' : 'secondary'}>{req.status}</Badge>
                                                  {req.status === 'Completed' && (
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => acknowledgeFulfilledRequest(req.id)}><X className="h-4 w-4"/></Button>
                                                  )}
                                                </div>
                                            </div>
                                            <AccordionContent className="pt-2">
                                                <div className="space-y-2 mt-2 pt-2 border-t">
                                                    {commentsArray.length > 0 ? commentsArray.map((c, i) => {
                                                        const commentUser = users.find(u => u.id === c.userId);
                                                        return (
                                                            <div key={i} className="flex items-start gap-2">
                                                                <Avatar className="h-6 w-6"><AvatarImage src={commentUser?.avatar} /><AvatarFallback>{commentUser?.name.charAt(0)}</AvatarFallback></Avatar>
                                                                <div className="text-xs bg-background p-2 rounded-md w-full">
                                                                    <div className="flex justify-between items-baseline"><p className="font-semibold">{commentUser?.name}</p><p className="text-muted-foreground">{formatDistanceToNow(new Date(c.date), { addSuffix: true })}</p></div>
                                                                    <p className="text-foreground/80 mt-1 whitespace-pre-wrap">{c.text}</p>
                                                                </div>
                                                            </div>
                                                        );
                                                    }) : <p className="text-xs text-muted-foreground">No comments yet.</p>}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>
            )}

            <Tabs defaultValue="general">
                <TabsList>
                    <TabsTrigger value="general">General Items</TabsTrigger>
                    <TabsTrigger value="consumables">Consumables</TabsTrigger>
                </TabsList>
                <TabsContent value="general">
                    <Card>
                        <CardHeader>
                           <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
                             {view === 'list' ? (
                                <InventoryFilters onApplyFilters={setFilters} />
                             ) : <CardTitle>General Inventory Summary</CardTitle>}
                             <InventoryReportDownloads items={filteredItems} isSummary={view === 'summary'} summaryData={summaryData} />
                           </div>
                        </CardHeader>
                        <CardContent>
                            {view === 'list' ? <InventoryTable items={filteredItems} /> : <InventorySummary items={filteredItems} />}
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="consumables">
                    <Card>
                        <CardHeader>
                            <CardTitle>Consumable Items</CardTitle>
                            <CardDescription>Manage daily and job-specific consumable items.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold mb-2">Daily Consumables</h3>
                                    <InventoryTable items={dailyConsumables} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold mb-2">Job Consumables</h3>
                                    <InventoryTable items={jobConsumables} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <AddItemDialog isOpen={isAddItemOpen} setIsOpen={setIsAddItemOpen} />
            <ImportItemsDialog isOpen={isImportOpen} setIsOpen={setIsImportOpen} />
            <BulkUpdateTpCertDialog isOpen={isBulkUpdateOpen} setIsOpen={setIsBulkUpdateOpen} />
            <GenerateTpCertDialog isOpen={isGenerateCertOpen} setIsOpen={setIsGenerateCertOpen} />
            {viewingCertRequest && ( <ViewCertificateRequestDialog request={viewingCertRequest} isOpen={!!viewingCertRequest} setIsOpen={() => setViewingCertRequest(null)} /> )}
        </div>
    );
}

    
