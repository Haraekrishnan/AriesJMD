'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { RequestListItem } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Button } from '../ui/button';
import { Eye, Paperclip, Trash2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';

interface RequestListTableProps {
    data: RequestListItem[];
}

export default function RequestListTable({ data }: RequestListTableProps) {
    if (data.length === 0) {
        return <p className="text-muted-foreground text-center py-8">No requests found.</p>;
    }
    
    const getStatusVariant = (status: string) => {
        const lowerStatus = status.toLowerCase();
        if (lowerStatus.includes('complete') || lowerStatus.includes('full delivery')) return 'success';
        if (lowerStatus.includes('process')) return 'warning';
        if (lowerStatus.includes('advance')) return 'destructive';
        return 'default';
    };

    return (
        <div className="border rounded-lg overflow-hidden">
            <ScrollArea className="h-[calc(100vh-40rem)]">
                <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                            <TableHead className="w-12">SNO</TableHead>
                            <TableHead>Request No</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Next Action</TableHead>
                            <TableHead>Request On</TableHead>
                            <TableHead>Delivery Date</TableHead>
                            <TableHead>Added By</TableHead>
                            <TableHead>Done By</TableHead>
                            <TableHead>To be Done By</TableHead>
                            <TableHead>Requested By</TableHead>
                            <TableHead>Requirement</TableHead>
                            <TableHead>Job No</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Sub Div</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((item, index) => (
                            <TableRow key={item.id}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>{item.requestNo}</TableCell>
                                <TableCell><Badge variant={getStatusVariant(item.status)}>{item.status}</Badge></TableCell>
                                <TableCell>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-4 w-4"/></Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7"><Paperclip className="h-4 w-4"/></Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-4 w-4"/></Button>
                                    </div>
                                </TableCell>
                                <TableCell>{format(parseISO(item.requestOn), 'yyyy-MM-dd')}</TableCell>
                                <TableCell>{format(parseISO(item.deliveryDate), 'yyyy-MM-dd')}</TableCell>
                                <TableCell>{item.addedBy}</TableCell>
                                <TableCell>{item.doneBy || 'N/A'}</TableCell>
                                <TableCell>{item.toBeDoneBy}</TableCell>
                                <TableCell>{item.requestedBy}</TableCell>
                                <TableCell className="max-w-xs truncate">{item.requirement}</TableCell>
                                <TableCell>{item.jobNo || 'N/A'}</TableCell>
                                <TableCell>{item.category || 'N/A'}</TableCell>
                                <TableCell>{item.subDivision || 'N/A'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
    );
}
