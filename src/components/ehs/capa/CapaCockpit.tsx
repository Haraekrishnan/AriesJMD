'use client';

import React, { useMemo, useState } from 'react';
import { 
    ChevronLeft, 
    MessageSquare, 
    Clock, 
    MapPin,
    User,
    Calendar,
    Paperclip,
    FileText,
    Settings,
} from 'lucide-react';
import { format, parseISO, differenceInDays, isValid } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';

// Cockpit Sub-components
import CapaLifecycleStepper from './cockpit/CapaLifecycleStepper';
import CapaWorkflowSidebar from './cockpit/CapaWorkflowSidebar';
import CapaCaseInformation from './cockpit/CapaCaseInformation';
import CapaStageWorkspace from './cockpit/CapaStageWorkspace';
import CapaActionFooter from './cockpit/CapaActionFooter';

interface CapaCockpitProps {
    observation: EhsObservation;
    onClose: () => void;
}

export default function CapaCockpit({ observation, onClose }: CapaCockpitProps) {
    const { users } = useAuth();
    const { projects } = useGeneral();
    const [viewingStage, setViewingStage] = useState<CapaStage>(observation.currentStage);

    const project = projects.find(p => p.id === observation.projectId);
    const reporter = users.find(u => u.id === observation.reporterId);
    
    const daysOpen = useMemo(() => {
        if (!observation.createdAt) return 0;
        const created = parseISO(observation.createdAt);
        return isValid(created) ? Math.max(0, differenceInDays(new Date(), created)) : 0;
    }, [observation.createdAt]);

    return (
        <div className="fixed inset-0 z-40 flex flex-col bg-[#F3F7FB] text-slate-900 font-sans overflow-hidden">
            {/* --- 1. EXECUTIVE IDENTITY HEADER --- */}
            <header className="h-[70px] shrink-0 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-30">
                <div className="flex items-center gap-6 min-w-0">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={onClose} 
                        className="h-8 w-8 text-slate-400 hover:text-slate-900 border border-slate-200 rounded"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="min-w-0 text-left">
                        <div className="flex items-center gap-3">
                            <h1 className="text-base font-bold tracking-tight uppercase text-slate-900">
                                CAPA-26-{observation.id.slice(-5).toUpperCase()}
                            </h1>
                            <Badge variant="outline" className={cn(
                                "font-bold uppercase text-[9px] tracking-wider h-5 px-2 border border-slate-200 rounded-sm bg-white",
                                observation.severity === 'High' || observation.severity === 'Critical' ? "text-rose-600 border-rose-100 bg-rose-50" : "text-amber-600 border-amber-100 bg-amber-50"
                            )}>
                                {observation.severity} RISK
                            </Badge>
                            <Badge className="bg-slate-800 text-white font-bold text-[9px] h-5 uppercase px-2 rounded-sm border-none tracking-widest">{observation.status}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-medium text-slate-400 uppercase mt-0.5">
                            <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3 text-slate-300" /> {project?.name || 'N/A'}</span>
                            <span className="flex items-center gap-1.5"><User className="h-3 w-3 text-slate-300" /> {reporter?.name || 'N/A'}</span>
                            <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3 text-slate-300" /> {format(parseISO(observation.createdAt), 'dd MMM yyyy')}</span>
                            <span className="flex items-center gap-1.5"><Clock className="h-3 w-3 text-slate-300" /> {daysOpen}D OPEN</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6 shrink-0">
                    <div className="hidden lg:flex flex-col text-right leading-none">
                        <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">A SAFER WORKPLACE</p>
                        <p className="text-[8px] font-medium text-slate-400 uppercase tracking-widest mt-1">ARIES MARINE GROUP</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="h-8 px-3 rounded border border-slate-300 font-bold text-[10px] uppercase tracking-wider gap-2 bg-white hover:bg-slate-50">
                            <MessageSquare className="h-3.5 w-3.5" /> COMMENT
                        </Button>
                        <Button variant="outline" className="h-8 px-3 rounded border border-slate-300 font-bold text-[10px] uppercase tracking-wider gap-2 bg-white hover:bg-slate-50">
                            <Paperclip className="h-3.5 w-3.5" /> EVIDENCE
                        </Button>
                    </div>
                </div>
            </header>

            {/* --- 2. PRO-LIFECYCLE STEPPER --- */}
            <section className="h-[75px] shrink-0 bg-white border-b border-slate-200 px-8 flex items-center z-20 shadow-sm">
                <CapaLifecycleStepper 
                    observation={observation} 
                    viewingStage={viewingStage} 
                    onStageSelect={setViewingStage} 
                />
            </section>

            {/* --- 3. OPERATIONAL WORKSPACE GRID --- */}
            <div className="flex-1 flex overflow-hidden">
                {/* LEFT: WORKFLOW SIDEBAR */}
                <aside className="w-[220px] shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
                    <CapaWorkflowSidebar 
                        observation={observation} 
                        viewingStage={viewingStage} 
                        onStageSelect={setViewingStage} 
                    />
                </aside>

                {/* CENTER: PRIMARY TECHNICAL WORKBENCH */}
                <main className="flex-1 flex flex-col overflow-hidden relative bg-[#F3F7FB]">
                    <ScrollArea className="flex-1">
                        <div className="p-8 pb-28">
                            <CapaStageWorkspace 
                                observation={observation} 
                                stage={viewingStage} 
                            />
                        </div>
                    </ScrollArea>

                    {/* ACTION FOOTER */}
                    <footer className="h-[65px] shrink-0 bg-white border-t border-slate-300 px-8 flex items-center z-30 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
                        <CapaActionFooter observation={observation} stage={viewingStage} />
                    </footer>
                </main>

                {/* RIGHT: INTELLIGENCE PANEL */}
                <aside className="w-[300px] shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
                    <CapaCaseInformation observation={observation} />
                </aside>
            </div>
        </div>
    );
}