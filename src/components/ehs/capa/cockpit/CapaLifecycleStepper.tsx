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
        <div className="flex items-center justify-between w-full max-w-6xl mx-auto px-4">
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
                                "flex flex-col items-center gap-1.5 group cursor-pointer transition-all",
                                isFuture && "opacity-50 pointer-events-none"
                            )}
                            onClick={() => !isFuture && onStageSelect(stage)}
                        >
                            <div className={cn(
                                "h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all shadow-sm",
                                isCompleted ? "bg-emerald-600 border-emerald-600 text-white" :
                                isReturned ? "bg-rose-500 border-rose-500 text-white animate-pulse" :
                                isViewing ? "bg-blue-600 border-blue-600 text-white ring-4 ring-blue-50" :
                                isCurrent ? "bg-white border-blue-600 text-blue-600" :
                                "bg-white border-slate-200 text-slate-300"
                            )}>
                                {isCompleted ? <Check className="h-4 w-4" /> : 
                                 isReturned ? <AlertTriangle className="h-4 w-4" /> :
                                 isFuture ? <Lock className="h-3 w-3" /> :
                                 <span className="text-[10px] font-black">{i + 1}</span>}
                            </div>
                            <div className="text-center">
                                <p className={cn(
                                    "text-[9px] font-black uppercase tracking-widest",
                                    isViewing ? "text-blue-700" : "text-slate-500"
                                )}>
                                    {stage}
                                </p>
                                <p className={cn(
                                    "text-[8px] font-bold uppercase",
                                    isCompleted ? "text-emerald-600" : 
                                    isReturned ? "text-rose-600" : 
                                    isCurrent ? "text-blue-600" : "text-slate-400"
                                )}>
                                    {isCompleted ? 'Completed' : isReturned ? 'Returned' : isCurrent ? 'Active' : 'Pending'}
                                </p>
                            </div>
                        </div>
                        {i < STAGES.length - 1 && (
                            <div className={cn(
                                "flex-1 h-0.5 max-w-[60px] mx-2 mb-6 rounded-full transition-colors",
                                isCompleted ? "bg-emerald-500" : "bg-slate-100"
                            )} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
