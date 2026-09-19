'use client';

import React from 'react';
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
    return (
        <div className="flex items-center w-full">
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
                                "flex items-center gap-3 cursor-pointer transition-all px-4 py-2 rounded-xl group relative",
                                isViewing ? "bg-blue-50/50" : "hover:bg-slate-50",
                                isFuture && "opacity-40 grayscale pointer-events-none"
                            )}
                            onClick={() => onStageSelect(stage)}
                        >
                            <div className={cn(
                                "h-9 w-9 rounded-full border-2 flex items-center justify-center transition-all text-sm font-black shadow-sm shrink-0",
                                isCompleted ? "bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/20" :
                                isViewing ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-600/30" :
                                "bg-white border-slate-200 text-slate-400"
                            )}>
                                {isCompleted ? <Check className="h-4 w-4 stroke-[4]" /> : <span>{i + 1}</span>}
                            </div>
                            <div className="flex flex-col text-left leading-tight">
                                <p className={cn(
                                    "text-[10px] font-black uppercase tracking-widest whitespace-nowrap",
                                    isViewing ? "text-blue-600" : "text-slate-600"
                                )}>
                                    {stage}
                                </p>
                                <p className={cn(
                                    "text-[8px] font-bold uppercase",
                                    isCompleted ? "text-emerald-500" : isViewing ? "text-blue-600" : "text-slate-300"
                                )}>
                                    {isCompleted ? 'Completed' : isViewing ? 'In Progress' : 'Pending'}
                                </p>
                            </div>
                        </div>
                        {i < STAGES.length - 1 && (
                            <div className="h-px bg-slate-200 flex-1 min-w-[20px] mx-2" />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

