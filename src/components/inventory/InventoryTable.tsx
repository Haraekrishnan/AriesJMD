'use client';
import { useState, useMemo, useEffect } from 'react';
import type { InventoryItem, Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash2, ShieldQuestion, Pencil, ArrowUpDown, CheckCircle, Link as LinkIcon, Download, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Badge } from '../ui/badge';
import { useAppContext } from '@/contexts/app-provider';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { format, isPast, parseISO, differenceInDays, formatDistanceToNow, isValid } from 'date-fns';
import React from 'react';
import { cn } from '@/lib/utils';
import EditItemDialog from './EditItemDialog';
import NewCertificateRequestDialog from './NewCertificateRequestDialog';
import RenameItemGroupDialog from './RenameItemGroupDialog';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { Card, CardContent } from '../ui/card';

interface InventoryTableProps {
  items: InventoryItem[];
  selectedItems?: InventoryItem[];
  onSelectionChange?: (items: InventoryItem[]) => void;
}

const ItemCard = ({ item, onEdit, onRequest, onDelete, onVerify }: { item: InventoryItem; onEdit: () => void; onRequest: () => void; onDelete: () => void; onVerify: () => void; }) => {
    const { can, user, projects } = useAppContext();
    
    const getProjectName = (item: InventoryItem) => {
        if (item.status === 'Moved to another project') {
            return item.movedToProjectId || 'N/A';
        }
        const project = projects.find(p => p.id === item.projectId);
        if (!project) return 'N/A';
        return item.plantUnit ? `${project.name} / ${item.plantUnit}` : project.name;
    };

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return 'N/A';
        try {
            return format(new Date(dateString), 'dd-MM-yyyy');
        } catch (error) {
            return 'Invalid Date';
        }
    };

    const getDateStyles = (dateString?: string) => {
        if (!dateString) return '';
        const date = parseISO(dateString);
        if (isPast(date)) return 'text-destructive font-bold';
        if (differenceInDays(date, new Date()) <= 30) return 'text-orange-500 font-semibold';
        return '';
    };

    const now = new Date();
    const isExpired = (item.inspectionDueDate && isPast(parseISO(item.inspectionDueDate))) || (item.tpInspectionDueDate && isPast(parseISO(item.tpInspectionDueDate)));
    const displayStatus = isExpired ? 'Expired' : item.status;
    
    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'Damaged': return 'destructive';
            case 'Expired': return 'yellow';
            case 'Quarantine': return 'quarantine';
            default: return 'secondary';
        }
    };


    return (
        <div className="border-t p-4 space-y-3">
            <div className="flex justify-between items-start">
                <div className="font-bold">{item.serialNumber}</div>
                <Badge variant={getStatusVariant(displayStatus)}>{displayStatus}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                    <div className="text-muted-foreground">Aries ID</div>
                    <div>{item.ariesId || 'N/A'}</div>
                </div>
                {item.chestCrollNo && (
                    <div>
                        <div className="text-muted-foreground">Chest Croll No</div>
                        <div>{item.chestCrollNo}</div>
                    </div>
                )}
                <div>
                    <div className="text-muted-foreground">Location</div>
                    <div>{getProjectName(item)}</div>
                </div>
                 {item.status === 'Moved to another project' && (
                    <div>
                        <div className="text-muted-foreground">Transfer Date</div>
                        <div>{formatDate(item.transferDate)}</div>
                    </div>
                )}
                 <div>
                    <div className="text-muted-foreground">Insp. Due</div>
                    <div className={cn(getDateStyles(item.inspectionDueDate))}>{formatDate(item.inspectionDueDate)}</div>
                </div>
                <div>
                    <div className="text-muted-foreground">TP Insp. Due</div>
                    <div className={cn(getDateStyles(item.tpInspectionDueDate))}>{formatDate(item.tpInspectionDueDate)}</div>
                </div>
                 <div>
                    <div className="text-muted-foreground">Last Updated</div>
                    <div>{item.lastUpdated ? formatDistanceToNow(parseISO(item.lastUpdated), { addSuffix: true }) : 'N/A'}</div>
                </div>
            </div>
             <div className="flex justify-end gap-2 pt-2">
                {item.certificateUrl && (
                    <Tooltip>
                        <TooltipTrigger asChild><Button asChild variant="secondary" size="icon" className="h-8 w-8"><a href={item.certificateUrl} target="_blank" rel="noopener noreferrer"><LinkIcon className="h-4 w-4" /></a></Button></TooltipTrigger>
                        <TooltipContent><p>View Certificate</p></TooltipContent>
                    </Tooltip>
                )}
                <Button variant="outline" size="sm" onClick={onRequest}><ShieldQuestion className="mr-2 h-4 w-4"/>Certificate</Button>
                {can.manage_inventory && (
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={onEdit}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                           <DropdownMenuItem onSelect={onVerify}>
                            <CheckCircle className="mr-2 h-4 w-4" /> Mark as Verified
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action will permanently delete this item.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                )}
            </div>
        </div>
    );
};

