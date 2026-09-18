'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { 
    ChevronLeft, 
    MessageSquare, 
    Clock, 
    MapPin,
    User,
    Calendar,
    Paperclip,
    FileText,
    MoreVertical,
    ShieldAlert,
    Target,
    Download,
    Share2,
    CheckCircle2,
    Activity,
    ShieldCheck
} from 'lucide-react';
import { format, parseISO, differenceInDays, isValid } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { useForm, FormProvider } from 'react-hook-form';

import CapaLifecycleStepper from './cockpit/CapaLifecycleStepper';
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
    
    const methods = useForm({
        defaultValues: observation.stages[viewingStage]?.data || {}
    });

    useEffect(() => {
        methods.reset(observation.stages[viewingStage]?.data || {});
    }, [viewingStage, observation.id, methods]);

    const daysOpen = useMemo(() => {
        if (!observation.createdAt) return 0;
        const created = parseISO(observation.createdAt);
        return isValid(created) ? Math.max(0, differenceInDays(new Date(), created)) : 0;
    }, [observation.createdAt]);

    return (
        <FormProvider {...methods}>
            <div className="fixed inset-0 z-40 flex flex-col bg-[#F3F7FB] text-slate-900 font-sans overflow-hidden">
                
                {/* --- 1. EXECUTIVE HEADER --- */}
                <header className="shrink-0 bg-white border-b-2 border-slate-900 px-8 py-4 flex flex-col gap-3 z-30 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={onClose} 
                                className="h-8 w-8 text-slate-900 hover:bg-slate-100 rounded-none border border-slate-200"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                            <div className="flex items-center gap-3">
                                <div className="bg-slate-900 text-white px-3 py-1 font-black text-sm tracking-tighter uppercase border-2 border-slate-900">
                                    CAPA-26-{observation.id.slice(-5).toUpperCase()}
                                </div>
                                <Badge variant="outline" className={cn(
                                    "font-black uppercase text-[10px] tracking-[0.2em] h-6 px-3 bg-amber-50 border-2 border-amber-500 text-amber-700 rounded-none",
                                    (observation.severity === 'High' || observation.severity === 'Critical') && "bg-rose-50 border-rose-500 text-rose-700"
                                )}>
                                    {observation.severity} RISK
                                </Badge>
                                <Badge className="bg-blue-600 text-white font-black text-[10px] h-6 uppercase px-4 border-none rounded-none tracking-widest">
                                    {observation.status}
                                </Badge>
                            </div>
                        </div>

                        <div className="flex items-center gap-8">
                            <div className="text-right hidden lg:block">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] leading-none">A SAFER WORKPLACE</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1.5 leading-none">A HEALTHIER TOMORROW</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" className="h-10 px-6 rounded-none font-black text-[10px] uppercase tracking-widest gap-2 border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] bg-white active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all">
                                    <MessageSquare className="h-4 w-4 text-[#2563EB]" /> Comment
                                </Button>
                                <Button variant="outline" className="h-10 px-6 rounded-none font-black text-[10px] uppercase tracking-widest gap-2 border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] bg-white active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all">
                                    <Paperclip className="h-4 w-4 text-[#2563EB]" /> Document
                                </Button>
                                <Button variant="outline" size="icon" className="h-10 w-10 border-2 border-slate-900 rounded-none">
                                    <MoreVertical className="h-5 w-5 text-slate-900" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-10 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] pt-1">
                        <span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-[#2563EB]" /> {project?.name || 'KITCHEN DUTY'}</span>
                        <span className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-[#2563EB]" /> {reporter?.name || 'N/A'}</span>
                        <span className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-[#2563EB]" /> {format(parseISO(observation.createdAt), 'dd MMM yyyy')}</span>
                        <span className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-[#2563EB]" /> {daysOpen} DAYS OPEN</span>
                        <span className="flex items-center gap-2"><Target className="h-3.5 w-3.5 text-[#2563EB]" /> TARGET CLOSURE: —</span>
                    </div>
                </header>

                {/* --- 2. PROGRESS STEPPER --- */}
                <section className="h-20 shrink-0 bg-white border-b-2 border-slate-900 px-8 flex items-center z-20 overflow-x-auto no-scrollbar">
                    <CapaLifecycleStepper 
                        observation={observation} 
                        viewingStage={viewingStage} 
                        onStageSelect={setViewingStage} 
                    />
                </section>

                {/* --- 3. CORE WORKSPACE & SIDEBAR --- */}
                <div className="flex-1 flex overflow-hidden">
                    <main className="flex-1 flex flex-col overflow-hidden relative">
                        <ScrollArea className="flex-1">
                            <div className="p-10 max-w-[1500px] mx-auto w-full pb-32">
                                <CapaStageWorkspace 
                                    observation={observation} 
                                    stage={viewingStage} 
                                />
                            </div>
                        </ScrollArea>

                        <footer className="h-16 shrink-0 bg-white border-t-2 border-slate-900 px-8 flex items-center z-30 absolute bottom-0 left-0 right-0">
                            <CapaActionFooter observation={observation} stage={viewingStage} />
                        </footer>
                    </main>

                    <aside className="w-[340px] shrink-0 bg-white flex flex-col overflow-hidden">
                        <CapaCaseInformation observation={observation} />
                    </aside>
                </div>
            </div>
        </FormProvider>
    );
}
