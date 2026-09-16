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
    Save,
    Send
} from 'lucide-react';
import { format, parseISO, differenceInDays, isValid } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { useEhs } from '@/contexts/ehs-provider';
import { ScrollArea } from '@/components/ui/scroll-area';

// Cockpit Sub-components
import CapaLifecycleStepper from './cockpit/CapaLifecycleStepper';
import CapaWorkflowSidebar from './cockpit/CapaWorkflowSidebar';
import CapaCaseInformation from './cockpit/CapaCaseInformation';
import CapaStageWorkspace from './cockpit/CapaStageWorkspace';

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
            <header className="h-[88px] shrink-0 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-30">
                <div className="flex items-center gap-6 min-w-0">
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 text-slate-400 hover:text-slate-900">
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                                CAPA-26-{observation.id.slice(-5).toUpperCase()}
                            </h1>
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-bold text-[10px] h-5 uppercase px-2">{observation.severity} RISK</Badge>
                            <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-bold text-[10px] h-5 uppercase px-2">{observation.status}</Badge>
                        </div>
                        <p className="text-sm font-bold text-slate-600 truncate max-w-2xl uppercase tracking-tight" title={sanitizedDescription}>
                            {sanitizedDescription}
                        </p>
                        <div className="flex items-center gap-4 mt-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-blue-600" /> {project?.name || 'N/A'}</span>
                            <span className="flex items-center gap-1"><User className="h-3 w-3 text-emerald-600" /> Reported by {reporter?.name || 'N/A'}</span>
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3 text-blue-600" /> {format(parseISO(observation.createdAt), 'dd MMM yyyy')}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-blue-600" /> {daysOpen} Days Open</span>
                            <span className="flex items-center gap-1"><Target className="h-3 w-3 text-slate-400" /> Target Closure: —</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right mr-6 border-r pr-6 hidden xl:block">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">A Safer Workplace</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">A Stronger Tomorrow</p>
                    </div>
                    <Button variant="outline" className="h-10 px-4 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest text-blue-700 gap-2">
                        <MessageSquare className="h-4 w-4" /> Add Comment
                    </Button>
                    <Button variant="outline" className="h-10 px-4 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest text-blue-700 gap-2">
                        <LinkIcon className="h-4 w-4" /> Evidence
                    </Button>
                    <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-2">
                        <MoreVertical className="h-4 w-4 text-slate-400" />
                    </Button>
                </div>
            </header>

            {/* --- LIFECYCLE STEPPER --- */}
            <section className="h-[84px] shrink-0 bg-white border-b border-slate-200 px-8 flex items-center z-20">
                <CapaLifecycleStepper observation={observation} viewingStage={viewingStage} onStageSelect={setViewingStage} />
            </section>

            {/* --- MAIN COCKPIT BODY --- */}
            <div className="flex-1 flex overflow-hidden">
                {/* LEFT: WORKFLOW SIDEBAR */}
                <aside className="w-[220px] shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
                    <ScrollArea className="flex-1">
                        <CapaWorkflowSidebar observation={observation} viewingStage={viewingStage} onStageSelect={setViewingStage} />
                    </ScrollArea>
                </aside>

                {/* CENTER: PRIMARY WORKSPACE */}
                <main className="flex-1 flex flex-col overflow-hidden">
                    <ScrollArea className="flex-1">
                        <div className="w-full max-w-[1400px] mx-auto p-8 pb-32">
                            <CapaStageWorkspace observation={observation} stage={viewingStage} />
                        </div>
                    </ScrollArea>

                    {/* --- FIXED ACTION FOOTER --- */}
                    <footer className="h-20 shrink-0 bg-white border-t border-slate-200 px-8 flex items-center justify-between z-30 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
                        <div className="flex items-center gap-8">
                            <div className="flex items-center gap-3">
                                <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.4)]" />
                                <span className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">STAGE: {observation.currentStage}</span>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" className="h-9 font-black text-[10px] uppercase tracking-widest text-slate-500 hover:text-blue-600">
                                    <Save className="mr-2 h-4 w-4" /> Save Draft
                                </Button>
                                <Button variant="ghost" className="h-9 font-black text-[10px] uppercase tracking-widest text-slate-500 hover:text-blue-600">
                                    <MessageSquare className="mr-2 h-4 w-4" /> Add Comment
                                </Button>
                            </div>
                        </div>

                        <Button className="h-12 px-10 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-xl shadow-xl shadow-blue-600/20 active:scale-95 transition-all">
                            Submit {viewingStage} <Send className="ml-3 h-4 w-4" />
                        </Button>
                    </footer>
                </main>

                {/* RIGHT: INTELLIGENCE SIDEBAR */}
                <aside className="w-[300px] shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
                    <ScrollArea className="flex-1">
                        <CapaCaseInformation observation={observation} />
                    </ScrollArea>
                </aside>
            </div>
        </div>
    );
}
