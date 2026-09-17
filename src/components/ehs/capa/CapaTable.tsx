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
    MapPin,
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
    'Open': 'bg-blue-50 text-blue-700 border-blue-200',
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
            <TableHeader className="sticky top-0 z-40 bg-white">
                <TableRow className="hover:bg-transparent border-b-2 border-slate-100">
                    <TableHead className="w-12 px-6 border-b border-slate-200">
                        <Checkbox />
                    </TableHead>
                    <TableHead className="w-[100px] font-black text-slate-900 border-b uppercase tracking-widest text-[9px] h-14">CASE ID</TableHead>
                    <TableHead className="min-w-[400px] font-black text-slate-900 border-b uppercase tracking-widest text-[9px] h-14">NARRATIVE FINDINGS</TableHead>
                    <TableHead className="w-[120px] font-black text-slate-900 border-b text-center uppercase tracking-widest text-[9px] h-14">CATEGORY</TableHead>
                    <TableHead className="w-[100px] font-black text-slate-900 border-b text-center uppercase tracking-widest text-[9px] h-14">RISK</TableHead>
                    <TableHead className="w-[120px] font-black text-slate-900 border-b text-center uppercase tracking-widest text-[9px] h-14">STATUS</TableHead>
                    <TableHead className="w-[120px] font-black text-slate-900 border-b uppercase tracking-widest text-[9px] h-14">SITE</TableHead>
                    <TableHead className="w-[130px] font-black text-slate-900 border-b uppercase tracking-widest text-[9px] h-14">INITIATED</TableHead>
                    <TableHead className="w-[100px] font-black text-slate-900 border-b text-center uppercase tracking-widest text-[9px] h-14">AGE</TableHead>
                    <TableHead className="w-[80px] text-right font-black text-slate-900 border-b uppercase tracking-widest text-[9px] px-6 h-14">ACTION</TableHead>
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
                                "group cursor-pointer hover:bg-blue-50/20 transition-colors border-b border-slate-50",
                                isSelected && "bg-blue-50/30"
                            )}
                            onClick={() => onSelect(isSelected ? null : obs.id)}
                        >
                            <TableCell className="px-6 py-5">
                                <Checkbox checked={isSelected} />
                            </TableCell>
                            <TableCell className="font-mono text-[10px] font-black text-blue-600">
                                <button 
                                    className="hover:underline flex flex-col items-start leading-tight"
                                    onClick={(e) => { e.stopPropagation(); onOpenCockpit(obs.id); }}
                                >
                                    <span>CAPA-</span>
                                    <span>{obs.id.slice(-3).toUpperCase()}</span>
                                </button>
                            </TableCell>
                            <TableCell className="py-5">
                                <div className="space-y-1">
                                    <p className="text-[12px] font-bold text-slate-800 line-clamp-1 uppercase tracking-tight">
                                        {obs.description}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <div className="bg-slate-100 p-1 rounded-sm"><MapPin className="h-2.5 w-2.5 text-slate-400" /></div>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{obs.location || 'SITE POSITION TBD'}</span>
                                    </div>
                                </div>
                            </TableCell>

                            <TableCell className="text-center">
                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest h-6 px-3 rounded-full bg-slate-50 border-slate-200 text-slate-600">
                                    {obs.category}
                                </Badge>
                            </TableCell>

                            <TableCell className="text-center">
                                <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest h-6 px-4 border-2 rounded-lg", riskStyles[obs.severity])}>
                                    {obs.severity}
                                </Badge>
                            </TableCell>

                            <TableCell className="text-center">
                                <Badge className={cn("text-[9px] font-black uppercase tracking-widest h-6 px-4 rounded border", statusStyles[obs.status])}>
                                    {obs.status}
                                </Badge>
                            </TableCell>
                            
                            <TableCell className="text-[10px] font-black text-slate-900 uppercase">
                                {project?.name || 'N/A'}
                            </TableCell>

                            <TableCell className="text-[10px] font-bold text-slate-500 uppercase">
                                <div className="flex flex-col">
                                    <span className="text-slate-900">{format(createdDate, 'dd MMM')}</span>
                                    <span>{format(createdDate, 'yyyy')}</span>
                                </div>
                            </TableCell>
                            
                            <TableCell className="text-center">
                                <div className={cn(
                                    "text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5",
                                    ageDays > 14 ? "text-rose-600" : "text-slate-600"
                                )}>
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>{ageDays} DAYS</span>
                                </div>
                            </TableCell>

                            <TableCell className="text-right px-6">
                                <div className="flex items-center justify-end gap-2">
                                    {user?.role === 'Admin' && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-rose-600 hover:bg-rose-50"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle className="text-xl font-black uppercase tracking-tight">DELETE SAFETY CASE?</AlertDialogTitle>
                                                    <AlertDialogDescription className="text-slate-500 font-medium">
                                                        This action wipes all technical data for Case <strong>CAPA-{obs.id.slice(-3).toUpperCase()}</strong>.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter className="gap-3">
                                                    <AlertDialogCancel className="font-bold rounded-xl h-12 px-8">CANCEL</AlertDialogCancel>
                                                    <AlertDialogAction 
                                                        className="bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px] h-12 px-10 rounded-xl"
                                                        onClick={() => deleteObservation(obs.id)}
                                                    >
                                                        DELETE PERMANENTLY
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
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
