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
    MoreVertical,
    FileText,
    Bell
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
    const { user, users } = useAuth();
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
                <header className="shrink-0 bg-white border-b z-30">
                    {/* Top Tier */}
                    <div className="px-8 py-3 flex items-center justify-between border-b bg-slate-50/30">
                        <div className="flex items-center gap-6">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={onClose} 
                                className="h-8 px-3 rounded-lg text-slate-500 hover:bg-white font-bold uppercase text-[10px] tracking-widest border-2 border-slate-200"
                            >
                                <ChevronLeft className="mr-1.5 h-3.5 w-3.5" /> Back
                            </Button>
                            <div className="flex items-center gap-3">
                                <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                                    {observation.id.slice(-12).toUpperCase()}
                                </h1>
                                <Badge className="bg-orange-100 text-orange-700 border-orange-200 font-black uppercase text-[9px] px-2 h-6 rounded-md tracking-wider">
                                    {observation.severity.toUpperCase()} RISK
                                </Badge>
                                <Badge className="bg-blue-100 text-blue-700 border-blue-200 font-black uppercase text-[9px] px-2 h-6 rounded-md tracking-wider">
                                    {observation.status.toUpperCase()}
                                </Badge>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                <div className="text-left">
                                    <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest leading-none">TECHNICAL GOVERNANCE</p>
                                    <p className="text-[8px] font-bold text-emerald-600/80 uppercase tracking-widest mt-0.5 leading-none">SYSTEM OPTIMAL</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                                <Button variant="outline" size="sm" className="h-10 px-4 gap-2 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 bg-white">
                                    <MessageSquare className="h-3.5 w-3.5" /> Add Note
                                </Button>
                                <Button variant="outline" size="sm" className="h-10 px-4 gap-2 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 bg-white">
                                    <UploadCloud className="h-3.5 w-3.5" /> Upload Document
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Metadata Readout row */}
                    <div className="px-8 py-3 flex items-center gap-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        <div className="flex items-center gap-2 bg-slate-100/50 px-2 py-1 rounded">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-slate-600">{project?.name || 'SITE TBD'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            <span>Reporter: <span className="text-slate-600">{reporter?.name || 'OFFICIAL RECORD'}</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>{format(parseISO(observation.createdAt), 'dd MMM yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-rose-500">
                            <Clock className="h-3.5 w-3.5" />
                            <span>0 Days Open</span>
                        </div>
                        <div className="flex items-center gap-2 text-blue-600">
                            <Target className="h-3.5 w-3.5" />
                            <span>Target Closure: 30 Sep 2026</span>
                        </div>
                    </div>
                </header>

                {/* --- 2. PROGRESS TIER --- */}
                <section className="h-24 shrink-0 bg-white border-b px-8 flex items-center z-20">
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
                            <div className="max-w-[1500px] mx-auto w-full pb-32">
                                <CapaStageWorkspace observation={observation} stage={viewingStage} />
                            </div>
                        </ScrollArea>

                        {/* BOTTOM ACTION BAR */}
                        <footer className="h-24 shrink-0 bg-white/90 backdrop-blur-md border-t px-10 flex items-center z-30 absolute bottom-0 left-0 right-0 shadow-2xl">
                            <CapaActionFooter observation={observation} stage={viewingStage} />
                        </footer>
                    </main>

                    {/* RIGHT SIDEBAR */}
                    <aside className="w-[380px] shrink-0 border-l bg-white flex flex-col z-20 overflow-y-auto">
                        <CapaRightSidebar observation={observation} />
                    </aside>
                </div>
            </div>
        </FormProvider>
    );
}
