'use client';
import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Upload, ChevronsUpDown, FilePen, FilePlus, FileText, ArrowRightLeft, Package, Hammer, CheckCircle, Database, AlertTriangle } from 'lucide-react';
import InventoryTable from '@/components/inventory/InventoryTable';
import AddItemDialog from '@/components/inventory/AddItemDialog';
import ImportItemsDialog from '@/components/inventory/ImportItemsDialog';
import InventoryFilters from '@/components/inventory/InventoryFilters';
import type { InventoryItem, CertificateRequest, Role, InventoryTransferRequest } from '@/lib/types';
import { isAfter, isBefore, addDays, parseISO, isWithinInterval, subDays, format, isValid, isPast } from 'date-fns';
import ViewCertificateRequestDialog from '@/components/inventory/ViewCertificateRequestDialog';
import InventorySummary from '@/components/inventory/InventorySummary';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import InventoryReportDownloads from '@/components/inventory/InventoryReportDownloads';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import BulkUpdateTpCertDialog from '@/components/inventory/BulkUpdateTpCertDialog';
import GenerateTpCertDialog from '@/components/inventory/GenerateTpCertDialog';
import NewInventoryTransferRequestDialog from '@/components/requests/new-inventory-transfer-request-dialog';
import PendingTransfers from '@/components/requests/PendingTransfers';
import BulkUpdateInspectionDialog from '@/components/inventory/BulkUpdateInspectionDialog';
import UpdateItemsDialog from '@/components/inventory/UpdateItemsDialog';
import ActionRequiredReport from '@/components/inventory/ActionRequiredReport';
import NewDamageReportDialog from '@/components/damage-reports/NewDamageReportDialog';
import { ScrollArea } from '@/components/ui/scroll-area';


