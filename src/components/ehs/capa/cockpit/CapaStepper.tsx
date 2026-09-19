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
                                "h-11 w-11 rounded-none flex items-center justify-center border-4 transition-all duration-500 text-[13px] font-black z-10",
                                isCompleted ? "bg-emerald-600 border-slate-900 text-white" :
                                isActive ? "bg-blue-600 border-slate-900 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" :
                                "bg-white border-slate-200 text-slate-300"
                            )}>
                                {isCompleted ? <Check className="h-6 w-6 stroke-[3]" /> : <span>{i + 1}</span>}
                            </div>
                            <div className="text-center">
                                <p className={cn(
                                    "text-[9px] font-black uppercase tracking-widest leading-tight whitespace-nowrap",
                                    isActive ? "text-blue-600" : "text-slate-400"
                                )}>
                                    {stage.label}
                                </p>
                                <p className={cn(
                                    "text-[8px] font-bold uppercase tracking-widest mt-1",
                                    isCompleted ? "text-emerald-600" : isActive ? "text-blue-600" : "text-slate-300"
                                )}>
                                    {isCompleted ? 'VERIFIED' : isActive ? 'ACTIVE' : 'PENDING'}
                                </p>
                            </div>
                        </div>
                        {i < STAGES.length - 1 && (
                            <div className="h-1 flex-1 mx-[-20px] bg-slate-200 relative">
                                <div 
                                    className={cn(
                                        "absolute inset-0 bg-emerald-600 transition-all duration-1000",
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
