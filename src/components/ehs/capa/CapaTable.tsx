'use client';

import React from 'react';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
    format, 
    parseISO, 
    differenceInDays 
} from 'date-fns';
import { cn } from '@/lib/utils';
import { 
    MoreVertical, 
    ChevronRight,
    Check,
} from 'lucide-react';
import type { EhsObservation } from '@/lib/types';
import { useGeneral } from '@/contexts/general-provider';
import { Checkbox } from '@/components/ui/checkbox';

interface CapaTableProps {
    observations: EhsObservation[];
    selectedId: string | null;
    onSelect: (id: string | null) => void;
}

const riskStyles: Record<string, string> = {
    'Low': 'bg-emerald-50 text-emerald-700 border-emerald-100',
    'Medium': 'bg-amber-50 text-amber-700 border-amber-100',
    'High': 'bg-rose-50 text-rose-700 border-rose-100',
    'Critical': 'bg-rose-100 text-rose-900 border-rose-200',
};

const statusStyles: Record<string, string> = {
    'Open': 'bg-blue-50 text-blue-700 border-blue-100',
    'In Progress': 'bg-blue-50 text-blue-700 border-blue-100',
    'Returned': 'bg-rose-50 text-rose-700 border-rose-100',
    'Closed': 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

const categoryStyles: Record<string, string> = {
    'Unsafe Act': 'bg-rose-50 text-rose-600 border-rose-100',
    'Unsafe Condition': 'bg-amber-50 text-amber-700 border-amber-100',
    'Safe Act': 'bg-emerald-50 text-emerald-700 border-emerald-100',
    'Near Miss': 'bg-violet-50 text-violet-700 border-violet-100',
    'Environmental': 'bg-cyan-50 text-cyan-700 border-cyan-100',
};

export default function CapaTable({ observations, selectedId, onSelect }: CapaTableProps) {
    const { projects } = useGeneral();

    return (
        <Table className="w-full border-separate border-spacing-0">
            <TableHeader className="sticky top-0 z-10 bg-slate-50/50 backdrop-blur-sm">
                <TableRow>
                    <TableHead className="w-12 px-4 border-b border-r border-slate-100">
                        <Checkbox />
                    </TableHead>
                    <TableHead className="w-32 font-black text-slate-900 border-b border-r border-slate-100 uppercase tracking-widest text-[10px] sticky left-0 z-20 bg-slate-50/50">Case ID</TableHead>
                    <TableHead className="min-w-[300px] font-black text-slate-900 border-b border-r border-slate-100 uppercase tracking-widest text-[10px] sticky left-32 z-20 bg-slate-50/50">Narrative Findings</TableHead>
                    <TableHead className="w-32 font-black text-slate-900 border-b border-r border-slate-100 uppercase tracking-widest text-[10px] text-center">Category</TableHead>
                    <TableHead className="w-24 font-black text-slate-900 border-b border-r border-slate-100 uppercase tracking-widest text-[10px] text-center">Risk</TableHead>
                    <TableHead className="w-32 font-black text-slate-900 border-b border-r border-slate-100 uppercase tracking-widest text-[10px] text-center">Status</TableHead>
                    <TableHead className="w-24 font-black text-slate-900 border-b border-r border-slate-100 uppercase tracking-widest text-[10px]">Site</TableHead>
                    <TableHead className="w-32 font-black text-slate-900 border-b border-r border-slate-100 uppercase tracking-widest text-[10px]">Initiated On</TableHead>
                    <TableHead className="w-20 font-black text-slate-900 border-b border-r border-slate-100 uppercase tracking-widest text-[10px] text-center">Days</TableHead>
                    <TableHead className="w-20 font-black text-slate-900 border-b uppercase tracking-widest text-[10px] text-center">Action</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {observations.map((obs) => {
                    const project = projects.find(p => p.id === obs.projectId);
                    const isSelected = selectedId === obs.id;
                    const createdDate = parseISO(obs.createdAt);
                    const ageDays = differenceInDays(new Date(), createdDate);

                    return (
                        <TableRow 
                            key={obs.id} 
                            className={cn(
                                "group cursor-pointer hover:bg-slate-50/80 transition-colors border-b border-slate-100",
                                isSelected && "bg-emerald-50/50"
                            )}
                            onClick={() => onSelect(isSelected ? null : obs.id)}
                        >
                            <TableCell className="w-12 px-4 border-r border-slate-100">
                                <Checkbox checked={isSelected} />
                            </TableCell>
                            <TableCell className="w-32 font-mono text-[10px] font-black text-blue-600 border-r border-slate-100 sticky left-0 z-20 group-hover:bg-slate-50 transition-colors bg-white">
                                CAPA-2026-{obs.id.slice(-3).toUpperCase()}
                            </TableCell>
                            <TableCell className="min-w-[300px] border-r border-slate-100 sticky left-32 z-20 group-hover:bg-slate-50 transition-colors bg-white">
                                <p className="text-[11px] font-bold text-slate-700 line-clamp-2 leading-tight uppercase tracking-tight">
                                    {obs.description}
                                </p>
                            </TableCell>
                            <TableCell className="w-32 text-center border-r border-slate-100">
                                <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest h-6 px-3 border-2", categoryStyles[obs.category])}>
                                    {obs.category}
                                </Badge>
                            </TableCell>
                            <TableCell className="w-24 text-center border-r border-slate-100">
                                <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest h-6 px-3 border-2", riskStyles[obs.severity])}>
                                    {obs.severity}
                                </Badge>
                            </TableCell>
                            <TableCell className="w-32 text-center border-r border-slate-100">
                                <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest h-6 px-3 border-2", statusStyles[obs.status] || 'bg-slate-100')}>
                                    {obs.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="w-24 text-[10px] font-bold text-slate-500 border-r border-slate-100 uppercase">
                                {project?.name || 'N/A'}
                            </TableCell>
                            <TableCell className="w-32 text-[10px] font-bold text-slate-500 border-r border-slate-100">
                                {format(createdDate, 'dd MMM yyyy')}
                            </TableCell>
                            <TableCell className="w-20 text-center border-r border-slate-100">
                                <span className={cn("text-[11px] font-black", ageDays > 10 ? "text-rose-600 underline" : "text-slate-900")}>
                                    {ageDays}
                                </span>
                            </TableCell>
                            <TableCell className="w-20 text-center">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}
