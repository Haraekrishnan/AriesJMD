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
        <div className="flex items-center w-full gap-16 min-w-max">
            {/* Progress Display */}
            <div className="flex flex-col shrink-0 min-w-[150px]">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-2">Overall Compliance</span>
                <div className="flex items-center gap-4">
                    <span className="text-3xl font-black text-[#2563EB] tracking-tighter leading-none">{stats.percentage}%</span>
                    <div className="h-1.5 w-24 bg-slate-100 rounded-none overflow-hidden border border-slate-200">
                        <div className="h-full bg-[#2563EB] transition-all duration-1000" style={{ width: `${stats.percentage}%` }} />
                    </div>
                </div>
            </div>

            {/* Stepper Chain */}
            <div className="flex items-center justify-between flex-1 gap-2">
                {STAGES.map((stage, i) => {
                    const sData = observation.stages[stage];
                    const isViewing = viewingStage === stage;
                    const isCompleted = sData?.status === 'Completed';
                    const isFuture = STAGES.indexOf(stage) > STAGES.indexOf(observation.currentStage);

                    return (
                        <React.Fragment key={stage}>
                            <div 
                                className={cn(
                                    "flex items-center gap-4 cursor-pointer transition-all px-3 py-2 border-b-4",
                                    isViewing ? "border-[#2563EB] bg-blue-50/30" : "border-transparent opacity-50 grayscale hover:opacity-100 hover:grayscale-0",
                                    isFuture && "pointer-events-none opacity-20"
                                )}
                                onClick={() => onStageSelect(stage)}
                            >
                                <div className={cn(
                                    "h-10 w-10 rounded-none border-2 flex items-center justify-center transition-all text-xs font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)]",
                                    isCompleted ? "bg-emerald-600 border-slate-900 text-white" :
                                    isViewing ? "bg-[#2563EB] border-slate-900 text-white" :
                                    "bg-white border-slate-200 text-slate-400"
                                )}>
                                    {isCompleted ? <Check className="h-5 w-5 stroke-[4]" /> : <span>0{i + 1}</span>}
                                </div>
                                <div className="flex flex-col leading-none">
                                    <p className={cn(
                                        "text-[10px] font-black uppercase tracking-widest",
                                        isViewing ? "text-[#2563EB]" : "text-slate-500"
                                    )}>
                                        {stage}
                                    </p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
                                        {isCompleted ? 'VERIFIED' : isViewing ? 'IN PROGRESS' : 'PENDING'}
                                    </p>
                                </div>
                            </div>
                            {i < STAGES.length - 1 && (
                                <div className="h-0.5 w-8 bg-slate-200 shrink-0" />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}
