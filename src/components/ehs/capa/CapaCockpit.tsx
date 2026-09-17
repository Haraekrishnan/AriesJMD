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
                <header className="h-[75px] shrink-0 bg-white border-b border-[#E5EBF2] px-8 flex items-center justify-between z-30">
                    <div className="flex items-center gap-6">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={onClose} 
                            className="h-8 w-8 text-slate-400 hover:text-slate-900 border border-slate-200 rounded"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <h1 className="text-lg font-black tracking-tight text-[#071B33]">
                                    CAPA-26-{observation.id.slice(-5).toUpperCase()}
                                </h1>
                                <Badge variant="outline" className={cn(
                                    "font-black uppercase text-[9px] tracking-wider h-5 px-3 border rounded-sm",
                                    observation.severity === 'High' || observation.severity === 'Critical' ? "text-rose-600 bg-rose-50" : "text-amber-600 bg-amber-50"
                                )}>
                                    {observation.severity} RISK
                                </Badge>
                                <Badge className="bg-blue-100 text-blue-700 font-black text-[9px] h-5 uppercase px-3 rounded-sm border-none tracking-widest">{observation.status}</Badge>
                            </div>
                            <div className="flex items-center gap-5 text-[10px] font-bold text-slate-400 uppercase">
                                <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {project?.name || 'N/A'}</span>
                                <span className="flex items-center gap-1.5"><User className="h-3 w-3" /> {reporter?.name || 'N/A'}</span>
                                <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> {format(parseISO(observation.createdAt), 'dd MMM yyyy')}</span>
                                <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {daysOpen} DAYS OPEN</span>
                                <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> TARGET CLOSURE: —</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden lg:flex flex-col text-right leading-none mr-4">
                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">A SAFER WORKPLACE</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">A HEALTHIER TOMORROW</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" className="h-9 px-4 rounded-lg border-2 font-black text-[10px] uppercase tracking-wider gap-2">
                                <MessageSquare className="h-3.5 w-3.5" /> COMMENT
                            </Button>
                            <Button variant="outline" className="h-9 px-4 rounded-lg border-2 font-black text-[10px] uppercase tracking-wider gap-2">
                                <Paperclip className="h-3.5 w-3.5" /> EVIDENCE
                            </Button>
                            <Button variant="ghost" size="icon" className="h-9 w-9">
                                <MoreVertical className="h-4 w-4 text-slate-400" />
                            </Button>
                        </div>
                    </div>
                </header>

                {/* --- 2. LIFECYCLE PROGRESS STEPPER --- */}
                <section className="h-[75px] shrink-0 bg-white border-b border-[#E5EBF2] px-8 flex items-center z-20 shadow-sm">
                    <CapaLifecycleStepper 
                        observation={observation} 
                        viewingStage={viewingStage} 
                        onStageSelect={setViewingStage} 
                    />
                </section>

                {/* --- 3. CORE WORKSPACE --- */}
                <div className="flex-1 flex overflow-hidden">
                    <main className="flex-1 flex flex-col overflow-hidden relative bg-[#F3F7FB]">
                        <ScrollArea className="flex-1">
                            <div className="p-6 max-w-[1400px] mx-auto w-full">
                                <CapaStageWorkspace 
                                    observation={observation} 
                                    stage={viewingStage} 
                                />
                            </div>
                        </ScrollArea>

                        <footer className="h-[70px] shrink-0 bg-white border-t border-[#D9E2EC] px-8 flex items-center z-30">
                            <CapaActionFooter observation={observation} stage={viewingStage} />
                        </footer>
                    </main>

                    <aside className="w-[420px] shrink-0 bg-white border-l border-[#E5EBF2] flex flex-col overflow-hidden">
                        <CapaCaseInformation observation={observation} />
                    </aside>
                </div>
            </div>
        </FormProvider>
    );
}
