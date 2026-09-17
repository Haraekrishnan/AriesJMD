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
    Paperclip,
    Plus,
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
        <div className="fixed inset-0 z-40 flex flex-col bg-[#F3F7FB] text-slate-900 font-sans overflow-hidden">
            {/* --- 1. MISSION HEADER --- */}
            <header className="h-[90px] shrink-0 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-30 shadow-sm">
                <div className="flex items-center gap-6 min-w-0">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={onClose} 
                        className="h-10 w-10 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <div className="min-w-0 text-left">
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-xl font-black tracking-tight uppercase text-slate-900">
                                CAPA-26-{observation.id.slice(-5).toUpperCase()}
                            </h1>
                            <Badge variant="outline" className={cn(
                                "font-black uppercase text-[9px] tracking-widest h-5 px-3 border-2",
                                observation.severity === 'High' || observation.severity === 'Critical' ? "text-rose-600 border-rose-100 bg-rose-50/50" : "text-amber-600 border-amber-100 bg-amber-50/50"
                            )}>
                                {observation.severity} RISK
                            </Badge>
                            <Badge className="bg-blue-600 text-white font-black text-[9px] h-5 uppercase px-3 rounded-sm border-none">{observation.status}</Badge>
                        </div>
                        <div className="flex items-center gap-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-blue-500" /> {project?.name || 'N/A'}</span>
                            <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-slate-400" /> Reported by {reporter?.name || 'N/A'}</span>
                            <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-slate-400" /> {format(parseISO(observation.createdAt), 'dd MMM yyyy')}</span>
                            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {daysOpen} days open</span>
                            <span className="flex items-center gap-1.5"><Settings className="h-3.5 w-3.5" /> Target closure: —</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6 shrink-0">
                    <div className="hidden lg:flex flex-col text-right mr-4 justify-center">
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none">A SAFER WORKPLACE</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 leading-none opacity-80">A STRONGER TOMORROW</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="h-10 px-4 rounded-lg border-2 font-black text-[10px] uppercase tracking-widest gap-2 shadow-sm">
                            <MessageSquare className="h-4 w-4" /> Add Comment
                        </Button>
                        <Button variant="outline" className="h-10 px-4 rounded-lg border-2 font-black text-[10px] uppercase tracking-widest gap-2 shadow-sm">
                            <Paperclip className="h-4 w-4" /> Evidence
                        </Button>
                        <Button variant="outline" size="icon" className="h-10 w-10 rounded-lg border-2 shadow-sm">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* --- 2. HORIZONTAL LIFECYCLE STEPPER --- */}
            <section className="h-[90px] shrink-0 bg-white border-b border-slate-200 px-8 flex items-center z-20">
                <CapaLifecycleStepper 
                    observation={observation} 
                    viewingStage={viewingStage} 
                    onStageSelect={setViewingStage} 
                />
            </section>

            {/* --- 3. COCKPIT TECHNICAL WORKSPACE --- */}
            <div className="flex-1 flex overflow-hidden">
                {/* LEFT: WORKFLOW SIDEBAR */}
                <aside className="w-[240px] shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
                    <CapaWorkflowSidebar 
                        observation={observation} 
                        viewingStage={viewingStage} 
                        onStageSelect={setViewingStage} 
                    />
                </aside>

                {/* CENTER: DOMINANT WORKSPACE */}
                <main className="flex-1 flex flex-col overflow-hidden relative">
                    <ScrollArea className="flex-1 bg-[#F3F7FB]">
                        <div className="p-8 pb-32">
                            <CapaStageWorkspace 
                                observation={observation} 
                                stage={viewingStage} 
                            />
                        </div>
                    </ScrollArea>

                    {/* --- FIXED ACTION FOOTER --- */}
                    <footer className="h-20 shrink-0 bg-white border-t border-slate-200 px-8 flex items-center z-30 shadow-lg">
                        <CapaActionFooter observation={observation} stage={viewingStage} />
                    </footer>
                </main>

                {/* RIGHT: INTELLIGENCE SIDEBAR */}
                <aside className="w-[320px] shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden shadow-sm">
                    <CapaCaseInformation observation={observation} />
                </aside>
            </div>
        </div>
    );
}
