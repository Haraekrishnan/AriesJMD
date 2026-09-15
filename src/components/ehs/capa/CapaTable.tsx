
'use client';

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, parseISO, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Eye, ChevronRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { EhsObservation } from '@/lib/types';
import { useGeneral } from '@/contexts/general-provider';
import { useAuth } from '@/contexts/auth-provider';

interface CapaTableProps {
    observations: EhsObservation[];
    onSelect: (id: string) => void;
    onOpenCockpit: (id: string) => void;
    selectedId: string | null;
}

const severityConfig: Record<string, string> = {
    'Low': 'bg-emerald-50 text-emerald-700 border-emerald-100',
    'Medium': 'bg-blue-50 text-blue-700 border-blue-100',
    'High': 'bg-orange-50 text-orange-700 border-orange-100',
    'Critical': 'bg-rose-50 text-rose-700 border-rose-100',
};

export default function CapaTable({ observations, onSelect, onOpenCockpit, selectedId }: CapaTableProps) {
    const { projects } = useGeneral();
    const { users } = useAuth();

    if (observations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <FileText className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-sm font-bold uppercase tracking-widest">No matching safety cases found</p>
            </div>
        );
    }

    return (
        <Table>
            <TableHeader className="bg-slate-50/50 sticky top-0 z-10 border-b-2">
                <TableRow>
                    <TableHead className="w-[120px] font-black uppercase text-[10px] tracking-widest px-6">Case ID</TableHead>
                    <TableHead className="min-w-[300px] font-black uppercase text-[10px] tracking-widest px-6">Finding Narrative</TableHead>
                    <TableHead className="w-[120px] font-black uppercase text-[10px] tracking-widest text-center">Risk</TableHead>
                    <TableHead className="w-[150px] font-black uppercase text-[10px] tracking-widest">Owner</TableHead>
                    <TableHead className="w-[150px] font-black uppercase text-[10px] tracking-widest">Site</TableHead>
                    <TableHead className="w-[120px] font-black uppercase text-[10px] tracking-widest text-right px-6">Action</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {observations.map(obs => {
                    const project = projects.find(p => p.id === obs.projectId);
                    const owner = users.find(u => u.id === obs.stages[obs.currentStage]?.assigneeId);
                    const isSelected = selectedId === obs.id;
                    const daysOpen = differenceInDays(new Date(), parseISO(obs.createdAt));
                    
                    return (
                        <TableRow 
                            key={obs.id} 
                            className={cn(
                                "group transition-colors cursor-pointer",
                                isSelected ? "bg-blue-50/50" : "hover:bg-slate-50/80"
                            )}
                            onClick={() => onSelect(obs.id)}
                        >
                            <TableCell className="px-6">
                                <button 
                                    className="font-mono font-black text-[11px] text-blue-600 hover:underline uppercase tracking-tighter"
                                    onClick={(e) => { e.stopPropagation(); onOpenCockpit(obs.id); }}
                                >
                                    CAPA-{format(parseISO(obs.createdAt), 'yy')}-{obs.id.slice(-4).toUpperCase()}
                                </button>
                            </TableCell>
                            <TableCell className="px-6">
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-slate-800 line-clamp-1 uppercase">{obs.description}</p>
                                    <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                        <Badge variant="outline" className="h-4 py-0 text-[8px] font-black uppercase">{obs.category}</Badge>
                                        <span>&middot;</span>
                                        <span className={cn(daysOpen > 14 ? "text-rose-600 font-black" : "")}>
                                            {obs.status === 'Closed' ? 'CLOSED' : `OPEN · ${daysOpen} DAYS`}
                                        </span>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="text-center">
                                <Badge variant="outline" className={cn("font-black text-[9px] uppercase tracking-widest border-2", severityConfig[obs.severity])}>
                                    {obs.severity}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-5 w-5 border">
                                        <AvatarImage src={owner?.avatar} />
                                        <AvatarFallback className="text-[7px] font-black">{owner?.name?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-[10px] font-black text-slate-700 truncate uppercase">{owner?.name || 'Unassigned'}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <span className="text-[10px] font-black text-slate-500 uppercase">{project?.name || 'Unknown'}</span>
                            </TableCell>
                            <TableCell className="text-right px-6">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 rounded-full text-slate-400 group-hover:text-blue-600"
                                    onClick={(e) => { e.stopPropagation(); onOpenCockpit(obs.id); }}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}
