'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Check, AlertTriangle, FileText } from 'lucide-react';
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
    const { users, user } = useAuth();

    const stats = useMemo(() => {
        const completedCount = STAGES.filter(s => observation.stages[s]?.status === 'Completed').length;
        const percentage = Math.round((completedCount / STAGES.length) * 100);
        return { completedCount, percentage };
    }, [observation]);

    return (
        <div className="flex flex-col h-full py-4 text-left">
            <div className="px-5 mb-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5" /> CASE WORKFLOW
                </h3>
                
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-700 uppercase">Progress</span>
                    <span className="text-lg font-black text-blue-600">{stats.percentage}%</span>
                </div>
                <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${stats.percentage}%` }} />
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
                                    "group relative flex items-center gap-3 px-3 py-2 rounded transition-all duration-200",
                                    isViewing 
                                        ? "bg-blue-50 border border-blue-200 shadow-sm" 
                                        : "hover:bg-slate-50"
                                )}
                                onClick={() => onStageSelect(stage)}
                            >
                                <div className={cn(
                                    "h-7 w-7 rounded-full border flex items-center justify-center shrink-0 transition-all text-[10px] font-black",
                                    isCompleted ? "bg-emerald-600 border-emerald-600 text-white" :
                                    isReturned ? "bg-red-600 border-red-600 text-white" :
                                    isViewing ? "bg-blue-600 border-blue-600 text-white" :
                                    isCurrent ? "bg-blue-50 border-blue-600 text-blue-600" :
                                    "bg-white border-slate-200 text-slate-300"
                                )}>
                                    {isCompleted ? <Check className="h-3.5 w-3.5" /> : 
                                     isReturned ? <AlertTriangle className="h-3.5 w-3.5" /> :
                                     <span>{i + 1}</span>}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className={cn(
                                        "text-[10px] font-bold uppercase tracking-tight truncate",
                                        isViewing ? "text-slate-900" : "text-slate-500"
                                    )}>
                                        {stage}
                                    </p>
                                    {isCurrent && assignee && (
                                        <p className="text-[9px] font-medium text-blue-600 truncate mt-0.5">
                                            {assignee.id === user?.id ? 'OWNED BY YOU' : `OWNED BY ${assignee.name.toUpperCase()}`}
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