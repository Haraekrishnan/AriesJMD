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
    Activity,
    Plus,
    FileText,
    Bell,
    Save,
    ArrowRight,
    MoreVertical,
    Paperclip
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
    
    // Find active step data
    const sData = observation.stages[viewingStage];
    const assignee = users.find(u => u.id === sData?.assigneeId);

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
                
                {/* --- 1. DUAL-TIER EXECUTIVE HEADER --- */}
                <header className="shrink-0 bg-white border-b z-30 shadow-sm flex flex-col">
                    {/* Tier 1: Case Identity & Hub */}
                    <div className="px-8 py-3 flex items-center justify-between bg-white">
                        <div className="flex items-center gap-6">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={onClose} 
                                className="h-8 px-3 rounded-md text-slate-600 hover:bg-slate-50 border-slate-200"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="flex items-center gap-3">
                                <h1 className="text-lg font-black text-slate-900 tracking-tighter uppercase leading-none">
                                    {observation.id.slice(-12).toUpperCase()}
                                </h1>
                                <Badge className="bg-amber-100 text-amber-700 border-none font-black uppercase text-[9px] px-2.5 h-6 rounded-md tracking-widest">
                                    MEDIUM RISK
                                </Badge>
                                <Badge className="bg-blue-600 text-white border-none font-black uppercase text-[9px] px-3 h-6 rounded-md tracking-widest">
                                    {observation.status.toUpperCase()}
                                </Badge>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex flex-col text-right leading-none mr-4">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">A SAFER WORKPLACE</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">A HEALTHIER TOMORROW</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" className="h-9 px-4 gap-2 text-slate-700 rounded-lg font-bold text-xs border-slate-200 bg-white hover:bg-slate-50">
                                    <MessageSquare className="h-4 w-4 text-slate-400" /> Comment
                                </Button>
                                <Button variant="outline" className="h-9 px-4 gap-2 text-slate-700 rounded-lg font-bold text-xs border-slate-200 bg-white hover:bg-slate-50">
                                    <Paperclip className="h-4 w-4 text-slate-400" /> Document
                                </Button>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg border-slate-200">
                                    <MoreVertical className="h-4 w-4 text-slate-400" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Tier 2: Metadata Ribbon */}
                    <div className="px-8 py-2.5 flex items-center gap-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-50/50 border-t">
                        <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-slate-300" />
                            <span className="text-slate-600 font-black">{project?.name || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-slate-300" />
                            <span><span className="text-slate-400">Reporter:</span> <span className="text-slate-600 font-black">{reporter?.name || 'OFFICIAL RECORD'}</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-slate-300" />
                            <span>{format(parseISO(observation.createdAt), 'dd MMM yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-slate-300" />
                            <span>1 Days Open</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Target className="h-3.5 w-3.5 text-slate-300" />
                            <span>Target Closure: —</span>
                        </div>
                    </div>
                </header>

                {/* --- 2. INTEGRATED PROGRESS & LIFECYCLE TIER --- */}
                <section className="h-24 shrink-0 bg-white border-b px-10 flex items-center justify-between z-20 shadow-sm">
                    <div className="flex items-center gap-10 w-full">
                        {/* Progress Meter */}
                        <div className="flex flex-col shrink-0">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Overall Progress</span>
                            <div className="flex items-center gap-3">
                                <span className="text-2xl font-black text-blue-600 tracking-tighter leading-none">{progress}%</span>
                                <div className="w-40 h-1.5 bg-slate-100 rounded-full overflow-hidden border">
                                    <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${progress}%` }} />
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
                </section>

                {/* --- 3. MAIN WORKSPACE --- */}
                <div className="flex-1 flex overflow-hidden">
                    <main className="flex-1 flex flex-col overflow-hidden relative bg-[#F8FAFC]">
                        <ScrollArea className="flex-1">
                            <div className="p-10 space-y-10">
                                
                                {/* Milestone Header Card */}
                                <div className="p-8 rounded-[1.5rem] bg-white border border-slate-200 shadow-sm flex items-center justify-between relative overflow-hidden">
                                    <div className="flex items-center gap-8">
                                        <div className="h-14 w-14 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-blue-500/20">
                                            {String(STAGES.indexOf(viewingStage) + 1).padStart(2, '0')}
                                        </div>
                                        <div>
                                            <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-none mb-2">{viewingStage}</h3>
                                            <p className="text-sm font-medium text-slate-500 leading-none">Determine what happened, why it happened and identify the root cause.</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-12 text-right">
                                        {assignee && (
                                            <div className="flex flex-col items-end">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">OWNER</p>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex flex-col">
                                                        <p className="text-xs font-black text-slate-900 uppercase leading-none">{assignee.name}</p>
                                                        <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mt-1">Not Supervisor</p>
                                                    </div>
                                                    <Avatar className="h-10 w-10 border-2 border-slate-100 shadow-sm">
                                                        <AvatarImage src={assignee.avatar} />
                                                        <AvatarFallback className="font-black text-xs bg-slate-900 text-white">{assignee.name[0]}</AvatarFallback>
                                                    </Avatar>
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex flex-col items-end">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">TARGET DELIVERY</p>
                                            <div className="flex items-center gap-2 text-blue-600">
                                                <Clock className="h-5 w-5" />
                                                <span className="text-xl font-black tracking-tighter">TBD</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Core Workspace */}
                                <CapaStageWorkspace observation={observation} stage={viewingStage} />
                            </div>
                        </ScrollArea>

                        {/* FIXED ACTION FOOTER */}
                        <footer className="h-20 shrink-0 bg-white border-t px-10 flex items-center z-40 shadow-sm">
                            <CapaActionFooter observation={observation} stage={viewingStage} />
                        </footer>
                    </main>

                    {/* INTELLIGENCE SIDEBAR */}
                    <aside className="w-[360px] shrink-0 border-l bg-white flex flex-col z-20 overflow-hidden relative">
                        <ScrollArea className="h-full">
                           <CapaRightSidebar observation={observation} activeStage={viewingStage} />
                        </ScrollArea>
                    </aside>
                </div>
            </div>
        </FormProvider>
    );
}

