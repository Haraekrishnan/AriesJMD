'use client';
import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { InwardOutwardRecord } from '@/lib/types';
import { Button } from '../ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import EditInwardOutwardDialog from './EditInwardOutwardDialog';

export default function InwardOutwardHistory({ records }: { records: InwardOutwardRecord[] }) {
    const { user, users, can, deleteInwardOutwardRecord } = useAppContext();
    const [editingRecord, setEditingRecord] = useState<InwardOutwardRecord | null>(null);

    const sortedRecords = useMemo(() => {
        return [...records].sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    }, [records]);

    if (records.length === 0) {
        return <p className="text-center text-muted-foreground py-8">No records found.</p>;
    }

    const handleDelete = (recordId: string) => {
        deleteInwardOutwardRecord(recordId);
    };

    return (
        <>
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
                {sortedRecords.map(record => {
                    const recordUser = users.find(u => u.id === record.userId);
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
                                    <div className="flex gap-2 justify-end">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingRecord(record)} disabled={!can.manage_inward_outward}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        {user?.role === 'Admin' && (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive h-8 w-8"><Trash2 className="h-4 w-4"/></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>This will permanently delete this record. This cannot be undone.</AlertDialogDescription>
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
        </>
    )
}
