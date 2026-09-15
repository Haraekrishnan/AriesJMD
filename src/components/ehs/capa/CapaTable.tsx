
'use client';

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, parseISO, differenceInDays, isValid, isAfter, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { MoreVertical, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import type { EhsObservation } from '@/lib/types';
import { useGeneral } from '@/contexts/general-provider';
import { useAuth } from '@/contexts/auth-provider';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useEhs } from '@/contexts/ehs-provider';

interface CapaTableProps {
    observations: EhsObservation[];
    onSelect: (id: string) => void;
    onOpenCockpit: (id: string) => void;
    selectedId: string | null;
}

const severityConfig: Record<string, { bg: string, text: string }> = {
    'Low': { bg: 'bg-emerald-50', text: 'text-emerald-700' },
    'Medium': { bg: 'bg-amber-50', text: 'text-amber-700' },
    'High': { bg: 'bg-rose-50', text: 'text-rose-700' },
    'Critical': { bg: 'bg-rose-100', text: 'text-rose-900' },
};

export default function CapaTable({ observations, onSelect, onOpenCockpit, selectedId }: CapaTableProps) {
    const { projects } = useGeneral();
    const { users, user } = useAuth();
    const { deleteObservation } = useEhs();

    if (observations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <p className="text-sm font-bold uppercase tracking-widest">No matching cases found</p>
            </div>
        );
    }

    return (
        <Table className="border-separate border-spacing-0">
            <TableHeader className="bg-slate-50/80 sticky top-0 z-10 border-b-2">
                <TableRow>
                    <TableHead className="w-[50px] border-r border-slate-100 p-0 text-center"><div className="w-5 h-5 border rounded mx-auto"/></TableHead>
                    <TableHead className="w-[120px] sticky left-0 z-20 bg-slate-50 font-black uppercase text-[9px] tracking-widest px-4 border-r">Case ID</TableHead>
                    <TableHead className="min-w-[300px] sticky left-[120px] z-20 bg-slate-50 font-black uppercase text-[9px] tracking-widest px-4 border-r">Narrative Findings</TableHead>
                    <TableHead className="w-[120px] font-black uppercase text-[9px] tracking-widest text-center border-r">Category</TableHead>
                    <TableHead className="w-[80px] font-black uppercase text-[9px] tracking-widest text-center border-r">Risk</TableHead>
                    <TableHead className="w-[100px] font-black uppercase text-[9px] tracking-widest text-center border-r">Status</TableHead>
                    <TableHead className="w-[120px] font-black uppercase text-[9px] tracking-widest border-r">Site</TableHead>
                    <TableHead className="w-[120px] font-black uppercase text-[9px] tracking-widest border-r">Initiated On</TableHead>
                    <TableHead className="w-[60px] font-black uppercase text-[9px] tracking-widest text-center border-r">Days</TableHead>
                    <TableHead className="w-[60px] font-black uppercase text-[9px] tracking-widest text-right px-4">Action</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {observations.map(obs => {
                    const project = projects.find(p => p.id === obs.projectId);
                    const isSelected = selectedId === obs.id;
                    const daysOpen = differenceInDays(new Date(), parseISO(obs.createdAt));
                    const isOverdue = obs.status !== 'Closed' && obs.targetDate && isAfter(new Date(), endOfDay(parseISO(obs.targetDate)));
                    
                    return (
                        <TableRow 
                            key={obs.id} 
                            className={cn(
                                "group transition-colors cursor-pointer border-b",
                                isSelected ? "bg-blue-50/50" : "hover:bg-slate-50/30"
                            )}
                            onClick={() => onSelect(obs.id)}
                        >
                            <TableCell className="border-r border-slate-100 p-0 text-center">
                                <div className="w-5 h-5 border rounded mx-auto"/>
                            </TableCell>
                            <TableCell className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-r px-4">
                                <button 
                                    className="font-mono font-black text-[10px] text-blue-600 hover:underline uppercase"
                                    onClick={(e) => { e.stopPropagation(); onOpenCockpit(obs.id); }}
                                >
                                    CAPA-{format(parseISO(obs.createdAt), 'yyyy')}-{obs.id.slice(-3).toUpperCase()}
                                </button>
                            </TableCell>
                            <TableCell className="sticky left-[120px] z-10 bg-white group-hover:bg-slate-50 border-r px-4 py-4">
                                <p className="text-[11px] font-bold text-slate-800 line-clamp-1 uppercase leading-tight">
                                    {obs.description}
                                </p>
                            </TableCell>
                            <TableCell className="border-r border-slate-100 text-center px-2">
                                <Badge variant="outline" className="h-5 rounded-md bg-rose-50 text-rose-600 border-rose-100 font-black text-[8px] uppercase tracking-tighter">
                                    {obs.category}
                                </Badge>
                            </TableCell>
                            <TableCell className="border-r border-slate-100 text-center px-2">
                                <Badge variant="outline" className={cn("h-5 rounded-md font-black text-[8px] uppercase tracking-tighter", severityConfig[obs.severity]?.bg, severityConfig[obs.severity]?.text)}>
                                    {obs.severity}
                                </Badge>
                            </TableCell>
                            <TableCell className="border-r border-slate-100 text-center px-2">
                                <Badge className={cn(
                                    "h-5 rounded-md font-black text-[8px] uppercase tracking-tighter border-none",
                                    obs.status === 'Closed' ? "bg-emerald-500" : "bg-blue-600"
                                )}>
                                    {obs.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="border-r border-slate-100 px-4 text-[10px] font-bold text-slate-600 uppercase">
                                {project?.name || 'N/A'}
                            </TableCell>
                            <TableCell className="border-r border-slate-100 px-4 text-[10px] font-bold text-slate-500">
                                {format(parseISO(obs.createdAt), 'dd MMM yyyy')}
                            </TableCell>
                            <TableCell className={cn("border-r border-slate-100 text-center font-black text-[10px]", daysOpen > 10 ? "text-rose-600" : "text-slate-900")}>
                                {daysOpen}
                            </TableCell>
                            <TableCell className="text-right px-4">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => onOpenCockpit(obs.id)}>Open Cockpit</DropdownMenuItem>
                                        {user?.role === 'Admin' && (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-rose-600">Delete Case</DropdownMenuItem>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Permanent Deletion</AlertDialogTitle>
                                                        <AlertDialogDescription>This will purge this safety case from the master registry.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => deleteObservation(obs.id)} className="bg-rose-600">Purge Record</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}
