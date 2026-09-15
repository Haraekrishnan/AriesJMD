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
    Trash2,
    ShieldCheck
} from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useGeneral } from '@/contexts/general-provider';
import { useAuth } from '@/contexts/auth-provider';
import { useEhs } from '@/contexts/ehs-provider';
import { Checkbox } from '@/components/ui/checkbox';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface CapaTableProps {
    observations: EhsObservation[];
    selectedId: string | null;
    onSelect: (id: string | null) => void;
}

const STAGES: CapaStage[] = ['Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'];

const riskStyles: Record<string, string> = {
    'Low': 'bg-emerald-50 text-emerald-700 border-emerald-100',
    'Medium': 'bg-amber-50 text-amber-700 border-amber-100',
    'High': 'bg-rose-50 text-rose-700 border-rose-100',
    'Critical': 'bg-rose-100 text-rose-900 border-rose-200',
};

const stageStatusStyles: Record<string, string> = {
    'Pending': 'bg-slate-100 text-slate-400 border-slate-200',
    'In Progress': 'bg-blue-50 text-blue-600 border-blue-200 animate-pulse',
    'Completed': 'bg-emerald-50 text-emerald-600 border-emerald-200',
    'Returned': 'bg-rose-50 text-rose-600 border-rose-200',
};

export default function CapaTable({ observations, selectedId, onSelect }: CapaTableProps) {
    const { projects } = useGeneral();
    const { user } = useAuth();
    const { deleteObservation } = useEhs();

    return (
        <Table className="w-full border-separate border-spacing-0">
            <TableHeader className="sticky top-0 z-40 bg-slate-50/50 backdrop-blur-sm">
                <TableRow>
                    <TableHead className="w-12 px-4 border-b border-r border-slate-100 bg-white">
                        <Checkbox />
                    </TableHead>
                    <TableHead className="w-[100px] font-black text-slate-900 border-b border-r border-slate-100 uppercase tracking-widest text-[9px] sticky left-0 z-40 bg-white">Case ID</TableHead>
                    <TableHead className="w-[400px] font-black text-slate-900 border-b border-r border-slate-100 uppercase tracking-widest text-[9px] sticky left-[100px] z-40 bg-white">Narrative Findings</TableHead>
                    
                    {/* Stage Headers */}
                    {STAGES.map(stage => (
                        <TableHead key={stage} className="w-[120px] font-black text-slate-900 border-b border-r border-slate-100 uppercase tracking-widest text-[9px] text-center px-1">
                            {stage === 'Effectiveness Review' ? 'Effectiveness' : stage}
                        </TableHead>
                    ))}

                    <TableHead className="w-[100px] font-black text-slate-900 border-b border-r border-slate-100 uppercase tracking-widest text-[9px] text-center">Risk</TableHead>
                    <TableHead className="w-[100px] font-black text-slate-900 border-b border-r border-slate-100 uppercase tracking-widest text-[9px] text-center">Days Open</TableHead>
                    <TableHead className="w-[80px] text-right font-black text-slate-900 border-b uppercase tracking-widest text-[9px] sticky right-0 z-40 bg-white shadow-[-4px_0_10px_rgba(0,0,0,0.02)]">Action</TableHead>
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
                            <TableCell className="w-[100px] font-mono text-[10px] font-black text-blue-600 border-r border-slate-100 sticky left-0 z-20 group-hover:bg-slate-50 transition-colors bg-white">
                                CAPA-{obs.id.slice(-3).toUpperCase()}
                            </TableCell>
                            <TableCell className="w-[400px] border-r border-slate-100 sticky left-[100px] z-20 group-hover:bg-slate-50 transition-colors bg-white">
                                <p className="text-[11px] font-bold text-slate-700 line-clamp-1 uppercase tracking-tight">
                                    {obs.description}
                                </p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{project?.name || 'N/A'}</p>
                            </TableCell>

                            {/* Stage Data Cells */}
                            {STAGES.map(stage => {
                                const sData = obs.stages?.[stage];
                                const status = sData?.status || 'Pending';
                                return (
                                    <TableCell key={stage} className="w-[120px] text-center border-r border-slate-100">
                                        <Badge variant="outline" className={cn(
                                            "text-[8px] font-black uppercase tracking-widest h-5 px-2 border-2",
                                            stageStatusStyles[status]
                                        )}>
                                            {status === 'Pending' ? '-' : status.toUpperCase()}
                                        </Badge>
                                    </TableCell>
                                );
                            })}

                            <TableCell className="w-[100px] text-center border-r border-slate-100">
                                <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest h-6 px-3 border-2", riskStyles[obs.severity])}>
                                    {obs.severity}
                                </Badge>
                            </TableCell>
                            
                            <TableCell className="w-[100px] text-center border-r border-slate-100">
                                <span className={cn("text-[10px] font-black uppercase tracking-widest", ageDays > 10 ? "text-rose-600" : "text-slate-600")}>
                                    {ageDays} DAYS
                                </span>
                            </TableCell>

                            <TableCell className="w-[80px] text-right sticky right-0 z-20 bg-white group-hover:bg-slate-50 border-l border-slate-100 shadow-[-4px_0_10px_rgba(0,0,0,0.02)]">
                                <div className="flex items-center justify-end gap-1 px-2">
                                    {user?.role === 'Admin' && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-7 w-7 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Safety Case?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will permanently remove <strong>CAPA-{obs.id.slice(-3).toUpperCase()}</strong> and all associated investigation logs. This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction 
                                                        className="bg-rose-600 hover:bg-rose-700 text-white font-black"
                                                        onClick={() => deleteObservation(obs.id)}
                                                    >
                                                        DELETE PERMANENTLY
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}
