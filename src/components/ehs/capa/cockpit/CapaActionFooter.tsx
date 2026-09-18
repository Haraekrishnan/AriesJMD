'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-1">Current Stage</p>
                    <p className="text-sm font-black uppercase text-slate-900 tracking-tight">{stage}</p>
                </div>
                <div className="h-8 w-px bg-slate-900" />
                <div className="flex flex-col text-left">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-1">Stage Status</p>
                    <Badge className="bg-[#2563EB] text-white font-black h-5 text-[9px] border-none uppercase tracking-widest px-3 rounded-none">
                        {sData?.status || 'IN PROGRESS'}
                    </Badge>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <Button 
                    variant="outline" 
                    className="h-10 px-6 rounded-none font-black text-[10px] uppercase tracking-widest gap-2 border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] bg-white active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                    disabled={isLocked || !isCurrentStage}
                    onClick={() => handleAction(false)}
                >
                    <Save className="h-4 w-4" /> Save Draft
                </Button>
                
                <Button 
                    variant="outline" 
                    className="h-10 px-6 rounded-none font-black text-[10px] uppercase tracking-widest gap-2 border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] bg-white active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                    disabled={isLocked || !isCurrentStage}
                >
                    <Paperclip className="h-4 w-4" /> Upload Document
                </Button>
                
                <Button 
                    className={cn(
                        "h-10 px-10 rounded-none font-black uppercase tracking-[0.2em] text-[11px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all ml-4 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
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
