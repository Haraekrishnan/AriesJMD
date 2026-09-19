'use client';

import React, { useState, useMemo } from 'react';
import { 
    ChevronLeft, 
    MessageSquare, 
    Clock, 
    MapPin,
    User,
    Calendar,
    MoreVertical,
    ShieldCheck,
    UploadCloud,
    Target
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

import CapaStepper from './cockpit/CapaStepper';
import CapaRightSidebar from './cockpit/CapaRightSidebar';
import CapaStageWorkspace from './cockpit/CapaStageWorkspace';
import { Progress } from '@/components/ui/progress';

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

    const stats = useMemo(() => {
        const completedCount = STAGES.filter(s => observation.stages[s]?.status === 'Completed').length;
        const percentage = Math.round((completedCount / STAGES.length) * 100);
        return { completedCount, percentage };
    }, [observation]);

    return (
        <FormProvider {...methods}>
            <div className="fixed inset-0 z-40 flex flex-col bg-[#F3F7FB] text-slate-900 font-sans overflow-hidden select-none">
                
                {/* --- 1. EXECUTIVE HEADER --- */}
                <header className="shrink-0 bg-white border-b-4 border-slate-900 px-8 py-4 flex flex-col gap-3 z-30">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={onClose} 
                                className="h-9 px-4 rounded-none text-slate-900 border-2 border-slate-900 bg-white hover:bg-slate-50 font-black uppercase text-[10px] tracking-widest"
                            >
                                <ChevronLeft className="mr-1.5 h-4 w-4" /> Back
                            </Button>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                                    {observation.id.slice(-10).toUpperCase()}
                                </h1>
                                <Badge variant="outline" className="bg-slate-900 text-white border-none font-black uppercase text-[10px] px-3 h-6 rounded-none">
                                    {observation.severity.toUpperCase()} RISK
                                </Badge>
                                <Badge variant="outline" className="bg-blue-600 text-white border-none font-black uppercase text-[10px] px-3 h-6 rounded-none">
                                    {observation.status.toUpperCase()}
                                </Badge>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 mr-6">
                                <div className="bg-slate-900 p-1.5 rounded-none border border-slate-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">TECHNICAL GOVERNANCE</p>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 leading-none">SYSTEM READY</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" className="h-10 px-6 gap-2 text-slate-900 border-2 border-slate-900 bg-white font-black text-[10px] uppercase tracking-widest rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-50">
                                <MessageSquare className="h-4 w-4" /> Add Note
                            </Button>
                            <Button variant="outline" size="sm" className="h-10 px-6 gap-2 text-slate-900 border-2 border-slate-900 bg-white font-black text-[10px] uppercase tracking-widest rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-50">
                                <UploadCloud className="h-4 w-4" /> Upload Document
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{observation.description}</p>
                        <div className="flex items-center gap-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pt-1">
                            <span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-slate-900" /> {project?.name || 'SITE TBD'}</span>
                            <span className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-slate-900" /> Reporter: {reporter?.name || 'N/A'}</span>
                            <span className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-slate-900" /> {format(parseISO(observation.createdAt), 'dd MMM yyyy')}</span>
                            <span className="flex items-center gap-2 text-rose-600"><Clock className="h-3.5 w-3.5" /> 0 Days Open</span>
                            <span className="flex items-center gap-2"><Target className="h-3.5 w-3.5 text-blue-600" /> Target Closure: 30 Sep 2026</span>
                        </div>
                    </div>
                </header>

                {/* --- 2. PROGRESS & STEPPER TIER --- */}
                <section className="h-24 shrink-0 bg-white border-b-2 border-slate-900 px-10 flex items-center gap-16 z-20">
                    <div className="flex flex-col shrink-0 min-w-[200px]">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-3">Overall Compliance</span>
                        <div className="flex items-center gap-6">
                            <span className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{stats.percentage}%</span>
                            <Progress value={stats.percentage} className="h-2 flex-1 bg-slate-200 rounded-none border-2 border-slate-900 shadow-inner" />
                        </div>
                    </div>
                    <div className="h-12 w-1 bg-slate-900 shrink-0" />
                    <CapaStepper currentStage={observation.currentStage} />
                </section>

                {/* --- 3. CORE CONTENT AREA --- */}
                <div className="flex-1 flex overflow-hidden">
                    {/* MAIN WORKSPACE */}
                    <main className="flex-1 flex flex-col overflow-hidden relative bg-[#F3F7FB]">
                        <ScrollArea className="flex-1">
                            <div className="p-8 max-w-[1600px] mx-auto w-full pb-40">
                                <CapaStageWorkspace observation={observation} stage={viewingStage} />
                            </div>
                        </ScrollArea>

                        {/* BOTTOM ACTION BAR */}
                        <footer className="h-20 shrink-0 bg-white border-t-4 border-slate-900 px-8 flex items-center justify-between z-30 absolute bottom-0 left-0 right-0 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
                            <div className="flex items-center gap-12">
                                <div className="flex items-center gap-4">
                                    <div className="h-3 w-3 rounded-none bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Active Milestone</span>
                                        <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{viewingStage}</span>
                                    </div>
                                </div>
                                <div className="h-8 w-px bg-slate-200" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status</span>
                                    <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{observation.stages[viewingStage]?.status || 'PENDING'}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <Button variant="outline" className="h-12 px-8 rounded-none font-black text-[11px] uppercase tracking-widest border-2 border-slate-900 gap-2 hover:bg-slate-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all">
                                    SAVE DRAFT
                                </Button>
                                <Button className="h-12 px-12 rounded-none bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] text-[11px] gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all ml-4">
                                    Submit Finalized Findings
                                </Button>
                            </div>
                        </footer>
                    </main>

                    {/* RIGHT SIDEBAR */}
                    <aside className="w-[380px] shrink-0 border-l-2 border-slate-900 bg-white flex flex-col z-20 overflow-y-auto shadow-[-4px_0px_20px_rgba(0,0,0,0.05)]">
                        <CapaRightSidebar observation={observation} />
                    </aside>
                </div>
            </div>
        </FormProvider>
    );
}