export default function StoreInventoryPage() {
    const { user, users, roles, inventoryItems, projects, certificateRequests, acknowledgeFulfilledRequest, markFulfilledRequestsAsViewed, can, pendingInventoryTransferRequestCount, pendingDamageReportCount, revalidateExpiredItems } = useAppContext();
    const [isAddItemOpen, setIsAddItemOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isUpdateItemsOpen, setIsUpdateItemsOpen] = useState(false);
    const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
    const [isBulkInspectionUpdateOpen, setIsBulkInspectionUpdateOpen] = useState(false);
    const [isGenerateCertOpen, setIsGenerateCertOpen] = useState(false);
    const [isTransferRequestOpen, setIsTransferRequestOpen] = useState(false);
    const [editingTransferRequest, setEditingTransferRequest] = useState<InventoryTransferRequest | null>(null);
    const [isNewDamageReportOpen, setIsNewDamageReportOpen] = useState(false);
    const [viewingCertRequest, setViewingCertRequest] = useState<CertificateRequest | null>(null);
    const [view, setView] = useState<'list' | 'summary'>('list');

    const [filters, setFilters] = useState({
        name: 'all',
        status: 'all',
        projectId: 'all',
        search: '',
        updatedDateRange: undefined,
    });
    
    const [selectedItemsForTransfer, setSelectedItemsForTransfer] = useState<InventoryItem[]>([]);


    const canManageInventory = useMemo(() => {
        if (!user) return false;
        return user.role === 'Admin' || can.manage_inventory;
    }, [user, can]);
    
    const actionRequiredNotifications = useMemo(() => {
        const now = new Date();
        const thirtyDaysFromNow = addDays(now, 30);
        const notifications: { message: string, item: InventoryItem }[] = [];

        const userVisibleItems = inventoryItems.filter(item => {
            if (can.manage_inventory || user?.role === 'Admin') return true;
            return user?.projectIds?.includes(item.projectId);
        });

        userVisibleItems.forEach(item => {
            if (item.isArchived || item.status === 'Damaged' || item.status === 'Quarantine') return;

            if (item.inspectionDueDate) {
                const dueDate = parseISO(item.inspectionDueDate);
                if (isValid(dueDate)) {
                    if (isPast(dueDate)) {
                        notifications.push({ message: `Inspection Expired: ${format(dueDate, 'dd-MM-yy')}`, item });
                    } else if (isBefore(dueDate, thirtyDaysFromNow)) {
                         notifications.push({ message: `Inspection Expires Soon: ${format(dueDate, 'dd-MM-yy')}`, item });
                    }
                }
            }
            if (item.tpInspectionDueDate) {
                const dueDate = parseISO(item.tpInspectionDueDate);
                if (isValid(dueDate)) {
                    if (isPast(dueDate)) {
                        notifications.push({ message: `TP Cert. Expired: ${format(dueDate, 'dd-MM-yy')}`, item });
                    } else if (isBefore(dueDate, thirtyDaysFromNow)) {
                         notifications.push({ message: `TP Cert. Expires Soon: ${format(dueDate, 'dd-MM-yy')}`, item });
                    }
                }
            }
        });

        return notifications.sort((a,b) => {
            // Sort logic to prioritize more urgent items, e.g., expired > expiring soon
            return 0; // Simple for now
        });
    }, [inventoryItems, can.manage_inventory, user]);


    const filteredItems = useMemo(() => {
        const userCanManage = can.manage_inventory || user?.role === 'Admin';
        
        return inventoryItems.filter(item => {
            if (item.isArchived) return false;
            if (item.category === 'Daily Consumable' || item.category === 'Job Consumable') {
                return false;
            }

            // Project visibility filter
            if (!userCanManage) {
                if (!user?.projectIds || !user.projectIds.includes(item.projectId)) {
                    return false;
                }
            }

            // Apply selected project filter for ALL users (both admin and non-admin)
            if (filters.projectId !== 'all') {
                if (item.projectId !== filters.projectId) {
                    return false;
                }
            }

            const { name, status, projectId, search, updatedDateRange } = filters;
            
            // Name filter
            if (name !== 'all' && item.name !== name) return false;

            // Search filter
            if (search && !(item.serialNumber?.toLowerCase().includes(search.toLowerCase()) || item.ariesId?.toLowerCase().includes(search.toLowerCase()) || item.chestCrollNo?.toLowerCase().includes(search.toLowerCase()))) {
                return false;
            }
            
            // Status filter
            const now = new Date();
            const inspectionDueDate = item.inspectionDueDate ? parseISO(item.inspectionDueDate) : null;
            const tpInspectionDueDate = item.tpInspectionDueDate ? parseISO(item.tpInspectionDueDate) : null;
            const isItemExpired = (inspectionDueDate && isAfter(now, inspectionDueDate)) || (tpInspectionDueDate && isAfter(now, tpInspectionDueDate));
            const itemEffectiveStatus = isItemExpired ? 'Expired' : item.status;

            if (status !== 'all') {
                if (status === 'Expired') {
                    if (!isItemExpired) return false;
                } else if (status === 'Inspection Expired') {
                    if (!inspectionDueDate || !isAfter(now, inspectionDueDate)) return false;
                } else if (status === 'TP Expired') {
                    if (!tpInspectionDueDate || !isAfter(now, tpInspectionDueDate)) return false;
                } else if (status === 'Not Verified') {
                    if (!item.lastUpdated) return true; // Show items with no lastUpdated date
                    const fifteenDaysAgo = subDays(now, 15);
                    if (isBefore(parseISO(item.lastUpdated), fifteenDaysAgo)) return true; // Show items updated more than 15 days ago
                    return false; // Hide items updated within the last 15 days
                } else {
                    if (item.status !== status) return false;
                }
            }
            
            // Date range filter
            if (updatedDateRange?.from) {
                if (!item.lastUpdated) return false;
                const updatedDate = parseISO(item.lastUpdated);
                const from = updatedDateRange.from;
                const to = updatedDateRange.to || from;
                if (!isWithinInterval(updatedDate, { start: from, end: to })) {
                    return false;
                }
            }
            
            return true;
        });
    }, [inventoryItems, filters, user, can.manage_inventory, projects]);

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
    
    const openTransferRequestDialog = (request: InventoryTransferRequest | null) => {
        if(request) {
            setEditingTransferRequest(request);
        } else {
            setIsTransferRequestOpen(true);
        }
    }
    
    const closeTransferRequestDialog = () => {
        setIsTransferRequestOpen(false);
        setEditingTransferRequest(null);
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Store Inventory</h1>
                    <p className="text-muted-foreground">Manage and track all equipment and items.</p>
                </div>
                <div className="flex items-center flex-wrap gap-2">
                    <Button asChild variant="outline"><Link href="/inventory-database"><Database className="mr-2 h-4 w-4"/> Inventory DB</Link></Button>
                    <Button asChild variant="outline"><Link href="/consumables"><Package className="mr-2 h-4 w-4"/> Consumables</Link></Button>
                    <Button asChild variant="outline"><Link href="/ppe-stock"><Package className="mr-2 h-4 w-4"/> PPE Stock</Link></Button>
                    <Button asChild variant="outline"><Link href="/igp-ogp"><ArrowRightLeft className="mr-2 h-4 w-4"/> IGP/OGP Register</Link></Button>
                    <Button asChild variant="outline"><Link href="/tp-certification"><FileText className="mr-2 h-4 w-4"/> TP Cert Lists</Link></Button>
                    
                    <Button onClick={() => setIsNewDamageReportOpen(true)} variant="destructive">
                        <Hammer className="mr-2 h-4 w-4 stroke-black fill-white" /> Report Damage
                    </Button>

                    <Button onClick={() => setView(v => v === 'list' ? 'summary' : 'list')} variant="outline"><ChevronsUpDown className="mr-2 h-4 w-4" />{view === 'list' ? 'View Summary' : 'View List'}</Button>
                    {selectedItemsForTransfer.length > 0 ? (
                        <Button onClick={() => openTransferRequestDialog(null)}>
                            <ArrowRightLeft className="mr-2 h-4 w-4" /> Transfer Selected ({selectedItemsForTransfer.length})
                        </Button>
                    ) : (
                        <Button variant="outline" onClick={() => openTransferRequestDialog(null)}>
                            <ArrowRightLeft className="mr-2 h-4 w-4" /> Transfer Items
                        </Button>
                    )}
                    {canManageInventory && (
                        <>
                            <Button onClick={revalidateExpiredItems} variant="outline"><CheckCircle className="mr-2 h-4 w-4" />Check Validity</Button>
                            <Button onClick={() => setIsBulkInspectionUpdateOpen(true)} variant="outline"><FilePen className="mr-2 h-4 w-4"/>Bulk Update Insp. Cert</Button>
                            <Button onClick={() => setIsBulkUpdateOpen(true)} variant="outline"><FilePen className="mr-2 h-4 w-4" /> Bulk Update TP Cert</Button>
                            <Button onClick={() => setIsGenerateCertOpen(true)} variant="outline"><FilePlus className="mr-2 h-4 w-4" /> Generate TP Cert List</Button>
                            <Button onClick={() => setIsImportOpen(true)} variant="outline"><Upload className="mr-2 h-4 w-4" /> Import</Button>
                            <Button onClick={() => setIsAddItemOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button>
                        </>
                    )}
                </div>
            </div>
            
            <Accordion type="single" collapsible className="w-full" defaultValue="inventory-transfers">
                <AccordionItem value="inventory-transfers">
                    <AccordionTrigger className="text-lg font-semibold">
                        <div className="flex items-center gap-2">
                            Inventory Transfers
                            {pendingInventoryTransferRequestCount > 0 && <Badge variant="destructive">{pendingInventoryTransferRequestCount}</Badge>}
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <PendingTransfers onEditRequest={openTransferRequestDialog} />
                    </AccordionContent>
                </AccordionItem>
                 {actionRequiredNotifications.length > 0 && (
                <AccordionItem value="action-required">
                    <AccordionTrigger className="text-lg font-semibold text-destructive">
                        <div className="flex items-center gap-2">
                            <AlertTriangle />
                            Action Required
                            <Badge variant="destructive">{actionRequiredNotifications.length}</Badge>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle>Items Requiring Attention</CardTitle>
                                        <CardDescription>These items are expired or have certifications expiring soon.</CardDescription>
                                    </div>
                                    <ActionRequiredReport notifications={actionRequiredNotifications} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-64">
                                    <div className="space-y-2">
                                        {actionRequiredNotifications.map(({item, message}, index) => {
                                            const projectName = projects.find(p => p.id === item.projectId)?.name;
                                            return (
                                            <div key={`${item.id}-${index}`} className="flex items-center justify-between p-2 rounded-md bg-muted">
                                                <div className="text-sm">
                                                    <p className="font-semibold">
                                                        {item.name} <span className="text-muted-foreground">(SN: {item.serialNumber})</span>
                                                        {projectName && <span className="ml-2 font-normal text-muted-foreground">[{projectName}]</span>}
                                                    </p>
                                                    <p className="text-destructive">{message}</p>
                                                </div>
                                            </div>
                                        )})}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </AccordionContent>
                </AccordionItem>
            )}
            </Accordion>
            
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
                    {view === 'list' ? <InventoryTable items={filteredItems} selectedItems={selectedItemsForTransfer} onSelectionChange={setSelectedItemsForTransfer} /> : <InventorySummary items={filteredItems} />}
                </CardContent>
            </Card>


            <AddItemDialog isOpen={isAddItemOpen} setIsOpen={setIsAddItemOpen} />
            <ImportItemsDialog isOpen={isImportOpen} setIsOpen={setIsImportOpen} />
            <UpdateItemsDialog isOpen={isUpdateItemsOpen} setIsOpen={setIsUpdateItemsOpen} />
            <BulkUpdateTpCertDialog isOpen={isBulkUpdateOpen} setIsOpen={setIsBulkUpdateOpen} />
            <BulkUpdateInspectionDialog isOpen={isBulkInspectionUpdateOpen} setIsOpen={setIsBulkInspectionUpdateOpen} />
            <GenerateTpCertDialog isOpen={isGenerateCertOpen} setIsOpen={setIsGenerateCertOpen} />
            <NewInventoryTransferRequestDialog
                isOpen={isTransferRequestOpen || !!editingTransferRequest}
                setIsOpen={closeTransferRequestDialog}
                preSelectedItems={selectedItemsForTransfer}
                onClearSelection={() => setSelectedItemsForTransfer([])}
                existingRequest={editingTransferRequest}
            />
            <NewDamageReportDialog isOpen={isNewDamageReportOpen} setIsOpen={setIsNewDamageReportOpen} />
            {viewingCertRequest && ( <ViewCertificateRequestDialog request={viewingCertRequest} isOpen={!!viewingCertRequest} setIsOpen={() => setViewingCertRequest(null)} /> )}
        </div>
    );
}
