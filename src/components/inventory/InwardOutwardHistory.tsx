'use client';
import React, { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { InwardOutwardRecord } from '@/lib/types';
import { Button } from '../ui/button';
import { Edit, Trash2, Search, Lock, Unlock, ChevronDown, ChevronRight, PackageCheck } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import EditInwardOutwardDialog from './EditInwardOutwardDialog';
import FinalizeInwardDialog from './FinalizeInwardDialog';
import { Input } from '../ui/input';
import { cn } from '@/lib/utils';
import { useInwardOutward } from '@/contexts/inward-outward-provider';
import { useAuth } from '@/contexts/auth-provider';
import { useInventory } from '@/contexts/inventory-provider';
import { ScrollArea } from '../ui/scroll-area';

const formatItemNames = (itemNameString?: string): string => {
    if (!itemNameString) return 'N/A';
    const items = itemNameString.split(',').map(name => name.trim()).filter(name => name);
    if (items.length === 0) return 'N/A';

    const counts = items.reduce((acc, name) => {
        const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        acc[capitalizedName] = (acc[capitalizedName] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
        .map(([name, count]) => `${name} - ${count} nos`)
        .join(', ');
};

export default function InwardOutwardHistory({ records }: { records: InwardOutwardRecord[] }) {
    const { user, users, can } = useAuth();
    const { inventoryItems } = useInventory();
    const { deleteInwardOutwardRecord, lockInwardOutwardRecord, unlockInwardOutwardRecord } = useInwardOutward();
    const [editingRecord, setEditingRecord] = useState<InwardOutwardRecord | null>(null);
    const [finalizingRecord, setFinalizingRecord] = useState<InwardOutwardRecord | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());

    const toggleRecord = (id: string) => {
        const newSet = new Set(expandedRecords);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedRecords(newSet);
    };

    const filteredRecords = useMemo(() => {
        let sorted = [...records].sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
        
        if (!searchTerm.trim()) {
            return sorted;
        }

        const lowercasedTerm = searchTerm.toLowerCase();

        return sorted.filter(record => {
            if (String(record.itemName || '').toLowerCase().includes(lowercasedTerm) || 
                String(record.source || '').toLowerCase().includes(lowercasedTerm)) {
                return true;
            }

            // Check snapshots for outward items
            if (record.movedItemsDetails) {
                if (record.movedItemsDetails.some(it => 
                    String(it.serialNumber || '').toLowerCase().includes(lowercasedTerm) || 
                    String(it.ariesId || '').toLowerCase().includes(lowercasedTerm)
                )) return true;
            }

            // Check current items for inward items
            const itemIds = record.finalizedItemIds || (record.itemId ? [record.itemId] : []);
            return itemIds.some(id => {
                const item = inventoryItems.find(i => i.id === id);
                return String(item?.serialNumber || '').toLowerCase().includes(lowercasedTerm) || 
                       String(item?.ariesId || '').toLowerCase().includes(lowercasedTerm);
            });
        });
    }, [records, searchTerm, inventoryItems]);


    if (records.length === 0) {
        return <p className="text-center text-muted-foreground py-8">No records found.</p>;
    }

    const handleDelete = (recordId: string) => {
        deleteInwardOutwardRecord(recordId);
    };

    return (
        <>
        <div className="mb-4">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by item, source, serial no, or Aries ID..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/30">
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Item Summary</TableHead>
                        <TableHead className="text-center">Quantity</TableHead>
                        <TableHead>Source / Destination</TableHead>
                        <TableHead>User</TableHead>
                        {(can.manage_inward_outward || user?.role === 'Admin') && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredRecords.map(record => {
                        const recordUser = users.find(u => u.id === record.userId);
                        const isLocked = record.isLocked;
                        const isExpanded = expandedRecords.has(record.id);
                        
                        return (
                            <React.Fragment key={record.id}>
                                <TableRow className={cn(isExpanded && "bg-muted/10")}>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleRecord(record.id)}>
                                            {isExpanded ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
                                        </Button>
                                    </TableCell>
                                    <TableCell className="text-xs whitespace-nowrap">{format(parseISO(record.date), 'dd MMM yy, p')}</TableCell>
                                    <TableCell>
                                        <Badge variant={record.type === 'Inward' ? 'success' : 'destructive'} className="text-[10px] h-5">{record.type}</Badge>
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate text-xs font-medium">{formatItemNames(record.itemName)}</TableCell>
                                    <TableCell className="text-center font-bold">{record.quantity}</TableCell>
                                    <TableCell className="max-w-[200px] truncate text-xs">
                                        <p className="font-semibold">{record.source}</p>
                                        {record.remarks && <p className="text-[10px] text-muted-foreground italic truncate" title={record.remarks}>{record.remarks}</p>}
                                    </TableCell>
                                    <TableCell className="text-xs">{recordUser?.name || 'Unknown'}</TableCell>
                                    {(can.manage_inward_outward || user?.role === 'Admin') && (
                                        <TableCell className="text-right">
                                            <div className="flex gap-1 justify-end">
                                            {record.status === 'Pending Details' ? (
                                                <Button variant="secondary" size="sm" className="h-7 text-[10px] font-bold" onClick={() => setFinalizingRecord(record)}>
                                                FINALIZE
                                                </Button>
                                            ) : (
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingRecord(record)} disabled={isLocked && user?.role !== 'Admin'}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {isLocked ? (
                                                user?.role === 'Admin' && (
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-yellow-500"><Unlock className="h-4 w-4"/></Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader><AlertDialogTitle>Unlock Record?</AlertDialogTitle><AlertDialogDescription>This will allow the record to be edited again.</AlertDialogDescription></AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => unlockInwardOutwardRecord(record.id)}>Unlock</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                )
                                            ) : (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7"><Lock className="h-4 w-4"/></Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader><AlertDialogTitle>Lock Record?</AlertDialogTitle><AlertDialogDescription>Once locked, this record cannot be edited by regular users.</AlertDialogDescription></AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => lockInwardOutwardRecord(record.id)}>Lock</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
                                                {user?.role === 'Admin' && (
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="text-destructive h-7 w-7"><Trash2 className="h-4 w-4"/></Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                <AlertDialogDescription>This will permanently delete this record. This action cannot be undone.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDelete(record.id)}>Delete</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                )}
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                                {isExpanded && (
                                    <TableRow className="bg-muted/5">
                                        <TableCell colSpan={8} className="p-0">
                                            <div className="p-4 border-l-4 border-primary/20 bg-card">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <PackageCheck className="h-4 w-4 text-primary/60" />
                                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Transaction Item Details</h4>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {record.type === 'Outward' && record.movedItemsDetails ? (
                                                        record.movedItemsDetails.map((item, idx) => (
                                                            <div key={idx} className="p-2 rounded bg-muted/40 border border-muted text-[10px] space-y-0.5">
                                                                <p className="font-black text-slate-700 uppercase">{item.name}</p>
                                                                <p className="text-muted-foreground"><span className="font-bold">SN:</span> {item.serialNumber}</p>
                                                                {item.ariesId && <p className="text-muted-foreground"><span className="font-bold">ID:</span> {item.ariesId}</p>}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        (record.finalizedItemIds || (record.itemId ? [record.itemId] : [])).map((id, idx) => {
                                                            const item = inventoryItems.find(i => i.id === id);
                                                            return (
                                                                <div key={idx} className="p-2 rounded bg-muted/40 border border-muted text-[10px] space-y-0.5">
                                                                    <p className="font-black text-slate-700 uppercase">{item?.name || 'Deleted Item'}</p>
                                                                    <p className="text-muted-foreground"><span className="font-bold">SN:</span> {item?.serialNumber || 'N/A'}</p>
                                                                    {item?.ariesId && <p className="text-muted-foreground"><span className="font-bold">ID:</span> {item.ariesId}</p>}
                                                                </div>
                                                            )
                                                        })
                                                    )}
                                                </div>
                                                {record.remarks && (
                                                    <div className="mt-4 pt-3 border-t">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Additional Remarks</p>
                                                        <p className="text-xs text-slate-600 italic whitespace-pre-wrap">{record.remarks}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </React.Fragment>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
        {editingRecord && (
            <EditInwardOutwardDialog 
                isOpen={!!editingRecord}
                setIsOpen={() => setEditingRecord(null)}
                record={editingRecord}
            />
        )}
        {finalizingRecord && (
          <FinalizeInwardDialog
            isOpen={!!finalizingRecord}
            setIsOpen={() => setFinalizingRecord(null)}
            record={finalizingRecord}
          />
        )}
        </>
    )
}
