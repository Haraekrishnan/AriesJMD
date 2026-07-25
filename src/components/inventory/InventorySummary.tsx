
'use client';
import { useMemo } from 'react';
import type { InventoryItem, Project } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useGeneral } from '@/contexts/general-provider';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Package, MapPin, Activity } from 'lucide-react';

interface InventorySummaryProps {
    items: InventoryItem[];
}

export default function InventorySummary({ items }: InventorySummaryProps) {
    const { projects } = useGeneral();

    const categoryBreakdown = useMemo(() => {
        const data: Record<string, { [projId: string]: number; total: number }> = {};
        items.forEach(item => {
            if (!data[item.name]) {
                data[item.name] = { total: 0 };
                projects.forEach(p => { data[item.name][p.id] = 0; });
            }
            data[item.name][item.projectId] = (data[item.name][item.projectId] || 0) + 1;
            data[item.name].total += 1;
        });
        return Object.entries(data).map(([name, counts]) => ({ name, ...counts })).sort((a, b) => b.total - a.total);
    }, [items, projects]);

    const statusBreakdown = useMemo(() => {
        const counts: Record<string, number> = {};
        items.forEach(item => {
            counts[item.status] = (counts[item.status] || 0) + 1;
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    }, [items]);

    const projectBreakdown = useMemo(() => {
        const counts: Record<string, number> = {};
        items.forEach(item => {
            counts[item.projectId] = (counts[item.projectId] || 0) + 1;
        });
        return projects
            .map(p => ({ name: p.name, count: counts[p.id] || 0 }))
            .filter(p => p.count > 0)
            .sort((a, b) => b.count - a.count);
    }, [items, projects]);

    if (items.length === 0) {
        return (
            <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/5">
                <Package className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-lg font-semibold">No inventory data to summarize.</p>
                <p className="text-sm">Try adjusting your filters to see results.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Top Level Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                            <Activity className="h-4 w-4 text-primary" /> Status Breakdown
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {statusBreakdown.map(([status, count]) => (
                            <div key={status} className="flex justify-between items-center text-sm">
                                <span className="font-medium">{status}</span>
                                <Badge variant="secondary" className="font-black">{count}</Badge>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-blue-600" /> Project Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {projectBreakdown.map(p => (
                            <div key={p.name} className="flex justify-between items-center text-sm">
                                <span className="font-medium">{p.name}</span>
                                <Badge variant="outline" className="font-black">{p.count}</Badge>
                            </div>
                        ))}
                    </CardContent>
                </Card>
                
                <div className="flex flex-col justify-center items-center p-8 bg-muted/30 border rounded-lg border-dashed">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Overall Inventory Size</p>
                    <h2 className="text-6xl font-black text-primary tracking-tighter">{items.length}</h2>
                    <p className="text-xs font-bold text-muted-foreground mt-2 uppercase">Total Filtered Items</p>
                </div>
            </div>

            {/* Matrix Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        Detailed Category Matrix
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-hidden">
                    <ScrollArea className="w-full">
                        <Table className="border-collapse">
                            <TableHeader>
                                <TableRow className="bg-muted/50 hover:bg-muted/50 border-b-2">
                                    <TableHead className="font-black text-slate-800 uppercase text-[10px] tracking-widest min-w-[200px] border-r">Item Category</TableHead>
                                    {projects.map(p => {
                                        const hasItems = items.some(i => i.projectId === p.id);
                                        if (!hasItems) return null;
                                        return <TableHead key={p.id} className="text-center font-black text-slate-800 uppercase text-[10px] tracking-widest border-r">{p.name}</TableHead>
                                    })}
                                    <TableHead className="text-center font-black text-primary uppercase text-[10px] tracking-widest bg-primary/5">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {categoryBreakdown.map(row => (
                                    <TableRow key={row.name} className="hover:bg-muted/30">
                                        <TableCell className="font-bold text-sm border-r">{row.name}</TableCell>
                                        {projects.map(p => {
                                            const hasItems = items.some(i => i.projectId === p.id);
                                            if (!hasItems) return null;
                                            const count = row[p.id as keyof typeof row] || 0;
                                            return (
                                                <TableCell key={p.id} className={cn("text-center text-sm border-r", count > 0 ? "font-black" : "text-muted-foreground opacity-30")}>
                                                    {count || '-'}
                                                </TableCell>
                                            )
                                        })}
                                        <TableCell className="text-center font-black text-sm bg-primary/5">{row.total}</TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="bg-muted/80 font-black border-t-2">
                                    <TableCell className="border-r">OVERALL TOTAL</TableCell>
                                    {projects.map(p => {
                                        const hasItems = items.some(i => i.projectId === p.id);
                                        if (!hasItems) return null;
                                        const projectTotal = items.filter(i => i.projectId === p.id).length;
                                        return <TableCell key={p.id} className="text-center border-r">{projectTotal}</TableCell>
                                    })}
                                    <TableCell className="text-center bg-primary/10 text-primary text-lg">{items.length}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
