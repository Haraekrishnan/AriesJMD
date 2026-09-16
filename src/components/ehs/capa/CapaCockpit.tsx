'use client';

import React, { useState, useMemo } from 'react';
import { format, parseISO, differenceInDays, isValid } from 'date-fns';
import { 
    ChevronLeft, 
    MoreVertical, 
    MapPin, 
    User,
    Calendar,
    Link as LinkIcon,
    MessageSquare,
    ShieldCheck,
    Download,
    Split,
    ArrowUpRight,
    Trash2,
    History,
    Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { useEhs } from '@/contexts/ehs-provider';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';

import CapaLifecycleStepper from './cockpit/CapaLifecycleStepper';
import CapaWorkflowSidebar from './cockpit/CapaWorkflowSidebar';
import CapaCaseInformation from './cockpit/CapaCaseInformation';
import CapaStageWorkspace from './cockpit/CapaStageWorkspace';
import CapaActionFooter from './cockpit/CapaActionFooter';

interface CapaCockpitProps {
    observation: EhsObservation;
    onClose: () => void;
}

const riskStyles: Record<string, string> = {
    'Low': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Medium': 'bg-amber-50 text-amber-700 border-amber-200',
    'High': 'bg-rose-50 text-rose-700 border-rose-200',
    'Critical': 'bg-rose-100 text-rose-900 border-rose-300 shadow-sm animate-pulse',
};

const statusStyles: Record<string, string> = {
    'Open': 'bg-blue-50 text-blue-700 border-blue-200',
    'In Progress': 'bg-blue-600 text-white border-none',
    'Closed': 'bg-emerald-600 text-white border-none',
    'Returned': 'bg-rose-600 text-white border-none',
};

// --- Helper: Strip HTML for header display ---
const stripHtml = (html: string) => {
    if (typeof window === 'undefined') return html;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
};

export default function CapaCockpit({ observation, onClose }: CapaCockpitProps) {
    const { user, users } = useAuth();
    const { projects } = useGeneral();
    const { deleteObservation } = useEhs();
    
    const [viewingStage, setViewingStage] = useState<CapaStage>(observation.currentStage);

    const project = projects.find(p => p.id === observation.projectId);
    const reporter = users.find(u => u.id === observation.reporterId);
    const caseIdDisplay = `CAPA-26-${observation.id.slice(-3).toUpperCase()}`;

    const daysOpen = useMemo(() => {
        const created = parseISO(observation.createdAt);
        if (!isValid(created)) return 0;
        return Math.max(0, differenceInDays(new Date(), created));
    }, [observation.createdAt]);

    const sanitizedDescription = useMemo(() => stripHtml(observation.description), [observation.description]);

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#F5F8FC] overflow-hidden font-sans">
            {/* --- CASE HEADER --- */}
            <header className="shrink-0 bg-white border-b px-6 py-3 shadow-sm z-30">
                <div className="flex justify-between items-start">
                    <div className="flex gap-4 items-start min-w-0 flex-1">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={onClose} 
                            className="h-9 w-9 mt-1 rounded-lg border hover:bg-slate-50 transition-all shrink-0"
                        >
                            <ChevronLeft className="h-5 w-5 text-slate-400" />
                        </Button>
                        
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg font-black text-slate-900 uppercase">{caseIdDisplay}</span>
                                <Badge variant="outline" className={cn("h-5 px-2 text-[9px] font-black uppercase tracking-widest border-2", riskStyles[observation.severity])}>
                                    {observation.severity} RISK
                                </Badge>
                                <Badge className={cn("h-5 px-2 text-[9px] font-black uppercase tracking-widest rounded-md", statusStyles[observation.status])}>
                                    {observation.status}
                                </Badge>
                            </div>
                            <h2 className="text-sm font-bold text-slate-600 truncate max-w-2xl uppercase tracking-tight">
                                {sanitizedDescription}
                            </h2>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-blue-500" /> {project?.name || 'N/A'}</span>
                                <span className="flex items-center gap-1"><User className="h-3 w-3 text-emerald-500" /> {reporter?.name}</span>
                                <span className="flex items-center gap-1"><Calendar className="h-3 w-3 text-indigo-500" /> {format(parseISO(observation.createdAt), 'dd MMM yyyy')}</span>
                                <span className="flex items-center gap-1"><History className="h-3 w-3 text-rose-500" /> {daysOpen} Days Open</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <div className="hidden xl:block text-right mr-4 border-r pr-6 border-slate-100">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">A Safer Workplace</p>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">A Stronger Tomorrow</p>
                        </div>
                        <Button variant="outline" className="h-9 px-4 text-[10px] font-black uppercase tracking-widest gap-2 rounded-lg border-2 shadow-sm">
                            <MessageSquare className="h-3.5 w-3.5 text-blue-500" /> Add Comment
                        </Button>
                        <Button variant="outline" className="h-9 px-4 text-[10px] font-black uppercase tracking-widest gap-2 rounded-lg border-2 shadow-sm">
                            <LinkIcon className="h-3.5 w-3.5 text-indigo-500" /> Evidence
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-9 px-3 rounded-lg border-2">
                                    <MoreVertical className="h-4 w-4 text-slate-400" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 p-1">
                                <DropdownMenuItem className="font-bold text-xs uppercase tracking-tight py-2.5 rounded-md"><Split className="mr-2 h-4 w-4 text-blue-600" /> Split Case</DropdownMenuItem>
                                <DropdownMenuItem className="font-bold text-xs uppercase tracking-tight py-2.5 rounded-md"><ArrowUpRight className="mr-2 h-4 w-4 text-orange-600" /> Redirect Stage</DropdownMenuItem>
                                <DropdownMenuItem className="font-bold text-xs uppercase tracking-tight py-2.5 rounded-md"><ShieldCheck className="mr-2 h-4 w-4 text-emerald-600" /> Overtake Step</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="font-bold text-xs uppercase tracking-tight py-2.5 rounded-md"><Printer className="mr-2 h-4 w-4" /> Print Dossier</DropdownMenuItem>
                                {user?.role === 'Admin' && (
                                    <DropdownMenuItem className="text-rose-600 font-bold text-xs uppercase tracking-tight py-2.5 rounded-md" onClick={() => deleteObservation(observation.id)}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Administrative Delete
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            {/* --- LIFECYCLE STEPPER --- */}
            <div className="bg-white border-b px-6 py-2 shrink-0 z-20 overflow-x-auto no-scrollbar">
                <CapaLifecycleStepper 
                    observation={observation} 
                    viewingStage={viewingStage}
                    onStageSelect={setViewingStage}
                />
            </div>

            {/* --- COCKPIT BODY --- */}
            <div className="flex-1 flex overflow-hidden">
                {/* LEFT: WORKFLOW SIDEBAR */}
                <aside className="w-[220px] shrink-0 border-r bg-white flex flex-col z-10 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.02)]">
                    <CapaWorkflowSidebar 
                        observation={observation} 
                        viewingStage={viewingStage}
                        onStageSelect={setViewingStage}
                    />
                </aside>

                {/* CENTER: WORKSPACE */}
                <main className="flex-1 flex flex-col overflow-hidden bg-[#F5F8FC]/50">
                    <div className="flex-1 overflow-y-auto px-8 py-8">
                        <div className="w-full">
                            <CapaStageWorkspace 
                                observation={observation} 
                                stage={viewingStage} 
                            />
                        </div>
                    </div>

                    {/* BOTTOM ACTION REGION (NON-OVERLAY) */}
                    <div className="shrink-0 px-8 py-4 bg-white border-t z-20">
                         <CapaActionFooter 
                            observation={observation} 
                            stage={viewingStage} 
                         />
                    </div>
                </main>

                {/* RIGHT: CASE INTELLIGENCE */}
                <aside className="w-[300px] shrink-0 border-l bg-white flex flex-col z-10 shadow-[-4px_0_10px_-2px_rgba(0,0,0,0.02)]">
                    <CapaCaseInformation observation={observation} />
                </aside>
            </div>
        </div>
    );
}
