'use client';

import React from 'react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Check, Clock, AlertTriangle, Lock, ShieldCheck } from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';

const STAGES: CapaStage[] = ['Initiation', 'Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'];

interface CapaWorkflowTimelineProps {
    observation: EhsObservation;
    activeStage: CapaStage;
    onStageSelect: (stage: CapaStage) => void;
}

export default function CapaWorkflowTimeline({ observation, activeStage, onStageSelect }: CapaWorkflowTimelineProps) {
    const { users } = useAuth();

    return (
        <div className="space-y-4">
            {STAGES.map((stage, i) => {
                const sData = observation.stages[stage];
                const isCurrent = observation.currentStage === stage;
                const isActive = activeStage === stage;
                
                const isCompleted = sData?.status === 'Completed';
                const isReturned = sData?.status === 'Returned';
                const isSubmitted = sData?.status === 'In Progress';
                
                const assignee = users.find(u => u.id === sData?.assigneeId);

                return (
                    <div 
                        key={stage}
                        className={cn(
                            "relative pl-12 py-4 cursor-pointer transition-all duration-300 rounded-2xl group",
                            isActive ? "bg-slate-50 border border-slate-100 shadow-sm" : "hover:bg-slate-50/50"
                        )}
                        onClick={() => onStageSelect(stage)}
                    >
                        {/* Connecting Line */}
                        {i < STAGES.length - 1 && (
                            <div className={cn(
                                "absolute left-[19px] top-10 bottom-0 w-0.5 transition-colors duration-500",
                                isCompleted ? "bg-emerald-500" : "bg-slate-100"
                            )} />
                        )}

                        {/* Status Icon */}
                        <div className={cn(
                            "absolute left-3 top-4 w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all duration-500 shadow-sm",
                            isCompleted ? "bg-emerald-600 border-emerald-600 text-white" :
                            isReturned ? "bg-rose-600 border-rose-600 text-white animate-pulse" :
                            isSubmitted ? "bg-blue-100 border-blue-500 text-blue-600" :
                            isCurrent ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30" :
                            "bg-white border-slate-200 text-slate-300"
                        )}>
                            {isCompleted ? <ShieldCheck className="h-4 w-4" /> : 
                             isReturned ? <AlertTriangle className="h-4 w-4" /> :
                             isCurrent ? <Clock className="h-4 w-4" /> : 
                             <span className="text-[10px] font-black">{i + 1}</span>}
                        </div>

                        {/* Text Details */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-center pr-4">
                                <p className={cn(
                                    "text-[10px] font-black uppercase tracking-[0.15em]",
                                    isActive ? "text-slate-900" : "text-slate-500"
                                )}>
                                    {stage}
                                </p>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className={cn(
                                    "h-4 px-1.5 rounded-sm text-[8px] font-black uppercase tracking-wider border-none",
                                    isCompleted ? "bg-emerald-50 text-emerald-600" : 
                                    isReturned ? "bg-rose-50 text-rose-600" :
                                    isSubmitted ? "bg-blue-50 text-blue-600" :
                                    isCurrent ? "bg-blue-50 text-blue-700" : "bg-slate-50 text-slate-400"
                                )}>
                                    {isReturned ? 'REWORK' : isSubmitted ? 'REVIEW' : isCompleted ? 'VERIFIED' : 'PENDING'}
                                </Badge>
                                
                                {sData?.actionedAt && (
                                    <span className="text-[8px] font-bold text-slate-400 uppercase">
                                        {format(parseISO(sData.actionedAt), 'dd MMM')}
                                    </span>
                                )}
                            </div>

                            {isActive && assignee && (
                                <div className="pt-2 animate-in fade-in duration-500 flex items-center gap-2">
                                    <Avatar className="h-4 w-4 border border-slate-100">
                                        <AvatarImage src={assignee.avatar} />
                                        <AvatarFallback className="text-[6px]">{assignee.name[0]}</AvatarFallback>
                                    </Avatar>
                                    <p className="text-[9px] font-bold text-slate-600 truncate">{assignee.name}</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
