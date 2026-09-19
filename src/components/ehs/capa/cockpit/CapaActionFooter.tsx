'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, ArrowRight, MessageSquare, Paperclip, UploadCloud } from 'lucide-react';
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
            <div className="flex items-center gap-12">
                <div className="flex items-center gap-5">
                    <div className="h-10 w-10 rounded-none border-4 border-slate-100 flex items-center justify-center bg-white shadow-sm">
                        <div className="h-3 w-3 rounded-none bg-[#2563EB]" />
                    </div>
                    <div className="flex flex-col text-left">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-1.5">Active Milestone</p>
                        <p className="text-base font-black uppercase text-slate-900 tracking-tighter">{stage}</p>
                    </div>
                </div>
                <div className="h-12 w-1 bg-slate-100" />
                <div className="flex flex-col text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-2">Stage Integrity</p>
                    <Badge className={cn(
                        "font-black h-6 text-[10px] border-none uppercase tracking-[0.2em] px-4 rounded-none shadow-sm",
                        isCompleted ? "bg-emerald-500" : isSubmitted ? "bg-amber-500" : "bg-blue-600"
                    )}>
                        {sData?.status || 'IN PROGRESS'}
                    </Badge>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <Button 
                    variant="outline" 
                    className="h-12 px-6 rounded-none font-black text-[11px] uppercase tracking-[0.2em] gap-3 border-2 border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
                    disabled={isLocked || !isCurrentStage}
                    onClick={() => handleAction(false)}
                >
                    <Save className="h-4 w-4 text-slate-400" /> Save Phase Draft
                </Button>
                
                <Button 
                    variant="outline" 
                    className="h-12 px-6 rounded-none font-black text-[11px] uppercase tracking-[0.2em] gap-3 border-2 border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
                    disabled={isLocked || !isCurrentStage}
                >
                    <MessageSquare className="h-4 w-4 text-slate-400" /> Add Note
                </Button>

                <Button 
                    variant="outline" 
                    className="h-12 px-6 rounded-none font-black text-[11px] uppercase tracking-[0.2em] gap-3 border-2 border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
                    disabled={isLocked || !isCurrentStage}
                >
                    <UploadCloud className="h-4 w-4 text-slate-400" /> Upload Document
                </Button>
                
                <Button 
                    className={cn(
                        "h-14 px-12 rounded-none font-black uppercase tracking-[0.2em] text-[12px] active:scale-95 transition-all ml-6 shadow-xl border-4 border-slate-900",
                        "bg-[#2563EB] hover:bg-blue-700 text-white"
                    )}
                    disabled={isLocked || !isCurrentStage}
                    onClick={() => handleAction(true)}
                >
                    Finalize {stage} <ArrowRight className="ml-4 h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}
