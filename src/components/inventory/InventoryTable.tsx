
'use client';
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { useInventory } from '@/contexts/inventory-provider';
import type { InventoryItem } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, ShieldQuestion, Pencil, ArrowUpDown, CheckCircle, Link as LinkIcon, Download } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import EditItemDialog from './EditItemDialog';
import { format, isPast, parseISO, differenceInDays, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import NewCertificateRequestDialog from './NewCertificateRequestDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RenameItemGroupDialog from './RenameItemGroupDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Checkbox } from '../ui/checkbox';
import React from 'react';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import Link from 'next/link';

interface InventoryTableProps {
  items: InventoryItem[];
  selectedItems?: InventoryItem[];
  onSelectionChange?: (items: InventoryItem[]) => void;
}

export default function InventoryTable({ items, selectedItems, onSelectionChange }: InventoryTableProps) {
    const { user, can } = useAuth();
    const { projects } = useGeneral();
    const { batchDeleteInventoryItems, updateInventoryItem, damageReports } = useInventory();

    const { toast } = useToast();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isCertRequestOpen, setIsCertRequestOpen] = useState(false);
    const [isRenameOpen, setIsRenameOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [selectedItemGroup, setSelectedItemGroup] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: 'lastUpdated', direction: 'ascending' | 'descending' } | null>(null);
    const [activeTab, setActiveTab] = useState<string | undefined>();

    const groupedItems = useMemo(() => {
        const sortedItems = [...items];
        if (sortConfig) {
            sortedItems.sort((a, b) => {
                const dateA = a.lastUpdated ? parseISO(a.lastUpdated).getTime() : 0;
                const dateB = b.lastUpdated ? parseISO(b.lastUpdated).getTime() : 0;
                if (dateA < dateB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (dateA > dateB) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        
        const groups = sortedItems.reduce<Record<string, InventoryItem[]>>((acc, item) => {
            if (!acc[item.name]) acc[item.name] = [];
            acc[item.name].push(item);
            return acc;
        }, {});

        return Object.keys(groups).sort().reduce((acc, key) => {
            acc[key] = groups[key];
            return acc;
        }, {} as Record<string, InventoryItem[]>);
    }, [items, sortConfig]);

    const itemNames = useMemo(() => Object.keys(groupedItems), [groupedItems]);

    useEffect(() => {
        if (itemNames.length > 0 && !activeTab) {
            setActiveTab(itemNames[0]);
        } else if (activeTab && !itemNames.includes(activeTab)) {
            setActiveTab(itemNames[0] || undefined);
        }
    }, [itemNames, activeTab]);

    const canManage = useMemo(() => {
        if (!user) return false;
        return can.manage_inventory;
    }, [user, can]);
    
    const getProjectName = (item: InventoryItem) => {
        if (item.status === 'Moved to another project') {
          return item.movedToProjectId || 'N/A';
        }
        const project = projects.find(p => p.id === item.projectId);
        if (!project) return 'N/A';
        return item.plantUnit ? `${project.name} / ${item.plantUnit}` : project.name;
    };

    const requestSort = (key: 'lastUpdated') => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleEditClick = (item: InventoryItem) => {
        setSelectedItem(item);
        setIsEditDialogOpen(true);
    };
    
    const handleRequestClick = (item: InventoryItem) => {
        setSelectedItem(item);
        setIsCertRequestOpen(true);
    };
    
    const handleRenameGroupClick = (itemName: string) => {
        setSelectedItemGroup(itemName);
        setIsRenameOpen(true);
    };

    const handleVerify = (item: InventoryItem) => {
        updateInventoryItem(item);
        toast({
            title: "Item Verified",
            description: `"${item.name}" (SN: ${item.serialNumber}) has been marked as verified.`
        });
    };

    const handleDelete = (itemId: string) => {
        batchDeleteInventoryItems([itemId]);
        toast({ variant: 'destructive', title: 'Item Deleted' });
    };

    const handleDeleteGroup = (itemName: string) => {
        const itemsToDelete = items.filter(item => item.name === itemName).map(item => item.id);
        if (itemsToDelete.length > 0) {
            batchDeleteInventoryItems(itemsToDelete);
            toast({ variant: 'destructive', title: 'Item Group Deleted', description: `All items named "${itemName}" have been deleted.` });
        }
    }
    
    const getDateStyles = (dateString?: string | null): string => {
        if (!dateString) return '';
        const date = parseISO(dateString);
        if (isPast(date)) return 'text-destructive font-bold';
        if (differenceInDays(date, new Date()) <= 30) return 'text-orange-500 font-semibold';
        return '';
    };

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return 'N/A';
        try {
            return format(new Date(dateString), 'dd-MM-yyyy');
        } catch (error) {
            return 'Invalid Date';
        }
    };
    
    const handleItemGroupSelection = (itemName: string, checked: boolean | 'indeterminate') => {
        if (!onSelectionChange || !selectedItems) return;
        const groupItems = groupedItems[itemName];
        const currentSelection = new Set(selectedItems.map(i => i.id));
        if (checked === true) {
            groupItems.forEach(item => currentSelection.add(item.id));
        } else {
            groupItems.forEach(item => currentSelection.delete(item.id));
        }
        onSelectionChange(items.filter(i => currentSelection.has(i.id)));
    };
    
    const handleRowSelection = (item: InventoryItem) => {
        if (!onSelectionChange || !selectedItems) return;
        const currentSelection = new Set(selectedItems.map(i => i.id));
        if (currentSelection.has(item.id)) {
            currentSelection.delete(item.id);
        } else {
            currentSelection.add(item.id);
        }
        onSelectionChange(items.filter(i => currentSelection.has(i.id)));
    };

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'Damaged': return 'destructive';
            case 'Expired': return 'yellow';
            case 'Quarantine': return 'quarantine';
            default: return 'secondary';
        }
    };

    if (items.length === 0) {
        return (
            <div className="flex items-center justify-center h-48 border-dashed border-2 rounded-lg">
                <p className="text-muted-foreground">No items match the current filters.</p>
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="flex flex-col h-full bg-card border rounded-lg overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
                    <div className="bg-muted/30 border-b p-1 flex items-center justify-between">
                        <ScrollArea className="flex-1 w-0">
                            <TabsList className="inline-flex h-10 p-1 bg-transparent gap-1">
                                {itemNames.map(name => (
                                    <TabsTrigger key={name} value={name} className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                        {name}
                                        <Badge variant="secondary" className="ml-2 h-5 px-1.5 min-w-[1.25rem] font-bold">{groupedItems[name].length}</Badge>
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                        
                        {user?.role === 'Admin' && activeTab && (
                            <div className="flex items-center gap-1 px-4 border-l ml-2 shrink-0">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRenameGroupClick(activeTab)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Rename Tab</p></TooltipContent>
                                </Tooltip>
                                <AlertDialog>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Delete All in "{activeTab}"</p></TooltipContent>
                                    </Tooltip>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will permanently delete all {groupedItems[activeTab]?.length || 0} items in the "{activeTab}" tab. This action cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteGroup(activeTab)} className="bg-destructive text-white">Delete All</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        )}
                    </div>

                    <ScrollArea className="flex-1 h-[500px]">
                        {itemNames.map(name => {
                            const itemList = groupedItems[name];
                            const allInGroupSelected = itemList.every(item => selectedItems?.some(sel => sel.id === item.id));
                            const someInGroupSelected = itemList.some(item => selectedItems?.some(sel => sel.id === item.id));

                            return (
                            <TabsContent key={name} value={name} className="m-0 p-0">
                                <Table className="text-xs">
                                    <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                                        <TableRow>
                                            <TableHead className="w-12 text-center">
                                                {onSelectionChange && (
                                                    <Checkbox 
                                                        checked={allInGroupSelected ? true : (someInGroupSelected ? 'indeterminate' : false)} 
                                                        onCheckedChange={(checked) => handleItemGroupSelection(name, checked)} 
                                                    />
                                                )}
                                            </TableHead>
                                            <TableHead className="w-12 text-center">Sl.</TableHead>
                                            <TableHead>Serial Number</TableHead>
                                            <TableHead>Aries ID</TableHead>
                                            {name.toLowerCase() === 'harness' && <TableHead>Chest Croll No.</TableHead>}
                                            <TableHead>Status</TableHead>
                                            <TableHead>Location</TableHead>
                                            <TableHead>Insp. Due</TableHead>
                                            <TableHead>TP Due</TableHead>
                                            <TableHead>
                                                <Button variant="ghost" size="sm" onClick={() => requestSort('lastUpdated')} className="h-6 text-[10px] font-bold p-0 uppercase">
                                                    Updated <ArrowUpDown className="ml-1 h-3 w-3" />
                                                </Button>
                                            </TableHead>
                                            <TableHead className="text-center">Certs</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {itemList.map((item, idx) => {
                                            const isExpired = (item.inspectionDueDate && isPast(parseISO(item.inspectionDueDate))) || (item.tpInspectionDueDate && isPast(parseISO(item.tpInspectionDueDate)));
                                            const displayStatus = isExpired ? 'Expired' : item.status;
                                            const damageReport = damageReports.find(dr => dr.itemId === item.id);
                                            const attachmentUrl = damageReport?.attachmentDownloadUrl || damageReport?.attachmentOriginalUrl;
                                            
                                            return (
                                            <TableRow key={item.id} className="hover:bg-muted/30">
                                                <TableCell className="text-center">
                                                    {onSelectionChange && <Checkbox checked={selectedItems?.some(sel => sel.id === item.id)} onCheckedChange={() => handleRowSelection(item)} />}
                                                </TableCell>
                                                <TableCell className="text-center text-muted-foreground font-medium">{idx + 1}</TableCell>
                                                <TableCell className="font-bold">{item.serialNumber}</TableCell>
                                                <TableCell>{item.ariesId || 'N/A'}</TableCell>
                                                {name.toLowerCase() === 'harness' && <TableCell>{item.chestCrollNo || 'N/A'}</TableCell>}
                                                <TableCell><Badge variant={getStatusVariant(displayStatus)} className="text-[10px] py-0">{displayStatus}</Badge></TableCell>
                                                <TableCell className="font-medium">{getProjectName(item)}</TableCell>
                                                <TableCell className={cn(getDateStyles(item.inspectionDueDate))}>{formatDate(item.inspectionDueDate)}</TableCell>
                                                <TableCell className={cn(getDateStyles(item.tpInspectionDueDate))}>{formatDate(item.tpInspectionDueDate)}</TableCell>
                                                <TableCell className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                    {item.lastUpdated ? formatDistanceToNow(parseISO(item.lastUpdated), { addSuffix: true }) : 'N/A'}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center justify-center gap-1">
                                                        {item.certificateUrl && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button asChild variant="ghost" size="icon" className="h-7 w-7"><a href={item.certificateUrl} target="_blank" rel="noopener noreferrer"><LinkIcon className="h-3.5 w-3.5" /></a></Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>TP Certificate</TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                        {item.inspectionCertificateUrl && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button asChild variant="ghost" size="icon" className="h-7 w-7"><a href={item.inspectionCertificateUrl} target="_blank" rel="noopener noreferrer"><CheckCircle className="h-3.5 w-3.5 text-green-600" /></a></Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Inspection Certificate</TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                        {attachmentUrl && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button asChild variant="ghost" size="icon" className="h-7 w-7"><a href={attachmentUrl} target="_blank" rel="noopener noreferrer"><Download className="h-3.5 w-3.5 text-red-500"/></a></Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Damage Report</TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            {canManage && <DropdownMenuItem onSelect={() => handleEditClick(item)}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>}
                                                            {canManage && <DropdownMenuItem onSelect={() => handleVerify(item)}><CheckCircle className="mr-2 h-4 w-4"/>Mark as Verified</DropdownMenuItem>}
                                                            <DropdownMenuItem onSelect={() => handleRequestClick(item)}><ShieldQuestion className="mr-2 h-4 w-4"/>Request Cert</DropdownMenuItem>
                                                            {user?.role === 'Admin' && (
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem></AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader><AlertDialogTitle>Delete Item?</AlertDialogTitle><AlertDialogDescription>Permanently remove SN: {item.serialNumber}?</AlertDialogDescription></AlertDialogHeader>
                                                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(item.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        )})}
                                    </TableBody>
                                </Table>
                            </TabsContent>
                        )})}
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </Tabs>
            </div>

            {selectedItem && canManage && <EditItemDialog isOpen={isEditDialogOpen} setIsOpen={setIsEditDialogOpen} item={selectedItem} />}
            {selectedItem && <NewCertificateRequestDialog isOpen={isCertRequestOpen} setIsOpen={setIsCertRequestOpen} item={selectedItem} />}
            {selectedItemGroup && <RenameItemGroupDialog isOpen={isRenameOpen} setIsOpen={setIsRenameOpen} currentItemName={selectedItemGroup} />}
        </TooltipProvider>
    );
}
