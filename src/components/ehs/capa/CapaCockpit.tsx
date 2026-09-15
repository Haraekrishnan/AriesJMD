
'use client';

import React, { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { 
    ChevronLeft, ShieldCheck, Download, MoreVertical, 
    Check, ArrowRight, Clock, Target, Search, FileCheck, Lock,
    AlertTriangle, History, MessageSquare, PlusCircle, Split
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { EhsObservation, CapaStage, User } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';

// Stage Component Imports
import CapaWorkflowTimeline from './CapaWorkflowTimeline';
import CapaStageWorkspace from './CapaStageWorkspace';
import CapaIntelligencePanel from './CapaIntelligencePanel';

interface CapaCockpitProps {
    observation: EhsObservation;
    onClose: () => void;
}

export default function CapaCockpit({ observation, onClose }: CapaCockpitProps) {
    const { user, users } = useAuth();
    const { projects } = useGeneral();
    const [activeStage, setActiveStage] = useState<CapaStage>(observation.currentStage);

    const project = projects.find(p => p.id === observation.projectId);
    const reporter = users.find(u => u.id === observation.reporterId);
    
    const caseIdDisplay = `CAPA-${format(parseISO(observation.createdAt), 'yy')}-${observation.id.slice(-4).toUpperCase()}`;

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#f8fafc] animate-in fade-in zoom-in-95 duration-500 overflow-hidden">
            {/* --- WORKSPACE HEADER --- */}
            <header className="h-20 shrink-0 bg-white border-b flex items-center justify-between px-8 shadow-sm">
                <div className="flex items-center gap-6">
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-100">
                        <ChevronLeft className="h-6 w-6 text-slate-600" />
                    </Button>
                    <div className="flex items-center gap-4 border-l pl-6 border-slate-200">
                        <div>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Management Docket</span>
                                <Badge variant="outline" className="h-4 font-black uppercase text-[8px] bg-slate-50">{observation.status}</Badge>
                            </div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">{caseIdDisplay}</h2>
                        </div>
                        <Badge className="bg-rose-500 font-black uppercase text-[9px] tracking-widest h-8 px-4 rounded-lg shadow-lg shadow-rose-500/10">
                            {observation.severity} Risk
                        </Badge>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="outline" className="font-bold text-xs uppercase tracking-widest h-10 border-2">
                        <Download className="mr-2 h-4 w-4" /> Export Report
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-full">
                        <MoreVertical className="h-5 w-5 text-slate-400" />
                    </Button>
                </div>
            </header>

            {/* --- MAIN WORKSPACE --- */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Pipeline Sidebar */}
                <aside className="w-80 shrink-0 border-r bg-white/50 backdrop-blur-sm flex flex-col shadow-inner">
                    <ScrollArea className="flex-1">
                        <div className="p-8">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-8">Lifecycle Timeline</h3>
                            <CapaWorkflowTimeline 
                                observation={observation} 
                                activeStage={activeStage}
                                onStageSelect={setActiveStage}
                            />
                        </div>
                    </ScrollArea>
                </aside>

                {/* Center: Stage Workspace */}
                <main className="flex-1 flex flex-col overflow-hidden">
                    <ScrollArea className="flex-1">
                        <div className="max-w-4xl mx-auto p-12 space-y-12">
                            <CapaStageWorkspace 
                                observation={observation} 
                                stage={activeStage} 
                            />
                        </div>
                    </ScrollArea>
                </main>

                {/* Right: Case Intelligence */}
                <aside className="w-96 shrink-0 border-l bg-white flex flex-col shadow-2xl">
                    <ScrollArea className="flex-1">
                        <div className="p-8 space-y-10">
                            <CapaIntelligencePanel observation={observation} />
                        </div>
                    </ScrollArea>
                </aside>
            </div>
        </div>
    );
}
