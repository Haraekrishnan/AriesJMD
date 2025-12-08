
'use client';
import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import type { InventoryItem } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, ShieldQuestion, Pencil, ArrowUpDown, CheckCircle, Link as LinkIcon } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import EditItemDialog from './EditItemDialog';
import { format, isPast, parseISO, differenceInDays, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import NewCertificateRequestDialog from './NewCertificateRequestDialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import RenameItemGroupDialog from './RenameItemGroupDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Checkbox } from '../ui/checkbox';
import React from 'react';

interface InventoryTableProps {
  items: InventoryItem[];
  selectedItems?: InventoryItem[];
  onSelectionChange?: (items: InventoryItem[]) => void;
}

const ItemCard = ({ item, onEdit, onRequest, onDelete, onVerify }: { item: InventoryItem; onEdit: () => void; onRequest: () => void; onDelete: () => void; onVerify: () => void; }) => {
    const { can, user, projects } = useAppContext();
    
    const getProjectName = (projectId: string) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return 'N/A';
        return item.plantUnit ? `${project.name} / ${item.plantUnit}` : project.name;
    };

    const formatDate = (dateString?: string) => dateString ? format(parseISO(dateString), 'dd-MM-yyyy') : 'N/A';

    const getDateStyles = (dateString?: string): string => {
        if (!dateString) return '';
        const date = parseISO(dateString);
        if (isPast(date)) return 'text-destructive font-bold';
        if (differenceInDays(date, new Date()) <= 30) return 'text-orange-500 font-semibold';
        return '';
    };

    const now = new Date();
    const isExpired = (item.inspectionDueDate && isPast(parseISO(item.inspectionDueDate))) || (item.tpInspectionDueDate && isPast(parseISO(item.tpInspectionDueDate)));
    const displayStatus = isExpired ? 'Expired' : item.status;
    const statusVariant = displayStatus === 'Damaged' || displayStatus === 'Expired' || displayStatus === 'Quarantine' ? 'destructive' : 'secondary';

    return (
        <div className="border-t p-4 space-y-3">
            <div className="flex justify-between items-start">
                <div className="font-bold">{item.serialNumber}</div>
                <Badge variant={statusVariant}>{displayStatus}</Badge>
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
                    <div>{getProjectName(item.projectId)}</div>
                </div>
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
                        <TooltipContent>View Certificate</TooltipContent>
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

export default function InventoryTable({ items, selectedItems, onSelectionChange }: InventoryTableProps) {
    const { user, roles, deleteInventoryItem, deleteInventoryItemGroup, projects, updateInventoryItem, can } = useAppContext();
    const { toast } = useToast();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isCertRequestOpen, setIsCertRequestOpen] = useState(false);
    const [isRenameOpen, setIsRenameOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [selectedItemGroup, setSelectedItemGroup] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: 'lastUpdated', direction: 'ascending' | 'descending' } | null>(null);


    const canManage = useMemo(() => {
        if (!user) return false;
        const userRole = roles.find(r => r.name === user.role);
        return userRole?.permissions.includes('manage_inventory') ?? false;
    }, [user, roles]);
    
    const getProjectName = (item: InventoryItem) => {
        const project = projects.find(p => p.id === item.projectId);
        if (!project) return 'N/A';
        return item.plantUnit ? `${project.name} / ${item.plantUnit}` : project.name;
    };

    const groupedItems = useMemo(() => {
        const sortedItems = [...items];
        if (sortConfig) {
            sortedItems.sort((a, b) => {
                const dateA = a.lastUpdated ? parseISO(a.lastUpdated).getTime() : 0;
                const dateB = b.lastUpdated ? parseISO(b.lastUpdated).getTime() : 0;
                if (dateA < dateB) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (dateA > dateB) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        
        return sortedItems.reduce<Record<string, InventoryItem[]>>((acc, item) => {
            if (!acc[item.name]) {
                acc[item.name] = [];
            }
            acc[item.name].push(item);
            return acc;
        }, {});
    }, [items, sortConfig]);

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
        deleteInventoryItem(itemId);
        toast({ variant: 'destructive', title: 'Item Deleted' });
    };

    const handleDeleteGroup = (itemName: string) => {
        deleteInventoryItemGroup(itemName);
        toast({ variant: 'destructive', title: 'Item Group Deleted', description: `All items named "${itemName}" have been deleted.` });
    }
    
    const getDateStyles = (dateString?: string): string => {
        if (!dateString) return '';
        const date = parseISO(dateString);
        if (isPast(date)) {
            return 'text-destructive font-bold';
        }
        if (differenceInDays(date, new Date()) <= 30) {
            return 'text-orange-500 font-semibold';
        }
        return '';
    };

    const formatDate = (dateString?: string) => {
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
        if (checked) {
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
                <Accordion type="multiple" className="w-full space-y-2">
                    {Object.entries(groupedItems).map(([itemName, itemList]) => {
                         const allInGroupSelected = itemList.every(item => selectedItems?.some(sel => sel.id === item.id));
                         const someInGroupSelected = itemList.some(item => selectedItems?.some(sel => sel.id === item.id));

                        return (
                        <AccordionItem key={itemName} value={itemName} className="border rounded-lg bg-card">
                             <div className="flex justify-between items-center p-4">
                                <div className="flex items-center gap-4 flex-1">
                                    {onSelectionChange && <Checkbox checked={allInGroupSelected ? true : (someInGroupSelected ? 'indeterminate' : false)} onCheckedChange={(checked) => handleItemGroupSelection(itemName, checked)} />}
                                    <AccordionTrigger className="p-0 hover:no-underline flex-1 text-left">
                                        <div className="flex items-center gap-4">
                                            <h3 className="font-semibold text-lg">{itemName}</h3>
                                            <Badge variant="secondary">Total: {itemList.length}</Badge>
                                        </div>
                                    </AccordionTrigger>
                                </div>
                                {user?.role === 'Admin' && (
                                    <div className="flex items-center gap-1 pl-4">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" onClick={() => handleRenameGroupClick(itemName)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>Edit Group Name</p></TooltipContent>
                                        </Tooltip>
                                        <AlertDialog>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                </TooltipTrigger>
                                                <TooltipContent><p>Delete Entire Group</p></TooltipContent>
                                            </Tooltip>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete all {itemList.length} items named "{itemName}".
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteGroup(itemName)}>Delete All</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                )}
                            </div>
                            <AccordionContent>
                                <div className="p-1 border-t">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead></TableHead>
                                                <TableHead>Serial No.</TableHead>
                                                <TableHead>Aries ID</TableHead>
                                                {itemName.toLowerCase() === 'harness' && <TableHead>Chest Croll No.</TableHead>}
                                                <TableHead>Status</TableHead>
                                                <TableHead>Location</TableHead>
                                                <TableHead>Insp. Due</TableHead>
                                                <TableHead>TP Insp. Due</TableHead>
                                                 <TableHead>
                                                    <Button variant="ghost" onClick={() => requestSort('lastUpdated')} className="px-0 hover:bg-transparent">
                                                        Last Updated
                                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                                    </Button>
                                                </TableHead>
                                                <TableHead>TP Cert.</TableHead>
                                                <TableHead>Insp. Cert.</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {itemList.map(item => {
                                                const now = new Date();
                                                const isExpired = (item.inspectionDueDate && isPast(parseISO(item.inspectionDueDate))) || (item.tpInspectionDueDate && isPast(parseISO(item.tpInspectionDueDate)));
                                                const displayStatus = isExpired ? 'Expired' : item.status;
                                                const statusVariant = displayStatus === 'Damaged' || displayStatus === 'Expired' || displayStatus === 'Quarantine' ? 'destructive' : 'secondary';
                                                return (
                                                <TableRow key={item.id}>
                                                    <TableCell>
                                                      {onSelectionChange && <Checkbox checked={selectedItems?.some(sel => sel.id === item.id)} onCheckedChange={() => handleRowSelection(item)} />}
                                                    </TableCell>
                                                    <TableCell>{item.serialNumber}</TableCell>
                                                    <TableCell>{item.ariesId || 'N/A'}</TableCell>
                                                    {itemName.toLowerCase() === 'harness' && <TableCell>{item.chestCrollNo || 'N/A'}</TableCell>}
                                                    <TableCell><Badge variant={statusVariant}>{displayStatus}</Badge></TableCell>
                                                    <TableCell>{getProjectName(item)}</TableCell>
                                                    <TableCell className={cn(getDateStyles(item.inspectionDueDate))}>{formatDate(item.inspectionDueDate)}</TableCell>
                                                    <TableCell className={cn(getDateStyles(item.tpInspectionDueDate))}>{formatDate(item.tpInspectionDueDate)}</TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {item.lastUpdated ? formatDistanceToNow(parseISO(item.lastUpdated), { addSuffix: true }) : 'N/A'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {item.certificateUrl && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button asChild variant="ghost" size="icon">
                                                                        <a href={item.certificateUrl} target="_blank" rel="noopener noreferrer"><LinkIcon className="h-4 w-4" /></a>
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>View TP Certificate</TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {item.inspectionCertificateUrl && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button asChild variant="ghost" size="icon">
                                                                        <a href={item.inspectionCertificateUrl} target="_blank" rel="noopener noreferrer"><LinkIcon className="h-4 w-4" /></a>
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>View Inspection Certificate</TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                
                                                                <AlertDialog>
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                                        <DropdownMenuContent align="end">
                                                                            {canManage && <DropdownMenuItem onSelect={() => handleEditClick(item)}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>}
                                                                            {canManage && <DropdownMenuItem onSelect={() => handleVerify(item)}><CheckCircle className="mr-2 h-4 w-4"/>Mark as Verified</DropdownMenuItem>}
                                                                            <DropdownMenuItem onSelect={() => handleRequestClick(item)}><ShieldQuestion className="mr-2 h-4 w-4"/>Request Certificate</DropdownMenuItem>
                                                                            {canManage && <AlertDialogTrigger asChild><DropdownMenuItem className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem></AlertDialogTrigger>}
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the item. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(item.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </div>
                                                    </TableCell>
                                                </TableRow>
                                            )})}
                                        </TableBody>
                                    </Table>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    )})}
                </Accordion>
            </div>

            {selectedItem && canManage && <EditItemDialog isOpen={isEditDialogOpen} setIsOpen={setIsEditDialogOpen} item={selectedItem} />}
            {selectedItem && <NewCertificateRequestDialog isOpen={isCertRequestOpen} setIsOpen={setIsCertRequestOpen} item={selectedItem} />}
            {selectedItemGroup && <RenameItemGroupDialog isOpen={isRenameOpen} setIsOpen={setIsRenameOpen} currentItemName={selectedItemGroup} />}
        </TooltipProvider>
    );
}

    