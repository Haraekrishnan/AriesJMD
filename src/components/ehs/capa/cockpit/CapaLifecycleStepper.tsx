'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Check, Circle } from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { Progress } from '@/components/ui/progress';

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
        <div className="flex items-center w-full gap-16 text-left">
            {/* Progress Display */}
            <div className="flex flex-col shrink-0 min-w-[180px]">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-3">Overall Progress</span>
                <div className="flex items-center gap-5">
                    <span className="text-3xl font-black text-blue-600 tracking-tighter leading-none">{stats.percentage}%</span>
                    <Progress value={stats.percentage} className="h-1.5 flex-1 bg-slate-100 rounded-full" />
                </div>
            </div>

            {/* Stepper Path */}
            <div className="flex items-center flex-1 justify-between max-w-5xl">
                {STAGES.map((stage, i) => {
                    const sData = observation.stages[stage];
                    const isViewing = viewingStage === stage;
                    const isCompleted = sData?.status === 'Completed';
                    const isCurrent = observation.currentStage === stage;
                    const isFuture = STAGES.indexOf(stage) > STAGES.indexOf(observation.currentStage);

                    return (
                        <React.Fragment key={stage}>
                            <div 
                                className={cn(
                                    "flex flex-col items-center gap-2 cursor-pointer transition-all px-2",
                                    isViewing ? "scale-110" : "hover:opacity-80",
                                    isFuture && "opacity-30 grayscale pointer-events-none"
                                )}
                                onClick={() => onStageSelect(stage)}
                            >
                                <div className={cn(
                                    "h-10 w-10 rounded-full border-2 flex items-center justify-center transition-all text-[11px] font-black shadow-sm relative",
                                    isCompleted ? "bg-emerald-500 border-emerald-500 text-white" :
                                    isViewing ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30" :
                                    "bg-white border-slate-200 text-slate-400"
                                )}>
                                    {isCompleted ? <Check className="h-5 w-5 stroke-[4]" /> : <span>{i + 1}</span>}
                                    {isCurrent && !isCompleted && (
                                        <div className="absolute inset-0 rounded-full border-2 border-blue-600 animate-ping opacity-20" />
                                    )}
                                </div>
                                <div className="text-center">
                                    <p className={cn(
                                        "text-[9px] font-black uppercase tracking-widest whitespace-nowrap",
                                        isViewing ? "text-blue-600" : "text-slate-400"
                                    )}>
                                        {stage}
                                    </p>
                                </div>
                            </div>
                            {i < STAGES.length - 1 && (
                                <div className="h-0.5 bg-slate-100 flex-1 mx-2 min-w-[20px] relative">
                                    <div 
                                        className={cn(
                                            "absolute inset-0 bg-emerald-500 transition-all duration-1000",
                                            isCompleted ? "w-full" : "w-0"
                                        )} 
                                    />
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}