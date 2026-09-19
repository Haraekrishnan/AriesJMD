'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import type { CapaStage } from '@/lib/types';

const STAGES: { id: CapaStage; label: string }[] = [
    { id: 'Initiation', label: 'INITIATION' },
    { id: 'Investigation', label: 'INVESTIGATION' },
    { id: 'Resolution', label: 'RESOLUTION' },
    { id: 'Implementation', label: 'IMPLEMENTATION' },
    { id: 'Effectiveness Review', label: 'EFFECTIVENESS REVIEW' },
    { id: 'Reference', label: 'REFERENCE' },
    { id: 'Closure', label: 'CLOSURE' }
];

export default function CapaStepper({ currentStage }: { currentStage: CapaStage }) {
    const activeIndex = STAGES.findIndex(s => s.id === currentStage);

    return (
        <div className="flex items-center justify-between w-full max-w-6xl mx-auto">
            {STAGES.map((stage, i) => {
                const isCompleted = i < activeIndex;
                const isActive = i === activeIndex;
                
                return (
                    <React.Fragment key={stage.id}>
                        <div className="flex flex-col items-center gap-3 flex-1 px-2 relative group">
                            <div className={cn(
                                "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 text-[13px] font-black z-10",
                                isCompleted ? "bg-[#10B981] border-[#10B981] text-white" :
                                isActive ? "bg-[#2563EB] border-[#2563EB] text-white shadow-lg shadow-blue-500/30" :
                                "bg-white border-slate-200 text-slate-300"
                            )}>
                                {isCompleted ? <Check className="h-5 w-5 stroke-[3]" /> : <span>{i + 1}</span>}
                            </div>
                            <div className="text-center">
                                <p className={cn(
                                    "text-[9px] font-black uppercase tracking-widest leading-tight whitespace-nowrap",
                                    isActive ? "text-[#2563EB]" : "text-slate-400"
                                )}>
                                    {stage.label}
                                </p>
                                <p className={cn(
                                    "text-[8px] font-bold uppercase tracking-widest mt-0.5",
                                    isCompleted ? "text-[#10B981]" : isActive ? "text-[#2563EB]" : "text-slate-300"
                                )}>
                                    {isCompleted ? 'COMPLETED' : isActive ? 'ACTIVE' : 'PENDING'}
                                </p>
                            </div>
                        </div>
                        {i < STAGES.length - 1 && (
                            <div className="h-0.5 flex-1 mx-[-15px] bg-slate-200 relative">
                                <div 
                                    className={cn(
                                        "absolute inset-0 bg-[#10B981] transition-all duration-1000",
                                        isCompleted ? "w-full" : "w-0"
                                    )} 
                                />
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
