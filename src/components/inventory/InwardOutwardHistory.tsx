'use client';
import { useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { InwardOutwardRecord } from '@/lib/types';

export default function InwardOutwardHistory({ records }: { records: InwardOutwardRecord[] }) {
    const { users } = useAppContext();

    const sortedRecords = useMemo(() => {
        return [...records].sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    }, [records]);

    if (records.length === 0) {
        return <p className="text-center text-muted-foreground py-8">No records found.</p>;
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead>Source / Remarks</TableHead>
                    <TableHead>User</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sortedRecords.map(record => {
                    const user = users.find(u => u.id === record.userId);
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
                            <TableCell>{user?.name || 'Unknown'}</TableCell>
                        </TableRow>
                    )
                })}
            </TableBody>
        </Table>
    )
}
