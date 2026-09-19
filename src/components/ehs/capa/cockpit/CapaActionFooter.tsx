'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, FileText, CheckCircle } from 'lucide-react';
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
    const isLocked = isCompleted || isSubmitted;

    // GOVERNANCE: Only the designated Phase Assignee can execute lifecycle transitions
    const isPhaseAssignee = user?.id === sData?.assigneeId;
    const actionedByUser = users.find(u => u.id === sData?.actionedById);

    const handleAction = (isSubmit: boolean) => {
        if (!isPhaseAssignee) return;
        const formData = getValues();
        actionStage(observation.id, stage, formData, isSubmit);
    };

    const actionButton = (
        <Button 
            className={cn(
                "h-12 px-10 rounded-xl font-black uppercase tracking-[0.15em] text-[10px] active:scale-95 transition-all shadow-xl ml-4",
                "bg-[#2563EB] hover:bg-blue-700 text-white shadow-blue-500/20",
                (!isPhaseAssignee || isLocked) && "opacity-50 grayscale"
            )}
            disabled={isLocked || !isCurrentStage || !isPhaseAssignee}
            onClick={() => handleAction(true)}
        >
            Finalize {stage} <ArrowRight className="ml-4 h-4 w-4 stroke-[3]" />
        </Button>
    );

    const draftButton = (
        <Button 
            variant="outline" 
            className={cn(
                "h-11 px-8 rounded-xl font-black text-[10px] uppercase tracking-widest gap-3 border-2 border-slate-100 hover:bg-slate-50 transition-all",
                (!isPhaseAssignee || isLocked) && "opacity-50 grayscale"
            )}
            disabled={isLocked || !isCurrentStage || !isPhaseAssignee}
            onClick={() => handleAction(false)}
        >
            <FileText className="h-4 w-4 text-slate-400" /> Save as Draft
        </Button>
    );

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
                    <Badge className={cn(
                        "font-black h-5 text-[8px] border-none uppercase tracking-[0.15em] px-3 rounded-md shadow-sm",
                        isCompleted ? "bg-emerald-500" : isSubmitted ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-600"
                    )}>
                        {isCompleted ? 'VERIFIED' : 
                         isSubmitted ? (isPhaseAssignee ? 'REVIEW PENDING' : `SUBMITTED BY ${actionedByUser?.name?.toUpperCase() || 'PERSONNEL'}`) : 
                         'AWAITING ACTION'}
                    </Badge>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <TooltipProvider>
                    {!isPhaseAssignee && isCurrentStage && !isLocked ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex items-center gap-3">
                                    {draftButton}
                                    {actionButton}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-slate-900 text-white border-none font-bold text-xs p-3 rounded-lg shadow-2xl">
                                <p>Action Restricted: Only the Phase Assignee can modify this stage.</p>
                            </TooltipContent>
                        </Tooltip>
                    ) : (
                        <div className="flex items-center gap-3">
                            {draftButton}
                            {actionButton}
                        </div>
                    )}
                </TooltipProvider>
            </div>
        </div>
    );
}
