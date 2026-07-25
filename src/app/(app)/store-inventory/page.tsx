'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { useInventory } from '@/contexts/inventory-provider';
import { useInwardOutward } from '@/contexts/inward-outward-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Upload, ChevronsUpDown, FilePen, FilePlus, FileText, ArrowRightLeft, Package, Hammer, CheckCircle, Database, AlertTriangle, Truck, Inbox, Table as TableIcon } from 'lucide-react';
import AddItemDialog from '@/components/inventory/AddItemDialog';
import ImportItemsDialog from '@/components/inventory/ImportItemsDialog';
import InventoryFilters, { type InventoryFilterValues } from '@/components/inventory/InventoryFilters';
import type { InventoryItem, CertificateRequest, Role, InventoryTransferRequest, InventoryItemStatus, TpCertList } from '@/lib/types';
import { isAfter, isBefore, addDays, parseISO, isWithinInterval, format, isValid, isPast, startOfDay } from 'date-fns';
import ViewCertificateRequestDialog from '@/components/inventory/ViewCertificateRequestDialog';
import InventorySummary from '@/components/inventory/InventorySummary';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import BulkUpdateTpCertDialog from '@/components/inventory/BulkUpdateTpCertDialog';
import BulkUpdateInspectionDialog from '@/components/inventory/BulkUpdateInspectionDialog';
import UpdateItemsDialog from '@/components/inventory/UpdateItemsDialog';
import ActionRequiredReport from '@/components/inventory/ActionRequiredReport';
import NewDamageReportDialog from '@/components/damage-reports/NewDamageReportDialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import AddInwardRecordDialog from '@/components/inventory/AddInwardRecordDialog';
import InwardOutwardHistory from '@/components/inventory/InwardOutwardHistory';
import NewOutwardDialog from '@/components/inventory/NewOutwardDialog';
import GenerateTpCertDialog from '@/components/inventory/GenerateTpCertDialog';
import PendingTransfers from '@/components/requests/PendingTransfers';
import NewInventoryTransferRequestDialog from '@/components/requests/new-inventory-transfer-request-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InventorySheet from '@/components/inventory/InventorySheet';


