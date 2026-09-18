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
    CheckCircle2
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
                <header className="shrink-0 bg-white border-b px-8 py-4 flex flex-col gap-4 z-30 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={onClose} 
                                className="h-8 w-8 text-slate-400 hover:text-slate-900"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                            <div className="flex items-center gap-3">
                                <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                                    CAPA-26-{observation.id.slice(-5).toUpperCase()}
                                </h1>
                                <Badge variant="outline" className={cn(
                                    "font-black uppercase text-[10px] tracking-widest h-5 px-2 bg-amber-100 border-amber-200 text-amber-700 rounded",
                                    (observation.severity === 'High' || observation.severity === 'Critical') && "bg-rose-100 border-rose-200 text-rose-700"
                                )}>
                                    {observation.severity} RISK
                                </Badge>
                                <Badge className="bg-blue-100 text-blue-700 font-black text-[10px] h-5 uppercase px-3 border-blue-200 rounded tracking-widest">
                                    {observation.status}
                                </Badge>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="text-right hidden lg:block">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">A SAFER WORKPLACE</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 leading-none">A HEALTHIER TOMORROW</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" className="h-9 px-4 rounded-lg font-bold text-xs gap-2 border-slate-200 text-slate-700 shadow-sm">
                                    <MessageSquare className="h-4 w-4 text-blue-600" /> Comment
                                </Button>
                                <Button variant="outline" className="h-9 px-4 rounded-lg font-bold text-xs gap-2 border-slate-200 text-slate-700 shadow-sm">
                                    <Paperclip className="h-4 w-4 text-blue-600" /> Document
                                </Button>
                                <Button variant="outline" size="icon" className="h-9 w-9 border-slate-200">
                                    <MoreVertical className="h-4 w-4 text-slate-400" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-8 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-t pt-3">
                        <span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {project?.name || 'KITCHEN DUTY'}</span>
                        <span className="flex items-center gap-2"><User className="h-3.5 w-3.5" /> {reporter?.name || 'N/A'}</span>
                        <span className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> {format(parseISO(observation.createdAt), 'dd MMM yyyy')}</span>
                        <span className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> {daysOpen} DAYS OPEN</span>
                        <span className="flex items-center gap-2"><Target className="h-3.5 w-3.5" /> TARGET CLOSURE: —</span>
                    </div>
                </header>

                {/* --- 2. PROGRESS STEPPER --- */}
                <section className="h-20 shrink-0 bg-white border-b px-8 flex items-center z-20">
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
                            <div className="p-8 max-w-[1400px] mx-auto w-full pb-32">
                                <CapaStageWorkspace 
                                    observation={observation} 
                                    stage={viewingStage} 
                                />
                            </div>
                        </ScrollArea>

                        <footer className="h-16 shrink-0 bg-white border-t px-8 flex items-center z-30 absolute bottom-0 left-0 right-0">
                            <CapaActionFooter observation={observation} stage={viewingStage} />
                        </footer>
                    </main>

                    <aside className="w-[320px] shrink-0 bg-white border-l flex flex-col overflow-hidden shadow-2xl">
                        <CapaCaseInformation observation={observation} />
                    </aside>
                </div>
            </div>
        </FormProvider>
    );
}
