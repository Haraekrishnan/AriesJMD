
'use client';
import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';

export default function ConsumableIssueList() {
    const { internalRequests, users } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');

    const issuedItems = useMemo(() => {
        const items: any[] = [];
        internalRequests.forEach(req => {
            if (req.items) {
                const requester = users.find(u => u.id === req.requesterId);
                req.items.forEach(item => {
                    if (item.status === 'Issued') {
                        items.push({
                            ...item,
                            requesterName: requester?.name || 'Unknown',
                            requestDate: req.date,
                            approvalDate: req.approvalDate,
                            issuedDate: (item as any).issuedDate, // Cast to any to access potentially missing property
                        });
                    }
                });
            }
        });
         return items.sort((a, b) => {
            const dateA = a.issuedDate ? parseISO(a.issuedDate).getTime() : 0;
            const dateB = b.issuedDate ? parseISO(b.issuedDate).getTime() : 0;
            return dateB - dateA;
        });
    }, [internalRequests, users]);

    const filteredItems = useMemo(() => {
        if (!searchTerm) return issuedItems;
        const lowercasedTerm = searchTerm.toLowerCase();
        return issuedItems.filter(item => 
            item.description.toLowerCase().includes(lowercasedTerm) ||
            item.requesterName.toLowerCase().includes(lowercasedTerm)
        );
    }, [issuedItems, searchTerm]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Issued Consumables History</CardTitle>
                <CardDescription>A log of all consumable items that have been issued from the store.</CardDescription>
                <div className="pt-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by item or requester name..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Item Name</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead>Requester</TableHead>
                            <TableHead>Issued Date</TableHead>
                            <TableHead>Remarks</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredItems.map(item => {
                            const issuedDate = item.issuedDate ? parseISO(item.issuedDate) : null;
                            return (
                                <TableRow key={`${item.id}-${item.requestDate}`}>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell>{item.unit}</TableCell>
                                    <TableCell>{item.requesterName}</TableCell>
                                    <TableCell>{issuedDate && isValid(issuedDate) ? format(issuedDate, 'dd MMM, yyyy') : 'N/A'}</TableCell>
                                    <TableCell>{item.remarks}</TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
                {filteredItems.length === 0 && <p className="text-center text-muted-foreground py-4">No issued items found for the current search.</p>}
            </CardContent>
        </Card>
    );
}
