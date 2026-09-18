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
    ShieldAlert
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
                {/* --- 1. EXECUTIVE HEADER: OLD SCHOOL RIGID --- */}
                <header className="h-[75px] shrink-0 bg-white border-b-2 border-slate-900 px-8 flex items-center justify-between z-30">
                    <div className="flex items-center gap-6">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={onClose} 
                            className="h-9 w-9 text-slate-900 hover:bg-slate-100 border-2 border-slate-900 rounded-none"
                        >
                            <ChevronLeft className="h-5 w-5 stroke-[3]" />
                        </Button>
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <h1 className="text-xl font-black tracking-tighter text-slate-900 uppercase">
                                    CAPA-26-{observation.id.slice(-5).toUpperCase()}
                                </h1>
                                <Badge variant="outline" className={cn(
                                    "font-black uppercase text-[10px] tracking-widest h-6 px-3 border-2 rounded-none",
                                    observation.severity === 'High' || observation.severity === 'Critical' ? "text-white bg-rose-600 border-rose-600" : "text-slate-900 bg-amber-400 border-amber-400"
                                )}>
                                    {observation.severity} RISK
                                </Badge>
                                <Badge className="bg-blue-600 text-white font-black text-[10px] h-6 uppercase px-4 rounded-none border-none tracking-[0.2em]">{observation.status}</Badge>
                            </div>
                            <div className="flex items-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-slate-900" /> {project?.name || 'N/A'}</span>
                                <span className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-slate-900" /> {reporter?.name || 'N/A'}</span>
                                <span className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-slate-900" /> {format(parseISO(observation.createdAt), 'dd MMM yyyy')}</span>
                                <span className="flex items-center gap-2 text-slate-900 font-black"><Clock className="h-3.5 w-3.5" /> {daysOpen} DAYS OPEN</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="h-10 px-6 rounded-none border-2 border-slate-900 font-black text-[11px] uppercase tracking-widest gap-2 bg-white">
                            <MessageSquare className="h-4 w-4" /> COMMENT
                        </Button>
                        <Button variant="outline" className="h-10 px-6 rounded-none border-2 border-slate-900 font-black text-[11px] uppercase tracking-widest gap-2 bg-white">
                            <Paperclip className="h-4 w-4" /> DOCUMENT
                        </Button>
                    </div>
                </header>

                {/* --- 2. LIFECYCLE PROGRESS STEPPER --- */}
                <section className="h-[75px] shrink-0 bg-white border-b-2 border-slate-900 px-8 flex items-center z-20">
                    <CapaLifecycleStepper 
                        observation={observation} 
                        viewingStage={viewingStage} 
                        onStageSelect={setViewingStage} 
                    />
                </section>

                {/* --- 3. CORE WORKSPACE --- */}
                <div className="flex-1 flex overflow-hidden">
                    <main className="flex-1 flex flex-col overflow-hidden relative bg-slate-100">
                        <ScrollArea className="flex-1">
                            <div className="p-8 max-w-[1400px] mx-auto w-full">
                                <CapaStageWorkspace 
                                    observation={observation} 
                                    stage={viewingStage} 
                                />
                            </div>
                        </ScrollArea>

                        <footer className="h-[75px] shrink-0 bg-white border-t-2 border-slate-900 px-8 flex items-center z-30">
                            <CapaActionFooter observation={observation} stage={viewingStage} />
                        </footer>
                    </main>

                    <aside className="w-[450px] shrink-0 bg-white border-l-2 border-slate-900 flex flex-col overflow-hidden">
                        <CapaCaseInformation observation={observation} />
                    </aside>
                </div>
            </div>
        </FormProvider>
    );
}
