'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Check, AlertTriangle, ShieldCheck, Clock, FileText } from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
        <div className="flex flex-col h-full py-6 text-left">
            <div className="px-6 mb-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-900 mb-6 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" /> CASE WORKFLOW
                </h3>
                
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black text-slate-900 uppercase">Total Progress</span>
                    <span className="text-xl font-black text-blue-600">{stats.percentage}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner mb-3">
                    <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${stats.percentage}%` }} />
                </div>
                <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>{stats.completedCount} completed</span>
                    <span>{STAGES.length - stats.completedCount} pending</span>
                </div>
            </div>

            <ScrollArea className="flex-1 px-4">
                <div className="space-y-1.5 pb-6">
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
                                    isViewing 
                                        ? "bg-blue-50 shadow-sm border border-blue-100" 
                                        : "hover:bg-slate-50"
                                )}
                                onClick={() => onStageSelect(stage)}
                            >
                                <div className={cn(
                                    "h-8 w-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                                    isCompleted ? "bg-emerald-500 border-emerald-500 text-white" :
                                    isReturned ? "bg-rose-500 border-rose-500 text-white" :
                                    isViewing ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/10" :
                                    isCurrent ? "bg-blue-50 border-blue-600 text-blue-600" :
                                    "bg-white border-slate-200 text-slate-300"
                                )}>
                                    {isCompleted ? <Check className="h-4 w-4 stroke-[3]" /> : 
                                     isReturned ? <AlertTriangle className="h-4 w-4" /> :
                                     <span className="text-[10px] font-black">{i + 1}</span>}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className={cn(
                                        "text-[11px] font-black uppercase tracking-tight truncate",
                                        isViewing ? "text-slate-900" : "text-slate-500"
                                    )}>
                                        {stage}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <Badge variant="outline" className={cn(
                                            "h-4 px-1.5 rounded-sm text-[7px] font-black uppercase tracking-widest border-none",
                                            isCompleted ? "bg-emerald-50 text-emerald-600" : 
                                            isReturned ? "bg-rose-50 text-rose-600" :
                                            isSubmitted ? "bg-blue-50 text-blue-600" :
                                            isViewing ? "bg-blue-100 text-blue-700" : "bg-slate-50 text-slate-400"
                                        )}>
                                            {isCompleted ? 'COMPLETED' : isReturned ? 'RETURNED' : isSubmitted ? 'REVIEW' : 'PENDING'}
                                        </Badge>
                                    </div>
                                    {isCurrent && assignee && (
                                        <div className="flex items-center gap-1.5 mt-2 bg-white p-1 rounded-lg border shadow-sm">
                                            <Avatar className="h-4 w-4 border border-slate-100">
                                                <AvatarImage src={assignee.avatar}/>
                                                <AvatarFallback className="text-[6px]">{assignee.name?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-[9px] font-bold text-blue-600 truncate uppercase">{assignee.name}</span>
                                        </div>
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
