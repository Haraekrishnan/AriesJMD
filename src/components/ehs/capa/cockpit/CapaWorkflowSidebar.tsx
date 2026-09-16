'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Check, Clock, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { format, parseISO, isValid } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';

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
        STAGES.forEach(s => {
            if (observation.stages[s]?.status === 'Completed') completed++;
        });
        return { 
            completed, 
            progress: Math.round((completed / STAGES.length) * 100) 
        };
    }, [observation.stages]);

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-white">
            <div className="p-5 border-b shrink-0">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900 mb-4 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-600" /> Case Workflow
                </h3>
                
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                        <span className="text-slate-400">Total Progress</span>
                        <span className="text-blue-600">{stats.progress}%</span>
                    </div>
                    <Progress value={stats.progress} className="h-1 bg-slate-100" />
                </div>
            </div>

            <ScrollArea className="flex-1 px-4 py-6">
                <div className="space-y-0.5">
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
                                    "relative pl-8 py-3.5 cursor-pointer transition-all border-l-2",
                                    isViewing ? "bg-blue-50/40 border-blue-600" : "border-slate-100 hover:bg-slate-50",
                                    isFuture && "opacity-50 pointer-events-none"
                                )}
                                onClick={() => !isFuture && onStageSelect(stage)}
                            >
                                {/* Connector */}
                                {i < STAGES.length - 1 && (
                                    <div className={cn(
                                        "absolute left-[-2px] top-7 bottom-[-7px] w-0.5",
                                        isCompleted ? "bg-emerald-500" : "bg-slate-100"
                                    )} />
                                )}

                                {/* Node */}
                                <div className={cn(
                                    "absolute left-[-6px] top-4.5 h-2.5 w-2.5 rounded-full border-2 bg-white",
                                    isCompleted ? "border-emerald-600 bg-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.3)]" :
                                    isReturned ? "border-rose-500 bg-rose-500 animate-pulse" :
                                    isCurrent ? "border-blue-600" : "border-slate-200"
                                )}>
                                    {isCompleted && <Check className="h-1.5 w-1.5 text-white absolute top-0.5 left-0.5" />}
                                </div>

                                <div className="space-y-0.5">
                                    <p className={cn(
                                        "text-[10px] font-black uppercase tracking-tight",
                                        isViewing ? "text-blue-700" : "text-slate-600"
                                    )}>
                                        {stage}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "text-[8px] font-bold uppercase tracking-widest",
                                            isCompleted ? "text-emerald-600" : isReturned ? "text-rose-600" : "text-slate-400"
                                        )}>
                                            {sData?.status || 'Pending'}
                                        </span>
                                        {sData?.actionedAt && (
                                            <span className="text-[8px] text-slate-300 font-bold">
                                                {format(parseISO(sData.actionedAt), 'dd MMM')}
                                            </span>
                                        )}
                                    </div>
                                    {isCurrent && assignee && (
                                        <p className="text-[9px] font-bold text-blue-600/80 truncate mt-1">
                                            @{assignee.name.split(' ')[0].toUpperCase()}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
}
