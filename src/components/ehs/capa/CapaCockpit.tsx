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
    Printer,
    Hammer,
    ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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

// Helper: Strip HTML and images for header display
const stripHtml = (html: string) => {
    if (!html) return '';
    try {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    } catch (e) {
        return html;
    }
};

export default function CapaCockpit({ observation, onClose }: CapaCockpitProps) {
    const { user, users } = useAuth();
    const { projects } = useGeneral();
    const { deleteObservation } = useEhs();
    
    const [viewingStage, setViewingStage] = useState<CapaStage>(observation.currentStage);

    const project = projects.find(p => p.id === observation.projectId);
    const reporter = users.find(u => u.id === observation.reporterId);
    const caseIdDisplay = `CAPA-26-${observation.id.slice(-5).toUpperCase()}`;

    const daysOpen = useMemo(() => {
        const created = parseISO(observation.createdAt);
        if (!isValid(created)) return 0;
        return Math.max(0, differenceInDays(new Date(), created));
    }, [observation.createdAt]);

    const sanitizedDescription = useMemo(() => stripHtml(observation.description), [observation.description]);

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#F3F7FB] overflow-hidden font-sans">
            {/* --- COMPACT ENTERPRISE HEADER --- */}
            <header className="shrink-0 bg-white border-b px-8 h-[80px] flex items-center justify-between shadow-sm z-30">
                <div className="flex gap-6 items-center min-w-0 flex-1">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={onClose} 
                        className="h-10 w-10 rounded-lg border hover:bg-slate-50 transition-all shrink-0"
                    >
                        <ChevronLeft className="h-5 w-5 text-slate-400" />
                    </Button>
                    
                    <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                            <span className="text-xl font-black text-slate-900 uppercase tracking-tight">{caseIdDisplay}</span>
                            <Badge variant="outline" className={cn("h-6 px-3 text-[10px] font-black uppercase tracking-widest border-2", riskStyles[observation.severity])}>
                                {observation.severity} RISK
                            </Badge>
                            <Badge className={cn("h-6 px-3 text-[10px] font-black uppercase tracking-widest rounded-md", statusStyles[observation.status])}>
                                {observation.status}
                            </Badge>
                        </div>
                        <h2 className="text-sm font-bold text-slate-600 truncate max-w-3xl uppercase tracking-tight leading-none">
                            {sanitizedDescription}
                        </h2>
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 pt-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3 text-blue-500" /> {project?.name || 'N/A'}</span>
                            <span className="flex items-center gap-1.5"><User className="h-3 w-3 text-emerald-500" /> Reported by {reporter?.name}</span>
                            <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3 text-indigo-500" /> {format(parseISO(observation.createdAt), 'dd MMM yyyy')}</span>
                            <span className="flex items-center gap-1.5 text-slate-600"><History className="h-3 w-3 text-rose-500" /> {daysOpen} Days Open</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <Button variant="outline" className="h-10 px-5 text-[11px] font-black uppercase tracking-widest gap-2 rounded-lg border-2 shadow-sm hover:bg-slate-50">
                        <MessageSquare className="h-4 w-4 text-blue-500" /> Add Comment
                    </Button>
                    <Button variant="outline" className="h-10 px-5 text-[11px] font-black uppercase tracking-widest gap-2 rounded-lg border-2 shadow-sm hover:bg-slate-50">
                        <LinkIcon className="h-4 w-4 text-indigo-500" /> Evidence
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="h-10 px-3 rounded-lg border-2 hover:bg-slate-50">
                                <MoreVertical className="h-5 w-5 text-slate-400" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 p-1">
                            <DropdownMenuItem className="font-bold text-xs uppercase tracking-tight py-3 rounded-md cursor-pointer"><Split className="mr-2 h-4 w-4 text-blue-600" /> Split Case</DropdownMenuItem>
                            <DropdownMenuItem className="font-bold text-xs uppercase tracking-tight py-3 rounded-md cursor-pointer"><ArrowUpRight className="mr-2 h-4 w-4 text-orange-600" /> Redirect Stage</DropdownMenuItem>
                            <DropdownMenuItem className="font-bold text-xs uppercase tracking-tight py-3 rounded-md cursor-pointer"><ShieldCheck className="mr-2 h-4 w-4 text-emerald-600" /> Overtake Step</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="font-bold text-xs uppercase tracking-tight py-3 rounded-md cursor-pointer"><Printer className="mr-2 h-4 w-4" /> Print Dossier</DropdownMenuItem>
                            {user?.role === 'Admin' && (
                                <DropdownMenuItem className="text-rose-600 font-bold text-xs uppercase tracking-tight py-3 rounded-md cursor-pointer" onClick={() => deleteObservation(observation.id)}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Administrative Delete
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            {/* --- PROMINENT LIFECYCLE STEPPER --- */}
            <div className="bg-white border-b px-8 h-[80px] flex items-center shrink-0 z-20">
                <CapaLifecycleStepper 
                    observation={observation} 
                    viewingStage={viewingStage}
                    onStageSelect={setViewingStage}
                />
            </div>

            {/* --- THREE-COLUMN TECHNICAL WORKSPACE --- */}
            <div className="flex-1 flex overflow-hidden">
                {/* LEFT: WORKFLOW NAVIGATOR */}
                <aside className="w-[220px] shrink-0 border-r bg-[#F8FAFC] flex flex-col z-10">
                    <CapaWorkflowSidebar 
                        observation={observation} 
                        viewingStage={viewingStage}
                        onStageSelect={setViewingStage}
                    />
                </aside>

                {/* CENTER: DOMINANT WORKSPACE */}
                <main className="flex-1 flex flex-col overflow-hidden">
                    <ScrollArea className="flex-1 bg-[#F5F8FC]/50">
                        <div className="p-10">
                            <CapaStageWorkspace 
                                observation={observation} 
                                stage={viewingStage} 
                            />
                        </div>
                    </ScrollArea>

                    {/* INTEGRATED ACTION FOOTER */}
                    <footer className="shrink-0 bg-white border-t px-10 h-[80px] flex items-center z-20">
                         <CapaActionFooter 
                            observation={observation} 
                            stage={viewingStage} 
                         />
                    </footer>
                </main>

                {/* RIGHT: INTELLIGENCE SIDEBAR */}
                <aside className="w-[300px] shrink-0 border-l bg-white flex flex-col z-10 shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
                    <CapaCaseInformation observation={observation} />
                </aside>
            </div>
        </div>
    );
}