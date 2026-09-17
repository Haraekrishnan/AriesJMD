'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Check, Circle, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

const STAGES: CapaStage[] = ['Initiation', 'Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'];

interface Props {
    observation: EhsObservation;
    viewingStage: CapaStage;
    onStageSelect: (stage: CapaStage) => void;
}

export default function CapaWorkflowSidebar({ observation, viewingStage, onStageSelect }: Props) {
    const { users } = useAuth();

    const stats = useMemo(() => {
        const completedCount = STAGES.filter(s => observation.stages[s]?.status === 'Completed').length;
        const percentage = Math.round((completedCount / STAGES.length) * 100);
        return { completedCount, percentage };
    }, [observation]);

    return (
        <div className="flex flex-col h-full py-8">
            <div className="px-6 mb-8">
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 mb-8 flex items-center gap-2.5">
                    <ShieldCheck className="h-4 w-4 text-blue-600" /> Case Workflow
                </h3>
                
                <div className="p-5 rounded-2xl bg-white border-2 border-slate-100 shadow-sm space-y-5 text-center">
                    <div className="relative inline-flex items-center justify-center">
                        <svg className="h-24 w-24">
                            <circle className="text-slate-100" strokeWidth="4" stroke="currentColor" fill="transparent" r="40" cx="48" cy="48" />
                            <circle className="text-blue-600 transition-all duration-1000" strokeWidth="4" strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * stats.percentage) / 100} strokeLinecap="round" stroke="currentColor" fill="transparent" r="40" cx="48" cy="48" />
                        </svg>
                        <span className="absolute text-xl font-black text-slate-900">{stats.percentage}%</span>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Progress</p>
                </div>
            </div>

            <ScrollArea className="flex-1 px-4">
                <div className="space-y-1.5 pb-8">
                    {STAGES.map((stage, i) => {
                        const sData = observation.stages[stage];
                        const isCurrent = observation.currentStage === stage;
                        const isViewing = viewingStage === stage;
                        const isCompleted = sData?.status === 'Completed';
                        const isReturned = sData?.status === 'Returned';
                        const isSubmitted = sData?.status === 'In Progress';
                        const assignee = users.find(u => u.id === sData?.assigneeId);

                        return (
                            <div 
                                key={stage}
                                className={cn(
                                    "group relative flex items-center gap-4 px-4 py-3.5 rounded-xl cursor-pointer transition-all duration-200 border-2 border-transparent",
                                    isViewing ? "bg-blue-600 border-blue-500 text-white shadow-xl" : "hover:bg-slate-50"
                                )}
                                onClick={() => onStageSelect(stage)}
                            >
                                <div className={cn(
                                    "h-8 w-8 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all",
                                    isCompleted ? "bg-emerald-500 border-emerald-500 text-white" :
                                    isReturned ? "bg-rose-500 border-rose-500 text-white" :
                                    isViewing ? "bg-white/20 border-white/40 text-white" :
                                    isSubmitted ? "bg-blue-100 border-blue-500 text-blue-600" :
                                    "bg-white border-slate-200 text-slate-400"
                                )}>
                                    {isCompleted ? <Check className="h-4 w-4 stroke-[3]" /> : 
                                     isReturned ? <AlertTriangle className="h-4 w-4" /> :
                                     <span className="text-[10px] font-black">{i + 1}</span>}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className={cn(
                                        "text-[11px] font-black uppercase tracking-tight truncate",
                                        isViewing ? "text-white" : "text-slate-700"
                                    )}>
                                        {stage}
                                    </p>
                                    {isCurrent && assignee && (
                                        <div className={cn(
                                            "text-[9px] font-bold mt-1 uppercase flex items-center gap-1.5",
                                            isViewing ? "text-white/70" : "text-blue-600/80"
                                        )}>
                                            <div className={cn("h-1 w-1 rounded-full", isViewing ? "bg-white" : "bg-blue-600")} />
                                            {assignee.name}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>

            <div className="px-6 mt-auto">
                <div className="p-5 rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Case Metrics</p>
                    <div className="space-y-2.5 text-[10px] font-bold uppercase tracking-tight">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500">Completed</span>
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-none font-black h-5">{stats.completedCount}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500">Milestones Left</span>
                            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-none font-black h-5">{STAGES.length - stats.completedCount}</Badge>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
