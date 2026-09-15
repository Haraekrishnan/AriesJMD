
'use client';

import React from 'react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Check, Clock, AlertTriangle, Lock } from 'lucide-react';
import type { EhsObservation, CapaStage, CapaStageRecord } from '@/lib/types';
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
                const isCompleted = sData?.status === 'Completed' || (observation.status === 'Closed' && STAGES.indexOf(stage) <= STAGES.indexOf(observation.currentStage));
                const isReturned = sData?.status === 'Returned';
                
                const assignee = users.find(u => u.id === sData?.assigneeId);

                return (
                    <div 
                        key={stage}
                        className={cn(
                            "relative pl-10 py-4 cursor-pointer transition-all duration-300 rounded-2xl group",
                            isActive ? "bg-slate-50/80 shadow-sm" : "hover:bg-slate-50/50"
                        )}
                        onClick={() => onStageSelect(stage)}
                    >
                        {/* Connecting Line */}
                        {i < STAGES.length - 1 && (
                            <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-slate-100 group-last:hidden" />
                        )}

                        {/* Status Icon */}
                        <div className={cn(
                            "absolute left-2 top-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors duration-500",
                            isCompleted ? "bg-emerald-500 border-emerald-500 text-white" :
                            isReturned ? "bg-rose-500 border-rose-500 text-white" :
                            isCurrent ? "bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/20" :
                            "bg-white border-slate-200 text-slate-300"
                        )}>
                            {isCompleted ? <Check className="h-3 w-3" /> : 
                             isReturned ? <AlertTriangle className="h-3 w-3" /> :
                             isCurrent ? <Clock className="h-3 w-3 animate-pulse" /> : 
                             <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                        </div>

                        {/* Text Details */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <p className={cn(
                                    "text-[10px] font-black uppercase tracking-widest",
                                    isActive ? "text-slate-900" : "text-slate-500"
                                )}>
                                    {stage}
                                </p>
                                {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                            </div>
                            
                            {sData?.actionedAt ? (
                                <p className="text-[8px] font-bold text-slate-400 uppercase">
                                    {format(parseISO(sData.actionedAt), 'dd MMM · h:mm a')}
                                </p>
                            ) : isCurrent ? (
                                <p className="text-[8px] font-black text-blue-600 uppercase tracking-tight">Active Milestone</p>
                            ) : null}

                            {isCurrent && assignee && (
                                <div className="pt-2 animate-in fade-in duration-700">
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Responsibility</p>
                                    <p className="text-[10px] font-black text-slate-700 truncate">{assignee.name}</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
