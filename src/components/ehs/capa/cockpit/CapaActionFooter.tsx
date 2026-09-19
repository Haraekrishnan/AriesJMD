
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, FileText, CheckCircle2, Clock } from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useEhs } from '@/contexts/ehs-provider';
import { useAuth } from '@/contexts/auth-provider';
import { useFormContext } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
    observation: EhsObservation;
    stage: CapaStage;
}

export default function CapaActionFooter({ observation, stage }: Props) {
    const { user, users } = useAuth();
    const { actionStage } = useEhs();
    const { getValues } = useFormContext();
    
    const sData = observation.stages[stage];
    const isCurrentStage = observation.currentStage === stage;
    const isCompleted = sData?.status === 'Completed';
    const isSubmitted = sData?.status === 'In Progress';
    const isReturned = sData?.status === 'Returned';
    const isLocked = isCompleted || isSubmitted;

    const isPhaseAssignee = user?.id === sData?.assigneeId;
    const actionedByUser = users.find(u => u.id === sData?.actionedById);

    const handleAction = (isSubmit: boolean) => {
        if (!isPhaseAssignee) return;
        const formData = getValues();
        actionStage(observation.id, stage, formData, isSubmit);
    };

    return (
        <div className="flex items-center justify-between w-full h-full">
            <div className="flex items-center gap-12 text-left">
                <div className="flex flex-col">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-1.5">Active Milestone</p>
                    <p className="text-sm font-black uppercase text-slate-900 tracking-tight">{stage}</p>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div className="flex flex-col">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-1.5">Stage Status</p>
                    {isSubmitted ? (
                        <Badge className="bg-amber-100 text-amber-700 border-none font-black h-6 text-[10px] uppercase tracking-widest px-4 rounded-md animate-pulse shadow-sm">
                            <Clock className="mr-2 h-3.5 w-3.5" /> Review Pending
                        </Badge>
                    ) : isCompleted ? (
                        <Badge className="bg-emerald-500 text-white border-none font-black h-6 text-[10px] uppercase tracking-widest px-4 rounded-md shadow-sm">
                            <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Verified Milestone
                        </Badge>
                    ) : isReturned ? (
                        <Badge className="bg-rose-500 text-white border-none font-black h-6 text-[10px] uppercase tracking-widest px-4 rounded-md shadow-sm">
                            Rework Required
                        </Badge>
                    ) : (
                        <Badge className="bg-slate-200 text-slate-600 border-none font-black h-6 text-[10px] uppercase tracking-widest px-4 rounded-md">
                            Technical Action Required
                        </Badge>
                    )}
                </div>
                
                {isSubmitted && !isPhaseAssignee && (
                    <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ownership:</span>
                        <span className="text-[10px] font-bold text-slate-600 uppercase">Finalized by {actionedByUser?.name}</span>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3">
                <TooltipProvider>
                    {isPhaseAssignee && !isLocked && isCurrentStage && (
                        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-2">
                            <Button 
                                variant="outline" 
                                className="h-11 px-8 rounded-xl font-black text-[10px] uppercase tracking-widest gap-3 border-2 border-slate-100 hover:bg-slate-50 transition-all"
                                onClick={() => handleAction(false)}
                            >
                                <FileText className="h-4 w-4 text-slate-400" /> Save as Draft
                            </Button>
                            
                            <Button 
                                className="h-12 px-10 rounded-xl font-black uppercase tracking-[0.15em] text-[10px] active:scale-95 transition-all shadow-xl bg-[#2563EB] hover:bg-blue-700 text-white shadow-blue-500/20"
                                onClick={() => handleAction(true)}
                            >
                                Finalize {stage} <ArrowRight className="ml-4 h-4 w-4 stroke-[3]" />
                            </Button>
                        </div>
                    )}
                </TooltipProvider>
            </div>
        </div>
    );
}
