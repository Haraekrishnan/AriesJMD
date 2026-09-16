'use client';

import React, { useState, useMemo } from 'react';
import { format, parseISO, differenceInDays, isValid } from 'date-fns';
import { 
    ChevronLeft, 
    ShieldCheck, 
    Download, 
    MoreVertical, 
    Clock, 
    MapPin, 
    User,
    Calendar,
    Edit,
    PlusCircle,
    ArrowUpRight,
    Split,
    Trash2,
    Link as LinkIcon,
    AlertTriangle,
    Zap,
    History,
    MessageSquare,
    Eye,
    Shield,
    GitBranch,
    ClipboardCheck,
    Activity,
    Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { EhsObservation, CapaStage, Role } from '@/lib/types';
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

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

export default function CapaCockpit({ observation, onClose }: CapaCockpitProps) {
    const { user, users } = useAuth();
    const { projects } = useGeneral();
    const { deleteObservation } = useEhs();
    
    // UI state for which stage we are VIEWING in the cockpit
    const [viewingStage, setViewingStage] = useState<CapaStage>(observation.currentStage);

    const project = projects.find(p => p.id === observation.projectId);
    const reporter = users.find(u => u.id === observation.reporterId);
    const caseIdDisplay = `CAPA-26-${observation.id.slice(-3).toUpperCase()}`;

    const daysOpen = useMemo(() => {
        const created = parseISO(observation.createdAt);
        if (!isValid(created)) return 0;
        return Math.max(0, differenceInDays(new Date(), created));
    }, [observation.createdAt]);

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#F5F8FC] animate-in fade-in zoom-in-95 duration-300 overflow-hidden font-sans">
            {/* --- TOP CASE HEADER --- */}
            <header className="h-auto shrink-0 bg-white border-b px-8 py-4 shadow-sm z-30">
                <div className="flex justify-between items-start">
                    <div className="flex gap-4 items-start">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={onClose} 
                            className="h-10 w-10 mt-1 rounded-xl hover:bg-slate-50 border-2 border-transparent hover:border-slate-100 transition-all shrink-0"
                        >
                            <ChevronLeft className="h-6 w-6 text-slate-400" />
                        </Button>
                        
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{caseIdDisplay}</h1>
                                <Badge variant="outline" className={cn("h-6 px-3 font-black uppercase text-[10px] tracking-widest border-2", riskStyles[observation.severity])}>
                                    {observation.severity} RISK
                                </Badge>
                                <Badge className={cn("h-6 px-3 font-black uppercase text-[10px] tracking-widest rounded-md", statusStyles[observation.status])}>
                                    {observation.status}
                                </Badge>
                            </div>
                            <h2 className="text-base font-bold text-slate-600 tracking-tight leading-snug max-w-4xl line-clamp-1">
                                {observation.description}
                            </h2>
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 pt-1 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3 text-blue-500" /> {project?.name || 'N/A'} - {observation.location}</span>
                                <span className="flex items-center gap-1.5"><User className="h-3 w-3 text-emerald-500" /> Reported by {reporter?.name}</span>
                                <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3 text-indigo-500" /> {format(parseISO(observation.createdAt), 'dd MMM yyyy')}</span>
                                <span className="flex items-center gap-1.5"><Clock className="h-3 w-3 text-rose-500" /> {daysOpen} Days Open</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mt-1">
                        <div className="hidden xl:block text-right mr-4 border-r pr-6 border-slate-100">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">A Safer Workplace</p>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">A Stronger Tomorrow</p>
                        </div>
                        <Button variant="outline" className="h-10 px-4 font-bold text-xs gap-2 rounded-lg border-2 shadow-sm">
                            <MessageSquare className="h-4 w-4 text-blue-500" /> Add Comment
                        </Button>
                        <Button variant="outline" className="h-10 px-4 font-bold text-xs gap-2 rounded-lg border-2 shadow-sm">
                            <LinkIcon className="h-4 w-4 text-indigo-500" /> Upload Evidence
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-10 px-4 font-bold text-xs gap-2 rounded-lg border-2 shadow-sm">
                                    More Actions <MoreVertical className="h-4 w-4 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 p-1">
                                <DropdownMenuItem className="font-bold text-xs uppercase tracking-tight py-2.5 rounded-md"><Split className="mr-2 h-4 w-4 text-blue-600" /> Split Case</DropdownMenuItem>
                                <DropdownMenuItem className="font-bold text-xs uppercase tracking-tight py-2.5 rounded-md"><ArrowUpRight className="mr-2 h-4 w-4 text-orange-600" /> Redirect Stage</DropdownMenuItem>
                                <DropdownMenuItem className="font-bold text-xs uppercase tracking-tight py-2.5 rounded-md"><ShieldCheck className="mr-2 h-4 w-4 text-emerald-600" /> Overtake Step</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="font-bold text-xs uppercase tracking-tight py-2.5 rounded-md"><Download className="mr-2 h-4 w-4" /> Export Dossier</DropdownMenuItem>
                                {user?.role === 'Admin' && (
                                    <DropdownMenuItem className="text-rose-600 font-bold text-xs uppercase tracking-tight py-2.5 rounded-md"><Trash2 className="mr-2 h-4 w-4" /> Administrative Delete</DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            {/* --- LIFECYCLE STEPPER --- */}
            <div className="bg-white border-b px-8 py-3 shrink-0 z-20">
                <CapaLifecycleStepper 
                    observation={observation} 
                    viewingStage={viewingStage}
                    onStageSelect={setViewingStage}
                />
            </div>

            {/* --- MAIN APPLICATION AREA --- */}
            <div className="flex-1 flex overflow-hidden">
                {/* LEFT: WORKFLOW SIDEBAR */}
                <aside className="w-[230px] shrink-0 border-r bg-white flex flex-col shadow-inner z-10">
                    <ScrollArea className="flex-1">
                        <div className="p-6">
                            <CapaWorkflowSidebar 
                                observation={observation} 
                                viewingStage={viewingStage}
                                onStageSelect={setViewingStage}
                            />
                        </div>
                    </ScrollArea>
                </aside>

                {/* CENTER: PRIMARY WORKSPACE */}
                <main className="flex-1 flex flex-col overflow-hidden relative">
                    <ScrollArea className="flex-1 bg-[#F5F8FC]/50">
                        <div className="max-w-5xl mx-auto p-10 pb-32">
                            <CapaStageWorkspace 
                                observation={observation} 
                                stage={viewingStage} 
                            />
                        </div>
                    </ScrollArea>

                    {/* BOTTOM ACTION BAR */}
                    <div className="absolute bottom-6 left-10 right-10 z-20">
                         <CapaActionFooter 
                            observation={observation} 
                            stage={viewingStage} 
                         />
                    </div>
                </main>

                {/* RIGHT: CASE INTELLIGENCE */}
                <aside className="w-[310px] shrink-0 border-l bg-white flex flex-col shadow-xl z-10">
                    <ScrollArea className="flex-1">
                        <div className="p-6">
                            <CapaCaseInformation observation={observation} />
                        </div>
                    </ScrollArea>
                </aside>
            </div>
        </div>
    );
}
