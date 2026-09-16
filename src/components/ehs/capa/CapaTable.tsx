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
    differenceInDays,
    isValid
} from 'date-fns';
import { cn } from '@/lib/utils';
import { 
    MoreVertical, 
    Trash2,
    Calendar,
    MapPin,
    ArrowRight,
    ExternalLink,
    Clock
} from 'lucide-react';
import type { EhsObservation } from '@/lib/types';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CapaTableProps {
    observations: EhsObservation[];
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    onOpenCockpit: (id: string) => void;
}

const riskStyles: Record<string, string> = {
    'Low': 'bg-emerald-50 text-emerald-700 border-emerald-100',
    'Medium': 'bg-amber-50 text-amber-700 border-amber-100',
    'High': 'bg-rose-50 text-rose-700 border-rose-100',
    'Critical': 'bg-rose-100 text-rose-900 border-rose-200',
};

const statusStyles: Record<string, string> = {
    'Open': 'bg-blue-50 text-blue-700 border-blue-100',
    'In Progress': 'bg-blue-600 text-white border-none',
    'Closed': 'bg-emerald-600 text-white border-none',
    'Returned': 'bg-rose-600 text-white border-none',
};

export default function CapaTable({ observations, selectedId, onSelect, onOpenCockpit }: CapaTableProps) {
    const { projects } = useGeneral();
    const { user } = useAuth();
    const { deleteObservation } = useEhs();

    return (
        <Table className="w-full border-separate border-spacing-0">
            <TableHeader className="sticky top-0 z-40 bg-slate-50/50 backdrop-blur-sm">
                <TableRow>
                    <TableHead className="w-12 px-4 border-b border-slate-200 bg-white">
                        <Checkbox />
                    </TableHead>
                    <TableHead className="w-[80px] font-black text-slate-900 border-b border-r border-slate-100 uppercase tracking-widest text-[9px] sticky left-0 z-40 bg-white">Case ID</TableHead>
                    <TableHead className="w-[400px] font-black text-slate-900 border-b border-r border-slate-100 uppercase tracking-widest text-[9px] sticky left-[80px] z-40 bg-white">Narrative Findings</TableHead>
                    <TableHead className="w-[120px] font-black text-slate-900 border-b border-r border-slate-100 uppercase tracking-widest text-[9px] text-center">Category</TableHead>
                    <TableHead className="w-[100px] font-black text-slate-900 border-b border-r border-slate-100 uppercase tracking-widest text-[9px] text-center">Risk</TableHead>
                    <TableHead className="w-[120px] font-black text-slate-900 border-b border-r border-slate-100 uppercase tracking-widest text-[9px] text-center">Status</TableHead>
                    <TableHead className="w-[120px] font-black text-slate-900 border-b border-r border-slate-100 uppercase tracking-widest text-[9px]">Site</TableHead>
                    <TableHead className="w-[130px] font-black text-slate-900 border-b border-r border-slate-100 uppercase tracking-widest text-[9px]">Initiated</TableHead>
                    <TableHead className="w-[100px] font-black text-slate-900 border-b border-r border-slate-100 uppercase tracking-widest text-[9px] text-center">Age</TableHead>
                    <TableHead className="w-[80px] text-right font-black text-slate-900 border-b uppercase tracking-widest text-[9px] sticky right-0 z-40 bg-white shadow-[-4px_0_10px_rgba(0,0,0,0.02)]">Action</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {observations.map((obs) => {
                    const project = projects.find(p => p.id === obs.projectId);
                    const isSelected = selectedId === obs.id;
                    const createdDate = parseISO(obs.createdAt);
                    const ageDays = isValid(createdDate) ? differenceInDays(new Date(), createdDate) : 0;

                    return (
                        <TableRow 
                            key={obs.id} 
                            className={cn(
                                "group cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100",
                                isSelected && "bg-blue-50/30"
                            )}
                            onClick={() => onSelect(isSelected ? null : obs.id)}
                        >
                            <TableCell className="w-12 px-4 border-r border-slate-100">
                                <Checkbox checked={isSelected} />
                            </TableCell>
                            <TableCell className="w-[80px] font-mono text-[10px] font-black text-blue-600 border-r border-slate-100 sticky left-0 z-20 group-hover:bg-slate-50 transition-colors bg-white">
                                <button 
                                    className="hover:underline flex items-center gap-1"
                                    onClick={(e) => { e.stopPropagation(); onOpenCockpit(obs.id); }}
                                >
                                    CAPA-{obs.id.slice(-3).toUpperCase()}
                                    <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            </TableCell>
                            <TableCell className="w-[400px] border-r border-slate-100 sticky left-[80px] z-20 group-hover:bg-slate-50 transition-colors bg-white">
                                <div className="space-y-0.5 pr-4">
                                    <p className="text-[11px] font-black text-slate-800 line-clamp-1 uppercase tracking-tight">
                                        {obs.description}
                                    </p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <MapPin className="h-2.5 w-2.5" /> {obs.location || 'N/A'}
                                    </p>
                                </div>
                            </TableCell>

                            <TableCell className="w-[120px] text-center border-r border-slate-100">
                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest h-5 px-2 bg-slate-50 border-slate-200 text-slate-600">
                                    {obs.category}
                                </Badge>
                            </TableCell>

                            <TableCell className="w-[100px] text-center border-r border-slate-100">
                                <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest h-5 px-3 border-2", riskStyles[obs.severity])}>
                                    {obs.severity}
                                </Badge>
                            </TableCell>

                            <TableCell className="w-[120px] text-center border-r border-slate-100">
                                <Badge className={cn("text-[9px] font-black uppercase tracking-widest h-5 px-3 rounded-sm", statusStyles[obs.status])}>
                                    {obs.status}
                                </Badge>
                            </TableCell>
                            
                            <TableCell className="w-[120px] border-r border-slate-100 text-[10px] font-bold text-slate-700 uppercase">
                                {project?.name || 'N/A'}
                            </TableCell>

                            <TableCell className="w-[130px] border-r border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                                {format(createdDate, 'dd MMM yyyy')}
                            </TableCell>
                            
                            <TableCell className="w-[100px] text-center border-r border-slate-100">
                                <div className={cn(
                                    "text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5",
                                    ageDays > 14 ? "text-rose-600" : "text-slate-600"
                                )}>
                                    <Clock className="h-3 w-3" />
                                    {ageDays} DAYS
                                </div>
                            </TableCell>

                            <TableCell className="w-[80px] text-right p-4 sticky right-0 z-20 bg-white group-hover:bg-slate-50 border-l border-slate-100 shadow-[-4px_0_10px_rgba(0,0,0,0.02)]">
                                <div className="flex items-center justify-end gap-1">
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
                                                    <AlertDialogTitle className="text-xl font-black uppercase">Delete Safety Case?</AlertDialogTitle>
                                                    <AlertDialogDescription className="text-slate-600 font-medium">
                                                        This will permanently remove <strong>CAPA-{obs.id.slice(-3).toUpperCase()}</strong> and all associated investigation logs. This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter className="gap-3">
                                                    <AlertDialogCancel className="font-bold rounded-xl h-11 px-8">Cancel</AlertDialogCancel>
                                                    <AlertDialogAction 
                                                        className="bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-xs h-11 px-10 rounded-xl shadow-lg shadow-rose-600/10"
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
