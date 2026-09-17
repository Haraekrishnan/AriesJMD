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
        <div className="flex items-center w-full max-w-7xl mx-auto gap-12">
            {/* Progress Visualization */}
            <div className="flex items-center gap-5 shrink-0 border-r border-[#E5EBF2] pr-12">
                <div className="flex flex-col items-start leading-none">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">OVERALL PROGRESS</p>
                    <div className="flex items-center gap-3">
                        <span className="text-xl font-black text-blue-700 leading-none">{stats.percentage}%</span>
                        <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden border">
                            <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${stats.percentage}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Stepper Chain */}
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
                                    "flex flex-col items-center gap-1.5 group cursor-pointer transition-all px-2 rounded-lg",
                                    isFuture && "opacity-30 grayscale"
                                )}
                                onClick={() => onStageSelect(stage)}
                            >
                                <div className={cn(
                                    "h-10 w-10 rounded-full border-2 flex items-center justify-center transition-all shadow-sm",
                                    isCompleted ? "bg-emerald-500 border-emerald-500 text-white" :
                                    isViewing ? "bg-blue-600 border-blue-600 text-white" :
                                    "bg-white border-slate-200 text-slate-300"
                                )}>
                                    {isCompleted ? <Check className="h-5 w-5 stroke-[4]" /> : <span className="text-[11px] font-black">{i + 1}</span>}
                                </div>
                                <div className="text-center leading-tight">
                                    <p className={cn(
                                        "text-[10px] font-black uppercase tracking-tight",
                                        isViewing ? "text-blue-700" : "text-slate-400"
                                    )}>
                                        {stage}
                                    </p>
                                    <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">
                                        {isCompleted ? 'COMPLETED' : isViewing ? 'IN PROGRESS' : 'PENDING'}
                                    </p>
                                </div>
                            </div>
                            {i < STAGES.length - 1 && (
                                <div className={cn(
                                    "flex-1 h-0.5 min-w-[20px] max-w-[60px] mx-2",
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
