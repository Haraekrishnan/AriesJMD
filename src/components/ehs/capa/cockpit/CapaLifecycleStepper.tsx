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
        <div className="flex items-center justify-between w-full max-w-6xl mx-auto overflow-x-auto no-scrollbar py-1">
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
                                "flex items-center gap-3 group cursor-pointer transition-all px-3 py-1.5 rounded shrink-0",
                                isViewing ? "bg-slate-50 border border-slate-200" : "hover:bg-slate-50",
                                isFuture && "opacity-50"
                            )}
                            onClick={() => onStageSelect(stage)}
                        >
                            <div className={cn(
                                "h-9 w-9 rounded-full border flex items-center justify-center transition-all",
                                isCompleted ? "bg-emerald-600 border-emerald-600 text-white" :
                                isReturned ? "bg-red-600 border-red-600 text-white" :
                                isViewing ? "bg-blue-600 border-blue-600 text-white" :
                                isCurrent ? "bg-white border-blue-600 text-blue-600" :
                                "bg-white border-slate-300 text-slate-400"
                            )}>
                                {isCompleted ? <Check className="h-4 w-4 stroke-[3]" /> : 
                                 isReturned ? <AlertTriangle className="h-4 w-4" /> :
                                 isFuture ? <Lock className="h-3 w-3 opacity-50" /> :
                                 <span className="text-[11px] font-black">{i + 1}</span>}
                            </div>
                            <div className="text-left leading-tight hidden sm:block">
                                <p className={cn(
                                    "text-[8px] font-black uppercase tracking-wider mb-0.5",
                                    isViewing ? "text-blue-600" : "text-slate-400"
                                )}>
                                    PHASE {i + 1}
                                </p>
                                <p className={cn(
                                    "text-[10px] font-bold uppercase tracking-tight",
                                    isViewing ? "text-slate-900" : "text-slate-500"
                                )}>
                                    {stage}
                                </p>
                            </div>
                        </div>
                        {i < STAGES.length - 1 && (
                            <div className={cn(
                                "flex-1 h-px min-w-[10px] max-w-[40px] mx-1",
                                isCompleted ? "bg-emerald-400" : "bg-slate-200"
                            )} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}