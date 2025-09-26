
'use client';
import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import type { InventoryItem } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, ShieldQuestion, Pencil } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import EditItemDialog from './EditItemDialog';
import { format, isPast, parseISO, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import RequestCertificateDialog from './RequestCertificateDialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import RenameItemGroupDialog from './RenameItemGroupDialog';

interface InventoryTableProps {
  items: InventoryItem[];
}

export default function InventoryTable({ items }: InventoryTableProps) {
    const { user, roles, deleteInventoryItem, deleteInventoryItemGroup, projects } = useAppContext();
    const { toast } = useToast();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isCertRequestOpen, setIsCertRequestOpen] = useState(false);
    const [isRenameOpen, setIsRenameOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [selectedItemGroup, setSelectedItemGroup] = useState<string | null>(null);

    const canManage = useMemo(() => {
        if (!user) return false;
        const userRole = roles.find(r => r.name === user.role);
        return userRole?.permissions.includes('manage_inventory') ?? false;
    }, [user, roles]);
    
    const getProjectName = (projectId: string) => {
        return projects.find(p => p.id === projectId)?.name || 'N/A';
    };

    const groupedItems = useMemo(() => {
        return items.reduce<Record<string, InventoryItem[]>>((acc, item) => {
            if (!acc[item.name]) {
                acc[item.name] = [];
            }
            acc[item.name].push(item);
            return acc;
        }, {});
    }, [items]);

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

    if (items.length === 0) {
        return (
            <div className="flex items-center justify-center h-48 border-dashed border-2 rounded-lg">
                <p className="text-muted-foreground">No items match the current filters.</p>
            </div>
        );
    }

    return (
        <>
            <Accordion type="multiple" className="w-full space-y-2">
                {Object.entries(groupedItems).map(([itemName, itemList]) => (
                    <AccordionItem key={itemName} value={itemName} className="border rounded-lg bg-card">
                        <div className="flex justify-between items-center p-4">
                            <AccordionTrigger className="p-0 hover:no-underline flex-1">
                                <div className="flex items-center gap-4">
                                    <h3 className="font-semibold text-lg">{itemName}</h3>
                                    <Badge variant="secondary">Total: {itemList.length}</Badge>
                                </div>
                            </AccordionTrigger>
                             {user?.role === 'Admin' && (
                                <div className="flex items-center gap-2 pl-4">
                                    <Button variant="ghost" size="sm" onClick={() => handleRenameGroupClick(itemName)}>
                                        <Pencil className="mr-2 h-4 w-4" /> Edit Name
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm">
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete Group
                                            </Button>
                                        </AlertDialogTrigger>
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
                                            <TableHead>Serial No.</TableHead>
                                            <TableHead>Aries ID</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Location</TableHead>
                                            <TableHead>Insp. Due</TableHead>
                                            <TableHead>TP Insp. Due</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {itemList.map(item => (
                                            <TableRow key={item.id}>
                                                <TableCell>{item.serialNumber}</TableCell>
                                                <TableCell>{item.ariesId || 'N/A'}</TableCell>
                                                <TableCell><Badge variant={item.status === 'Damaged' || item.status === 'Expired' ? 'destructive' : 'secondary'}>{item.status}</Badge></TableCell>
                                                <TableCell>{getProjectName(item.projectId)}</TableCell>
                                                <TableCell className={cn(getDateStyles(item.inspectionDueDate))}>{item.inspectionDueDate ? format(new Date(item.inspectionDueDate), 'dd-MM-yyyy') : 'N/A'}</TableCell>
                                                <TableCell className={cn(getDateStyles(item.tpInspectionDueDate))}>{item.tpInspectionDueDate ? format(new Date(item.tpInspectionDueDate), 'dd-MM-yyyy') : 'N/A'}</TableCell>
                                                <TableCell className="text-right">
                                                        <AlertDialog>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    {canManage && <DropdownMenuItem onSelect={() => handleEditClick(item)}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>}
                                                                    <DropdownMenuItem onSelect={() => handleRequestClick(item)}><ShieldQuestion className="mr-2 h-4 w-4"/>Request Certificate</DropdownMenuItem>
                                                                    {canManage && <AlertDialogTrigger asChild><DropdownMenuItem className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem></AlertDialogTrigger>}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the item. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(item.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
            {selectedItem && canManage && <EditItemDialog isOpen={isEditDialogOpen} setIsOpen={setIsEditDialogOpen} item={selectedItem} />}
            {selectedItem && <RequestCertificateDialog isOpen={isCertRequestOpen} setIsOpen={setIsCertRequestOpen} item={selectedItem} />}
            {selectedItemGroup && <RenameItemGroupDialog isOpen={isRenameOpen} setIsOpen={setIsRenameOpen} currentItemName={selectedItemGroup} />}
        </>
    );
}
