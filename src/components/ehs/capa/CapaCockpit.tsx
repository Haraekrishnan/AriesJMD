'use client';

import React, { useState } from 'react';
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
    Activity,
    Plus,
    FileText,
    Bell,
    Save,
    ArrowRight
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
            <div className="fixed inset-0 z-40 flex flex-col bg-[#F3F7FB] text-slate-900 font-sans overflow-hidden select-none">
                
                {/* --- 1. DUAL-TIER EXECUTIVE HEADER --- */}
                <header className="shrink-0 bg-white border-b z-30 shadow-sm">
                    {/* Tier 1: Case Identity & Global Tools */}
                    <div className="px-8 py-4 flex items-center justify-between border-b bg-white">
                        <div className="flex items-center gap-6">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={onClose} 
                                className="h-9 px-4 rounded-xl text-slate-500 hover:bg-slate-50 font-bold uppercase text-[10px] tracking-widest border-2 transition-all"
                            >
                                <ChevronLeft className="mr-2 h-4 w-4" /> Back
                            </Button>
                            <div className="flex items-center gap-4">
                                <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                                    {observation.id.slice(-12).toUpperCase()}
                                </h1>
                                <Badge className="bg-orange-100 text-orange-700 border-none font-black uppercase text-[10px] px-3 h-7 rounded-full tracking-widest">
                                    {observation.severity.toUpperCase()} RISK
                                </Badge>
                                <Badge className="bg-blue-600 text-white border-none font-black uppercase text-[10px] px-4 h-7 rounded-full tracking-widest shadow-sm">
                                    {observation.status.toUpperCase()}
                                </Badge>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100">
                                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-emerald-900 uppercase tracking-widest leading-none">TECHNICAL GOVERNANCE</p>
                                    <p className="text-[9px] font-bold text-emerald-600/80 uppercase tracking-widest mt-1 leading-none">SYSTEM OPTIMAL</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                                <Button variant="outline" className="h-11 px-5 gap-3 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 bg-white hover:bg-slate-50 transition-all">
                                    <MessageSquare className="h-4 w-4 text-slate-400" /> Add Note
                                </Button>
                                <Button variant="outline" className="h-11 px-5 gap-3 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 bg-white hover:bg-slate-50 transition-all">
                                    <UploadCloud className="h-4 w-4 text-slate-400" /> Upload Document
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Tier 2: Metadata Registry */}
                    <div className="px-8 py-3.5 flex items-center gap-12 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-50/50">
                        <div className="flex items-center gap-2.5">
                            <MapPin className="h-4 w-4 text-slate-300" />
                            <span className="text-slate-600">{project?.name || 'OPERATIONAL SITE TBD'}</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <User className="h-4 w-4 text-slate-300" />
                            <span>Reporter: <span className="text-slate-600">{reporter?.name || 'OFFICIAL RECORD'}</span></span>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <Calendar className="h-4 w-4 text-slate-300" />
                            <span>Initiated: <span className="text-slate-600">{format(parseISO(observation.createdAt), 'dd MMM yyyy')}</span></span>
                        </div>
                        <div className="flex items-center gap-2.5 text-rose-500 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
                            <Clock className="h-4 w-4" />
                            <span>PHASE DELAY: 0D</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 ml-auto">
                            <Target className="h-4 w-4" />
                            <span>Target Closure: TBD</span>
                        </div>
                    </div>
                </header>

                {/* --- 2. PROGRESS & LIFECYCLE TIER --- */}
                <section className="h-28 shrink-0 bg-white border-b px-10 flex items-center z-20 shadow-sm">
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
                            <div className="max-w-[1600px] mx-auto w-full pb-32">
                                <CapaStageWorkspace observation={observation} stage={viewingStage} />
                            </div>
                        </ScrollArea>

                        {/* FIXED ACTION FOOTER */}
                        <footer className="h-24 shrink-0 bg-white/95 backdrop-blur-md border-t px-10 flex items-center z-40 absolute bottom-0 left-0 right-0 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)]">
                            <CapaActionFooter observation={observation} stage={viewingStage} />
                        </footer>
                    </main>

                    {/* INTELLIGENCE SIDEBAR */}
                    <aside className="w-[400px] shrink-0 border-l bg-white flex flex-col z-20 overflow-hidden shadow-2xl relative">
                        <ScrollArea className="h-full">
                           <CapaRightSidebar observation={observation} />
                        </ScrollArea>
                    </aside>
                </div>
            </div>
        </FormProvider>
    );
}
