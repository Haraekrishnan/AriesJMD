'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Check, Lock, AlertTriangle } from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';

const STAGES: CapaStage[] = ['Initiation', 'Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'];

interface Props {
    observation: EhsObservation;
    viewingStage: CapaStage;
    onStageSelect: (stage: CapaStage) => void;
}

export default function CapaLifecycleStepper({ observation, viewingStage, onStageSelect }: Props) {
    return (
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto overflow-x-auto no-scrollbar">
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
                                "flex items-center gap-3 group cursor-pointer transition-all px-4 py-2 rounded-xl shrink-0",
                                isViewing ? "bg-blue-50" : "hover:bg-slate-50",
                                isFuture && "opacity-40"
                            )}
                            onClick={() => onStageSelect(stage)}
                        >
                            <div className={cn(
                                "h-9 w-9 rounded-full border-2 flex items-center justify-center transition-all shadow-sm",
                                isCompleted ? "bg-emerald-600 border-emerald-600 text-white" :
                                isReturned ? "bg-rose-500 border-rose-500 text-white animate-pulse" :
                                isViewing ? "bg-blue-600 border-blue-600 text-white" :
                                isCurrent ? "bg-white border-blue-600 text-blue-600" :
                                "bg-white border-slate-200 text-slate-300"
                            )}>
                                {isCompleted ? <Check className="h-4 w-4 stroke-[3]" /> : 
                                 isReturned ? <AlertTriangle className="h-4 w-4" /> :
                                 isFuture ? <Lock className="h-3.5 w-3.5" /> :
                                 <span className="text-[10px] font-black">{i + 1}</span>}
                            </div>
                            <div className="text-left leading-tight">
                                <p className={cn(
                                    "text-[9px] font-black uppercase tracking-[0.1em]",
                                    isViewing ? "text-blue-700" : "text-slate-400"
                                )}>
                                    Stage 0{i + 1}
                                </p>
                                <p className={cn(
                                    "text-[11px] font-black uppercase tracking-tight",
                                    isViewing ? "text-blue-900" : "text-slate-600"
                                )}>
                                    {stage}
                                </p>
                            </div>
                        </div>
                        {i < STAGES.length - 1 && (
                            <div className={cn(
                                "flex-1 h-0.5 min-w-[20px] max-w-[60px] rounded-full mx-2 transition-colors duration-500",
                                isCompleted ? "bg-emerald-500" : "bg-slate-100"
                            )} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
