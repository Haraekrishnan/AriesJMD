
'use client';
import { useMemo } from 'react';
import type { InventoryItem } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useAppContext } from '@/contexts/app-provider';

interface InventorySummaryProps {
    items: InventoryItem[];
}

interface SummaryData {
    [itemName: string]: {
        [projectId: string]: number;
        total: number;
    };
}

export default function InventorySummary({ items }: InventorySummaryProps) {
    const { projects } = useAppContext();

    const summaryData = useMemo(() => {
        const data: SummaryData = {};
        items.forEach(item => {
            if (!data[item.name]) {
                data[item.name] = { total: 0 };
                projects.forEach(p => {
                    data[item.name][p.id] = 0;
                });
            }
            data[item.name][item.projectId] = (data[item.name][item.projectId] || 0) + 1;
            data[item.name].total += 1;
        });
        return Object.entries(data).map(([name, counts]) => ({ name, ...counts }));
    }, [items, projects]);

    if (items.length === 0) {
        return <p className="text-center py-10 text-muted-foreground">No inventory data to summarize. Try adjusting filters.</p>;
    }

    return (
        <div className="space-y-4">
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Item Name</TableHead>
                            {projects.map(p => <TableHead key={p.id} className="text-center">{p.name}</TableHead>)}
                            <TableHead className="text-center font-bold">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {summaryData.map(row => (
                            <TableRow key={row.name}>
                                <TableCell className="font-medium">{row.name}</TableCell>
                                {projects.map(p => <TableCell key={p.id} className="text-center">{row[p.id as keyof typeof row] || 0}</TableCell>)}
                                <TableCell className="text-center font-bold">{row.total}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

    