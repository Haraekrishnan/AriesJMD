

'use client';
import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { InwardOutwardRecord } from '@/lib/types';
import { Button } from '../ui/button';
import { Edit, Trash2, Search, Lock, Unlock } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import EditInwardOutwardDialog from './EditInwardOutwardDialog';
import FinalizeInwardDialog from './FinalizeInwardDialog';
import { Input } from '../ui/input';
import { cn } from '@/lib/utils';
import { useInwardOutward } from '@/contexts/inward-outward-provider';

export default function InwardOutwardHistory({ records }: { records: InwardOutwardRecord[] }) {
    const { user, users, can, inventoryItems } = useAppContext();
    const { deleteInwardOutwardRecord, lockInwardOutwardRecord, unlockInwardOutwardRecord } = useInwardOutward();
    const [editingRecord, setEditingRecord] = useState<InwardOutwardRecord | null>(null);
    const [finalizingRecord, setFinalizingRecord] = useState<InwardOutwardRecord | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredRecords = useMemo(() => {
        let sorted = [...records].sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
        
        if (!searchTerm.trim()) {
            return sorted;
        }

        const lowercasedTerm = searchTerm.toLowerCase();

        return sorted.filter(record => {
            if (record.itemName?.toLowerCase().includes(lowercasedTerm) || record.source?.toLowerCase().includes(lowercasedTerm)) {
                return true;
            }

            const itemIds = record.finalizedItemIds || (record.itemId ? [record.itemId] : []);
            return itemIds.some(id => {
                const item = inventoryItems.find(i => i.id === id);
                return item?.serialNumber?.toLowerCase().includes(lowercasedTerm) || item?.ariesId?.toLowerCase().includes(lowercasedTerm);
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
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead>Source / Remarks</TableHead>
                    <TableHead>User</TableHead>
                    {(can.manage_inward_outward || user?.role === 'Admin') && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
                {filteredRecords.map(record => {
                    const recordUser = users.find(u => u.id === record.userId);
                    const isLocked = record.isLocked;
                    return (
                        <TableRow key={record.id}>
                            <TableCell>{format(parseISO(record.date), 'dd MMM yyyy, p')}</TableCell>
                            <TableCell>
                                <Badge variant={record.type === 'Inward' ? 'success' : 'destructive'}>{record.type}</Badge>
                            </TableCell>
                            <TableCell>{record.itemName}</TableCell>
                            <TableCell className="text-center">{record.quantity}</TableCell>
                            <TableCell>
                                <p>{record.source}</p>
                                {record.remarks && <p className="text-xs text-muted-foreground">{record.remarks}</p>}
                            </TableCell>
                            <TableCell>{recordUser?.name || 'Unknown'}</TableCell>
                             {(can.manage_inward_outward || user?.role === 'Admin') && (
                                <TableCell className="text-right">
                                    <div className="flex gap-1 justify-end">
                                      {record.status === 'Pending Details' ? (
                                        <Button variant="secondary" size="sm" onClick={() => setFinalizingRecord(record)}>
                                          Finalize
                                        </Button>
                                      ) : (
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingRecord(record)} disabled={isLocked && user?.role !== 'Admin'}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                      )}
                                      {isLocked ? (
                                        user?.role === 'Admin' && (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-yellow-500"><Unlock className="h-4 w-4"/></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitle>Unlock Record?</AlertDialogTitle><AlertDialogDescription>This will allow the record to be edited again.</AlertDialogDescription></AlertDialogHeader>
                                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => unlockInwardOutwardRecord(record.id)}>Unlock</AlertDialogAction></AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )
                                      ) : (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8"><Lock className="h-4 w-4"/></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitle>Lock Record?</AlertDialogTitle><AlertDialogDescription>Once locked, this record cannot be edited by regular users.</AlertDialogDescription></AlertDialogHeader>
                                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => lockInwardOutwardRecord(record.id)}>Lock</AlertDialogAction></AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                      )}
                                        {user?.role === 'Admin' && (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive h-8 w-8"><Trash2 className="h-4 w-4"/></Button>
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
                    )
                })}
            </TableBody>
        </Table>
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
