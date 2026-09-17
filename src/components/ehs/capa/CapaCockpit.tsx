'use client';

import React, { useMemo, useState } from 'react';
import { 
    ChevronLeft, 
    MessageSquare, 
    MoreVertical, 
    Clock, 
    MapPin,
    User,
    Calendar,
    Upload,
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
    const { user, users } = useAuth();
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
            {/* --- 1. MISSION HEADER (NAVY THEME) --- */}
            <header className="h-[82px] shrink-0 bg-[#0F172A] border-b border-white/5 px-8 flex items-center justify-between z-30 text-white shadow-xl">
                <div className="flex items-center gap-6 min-w-0">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={onClose} 
                        className="h-10 w-10 text-white/70 hover:text-white hover:bg-white/10 border border-white/20 rounded-lg transition-all"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <div className="min-w-0 text-left">
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-xl font-black tracking-tight uppercase text-white">
                                CAPA-26-{observation.id.slice(-5).toUpperCase()}
                            </h1>
                            <Badge variant="outline" className={cn(
                                "font-black uppercase text-[9px] tracking-widest h-5 px-3 border-2 text-white shadow-sm",
                                observation.severity === 'High' || observation.severity === 'Critical' ? "bg-rose-600 border-rose-500" : "bg-emerald-600 border-emerald-500"
                            )}>
                                {observation.severity} RISK
                            </Badge>
                            <Badge className="bg-blue-600 text-white font-black text-[9px] h-5 uppercase px-3 rounded-sm border-none shadow-sm">{observation.status}</Badge>
                        </div>
                        <p className="text-sm font-bold text-slate-300 truncate max-w-2xl uppercase tracking-tight" title={sanitizedDescription}>
                            {sanitizedDescription}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-8 shrink-0">
                    <div className="text-right hidden 2xl:block border-r border-white/10 pr-8">
                        <div className="flex items-center gap-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-blue-400" /> {project?.name || 'N/A'}</span>
                            <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-emerald-400" /> {reporter?.name || 'N/A'}</span>
                            <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-slate-400" /> {format(parseISO(observation.createdAt), 'dd MMM yyyy')}</span>
                            <span className="flex items-center gap-1.5 text-rose-400 font-black"><Clock className="h-3.5 w-3.5" /> {daysOpen} DAYS OPEN</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                         <div className="hidden lg:flex flex-col text-right mr-4 justify-center">
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none">A SAFER WORKPLACE</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 leading-none">A STRONGER TOMORROW</p>
                        </div>
                        <Button variant="outline" className="h-10 px-4 rounded-lg border-white/20 bg-white/5 text-white font-black text-[10px] uppercase tracking-widest gap-2 hover:bg-white/10">
                            <MessageSquare className="h-4 w-4" /> Comment
                        </Button>
                        <Button variant="outline" className="h-10 px-4 rounded-lg border-white/20 bg-white/5 text-white font-black text-[10px] uppercase tracking-widest gap-2 hover:bg-white/10">
                            <Upload className="h-4 w-4" /> Evidence
                        </Button>
                        <Button variant="outline" size="icon" className="h-10 w-10 rounded-lg border-white/20 bg-white/5 text-white hover:bg-white/10">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* --- 2. HORIZONTAL LIFECYCLE PANEL --- */}
            <section className="h-[80px] shrink-0 bg-white border-b border-slate-200 px-8 flex items-center z-20 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                <CapaLifecycleStepper 
                    observation={observation} 
                    viewingStage={viewingStage} 
                    onStageSelect={setViewingStage} 
                />
            </section>

            {/* --- 3. COCKPIT TECHNICAL WORKSPACE GRID --- */}
            <div className="flex-1 flex overflow-hidden">
                {/* LEFT: WORKFLOW SIDEBAR */}
                <aside className="w-[220px] shrink-0 bg-[#F8FAFC] border-r border-slate-200 flex flex-col overflow-hidden shadow-[inset_-1px_0_0_rgba(0,0,0,0.05)]">
                    <CapaWorkflowSidebar 
                        observation={observation} 
                        viewingStage={viewingStage} 
                        onStageSelect={setViewingStage} 
                    />
                </aside>

                {/* CENTER: DOMINANT WORKSPACE */}
                <main className="flex-1 flex flex-col overflow-hidden bg-[#F3F7FB]">
                    <ScrollArea className="flex-1">
                        <div className="p-8 pb-24">
                            <CapaStageWorkspace 
                                observation={observation} 
                                stage={viewingStage} 
                            />
                        </div>
                    </ScrollArea>

                    {/* --- FIXED ACTION FOOTER --- */}
                    <footer className="h-20 shrink-0 bg-white border-t border-slate-200 px-8 flex items-center z-30 shadow-[0_-4px_15px_rgba(0,0,0,0.02)]">
                        <CapaActionFooter observation={observation} stage={viewingStage} />
                    </footer>
                </main>

                {/* RIGHT: INTELLIGENCE SIDEBAR */}
                <aside className="w-[300px] shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden shadow-[inset_1px_0_0_rgba(0,0,0,0.05)]">
                    <CapaCaseInformation observation={observation} />
                </aside>
            </div>
        </div>
    );
}
