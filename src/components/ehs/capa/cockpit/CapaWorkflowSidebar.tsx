'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Check, Circle, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { Progress } from '@/components/ui/progress';
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
        const activeCount = STAGES.filter(s => observation.stages[s]?.status === 'In Progress' || observation.stages[s]?.status === 'Pending').length;
        const reworkCount = STAGES.filter(s => observation.stages[s]?.status === 'Returned').length;
        const percentage = Math.round((completedCount / STAGES.length) * 100);
        return { completedCount, activeCount, reworkCount, percentage };
    }, [observation]);

    return (
        <div className="flex flex-col h-full py-6">
            <div className="px-6 mb-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6 flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-600" /> Case Workflow
                </h3>
                
                <div className="p-4 rounded-2xl bg-white border-2 border-slate-100 shadow-sm space-y-4">
                    <div className="flex justify-between items-end">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Progress</span>
                        <span className="text-xl font-black text-blue-600 leading-none">{stats.percentage}%</span>
                    </div>
                    <Progress value={stats.percentage} className="h-1.5 bg-slate-100" />
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
                                    "group relative flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200",
                                    isViewing ? "bg-blue-50 border-blue-100" : "hover:bg-slate-50"
                                )}
                                onClick={() => onStageSelect(stage)}
                            >
                                {isViewing && <div className="absolute left-0 w-1 h-6 bg-blue-600 rounded-r-full" />}
                                
                                <div className={cn(
                                    "h-7 w-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                                    isCompleted ? "bg-emerald-500 border-emerald-500 text-white" :
                                    isReturned ? "bg-rose-500 border-rose-500 text-white animate-pulse" :
                                    isSubmitted ? "bg-blue-100 border-blue-500 text-blue-600" :
                                    isViewing ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20" :
                                    "bg-white border-slate-200 text-slate-400"
                                )}>
                                    {isCompleted ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : 
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
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <Badge variant="outline" className={cn(
                                            "h-4 px-1 rounded-sm text-[7px] font-black uppercase tracking-widest border-none",
                                            isCompleted ? "bg-emerald-50 text-emerald-600" : 
                                            isReturned ? "bg-rose-50 text-rose-600" :
                                            isSubmitted ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-400"
                                        )}>
                                            {isCompleted ? 'VERIFIED' : isReturned ? 'REWORK' : isSubmitted ? 'REVIEW' : 'PENDING'}
                                        </Badge>
                                        {isCurrent && assignee && (
                                            <span className="text-[8px] font-bold text-blue-600/80 truncate">
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

            <div className="px-6 mt-auto">
                <div className="p-4 rounded-xl border-2 border-dashed border-slate-200 bg-white/50">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Lifecycle State</p>
                    <div className="space-y-2 text-[10px] font-bold uppercase tracking-tight">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Completed</span>
                            <span className="text-emerald-600 font-black">{stats.completedCount}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Active</span>
                            <span className="text-blue-600 font-black">{stats.activeCount}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Rework</span>
                            <span className="text-rose-600 font-black">{stats.reworkCount}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
