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
    UploadCloud,
    Target,
    Zap,
    Activity,
    Info,
    History,
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
    const [viewingStage, setViewingStage] = useState<CapaStage>(observation.currentStage || 'Investigation');

    const project = projects.find(p => p.id === observation.projectId);
    const reporter = users.find(u => u.id === observation.reporterId);
    
    const methods = useForm({
        defaultValues: observation.stages?.[viewingStage]?.data || {}
    });

    return (
        <FormProvider {...methods}>
            <div className="fixed inset-0 z-40 flex flex-col bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden select-none">
                
                {/* --- 1. MODERN SaaS HEADER --- */}
                <header className="shrink-0 bg-white border-b px-8 py-4 flex flex-col gap-3 z-30 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={onClose} 
                                className="h-10 px-4 rounded-xl text-slate-600 hover:bg-slate-100 font-bold uppercase text-[10px] tracking-widest border"
                            >
                                <ChevronLeft className="mr-2 h-4 w-4" /> Back
                            </Button>
                            <div className="flex items-center gap-4">
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                                    {observation.id.slice(-12).toUpperCase()}
                                </h1>
                                <div className="flex gap-2">
                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-black uppercase text-[9px] px-3 h-6 rounded-lg tracking-widest">
                                        {observation.severity.toUpperCase()} RISK
                                    </Badge>
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-black uppercase text-[9px] px-3 h-6 rounded-lg tracking-widest">
                                        {observation.status.toUpperCase()}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3 mr-6 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100">
                                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-emerald-900 uppercase tracking-widest leading-none">TECHNICAL GOVERNANCE</p>
                                    <p className="text-[9px] font-bold text-emerald-600/80 uppercase tracking-widest mt-1 leading-none">SYSTEM OPTIMAL</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" className="h-10 px-6 gap-2 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all border-2">
                                <MessageSquare className="h-4 w-4" /> Add Note
                            </Button>
                            <Button variant="outline" size="sm" className="h-10 px-6 gap-2 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all border-2">
                                <UploadCloud className="h-4 w-4" /> Upload Document
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] pt-1">
                        <div className="flex items-center gap-8">
                            <span className="flex items-center gap-2 text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg"><MapPin className="h-3.5 w-3.5" /> {project?.name || 'SITE TBD'}</span>
                            <span className="flex items-center gap-2"><User className="h-3.5 w-3.5" /> Reporter: {reporter?.name || 'N/A'}</span>
                            <span className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> {format(parseISO(observation.createdAt), 'dd MMM yyyy')}</span>
                            <span className="flex items-center gap-2 text-rose-600"><Clock className="h-3.5 w-3.5" /> 0 Days Open</span>
                            <span className="flex items-center gap-2 text-blue-600"><Target className="h-3.5 w-3.5" /> Target Closure: 30 Sep 2026</span>
                        </div>
                    </div>
                </header>

                {/* --- 2. PROGRESS TIER --- */}
                <section className="h-24 shrink-0 bg-white border-b px-10 flex items-center z-20 shadow-sm">
                    <CapaLifecycleStepper 
                        observation={observation} 
                        viewingStage={viewingStage} 
                        onStageSelect={setViewingStage} 
                    />
                </section>

                {/* --- 3. CORE WORKSPACE --- */}
                <div className="flex-1 flex overflow-hidden">
                    <main className="flex-1 flex flex-col overflow-hidden relative bg-[#F8FAFC]">
                        <ScrollArea className="flex-1">
                            <div className="p-8 max-w-[1400px] mx-auto w-full pb-32">
                                <CapaStageWorkspace observation={observation} stage={viewingStage} />
                            </div>
                        </ScrollArea>

                        {/* BOTTOM ACTION BAR */}
                        <footer className="h-24 shrink-0 bg-white/80 backdrop-blur-md border-t px-10 flex items-center z-30 absolute bottom-0 left-0 right-0 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                            <CapaActionFooter observation={observation} stage={viewingStage} />
                        </footer>
                    </main>

                    {/* RIGHT SIDEBAR */}
                    <aside className="w-[400px] shrink-0 border-l bg-white flex flex-col z-20 overflow-y-auto shadow-2xl">
                        <CapaRightSidebar observation={observation} />
                    </aside>
                </div>
            </div>
        </FormProvider>
    );
}