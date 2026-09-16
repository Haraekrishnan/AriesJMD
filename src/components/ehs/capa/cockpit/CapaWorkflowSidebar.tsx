'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Check, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { format, parseISO } from 'date-fns';
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
        <div className="flex-1 flex flex-col min-h-0">
            <div className="p-6 border-b bg-white">
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900 mb-5 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-600" /> Case Workflow
                </h3>
                
                <div className="space-y-3">
                    <div className="flex justify-between items-end">
                        <span className="text-[10px] font-black uppercase text-slate-400">Total Progress</span>
                        <span className="text-sm font-black text-blue-600">{stats.progress}%</span>
                    </div>
                    <Progress value={stats.progress} className="h-1.5 bg-slate-100" />
                </div>
            </div>

            <ScrollArea className="flex-1 py-4">
                <div className="space-y-1 px-3">
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
                                    "group relative p-3.5 rounded-xl cursor-pointer transition-all border-2",
                                    isViewing 
                                        ? "bg-blue-50/50 border-blue-200 shadow-sm" 
                                        : "bg-transparent border-transparent hover:bg-white hover:border-slate-100",
                                    isFuture && "opacity-40 pointer-events-none"
                                )}
                                onClick={() => !isFuture && onStageSelect(stage)}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={cn(
                                        "h-6 w-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors",
                                        isCompleted ? "bg-emerald-600 border-emerald-600 text-white" :
                                        isReturned ? "bg-rose-500 border-rose-500 text-white animate-pulse" :
                                        isCurrent ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20" :
                                        "bg-white border-slate-200 text-slate-300"
                                    )}>
                                        {isCompleted ? <Check className="h-3.5 w-3.5" /> : <span className="text-[10px] font-black">{i + 1}</span>}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className={cn(
                                            "text-[10px] font-black uppercase tracking-tight truncate",
                                            isViewing ? "text-blue-900" : "text-slate-600"
                                        )}>
                                            {stage}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className={cn(
                                                "text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded",
                                                isCompleted ? "bg-emerald-100 text-emerald-700" : 
                                                isReturned ? "bg-rose-100 text-rose-700" :
                                                "bg-slate-100 text-slate-500"
                                            )}>
                                                {sData?.status || 'Pending'}
                                            </span>
                                            {sData?.actionedAt && (
                                                <span className="text-[9px] text-slate-300 font-bold uppercase">
                                                    {format(parseISO(sData.actionedAt), 'dd MMM')}
                                                </span>
                                            )}
                                        </div>
                                        {isCurrent && assignee && (
                                            <div className="text-[10px] font-bold text-blue-600/80 truncate mt-1.5 flex items-center gap-1">
                                                <div className="h-1 w-1 rounded-full bg-blue-600" /> {assignee.name.toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
}