'use client';

import React, { useState, useMemo } from 'react';
import { 
    ChevronLeft, 
    MessageSquare, 
    Clock, 
    MapPin,
    User,
    Calendar,
    ShieldCheck,
    Target,
    Activity,
    FileText,
    MoreVertical,
    Paperclip,
    ShieldAlert
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { useForm, FormProvider } from 'react-hook-form';

import CapaLifecycleStepper from './cockpit/CapaLifecycleStepper';
import CapaRightSidebar from './cockpit/CapaRightSidebar';
import CapaStageWorkspace from './cockpit/CapaStageWorkspace';
import CapaActionFooter from './cockpit/CapaActionFooter';

interface CapaCockpitProps {
    observation: EhsObservation;
    onClose: () => void;
}

const STAGES: CapaStage[] = ['Initiation', 'Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'];

export default function CapaCockpit({ observation, onClose }: CapaCockpitProps) {
    const { users } = useAuth();
    const { projects } = useGeneral();
    const [viewingStage, setViewingStage] = useState<CapaStage>(observation.currentStage || 'Initiation');

    const project = projects.find(p => p.id === observation.projectId);
    const reporter = users.find(u => u.id === observation.reporterId);
    
    const sData = observation.stages[viewingStage];

    const methods = useForm({
        defaultValues: sData?.data || {}
    });

    const progress = useMemo(() => {
        const completedCount = STAGES.filter(s => observation.stages[s]?.status === 'Completed').length;
        return Math.round((completedCount / STAGES.length) * 100);
    }, [observation]);

    return (
        <FormProvider {...methods}>
            <div className="fixed inset-0 z-40 flex flex-col bg-[#F3F7FB] text-slate-900 font-sans overflow-hidden">
                
                {/* --- 1. TRIPLE-TIER EXECUTIVE HEADER --- */}
                <header className="shrink-0 bg-white border-b z-30 shadow-sm flex flex-col text-left">
                    {/* Tier 1: Case Identity & Brand Status */}
                    <div className="px-8 py-3 flex items-center justify-between bg-white border-b">
                        <div className="flex items-center gap-6">
                            <Button 
                                variant="outline" 
                                size="icon" 
                                onClick={onClose} 
                                className="h-8 w-8 rounded-md text-slate-400 hover:bg-slate-50 border-slate-200"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="flex items-center gap-3">
                                <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                                    {observation.id.slice(-12).toUpperCase()}
                                </h1>
                                <Badge className="bg-amber-100 text-amber-700 border-none font-black uppercase text-[9px] px-2.5 h-6 rounded-sm tracking-widest">
                                    MEDIUM RISK
                                </Badge>
                                <Badge className="bg-blue-600 text-white border-none font-black uppercase text-[9px] px-3 h-6 rounded-sm tracking-widest">
                                    {observation.status.toUpperCase()}
                                </Badge>
                            </div>
                        </div>

                        <div className="flex items-center gap-10">
                            <div className="flex flex-col text-right leading-none mr-4">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">A SAFER WORKPLACE</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">A HEALTHIER TOMORROW</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" className="h-9 px-5 gap-2 text-slate-700 rounded-lg font-bold text-xs border-slate-200 bg-white hover:bg-slate-50 shadow-sm">
                                    <MessageSquare className="h-4 w-4 text-slate-400" /> Comment
                                </Button>
                                <Button variant="outline" className="h-9 px-5 gap-2 text-slate-700 rounded-lg font-bold text-xs border-slate-200 bg-white hover:bg-slate-50 shadow-sm">
                                    <Paperclip className="h-4 w-4 text-slate-400" /> Document
                                </Button>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
                                    <MoreVertical className="h-4 w-4 text-slate-400" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Tier 2: Metadata Registry */}
                    <div className="px-8 py-2.5 flex items-center gap-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] bg-white border-b">
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-slate-300" />
                            <span className="text-slate-600 font-black">{project?.name?.toUpperCase() || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 border-l pl-8 border-slate-100">
                            <User className="h-4 w-4 text-slate-300" />
                            <span><span className="text-slate-400">REPORTER:</span> <span className="text-slate-600 font-black">{reporter?.name?.toUpperCase() || 'OFFICIAL RECORD'}</span></span>
                        </div>
                        <div className="flex items-center gap-2 border-l pl-8 border-slate-100">
                            <Calendar className="h-4 w-4 text-slate-300" />
                            <span>{format(parseISO(observation.createdAt), 'dd MMM yyyy').toUpperCase()}</span>
                        </div>
                        <div className="flex items-center gap-2 border-l pl-8 border-slate-100">
                            <Clock className="h-4 w-4 text-slate-300" />
                            <span>1 DAYS OPEN</span>
                        </div>
                        <div className="flex items-center gap-2 border-l pl-8 border-slate-100">
                            <Target className="h-4 w-4 text-slate-300" />
                            <span>TARGET CLOSURE: —</span>
                        </div>
                    </div>

                    {/* Tier 3: Integrated Progress Tier */}
                    <div className="h-20 shrink-0 bg-[#F8FAFC] px-10 flex items-center justify-between border-b shadow-inner">
                        <div className="flex items-center gap-12 w-full">
                            {/* Progress Meter */}
                            <div className="flex flex-col shrink-0">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Overall Progress</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl font-black text-blue-600 tracking-tighter leading-none">{progress}%</span>
                                    <div className="w-40 h-1.5 bg-slate-200 rounded-full overflow-hidden border border-white shadow-inner">
                                        <div className="h-full bg-blue-600 transition-all duration-1000 shadow-[0_0_8px_rgba(37,99,235,0.4)]" style={{ width: `${progress}%` }} />
                                    </div>
                                </div>
                            </div>

                            {/* Stepper */}
                            <div className="flex-1">
                                <CapaLifecycleStepper 
                                    observation={observation} 
                                    viewingStage={viewingStage} 
                                    onStageSelect={setViewingStage} 
                                />
                            </div>
                        </div>
                    </div>
                </header>

                {/* --- 2. MAIN WORKSPACE --- */}
                <div className="flex-1 flex overflow-hidden">
                    <main className="flex-1 flex flex-col overflow-hidden relative bg-[#F8FAFC]">
                        <ScrollArea className="flex-1 no-scrollbar">
                            <div className="p-10 space-y-10">
                                <CapaStageWorkspace observation={observation} stage={viewingStage} />
                            </div>
                        </ScrollArea>

                        {/* FIXED ACTION FOOTER */}
                        <footer className="h-20 shrink-0 bg-white border-t px-10 flex items-center z-40 shadow-2xl">
                            <CapaActionFooter observation={observation} stage={viewingStage} />
                        </footer>
                    </main>

                    {/* INTELLIGENCE SIDEBAR */}
                    <aside className="w-[380px] shrink-0 border-l bg-white flex flex-col z-20 overflow-hidden relative shadow-lg">
                        <ScrollArea className="h-full no-scrollbar">
                           <CapaRightSidebar observation={observation} activeStage={viewingStage} />
                        </ScrollArea>
                    </aside>
                </div>
            </div>
        </FormProvider>
    );
}
