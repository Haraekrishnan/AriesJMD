'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Check, Clock, AlertTriangle, User } from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { format, parseISO, isValid } from 'date-fns';
import { Progress } from '@/components/ui/progress';

const STAGES: CapaStage[] = ['Initiation', 'Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'];

interface Props {
    observation: EhsObservation;
    viewingStage: CapaStage;
    onStageSelect: (stage: CapaStage) => void;
}

export default function CapaWorkflowSidebar({ observation, viewingStage, onStageSelect }: Props) {
    const { users } = useAuth();
    
    const stats = useMemo(() => {
        let completed = 0;
        let inProgress = 0;
        let returned = 0;
        let pending = 0;

        STAGES.forEach(s => {
            const status = observation.stages[s]?.status;
            if (status === 'Completed') completed++;
            else if (status === 'Returned') returned++;
            else if (s === observation.currentStage) inProgress++;
            else pending++;
        });

        const progress = Math.round((completed / STAGES.length) * 100);
        return { completed, inProgress, returned, pending, progress };
    }, [observation.stages, observation.currentStage]);

    return (
        <div className="space-y-10">
            <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-6 flex items-center gap-2">
                    <Clock className="h-3 w-3" /> Case Workflow
                </h3>
                <div className="space-y-0">
                    {STAGES.map((stage, i) => {
                        const sData = observation.stages[stage];
                        const isCurrent = observation.currentStage === stage;
                        const isViewing = viewingStage === stage;
                        const isCompleted = sData?.status === 'Completed';
                        const isReturned = sData?.status === 'Returned';
                        const isFuture = STAGES.indexOf(stage) > STAGES.indexOf(observation.currentStage);
                        
                        const assignee = users.find(u => u.id === sData?.assigneeId);

                        return (
                            <div 
                                key={stage}
                                className={cn(
                                    "relative pl-8 py-3 cursor-pointer transition-all border-l-2",
                                    isViewing ? "bg-blue-50/50 border-blue-600" : "border-slate-100 hover:bg-slate-50",
                                    isFuture && "opacity-50 pointer-events-none"
                                )}
                                onClick={() => !isFuture && onStageSelect(stage)}
                            >
                                {/* Vertical Connection */}
                                {i < STAGES.length - 1 && (
                                    <div className={cn(
                                        "absolute left-[-2px] top-6 bottom-[-6px] w-0.5",
                                        isCompleted ? "bg-emerald-500" : "bg-slate-100"
                                    )} />
                                )}

                                {/* Node */}
                                <div className={cn(
                                    "absolute left-[-7px] top-4 h-3 w-3 rounded-full border-2 bg-white",
                                    isCompleted ? "border-emerald-600 bg-emerald-600" :
                                    isReturned ? "border-rose-500 bg-rose-500" :
                                    isCurrent ? "border-blue-600" : "border-slate-200"
                                )}>
                                    {isCompleted && <Check className="h-2 w-2 text-white absolute top-0.5 left-0.5" />}
                                </div>

                                <div className="space-y-1">
                                    <p className={cn(
                                        "text-[10px] font-black uppercase tracking-tight",
                                        isViewing ? "text-blue-700" : "text-slate-600"
                                    )}>
                                        {stage}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "text-[9px] font-bold uppercase",
                                            isCompleted ? "text-emerald-600" : isReturned ? "text-rose-600" : "text-slate-400"
                                        )}>
                                            {sData?.status || 'Pending'}
                                        </span>
                                        {sData?.actionedAt && (
                                            <span className="text-[8px] text-slate-300 font-bold uppercase">
                                                {format(parseISO(sData.actionedAt), 'dd MMM')}
                                            </span>
                                        )}
                                    </div>
                                    {isCurrent && assignee && (
                                        <p className="text-[9px] font-bold text-blue-600/70 truncate mt-1">
                                            @{assignee.name.split(' ')[0]}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                <div className="flex justify-between items-center">
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400">Case Progress</h4>
                    <span className="text-xs font-black text-blue-600">{stats.progress}%</span>
                </div>
                <Progress value={stats.progress} className="h-1.5 bg-slate-200" />
                <div className="grid grid-cols-2 gap-y-2 text-[9px] font-black uppercase tracking-widest text-slate-500">
                    <div className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Done: {stats.completed}</div>
                    <div className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Active: {stats.inProgress}</div>
                    <div className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-slate-300" /> Pending: {stats.pending}</div>
                    <div className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Rework: {stats.returned}</div>
                </div>
            </div>
        </div>
    );
}

import { useMemo } from 'react';
