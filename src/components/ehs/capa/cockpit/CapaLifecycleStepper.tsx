
'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Check, Lock, AlertTriangle, Activity } from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';

const STAGES: CapaStage[] = ['Initiation', 'Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'];

interface Props {
    observation: EhsObservation;
    viewingStage: CapaStage;
    onStageSelect: (stage: CapaStage) => void;
}

export default function CapaLifecycleStepper({ observation, viewingStage, onStageSelect }: Props) {
    const stats = useMemo(() => {
        const completedCount = STAGES.filter(s => observation.stages[s]?.status === 'Completed').length;
        const percentage = Math.round((completedCount / STAGES.length) * 100);
        return { completedCount, percentage };
    }, [observation]);

    return (
        <div className="flex items-center w-full max-w-7xl mx-auto gap-8">
            {/* --- PROGRESS BLOCK --- */}
            <div className="flex items-center gap-4 shrink-0 border-r border-slate-200 pr-8">
                <div className="flex flex-col items-start leading-none">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1.5 flex items-center gap-2">
                        <Activity className="h-3 w-3" /> PROGRESS
                    </p>
                    <span className="text-xl font-black text-blue-600 leading-none">{stats.percentage}%</span>
                </div>
                <div className="h-10 w-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className="w-full bg-blue-600 transition-all duration-1000" style={{ height: `${stats.percentage}%` }} />
                </div>
            </div>

            {/* --- STEPPER --- */}
            <div className="flex items-center justify-between flex-1 overflow-x-auto no-scrollbar">
                {STAGES.map((stage, i) => {
                    const sData = observation.stages[stage];
                    const isCurrent = observation.currentStage === stage;
                    const isViewing = viewingStage === stage;
                    const isCompleted = sData?.status === 'Completed';
                    const isReturned = sData?.status === 'Returned';
                    const isFuture = STAGES.indexOf(stage) > STAGES.indexOf(observation.currentStage);

                    return (
                        <React.Fragment key={stage}>
                            <div 
                                className={cn(
                                    "flex items-center gap-3 group cursor-pointer transition-all px-3 py-1.5 rounded-lg shrink-0",
                                    isViewing ? "bg-blue-50 border border-blue-200 shadow-sm" : "hover:bg-slate-50",
                                    isFuture && "opacity-40 grayscale"
                                )}
                                onClick={() => onStageSelect(stage)}
                            >
                                <div className={cn(
                                    "h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all shadow-sm",
                                    isCompleted ? "bg-emerald-600 border-emerald-600 text-white" :
                                    isReturned ? "bg-rose-600 border-rose-600 text-white" :
                                    isViewing ? "bg-blue-600 border-blue-600 text-white" :
                                    isCurrent ? "bg-white border-blue-600 text-blue-600" :
                                    "bg-white border-slate-200 text-slate-300"
                                )}>
                                    {isCompleted ? <Check className="h-4 w-4 stroke-[3]" /> : 
                                    isReturned ? <AlertTriangle className="h-4 w-4" /> :
                                    isFuture ? <Lock className="h-3 w-3 opacity-50" /> :
                                    <span className="text-[10px] font-black">{i + 1}</span>}
                                </div>
                                <div className="text-left leading-tight hidden xl:block">
                                    <p className={cn(
                                        "text-[8px] font-black uppercase tracking-[0.2em] mb-0.5",
                                        isViewing ? "text-blue-600" : "text-slate-400"
                                    )}>
                                        PHASE {i + 1}
                                    </p>
                                    <p className={cn(
                                        "text-[10px] font-black uppercase tracking-tight",
                                        isViewing ? "text-slate-900" : "text-slate-500"
                                    )}>
                                        {stage}
                                    </p>
                                </div>
                            </div>
                            {i < STAGES.length - 1 && (
                                <div className={cn(
                                    "flex-1 h-0.5 min-w-[10px] max-w-[40px] mx-1",
                                    isCompleted ? "bg-emerald-400" : "bg-slate-100"
                                )} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}
