
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
        <div className="flex items-center w-full gap-12">
            {/* Progress Display */}
            <div className="flex flex-col shrink-0 min-w-[180px]">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Overall Progress</span>
                <div className="flex items-center gap-4">
                    <span className="text-2xl font-black text-blue-700 tracking-tighter leading-none">{stats.percentage}%</span>
                    <Progress value={stats.percentage} className="h-1.5 flex-1 bg-slate-200" />
                </div>
            </div>

            {/* Stepper Chain */}
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
                                    "flex items-center gap-3 cursor-pointer transition-all px-2 py-1.5 rounded-lg",
                                    isViewing ? "bg-blue-50/50" : "hover:bg-slate-100",
                                    isFuture && "opacity-40 grayscale pointer-events-none"
                                )}
                                onClick={() => onStageSelect(stage)}
                            >
                                <div className={cn(
                                    "h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all text-[11px] font-black shadow-sm",
                                    isCompleted ? "bg-emerald-500 border-emerald-500 text-white" :
                                    isViewing ? "bg-[#2563EB] border-[#2563EB] text-white" :
                                    "bg-white border-slate-200 text-slate-400"
                                )}>
                                    {isCompleted ? <Check className="h-4 w-4 stroke-[4]" /> : <span>{i + 1}</span>}
                                </div>
                                <div className="flex flex-col leading-none">
                                    <p className={cn(
                                        "text-[10px] font-black uppercase tracking-wider",
                                        isViewing ? "text-blue-700" : "text-slate-500"
                                    )}>
                                        {stage}
                                    </p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                                        {isCompleted ? 'Completed' : isViewing ? 'In Progress' : 'Pending'}
                                    </p>
                                </div>
                            </div>
                            {i < STAGES.length - 1 && (
                                <div className="h-px bg-slate-200 flex-1 mx-2 min-w-[20px]" />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}
