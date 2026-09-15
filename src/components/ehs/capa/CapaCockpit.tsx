'use client';

import React, { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
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
    UserPlus,
    PlusCircle,
    ArrowUpRight,
    Split,
    Trash2,
    Link as LinkIcon,
    AlertTriangle,
    Zap,
    History
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

// Workspace & Intelligence Components
import CapaWorkflowTimeline from './CapaWorkflowTimeline';
import CapaStageWorkspace from './CapaStageWorkspace';
import CapaIntelligencePanel from './CapaIntelligencePanel';

interface CapaCockpitProps {
    observation: EhsObservation;
    onClose: () => void;
}

const severityStyles: Record<string, string> = {
    'Low': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Medium': 'bg-amber-50 text-amber-700 border-amber-200',
    'High': 'bg-rose-50 text-rose-700 border-rose-200',
    'Critical': 'bg-rose-100 text-rose-900 border-rose-300 shadow-sm animate-pulse',
};

export default function CapaCockpit({ observation, onClose }: CapaCockpitProps) {
    const { user, users } = useAuth();
    const { projects } = useGeneral();
    const { deleteObservation } = useEhs();
    const [activeStage, setActiveStage] = useState<CapaStage>(observation.currentStage);

    const project = projects.find(p => p.id === observation.projectId);
    const reporter = users.find(u => u.id === observation.reporterId);
    const caseIdDisplay = `CAPA-${format(parseISO(observation.createdAt), 'yy')}-${observation.id.slice(-4).toUpperCase()}`;

    const isAdmin = user?.role === 'Admin';

    const handleDelete = () => {
        deleteObservation(observation.id);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#F6F9FC] animate-in fade-in zoom-in-95 duration-500 overflow-hidden">
            {/* --- WORKSPACE HEADER --- */}
            <header className="h-24 shrink-0 bg-white border-b flex items-center justify-between px-8 shadow-sm">
                <div className="flex items-center gap-6">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={onClose} 
                        className="rounded-xl hover:bg-slate-50 border-2 border-transparent hover:border-slate-100 transition-all"
                    >
                        <ChevronLeft className="h-6 w-6 text-slate-600" />
                    </Button>
                    
                    <div className="flex items-center gap-5 border-l pl-6 border-slate-200">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <span className="font-mono text-blue-600 font-black text-xs tracking-tighter uppercase">{caseIdDisplay}</span>
                                <Badge variant="outline" className={cn(
                                    "h-4 px-2 font-black uppercase text-[8px] tracking-widest border-2",
                                    severityStyles[observation.severity]
                                )}>
                                    {observation.severity} RISK
                                </Badge>
                                <div className="h-1 w-1 rounded-full bg-slate-300" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{observation.status}</span>
                            </div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase line-clamp-1 max-w-xl">
                                {observation.description}
                            </h2>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden lg:flex items-center gap-6 pr-6 border-r border-slate-100">
                        <div className="text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Site Location</p>
                            <p className="text-xs font-bold text-slate-800 uppercase">{project?.name || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reported By</p>
                            <p className="text-xs font-bold text-slate-800 uppercase">{reporter?.name || 'Unknown'}</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Button variant="outline" className="font-black text-[10px] uppercase tracking-widest h-11 px-6 border-2 rounded-xl">
                            <Download className="mr-2 h-4 w-4" /> Export Report
                        </Button>
                        
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-xl h-11 w-11 hover:bg-slate-100">
                                    <MoreVertical className="h-5 w-5 text-slate-400" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem className="font-bold text-xs uppercase tracking-tight py-2.5">
                                    <Edit className="mr-2 h-4 w-4" /> Edit Narrative
                                </DropdownMenuItem>
                                <DropdownMenuItem className="font-bold text-xs uppercase tracking-tight py-2.5">
                                    <Split className="mr-2 h-4 w-4" /> Split Into Sub-cases
                                </DropdownMenuItem>
                                <DropdownMenuItem className="font-bold text-xs uppercase tracking-tight py-2.5">
                                    <ArrowUpRight className="mr-2 h-4 w-4" /> Redirect Stage
                                </DropdownMenuItem>
                                <DropdownMenuItem className="font-bold text-xs uppercase tracking-tight py-2.5">
                                    <ShieldCheck className="mr-2 h-4 w-4" /> Overtake Step
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="font-bold text-xs uppercase tracking-tight py-2.5">
                                    <History className="mr-2 h-4 w-4" /> View Full Audit Trail
                                </DropdownMenuItem>
                                {isAdmin && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <DropdownMenuItem 
                                                    onSelect={(e) => e.preventDefault()}
                                                    className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 font-black text-xs uppercase tracking-tight py-2.5"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" /> Administrative Delete
                                                </DropdownMenuItem>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle className="text-xl font-black uppercase text-slate-900 tracking-tight">Delete Technical Case?</AlertDialogTitle>
                                                    <AlertDialogDescription className="text-slate-600 font-medium">
                                                        This will permanently wipe <strong>{caseIdDisplay}</strong> and all associated child cases, technical logs, and evidence attachments. This operation is non-reversible.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter className="gap-3">
                                                    <AlertDialogCancel className="font-bold rounded-xl h-12 px-8">Cancel</AlertDialogCancel>
                                                    <AlertDialogAction 
                                                        className="bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px] h-12 px-10 rounded-xl shadow-lg shadow-rose-600/10"
                                                        onClick={handleDelete}
                                                    >
                                                        CONFIRM DELETION
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            {/* --- MAIN WORKSPACE --- */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Interactive Pipeline Timeline */}
                <aside className="w-80 shrink-0 border-r bg-white flex flex-col shadow-inner z-10">
                    <div className="p-6 border-b bg-slate-50/50">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Governance Pipeline</h3>
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="p-8">
                            <CapaWorkflowTimeline 
                                observation={observation} 
                                activeStage={activeStage}
                                onStageSelect={setActiveStage}
                            />
                        </div>
                    </ScrollArea>
                    <div className="p-6 border-t bg-slate-50/50">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Case Vitality</span>
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tight">On Track</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: '68%' }} />
                        </div>
                    </div>
                </aside>

                {/* Center: Technical Stage Workspace */}
                <main className="flex-1 flex flex-col overflow-hidden relative">
                    <ScrollArea className="flex-1">
                        <div className="max-w-4xl mx-auto p-12 pb-32">
                            <CapaStageWorkspace 
                                observation={observation} 
                                stage={activeStage} 
                            />
                        </div>
                    </ScrollArea>

                    {/* Bottom Floating Action Bar */}
                    <div className="absolute bottom-8 left-12 right-12 z-20">
                         <div className="bg-white/80 backdrop-blur-xl border-2 border-slate-200 shadow-2xl rounded-[2rem] p-4 flex items-center justify-between gap-6 px-10">
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-blue-500" />
                                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Phase Active for 2 Days</span>
                                </div>
                                <div className="h-4 w-px bg-slate-200" />
                                <div className="flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-amber-500" />
                                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Risk Mitigation Required</span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <Button variant="ghost" className="font-black text-[10px] uppercase tracking-widest text-slate-500 h-10 px-6 rounded-xl hover:bg-slate-100">
                                    Save Technical Draft
                                </Button>
                                <Button className="bg-[#2563EB] hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-[0.2em] h-12 px-10 rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
                                    Transmit Stage Data
                                </Button>
                            </div>
                         </div>
                    </div>
                </main>

                {/* Right: Case Intelligence Panel */}
                <aside className="w-96 shrink-0 border-l bg-white flex flex-col shadow-2xl z-10">
                    <div className="p-6 border-b bg-slate-50/50">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Intelligence & Collaboration</h3>
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="p-8">
                            <CapaIntelligencePanel observation={observation} />
                        </div>
                    </ScrollArea>
                </aside>
            </div>
        </div>
    );
}
