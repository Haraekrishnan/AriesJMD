'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Check, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

const STAGES: CapaStage[] = ['Initiation', 'Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'];

interface Props {
    observation: EhsObservation;
    viewingStage: CapaStage;
    onStageSelect: (stage: CapaStage) => void;
}

export default function CapaWorkflowSidebar({ observation, viewingStage, onStageSelect }: Props) {
    const { users } = useAuth();

    const stats = useMemo(() => {
        const completedCount = STAGES.filter(s => observation.stages[s]?.status === 'Completed').length;
        const percentage = Math.round((completedCount / STAGES.length) * 100);
        return { completedCount, percentage };
    }, [observation]);

    return (
        <div className="flex flex-col h-full py-6">
            <div className="px-6 mb-6">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-6 flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-600" /> Case Workflow
                </h3>
                
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4 text-center">
                    <div className="relative inline-flex items-center justify-center">
                        <svg className="h-20 w-20">
                            <circle className="text-slate-100" strokeWidth="3" stroke="currentColor" fill="transparent" r="36" cx="40" cy="40" />
                            <circle className="text-blue-600 transition-all duration-1000" strokeWidth="3" strokeDasharray={226.2} strokeDashoffset={226.2 - (226.2 * stats.percentage) / 100} strokeLinecap="round" stroke="currentColor" fill="transparent" r="36" cx="40" cy="40" />
                        </svg>
                        <span className="absolute text-lg font-bold text-slate-900">{stats.percentage}%</span>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Progress</p>
                </div>
            </div>

            <ScrollArea className="flex-1 px-3">
                <div className="space-y-1 pb-6">
                    {STAGES.map((stage, i) => {
                        const sData = observation.stages[stage];
                        const isCurrent = observation.currentStage === stage;
                        const isViewing = viewingStage === stage;
                        const isCompleted = sData?.status === 'Completed';
                        const isReturned = sData?.status === 'Returned';
                        const isSubmitted = sData?.status === 'In Progress';
                        const assignee = users.find(u => u.id === sData?.assigneeId);

                        return (
                            <div 
                                key={stage}
                                className={cn(
                                    "group relative flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all duration-200 border-l-4",
                                    isViewing 
                                        ? "bg-blue-50 border-blue-600 shadow-sm" 
                                        : "hover:bg-slate-50 border-transparent"
                                )}
                                onClick={() => onStageSelect(stage)}
                            >
                                <div className={cn(
                                    "h-7 w-7 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all",
                                    isCompleted ? "bg-emerald-500 border-emerald-500 text-white" :
                                    isReturned ? "bg-rose-500 border-rose-500 text-white" :
                                    isViewing ? "bg-blue-100 border-blue-500 text-blue-700" :
                                    isSubmitted ? "bg-blue-50 border-blue-200 text-blue-600" :
                                    "bg-white border-slate-200 text-slate-400"
                                )}>
                                    {isCompleted ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : 
                                     isReturned ? <AlertTriangle className="h-3.5 w-3.5" /> :
                                     <span className="text-[9px] font-bold">{i + 1}</span>}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className={cn(
                                        "text-[10px] font-bold uppercase tracking-tight truncate",
                                        isViewing ? "text-blue-900" : "text-slate-700"
                                    )}>
                                        {stage}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <Badge variant="outline" className={cn(
                                            "h-4 px-1 rounded-sm text-[6px] font-bold uppercase tracking-widest border-none",
                                            isCompleted ? "bg-emerald-50 text-emerald-600" : 
                                            isReturned ? "bg-rose-50 text-rose-600" :
                                            isSubmitted ? "bg-blue-50 text-blue-600" :
                                            isViewing ? "bg-blue-100 text-blue-700" : "bg-slate-50 text-slate-400"
                                        )}>
                                            {isCompleted ? 'Done' : isReturned ? 'Rework' : isSubmitted ? 'Review' : 'Pending'}
                                        </Badge>
                                        {isCurrent && assignee && (
                                            <span className="text-[8px] font-bold text-slate-400 truncate uppercase">
                                                &middot; {assignee.name.split(' ')[0]}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>

            <div className="px-5 mt-auto">
                <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-white/50 space-y-3">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Case Metrics</p>
                    <div className="space-y-2 text-[9px] font-bold uppercase tracking-tight">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500">Completed</span>
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-none font-bold h-4">{stats.completedCount}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500">Remaining</span>
                            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-none font-bold h-4">{STAGES.length - stats.completedCount}</Badge>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

import { Checkbox } from '@/components/ui/checkbox';