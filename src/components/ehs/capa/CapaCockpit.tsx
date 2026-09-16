'use client';

import React, { useMemo, useState } from 'react';
import { 
    ChevronLeft, 
    MessageSquare, 
    Link as LinkIcon, 
    MoreVertical, 
    Clock, 
    Target,
    MapPin,
    User,
    Calendar,
    ArrowRight
} from 'lucide-react';
import { format, parseISO, differenceInDays, isValid } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { ScrollArea } from '@/components/ui/scroll-area';

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

    const sanitizedDescription = useMemo(() => {
        if (!observation.description) return '';
        return observation.description.replace(/<[^>]*>/g, ' ').trim();
    }, [observation.description]);

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#F3F7FB] text-slate-900 font-sans overflow-hidden">
            {/* --- CASE HEADER --- */}
            <header className="h-[82px] shrink-0 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-30">
                <div className="flex items-center gap-6 min-w-0">
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 text-slate-400 hover:text-slate-900 border-2">
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                                CAPA-26-{observation.id.slice(-5).toUpperCase()}
                            </h1>
                            <Badge variant="outline" className={cn(
                                "font-black uppercase text-[9px] tracking-widest h-5 px-3 border-2",
                                observation.severity === 'High' || observation.severity === 'Critical' ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                            )}>
                                {observation.severity} RISK
                            </Badge>
                            <Badge className="bg-blue-600 text-white font-black text-[9px] h-5 uppercase px-3 rounded-sm">{observation.status}</Badge>
                        </div>
                        <p className="text-sm font-bold text-slate-500 truncate max-w-3xl uppercase tracking-tight" title={sanitizedDescription}>
                            {sanitizedDescription}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-8 shrink-0">
                    <div className="text-right hidden xl:block border-r pr-8">
                        <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3 text-blue-500" /> {project?.name || 'N/A'}</span>
                            <span className="flex items-center gap-1.5"><User className="h-3 w-3 text-emerald-500" /> {reporter?.name || 'N/A'}</span>
                            <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3 text-slate-400" /> {format(parseISO(observation.createdAt), 'dd MMM yyyy')}</span>
                            <span className="flex items-center gap-1.5 text-rose-600"><Clock className="h-3 w-3" /> {daysOpen} Days Open</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="h-10 px-4 rounded-lg border-2 font-black text-[10px] uppercase tracking-widest text-slate-700 gap-2 hover:bg-slate-50">
                            <MessageSquare className="h-4 w-4" /> Comment
                        </Button>
                        <Button variant="outline" className="h-10 px-4 rounded-lg border-2 font-black text-[10px] uppercase tracking-widest text-slate-700 gap-2 hover:bg-slate-50">
                            <LinkIcon className="h-4 w-4" /> Evidence
                        </Button>
                        <Button variant="outline" size="icon" className="h-10 w-10 rounded-lg border-2">
                            <MoreVertical className="h-4 w-4 text-slate-400" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* --- LIFECYCLE STEPPER PANEL --- */}
            <section className="h-[80px] shrink-0 bg-white border-b border-slate-200 px-8 flex items-center z-20">
                <CapaLifecycleStepper 
                    observation={observation} 
                    viewingStage={viewingStage} 
                    onStageSelect={setViewingStage} 
                />
            </section>

            {/* --- COCKPIT TECHNICAL WORKSPACE --- */}
            <div className="flex-1 flex overflow-hidden">
                {/* LEFT: WORKFLOW SIDEBAR */}
                <aside className="w-[220px] shrink-0 bg-[#F8FAFC] border-r border-slate-200 flex flex-col overflow-hidden">
                    <CapaWorkflowSidebar 
                        observation={observation} 
                        viewingStage={viewingStage} 
                        onStageSelect={setViewingStage} 
                    />
                </aside>

                {/* CENTER: DOMINANT WORKSPACE */}
                <main className="flex-1 flex flex-col overflow-hidden relative">
                    <ScrollArea className="flex-1">
                        <div className="w-full p-8 pb-32">
                            <CapaStageWorkspace 
                                observation={observation} 
                                stage={viewingStage} 
                            />
                        </div>
                    </ScrollArea>

                    {/* --- RIGID ACTION FOOTER --- */}
                    <footer className="h-20 shrink-0 bg-white border-t border-slate-200 px-8 flex items-center z-30 shadow-[0_-4px_15px_rgba(0,0,0,0.02)]">
                        <CapaActionFooter observation={observation} stage={viewingStage} />
                    </footer>
                </main>

                {/* RIGHT: INTELLIGENCE SIDEBAR */}
                <aside className="w-[300px] shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
                    <CapaCaseInformation observation={observation} />
                </aside>
            </div>
        </div>
    );
}
