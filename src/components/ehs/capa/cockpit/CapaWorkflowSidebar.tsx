'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Check, Circle, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';

const STAGES: CapaStage[] = ['Initiation', 'Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'];

interface Props {
    observation: EhsObservation;
    viewingStage: CapaStage;
    onStageSelect: (stage: CapaStage) => void;
}

export default function CapaWorkflowSidebar({ observation, viewingStage, onStageSelect }: Props) {
    const { users } = useAuth();

    const progress = useMemo(() => {
        const completed = STAGES.filter(s => observation.stages[s]?.status === 'Completed').length;
        return Math.round((completed / STAGES.length) * 100);
    }, [observation]);

    return (
        <div className="flex flex-col h-full py-6">
            <div className="px-6 mb-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6 flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-600" /> Case Workflow
                </h3>
                
                <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 shadow-inner space-y-4">
                    <div className="flex justify-between items-end">
                        <span className="text-[9px] font-black text-blue-900 uppercase">Total Progress</span>
                        <span className="text-lg font-black text-blue-600">{progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-blue-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${progress}%` }} />
                    </div>
                </div>
            </div>

            <nav className="flex-1 space-y-1 px-3">
                {STAGES.map((stage, i) => {
                    const sData = observation.stages[stage];
                    const isCurrent = observation.currentStage === stage;
                    const isViewing = viewingStage === stage;
                    const isCompleted = sData?.status === 'Completed';
                    const isReturned = sData?.status === 'Returned';
                    const assignee = users.find(u => u.id === sData?.assigneeId);

                    return (
                        <div 
                            key={stage}
                            className={cn(
                                "group relative flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200",
                                isViewing ? "bg-blue-50" : "hover:bg-slate-50"
                            )}
                            onClick={() => onStageSelect(stage)}
                        >
                            {isViewing && <div className="absolute left-0 w-1 h-6 bg-blue-600 rounded-r-full" />}
                            
                            <div className={cn(
                                "h-7 w-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                                isCompleted ? "bg-emerald-500 border-emerald-500 text-white" :
                                isReturned ? "bg-rose-500 border-rose-500 text-white" :
                                isCurrent ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20" :
                                "bg-white border-slate-200 text-slate-400"
                            )}>
                                {isCompleted ? <Check className="h-3.5 w-3.5" /> : 
                                 isReturned ? <AlertTriangle className="h-3 w-3" /> :
                                 <span className="text-[9px] font-black">{i + 1}</span>}
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className={cn(
                                    "text-[10px] font-black uppercase tracking-tight truncate",
                                    isViewing ? "text-blue-900" : "text-slate-600"
                                )}>
                                    {stage}
                                </p>
                                {isCurrent && assignee && (
                                    <div className="mt-1 flex items-center gap-1.5">
                                        <div className="h-1 w-1 rounded-full bg-blue-600" />
                                        <p className="text-[8px] font-black text-blue-600 uppercase truncate">
                                            {assignee.name}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </nav>

            <div className="px-6 mt-8">
                <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Summary</p>
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-600">Stages Done:</span>
                        <span className="text-xs font-black text-slate-900">{STAGES.filter(s => observation.stages[s]?.status === 'Completed').length} / 7</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