export default function StoreInventoryPage() {
    const { user, can } = useAuth();
    const { projects } = useGeneral();
    const { 
        inventoryItems, 
        certificateRequests, 
        inventoryTransferRequests,
        damageReports,
        revalidateExpiredItems 
    } = useInventory();
    const { inwardOutwardRecords, pendingFinalizationCount } = useInwardOutward();
    
    const [isAddItemOpen, setIsAddItemOpen] = useState(false);
    const [isInwardOpen, setIsInwardOpen] = useState(false);
    const [isOutwardOpen, setIsOutwardOpen] = useState(false);
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

    const [filters, setFilters] = useState<InventoryFilterValues>({
        name: 'all',
        status: 'all',
        projectId: 'all',
        search: '',
        updatedDateRange: undefined,
    });

    const globalFilteredItems = useMemo(() => {
        return inventoryItems.filter(item => {
            if (item.category !== 'General' || item.isArchived) return false;

            const nameMatch = filters.name === 'all' || item.name === filters.name;
            const statusMatch = filters.status === 'all' || item.status === filters.status;
            const projectMatch = filters.projectId === 'all' || item.projectId === filters.projectId;
            
            const term = filters.search.toLowerCase();
            const searchMatch = !filters.search || 
                               item.serialNumber.toLowerCase().includes(term) || 
                               (item.ariesId && item.ariesId.toLowerCase().includes(term)) ||
                               (item.chestCrollNo && item.chestCrollNo.toLowerCase().includes(term));

            let dateMatch = true;
            if (filters.updatedDateRange?.from) {
                const updated = parseISO(item.lastUpdated);
                const start = startOfDay(filters.updatedDateRange.from);
                const end = filters.updatedDateRange.to ? addDays(startOfDay(filters.updatedDateRange.to), 1) : addDays(start, 1);
                dateMatch = isWithinInterval(updated, { start, end });
            }

            return nameMatch && statusMatch && projectMatch && searchMatch && dateMatch;
        });
    }, [inventoryItems, filters]);

    const inventoryCategories = useMemo(() => {
        const categories = new Set(globalFilteredItems.map(item => item.name));
        return Array.from(categories).sort();
    }, [globalFilteredItems]);

    const [activeTab, setActiveTab] = useState<string | undefined>();

    useEffect(() => {
        if (inventoryCategories.length > 0 && !activeTab) {
            setActiveTab(inventoryCategories[0]);
        } else if (activeTab && !inventoryCategories.includes(activeTab)) {
            setActiveTab(inventoryCategories[0] || undefined);
        }
    }, [inventoryCategories, activeTab]);

    const hasTransferAuthority = useMemo(() => {
        if (!user) return false;
        return user.canApproveTransfers || user.role === 'Admin' || can.approve_transfer_requests;
    }, [user, can.approve_transfer_requests]);

    const pendingInventoryTransferRequestCount = hasTransferAuthority ? (inventoryTransferRequests || []).filter(r => r.status === 'Pending' || r.status === 'Disputed').length : 0;
    
    const actionRequiredNotifications = useMemo(() => {
        const now = new Date();
        const thirtyDaysFromNow = addDays(now, 30);
        const notifications: { message: string, item: InventoryItem }[] = [];

        globalFilteredItems.forEach(item => {
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

        return notifications;
    }, [globalFilteredItems]);

    if (!can.view_inventory && !can.manage_inventory) {
        return (
             <Card className="w-full max-w-md mx-auto mt-20">
               <CardHeader className="text-center items-center">
                   <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4">
                       <AlertTriangle className="h-10 w-10 text-destructive" />
                   </div>
                   <CardTitle>Access Denied</CardTitle>
                   <CardDescription>You do not have permission to view the Store Inventory.</CardDescription>
               </CardHeader>
           </Card>
        )
    }

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
        <div className="space-y-6 flex flex-col h-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-bold tracking-tight">Store Inventory</h1>
                    <p className="text-muted-foreground text-sm">Comprehensive database and spreadsheet view for all assets.</p>
                </div>
                <div className="flex items-center flex-wrap gap-2">
                    <Button asChild variant="outline" className="h-9 font-bold text-xs"><Link href="/consumables"><Package className="mr-2 h-4 w-4"/> Consumables</Link></Button>
                    <Button asChild variant="outline" className="h-9 font-bold text-xs"><Link href="/ppe-stock"><Package className="mr-2 h-4 w-4"/> PPE Stock</Link></Button>
                    <Button asChild variant="outline" className="h-9 font-bold text-xs"><Link href="/tp-certification"><FileText className="mr-2 h-4 w-4"/> TP Cert Lists</Link></Button>
                    
                    <Button onClick={() => setIsNewDamageReportOpen(true)} variant="destructive" className="h-9 font-bold text-xs">
                        <Hammer className="mr-2 h-4 w-4" /> Report Damage
                    </Button>

                    <Button onClick={() => setView(v => v === 'list' ? 'summary' : 'list')} variant="outline" className="h-9 font-bold text-xs">
                        {view === 'list' ? <><Database className="mr-2 h-4 w-4" />View Summary</> : <><TableIcon className="mr-2 h-4 w-4" />View Database</>}
                    </Button>
                    
                    <Button variant="outline" onClick={() => openTransferRequestDialog(null)} className="h-9 font-bold text-xs">
                        <ArrowRightLeft className="mr-2 h-4 w-4" /> Transfer Items
                    </Button>

                    {can.manage_inventory && (
                        <>
                            <Button onClick={() => setIsInwardOpen(true)} variant="outline" className="h-9 font-bold text-xs"><Inbox className="mr-2 h-4 w-4"/>New Inward</Button>
                            <Button onClick={() => setIsOutwardOpen(true)} variant="outline" className="h-9 font-bold text-xs"><ArrowRightLeft className="mr-2 h-4 w-4"/>New Outward</Button>
                            <Button onClick={revalidateExpiredItems} variant="outline" className="h-9 font-bold text-xs"><CheckCircle className="mr-2 h-4 w-4" />Check Validity</Button>
                            <Button onClick={() => setIsBulkInspectionUpdateOpen(true)} variant="outline" className="h-9 font-bold text-xs"><FilePen className="mr-2 h-4 w-4"/>Bulk Update Insp. Cert</Button>
                            <Button onClick={() => setIsBulkUpdateOpen(true)} variant="outline" className="h-9 font-bold text-xs"><FilePen className="mr-2 h-4 w-4" /> Bulk Update TP Cert</Button>
                            <Button onClick={() => setIsGenerateCertOpen(true)} variant="outline" className="h-9 font-bold text-xs"><FilePlus className="mr-2 h-4 w-4" /> Generate TP Cert List</Button>
                            <Button onClick={() => setIsImportOpen(true)} variant="outline" className="h-9 font-bold text-xs"><Upload className="mr-2 h-4 w-4" /> Import</Button>
                            <Button onClick={() => setIsAddItemOpen(true)} className="h-9 font-bold text-xs"><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button>
                        </>
                    )}
                </div>
            </div>
            
            <div className="shrink-0 space-y-4">
                <Accordion type="multiple" className="w-full space-y-4">
                    <AccordionItem value="inventory-transfers">
                        <AccordionTrigger className={cn("text-sm font-bold border rounded-lg p-3 bg-muted/5", pendingInventoryTransferRequestCount > 0 && "text-destructive border-destructive")}>
                            <div className="flex items-center gap-2">
                                <AlertTriangle className={cn("h-4 w-4", pendingInventoryTransferRequestCount > 0 ? "text-destructive" : "text-muted-foreground")} />
                                Inventory Transfers
                                {pendingInventoryTransferRequestCount > 0 && <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] p-0 flex justify-center items-center font-black">{pendingInventoryTransferRequestCount}</Badge>}
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 border border-t-0 rounded-b-lg">
                            <PendingTransfers onEditRequest={openTransferRequestDialog} />
                        </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="inward-outward-register">
                        <AccordionTrigger className={cn("text-sm font-bold border rounded-lg p-3 bg-muted/5", pendingFinalizationCount > 0 && "text-destructive border-destructive")}>
                            <div className="flex items-center gap-2">
                                <Inbox className={cn("h-4 w-4", pendingFinalizationCount > 0 ? "text-destructive" : "text-muted-foreground")} />
                                Inward/Outward Register
                                {pendingFinalizationCount > 0 && <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] p-0 flex justify-center items-center font-black">{pendingFinalizationCount}</Badge>}
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 border border-t-0 rounded-b-lg">
                            <InwardOutwardHistory records={inwardOutwardRecords} />
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="action-required">
                        <AccordionTrigger className={cn("text-sm font-bold border rounded-lg p-3 bg-muted/5", actionRequiredNotifications.length > 0 && "text-destructive border-destructive bg-destructive/5")}>
                            <div className="flex items-center gap-2">
                                <AlertTriangle className={actionRequiredNotifications.length > 0 ? "text-destructive h-4 w-4" : "text-muted-foreground h-4 w-4"} />
                                Action Required (Expiring Items)
                                {actionRequiredNotifications.length > 0 && <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] p-0 flex justify-center items-center font-black">{actionRequiredNotifications.length}</Badge>}
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 border border-t-0 rounded-b-lg">
                            <ActionRequiredReport notifications={actionRequiredNotifications} />
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
                
                <InventoryFilters 
                    initialFilters={filters}
                    onApplyFilters={setFilters}
                />
            </div>

            <div className="flex-1 min-h-0">
                {view === 'list' ? (
                    <div className="h-full flex flex-col space-y-4">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                            <ScrollArea className="w-full whitespace-nowrap rounded-md border bg-muted/20 p-1 shrink-0">
                                <TabsList className="inline-flex h-10 bg-transparent gap-1">
                                    {inventoryCategories.map(cat => {
                                        const count = globalFilteredItems.filter(i => i.name === cat).length;
                                        return (
                                            <TabsTrigger key={cat} value={cat} className="px-5 py-1.5 text-[11px] font-black uppercase tracking-wider data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                                {cat}
                                                <Badge variant="secondary" className="ml-3 h-5 px-1.5 min-w-[1.25rem] font-black text-[10px]">{count}</Badge>
                                            </TabsTrigger>
                                        )
                                    })}
                                </TabsList>
                                <ScrollBar orientation="horizontal" />
                            </ScrollArea>
                            {inventoryCategories.map(cat => (
                                <TabsContent key={cat} value={cat} className="flex-1 mt-4 focus-visible:ring-0">
                                    <div className="h-[calc(100vh-420px)] border rounded-lg overflow-hidden bg-card">
                                        <InventorySheet category={cat} items={globalFilteredItems.filter(i => i.name === cat)} />
                                    </div>
                                </TabsContent>
                            ))}
                            {inventoryCategories.length === 0 && (
                                <div className="flex-1 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg p-20 bg-muted/10">
                                    <Database className="mr-2 h-10 w-10 opacity-20" />
                                    <p className="text-lg font-semibold">No items match the current filters.</p>
                                </div>
                            )}
                        </Tabs>
                    </div>
                ) : (
                    <InventorySummary items={globalFilteredItems} />
                )}
            </div>

            <AddItemDialog isOpen={isAddItemOpen} setIsOpen={setIsAddItemOpen} />
            <AddInwardRecordDialog isOpen={isInwardOpen} setIsOpen={setIsInwardOpen} />
            <NewOutwardDialog isOpen={isOutwardOpen} setIsOpen={isOutwardOpen} />
            <ImportItemsDialog isOpen={isImportOpen} setIsOpen={setIsImportOpen} />
            <UpdateItemsDialog isOpen={isUpdateItemsOpen} setIsOpen={setIsUpdateItemsOpen} />
            <BulkUpdateTpCertDialog isOpen={isBulkUpdateOpen} setIsOpen={setIsBulkUpdateOpen} />
            <BulkUpdateInspectionDialog isOpen={isBulkInspectionUpdateOpen} setIsOpen={setIsBulkInspectionUpdateOpen} />
            <GenerateTpCertDialog isOpen={isGenerateCertOpen} setIsOpen={setIsGenerateCertOpen} />
            <NewInventoryTransferRequestDialog
                isOpen={isTransferRequestOpen || !!editingTransferRequest}
                setIsOpen={closeTransferRequestDialog}
                onClearSelection={() => {}}
                existingRequest={editingTransferRequest}
            />
            <NewDamageReportDialog isOpen={isNewDamageReportOpen} setIsOpen={setIsNewDamageReportOpen} />
            {viewingCertRequest && ( <ViewCertificateRequestDialog request={viewingCertRequest} isOpen={!!viewingCertRequest} setIsOpen={() => setViewingCertRequest(null)} /> )}
        </div>
    );
}
