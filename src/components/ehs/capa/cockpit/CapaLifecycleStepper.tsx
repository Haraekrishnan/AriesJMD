'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Check, Clock, AlertTriangle, Lock } from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';

const STAGES: CapaStage[] = ['Initiation', 'Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'];

interface Props {
    observation: EhsObservation;
    viewingStage: CapaStage;
    onStageSelect: (stage: CapaStage) => void;
}

export default function CapaLifecycleStepper({ observation, viewingStage, onStageSelect }: Props) {
    return (
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto px-4 min-w-max">
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
                                "flex items-center gap-3 group cursor-pointer transition-all px-3 py-1.5 rounded-lg",
                                isViewing ? "bg-blue-50/50" : "hover:bg-slate-50",
                                isFuture && "opacity-50 pointer-events-none"
                            )}
                            onClick={() => !isFuture && onStageSelect(stage)}
                        >
                            <div className={cn(
                                "h-6 w-6 rounded-full border flex items-center justify-center transition-all shadow-sm",
                                isCompleted ? "bg-emerald-600 border-emerald-600 text-white" :
                                isReturned ? "bg-rose-500 border-rose-500 text-white animate-pulse" :
                                isViewing ? "bg-blue-600 border-blue-600 text-white" :
                                isCurrent ? "bg-white border-blue-600 text-blue-600" :
                                "bg-white border-slate-200 text-slate-300"
                            )}>
                                {isCompleted ? <Check className="h-3 w-3" /> : 
                                 isReturned ? <AlertTriangle className="h-3 w-3" /> :
                                 isFuture ? <Lock className="h-2.5 w-2.5" /> :
                                 <span className="text-[9px] font-black">{i + 1}</span>}
                            </div>
                            <div className="text-left leading-none">
                                <p className={cn(
                                    "text-[9px] font-black uppercase tracking-widest",
                                    isViewing ? "text-blue-700" : "text-slate-500"
                                )}>
                                    {stage}
                                </p>
                            </div>
                        </div>
                        {i < STAGES.length - 1 && (
                            <div className={cn(
                                "flex-1 h-0.5 min-w-[20px] max-w-[40px] rounded-full transition-colors",
                                isCompleted ? "bg-emerald-500" : "bg-slate-100"
                            )} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