export default function InventoryTable({ items, selectedItems = [], onSelectionChange }: InventoryTableProps) {
    const { user, roles, deleteInventoryItem, deleteInventoryItemGroup, projects, updateInventoryItem, can, damageReports } = useAppContext();
    const { toast } = useToast();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isCertRequestOpen, setIsCertRequestOpen] = useState(false);
    const [isRenameOpen, setIsRenameOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [selectedItemGroup, setSelectedItemGroup] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: keyof InventoryItem, direction: 'ascending' | 'descending' } | null>({ key: 'lastUpdated', direction: 'descending' });
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const canManage = useMemo(() => user?.role === 'Admin' || can.manage_inventory, [user, can]);
    
    const toggleRow = (id: string) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const getProjectName = (item: InventoryItem) => {
        if (item.status === 'Moved to another project') return item.movedToProjectId || 'N/A';
        const project = projects.find(p => p.id === item.projectId);
        if (!project) return 'N/A';
        return item.plantUnit ? `${project.name} / ${item.plantUnit}` : project.name;
    };

    const sortedItems = useMemo(() => {
        const sortableItems = [...items];
        if (sortConfig) {
          sortableItems.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
    
            if (aValue === null || aValue === undefined) return 1;
            if (bValue === null || bValue === undefined) return -1;
            
            if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            
            return 0;
          });
        }
        return sortableItems;
    }, [items, sortConfig]);

    const requestSort = (key: keyof InventoryItem) => {
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

    const handleVerify = (item: InventoryItem) => {
        updateInventoryItem(item);
        toast({
            title: "Item Verified",
            description: `"${item.name}" (SN: ${item.serialNumber}) has been marked as verified.`
        });
    };

    const handleDelete = (itemId: string) => {
        deleteInventoryItem(itemId);
        toast({ variant: 'destructive', title: 'Item Deleted' });
    };

    const handleSelectAll = (checked: boolean | 'indeterminate') => {
        if (!onSelectionChange) return;
        onSelectionChange(checked === true ? [...items] : []);
    };

    const handleRowSelection = (item: InventoryItem, checked: boolean) => {
        if (!onSelectionChange) return;
        const currentSelection = new Set(selectedItems.map(i => i.id));
        if (checked) {
            currentSelection.add(item.id);
        } else {
            currentSelection.delete(item.id);
        }
        onSelectionChange(items.filter(i => currentSelection.has(i.id)));
    };

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'Damaged': return 'destructive';
            case 'Expired': return 'yellow';
            case 'Quarantine': return 'quarantine';
            case 'In Use': return 'success';
            case 'In Store': return 'default';
            default: return 'secondary';
        }
    };
    
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

    if (items.length === 0) {
        return (
            <div className="flex items-center justify-center h-48 border-dashed border-2 rounded-lg">
                <p className="text-muted-foreground">No items match the current filters.</p>
            </div>
        );
    }

    return (
        <TooltipProvider>
            {/* Desktop View */}
            <div className="hidden md:block">
                <ScrollArea className="h-[calc(100vh-32rem)]">
                    <Table>
                        <TableHeader className="sticky top-0 z-10 bg-card">
                            <TableRow>
                                {onSelectionChange && <TableHead className="w-12"><Checkbox checked={selectedItems.length === items.length && items.length > 0 ? true : (selectedItems.length > 0 ? 'indeterminate' : false)} onCheckedChange={handleSelectAll} /></TableHead>}
                                <TableHead className="w-8"></TableHead>
                                <TableHead>Item Name</TableHead>
                                <TableHead>Serial No.</TableHead>
                                <TableHead>Aries ID</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Insp. Due</TableHead>
                                <TableHead>TP Insp. Due</TableHead>
                                <TableHead>
                                    <Button variant="ghost" onClick={() => requestSort('lastUpdated')} className="px-0 hover:bg-transparent">
                                        Last Updated
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedItems.map(item => {
                                const isExpanded = expandedRows.has(item.id);
                                const now = new Date();
                                const isItemExpired = (item.inspectionDueDate && isPast(parseISO(item.inspectionDueDate))) || (item.tpInspectionDueDate && isPast(parseISO(item.tpInspectionDueDate)));
                                const displayStatus = isItemExpired ? 'Expired' : item.status;
                                const damageReport = damageReports.find(dr => dr.itemId === item.id);
                                const attachmentUrl = damageReport?.attachmentDownloadUrl || damageReport?.attachmentOriginalUrl || damageReport?.attachmentUrl;
                                
                                return (
                                    <React.Fragment key={item.id}>
                                        <TableRow>
                                            {onSelectionChange && <TableCell><Checkbox checked={selectedItems.some(sel => sel.id === item.id)} onCheckedChange={(checked) => handleRowSelection(item, checked === true)}/></TableCell>}
                                            <TableCell>
                                                <Button variant="ghost" size="icon" onClick={() => toggleRow(item.id)} className="h-8 w-8">
                                                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                </Button>
                                            </TableCell>
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell>{item.serialNumber}</TableCell>
                                            <TableCell>{item.ariesId || 'N/A'}</TableCell>
                                            <TableCell>{getProjectName(item)}</TableCell>
                                            <TableCell><Badge variant={getStatusVariant(displayStatus)}>{displayStatus}</Badge></TableCell>
                                            <TableCell className={cn(getDateStyles(item.inspectionDueDate))}>{formatDate(item.inspectionDueDate)}</TableCell>
                                            <TableCell className={cn(getDateStyles(item.tpInspectionDueDate))}>{formatDate(item.tpInspectionDueDate)}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{item.lastUpdated ? formatDistanceToNow(parseISO(item.lastUpdated), { addSuffix: true }) : 'N/A'}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {canManage && (
                                                        <AlertDialog>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem onSelect={() => handleEditClick(item)}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                                                    <DropdownMenuItem onSelect={() => handleRequestClick(item)}><ShieldQuestion className="mr-2 h-4 w-4"/>Request Cert</DropdownMenuItem>
                                                                    <DropdownMenuItem onSelect={() => handleVerify(item)}><CheckCircle className="mr-2 h-4 w-4"/>Mark as Verified</DropdownMenuItem>
                                                                    <AlertDialogTrigger asChild><DropdownMenuItem className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem></AlertDialogTrigger>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this item.</AlertDialogDescription></AlertDialogHeader>
                                                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(item.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        {isExpanded && (
                                            <TableRow>
                                                <TableCell colSpan={onSelectionChange ? 11 : 10}>
                                                    <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/50">
                                                        <DetailItem label="Chest Croll No." value={item.chestCrollNo} />
                                                        <DetailItem label="ERP ID" value={item.erpId} />
                                                        <DetailItem label="Certification" value={item.certification} />
                                                        <DetailItem label="Purchase Date" value={formatDate(item.purchaseDate)} />
                                                        <DetailItem label="Inspection Date" value={formatDate(item.inspectionDate)} />
                                                        <div className="col-span-full space-y-1">
                                                            <p className="text-xs text-muted-foreground">Remarks</p>
                                                            <p className="text-sm font-medium">{item.remarks || 'N/A'}</p>
                                                        </div>
                                                        <div className="col-span-full flex gap-4">
                                                            {item.certificateUrl && <Button size="sm" variant="link" asChild><a href={item.certificateUrl} target="_blank"><LinkIcon className="h-4 w-4 mr-2" /> View TP Cert.</a></Button>}
                                                            {item.inspectionCertificateUrl && <Button size="sm" variant="link" asChild><a href={item.inspectionCertificateUrl} target="_blank"><LinkIcon className="h-4 w-4 mr-2" /> View Insp. Cert.</a></Button>}
                                                            {attachmentUrl && <Button size="sm" variant="link" asChild><a href={attachmentUrl} target="_blank"><Download className="h-4 w-4 mr-2 text-red-500" /> Damage Report</a></Button>}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>
            
            {/* Mobile View */}
            <div className="md:hidden space-y-4">
                 <ScrollArea className="h-[calc(100vh-25rem)]">
                    {sortedItems.map(item => <ItemCard key={item.id} item={item} onEdit={() => handleEditClick(item)} onRequest={() => handleRequestClick(item)} onDelete={() => handleDelete(item.id)} onVerify={() => handleVerify(item)}/>)}
                 </ScrollArea>
            </div>

            {selectedItem && canManage && <EditItemDialog isOpen={isEditDialogOpen} setIsOpen={setIsEditDialogOpen} item={selectedItem} />}
            {selectedItem && <NewCertificateRequestDialog isOpen={isCertRequestOpen} setIsOpen={setIsCertRequestOpen} item={selectedItem} />}
            {selectedItemGroup && <RenameItemGroupDialog isOpen={isRenameOpen} setIsOpen={setIsRenameOpen} currentItemName={selectedItemGroup} />}
        </TooltipProvider>
    );
}
