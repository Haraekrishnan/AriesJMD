'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
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
            {/* Progress Intelligence */}
            <div className="flex items-center gap-6 shrink-0 border-r-2 border-slate-900 pr-12">
                <div className="flex flex-col items-start leading-none">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">OVERALL PROGRESS</p>
                    <div className="flex items-center gap-4">
                        <span className="text-2xl font-black text-blue-700 leading-none">{stats.percentage}%</span>
                        <div className="h-2 w-20 bg-slate-200 border-2 border-slate-900 rounded-none overflow-hidden">
                            <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${stats.percentage}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Stepper Chain: Rigid Nodes */}
            <div className="flex items-center justify-between flex-1 overflow-x-auto no-scrollbar">
                {STAGES.map((stage, i) => {
                    const sData = observation.stages[stage];
                    const isViewing = viewingStage === stage;
                    const isCompleted = sData?.status === 'Completed';
                    const isFuture = STAGES.indexOf(stage) > STAGES.indexOf(observation.currentStage);

                    return (
                        <React.Fragment key={stage}>
                            <div 
                                className={cn(
                                    "flex flex-col items-center gap-2 group cursor-pointer transition-all px-2",
                                    isFuture && "opacity-30 grayscale"
                                )}
                                onClick={() => onStageSelect(stage)}
                            >
                                <div className={cn(
                                    "h-10 w-10 border-2 flex items-center justify-center transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
                                    isCompleted ? "bg-emerald-500 border-slate-900 text-white" :
                                    isViewing ? "bg-blue-600 border-slate-900 text-white" :
                                    "bg-white border-slate-300 text-slate-400"
                                )}>
                                    {isCompleted ? <Check className="h-5 w-5 stroke-[4]" /> : <span className="text-xs font-black">{i + 1}</span>}
                                </div>
                                <div className="text-center leading-tight">
                                    <p className={cn(
                                        "text-[10px] font-black uppercase tracking-widest",
                                        isViewing ? "text-blue-700" : "text-slate-900"
                                    )}>
                                        {stage}
                                    </p>
                                </div>
                            </div>
                            {i < STAGES.length - 1 && (
                                <div className={cn(
                                    "flex-1 h-0.5 min-w-[20px] max-w-[60px] mx-2",
                                    isCompleted ? "bg-slate-900" : "bg-slate-200"
                                )} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}
