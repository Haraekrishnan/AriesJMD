'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, ArrowRight, MessageSquare, Paperclip, CheckCircle2 } from 'lucide-react';
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
                <div className="flex flex-col">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">PHASE IDENTITY</p>
                    <p className="text-sm font-black uppercase text-slate-900 tracking-tighter">{stage}</p>
                </div>
                <div className="h-10 w-0.5 bg-slate-900" />
                <div className="flex flex-col">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">GOVERNANCE STATUS</p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <div className={cn("h-3 w-3 rounded-none border-2 border-slate-900", isCompleted ? "bg-emerald-500" : isSubmitted ? "bg-amber-400" : "bg-blue-600")} />
                        <span className="text-xs font-black uppercase tracking-widest text-slate-900">{sData?.status || 'PENDING'}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <Button 
                    variant="outline" 
                    className="h-11 px-8 rounded-none border-2 border-slate-900 font-black text-[11px] uppercase tracking-widest gap-2 bg-white"
                    disabled={isLocked || !isCurrentStage}
                    onClick={() => handleAction(false)}
                >
                    <Save className="h-4 w-4" /> SAVE DRAFT
                </Button>
                
                <Button 
                    className={cn(
                        "h-11 px-10 rounded-none font-black uppercase tracking-[0.2em] text-[11px] active:scale-95 transition-all ml-4 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                        isCompleted ? "bg-emerald-500 text-white" : "bg-[#1769FF] text-white hover:bg-blue-700"
                    )}
                    disabled={isLocked || !isCurrentStage}
                    onClick={() => handleAction(true)}
                >
                    {isCompleted ? <CheckCircle2 className="mr-2 h-4 w-4" /> : null}
                    {isCompleted ? 'MILESTONE FINALIZED' : `AUTHORIZE ${stage.toUpperCase()}`} <ArrowRight className="ml-3 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
