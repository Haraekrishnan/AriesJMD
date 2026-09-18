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
        <div className="flex items-center w-full gap-12">
            {/* Progress Circular Display */}
            <div className="flex items-center gap-4 shrink-0 min-w-[140px]">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Overall Progress</span>
                    <div className="flex items-center gap-3">
                        <span className="text-2xl font-black text-blue-600 leading-none">{stats.percentage}%</span>
                        <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden border">
                            <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${stats.percentage}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Stepper Chain */}
            <div className="flex items-center justify-between flex-1 overflow-x-auto no-scrollbar py-2">
                {STAGES.map((stage, i) => {
                    const sData = observation.stages[stage];
                    const isViewing = viewingStage === stage;
                    const isCompleted = sData?.status === 'Completed';
                    const isFuture = STAGES.indexOf(stage) > STAGES.indexOf(observation.currentStage);

                    return (
                        <React.Fragment key={stage}>
                            <div 
                                className={cn(
                                    "flex items-center gap-3 cursor-pointer transition-all px-2 border-b-2 py-2",
                                    isViewing ? "border-blue-600" : "border-transparent opacity-60 grayscale hover:opacity-100 hover:grayscale-0",
                                    isFuture && "pointer-events-none opacity-20"
                                )}
                                onClick={() => onStageSelect(stage)}
                            >
                                <div className={cn(
                                    "h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all text-xs font-black shadow-sm",
                                    isCompleted ? "bg-emerald-500 border-emerald-500 text-white" :
                                    isViewing ? "bg-blue-600 border-blue-600 text-white" :
                                    "bg-white border-slate-200 text-slate-400"
                                )}>
                                    {isCompleted ? <Check className="h-4 w-4 stroke-[4]" /> : <span>{i + 1}</span>}
                                </div>
                                <div className="flex flex-col leading-tight">
                                    <p className={cn(
                                        "text-[10px] font-black uppercase tracking-widest",
                                        isViewing ? "text-blue-700" : "text-slate-500"
                                    )}>
                                        {stage}
                                    </p>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                                        {isCompleted ? 'Completed' : isViewing ? 'In Progress' : 'Pending'}
                                    </p>
                                </div>
                            </div>
                            {i < STAGES.length - 1 && (
                                <div className="h-0.5 w-6 bg-slate-200 mx-1 shrink-0" />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}
