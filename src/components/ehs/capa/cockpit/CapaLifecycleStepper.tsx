'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
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
            <div className="flex flex-col shrink-0 min-w-[200px]">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-3">Overall Compliance</span>
                <div className="flex items-center gap-6">
                    <span className="text-3xl font-black text-[#2563EB] tracking-tighter leading-none">{stats.percentage}%</span>
                    <Progress value={stats.percentage} className="h-2 flex-1 bg-slate-200 rounded-none border border-slate-300 shadow-inner" />
                </div>
            </div>

            {/* Stepper Chain */}
            <div className="flex items-center flex-1 justify-between max-w-6xl">
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
                                    "flex items-center gap-4 cursor-pointer transition-all px-3 py-2 rounded-none border-2",
                                    isViewing ? "bg-blue-50 border-blue-200 shadow-sm" : "border-transparent hover:bg-slate-100",
                                    isFuture && "opacity-40 grayscale pointer-events-none"
                                )}
                                onClick={() => onStageSelect(stage)}
                            >
                                <div className={cn(
                                    "h-10 w-10 rounded-none border-4 flex items-center justify-center transition-all text-[12px] font-black shadow-sm",
                                    isCompleted ? "bg-emerald-500 border-emerald-600 text-white" :
                                    isViewing ? "bg-[#2563EB] border-blue-700 text-white" :
                                    "bg-white border-slate-200 text-slate-400"
                                )}>
                                    {isCompleted ? <Check className="h-5 w-5 stroke-[4]" /> : <span>0{i + 1}</span>}
                                </div>
                                <div className="flex flex-col leading-none">
                                    <p className={cn(
                                        "text-[11px] font-black uppercase tracking-[0.15em]",
                                        isViewing ? "text-[#2563EB]" : "text-slate-500"
                                    )}>
                                        {stage}
                                    </p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1.5 tracking-widest">
                                        {isCompleted ? 'VERIFIED' : isViewing ? 'IN PROGRESS' : 'PENDING'}
                                    </p>
                                </div>
                            </div>
                            {i < STAGES.length - 1 && (
                                <div className="h-1 bg-slate-200 flex-1 mx-4 min-w-[20px] shadow-inner" />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}
