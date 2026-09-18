'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, ArrowRight, MessageSquare, Paperclip } from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useEhs } from '@/contexts/ehs-provider';
import { useFormContext } from 'react-hook-form';
import { cn } from '@/lib/utils';

interface Props {
    observation: EhsObservation;
    stage: CapaStage;
}

export default function CapaActionFooter({ observation, stage }: Props) {
    const { actionStage } = useEhs();
    const { getValues } = useFormContext();
    
    const sData = observation.stages[stage];
    const isCurrentStage = observation.currentStage === stage;
    const isCompleted = sData?.status === 'Completed';
    const isSubmitted = sData?.status === 'In Progress';
    const isLocked = isCompleted || isSubmitted;

    const handleAction = (isSubmit: boolean) => {
        const formData = getValues();
        actionStage(observation.id, stage, formData, isSubmit);
    };

    return (
        <div className="flex items-center justify-between w-full h-full">
            <div className="flex items-center gap-10">
                <div className="flex flex-col text-left">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Current Stage</p>
                    <p className="text-sm font-black uppercase text-slate-900 tracking-tight">{stage}</p>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div className="flex flex-col text-left">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Stage Status</p>
                    <Badge className="bg-blue-100 text-blue-700 font-black h-5 text-[9px] border-none uppercase tracking-widest px-3">
                        {sData?.status || 'IN PROGRESS'}
                    </Badge>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <Button 
                    variant="outline" 
                    className="h-10 px-6 rounded-lg font-bold text-xs gap-2 border-slate-200 shadow-sm bg-white"
                    disabled={isLocked || !isCurrentStage}
                    onClick={() => handleAction(false)}
                >
                    <Save className="h-4 w-4" /> Save as Draft
                </Button>
                <Button 
                    variant="outline" 
                    className="h-10 px-6 rounded-lg font-bold text-xs gap-2 border-slate-200 shadow-sm bg-white"
                    disabled={isLocked || !isCurrentStage}
                >
                    <MessageSquare className="h-4 w-4" /> Add Comment
                </Button>
                <Button 
                    variant="outline" 
                    className="h-10 px-6 rounded-lg font-bold text-xs gap-2 border-slate-200 shadow-sm bg-white"
                    disabled={isLocked || !isCurrentStage}
                >
                    <Paperclip className="h-4 w-4" /> Upload Evidence
                </Button>
                
                <Button 
                    className={cn(
                        "h-10 px-10 rounded-lg font-black uppercase tracking-[0.1em] text-[11px] active:scale-95 transition-all ml-4 shadow-lg",
                        "bg-[#2563EB] hover:bg-blue-700 text-white"
                    )}
                    disabled={isLocked || !isCurrentStage}
                    onClick={() => handleAction(true)}
                >
                    Finalize {stage} <ArrowRight className="ml-3 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
