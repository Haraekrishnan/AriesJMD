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
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto overflow-x-auto no-scrollbar py-2">
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
                                "flex items-center gap-4 group cursor-pointer transition-all px-4 py-2 rounded-xl shrink-0",
                                isViewing ? "bg-slate-50 ring-1 ring-slate-100" : "hover:bg-slate-50",
                                isFuture && "opacity-40"
                            )}
                            onClick={() => onStageSelect(stage)}
                        >
                            <div className={cn(
                                "h-11 w-11 rounded-full border-2 flex items-center justify-center transition-all",
                                isCompleted ? "bg-emerald-500 border-emerald-500 text-white" :
                                isReturned ? "bg-rose-500 border-rose-500 text-white" :
                                isViewing ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/20" :
                                isCurrent ? "bg-white border-blue-600 text-blue-600" :
                                "bg-white border-slate-200 text-slate-300"
                            )}>
                                {isCompleted ? <Check className="h-5 w-5 stroke-[4]" /> : 
                                 isReturned ? <AlertTriangle className="h-5 w-5" /> :
                                 isFuture ? <Lock className="h-4 w-4 opacity-50" /> :
                                 <span className="text-xs font-black">{i + 1}</span>}
                            </div>
                            <div className="text-left leading-tight">
                                <p className={cn(
                                    "text-[8px] font-black uppercase tracking-[0.2em] mb-1",
                                    isViewing ? "text-blue-600" : "text-slate-400"
                                )}>
                                    STAGE 0{i + 1}
                                </p>
                                <p className={cn(
                                    "text-[11px] font-black uppercase tracking-tight",
                                    isViewing ? "text-slate-900" : "text-slate-400"
                                )}>
                                    {stage}
                                </p>
                            </div>
                        </div>
                        {i < STAGES.length - 1 && (
                            <div className={cn(
                                "flex-1 h-0.5 min-w-[20px] max-w-[50px] rounded-full mx-2 transition-colors duration-1000",
                                isCompleted ? "bg-emerald-500" : "bg-slate-100"
                            )} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
