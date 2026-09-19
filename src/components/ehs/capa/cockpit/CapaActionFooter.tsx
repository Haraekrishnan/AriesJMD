'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, ArrowRight, MessageSquare, UploadCloud, ShieldCheck } from 'lucide-react';
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
            <div className="flex items-center gap-16">
                <div className="flex flex-col text-left">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-2">Active Milestone</p>
                    <p className="text-sm font-black uppercase text-slate-900 tracking-tight">{stage}</p>
                </div>
                <div className="h-10 w-px bg-slate-200" />
                <div className="flex flex-col text-left">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-2">Stage Integrity</p>
                    <Badge className={cn(
                        "font-black h-6 text-[10px] border-none uppercase tracking-[0.2em] px-4 rounded-lg shadow-sm",
                        isCompleted ? "bg-emerald-500" : isSubmitted ? "bg-amber-500" : "bg-blue-600"
                    )}>
                        {sData?.status || 'PENDING'}
                    </Badge>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <Button 
                    variant="ghost" 
                    className="h-12 px-8 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] gap-3 hover:bg-slate-100 transition-all"
                    disabled={isLocked || !isCurrentStage}
                    onClick={() => handleAction(false)}
                >
                    <Save className="h-4 w-4 text-slate-400" /> Save Draft
                </Button>
                
                <div className="flex gap-2 mx-4">
                     <Button 
                        variant="outline" 
                        size="icon"
                        className="h-12 w-12 rounded-2xl border-2 hover:bg-slate-50 shadow-sm border-slate-200 bg-white"
                        disabled={isLocked || !isCurrentStage}
                    >
                        <MessageSquare className="h-4.5 w-4.5 text-slate-400" />
                    </Button>
                    <Button 
                        variant="outline" 
                        size="icon"
                        className="h-12 w-12 rounded-2xl border-2 hover:bg-slate-50 shadow-sm border-slate-200 bg-white"
                        disabled={isLocked || !isCurrentStage}
                    >
                        <UploadCloud className="h-4.5 w-4.5 text-slate-400" />
                    </Button>
                </div>
                
                <Button 
                    className={cn(
                        "h-14 px-12 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] active:scale-95 transition-all shadow-xl",
                        "bg-[#2563EB] hover:bg-blue-700 text-white shadow-blue-500/20"
                    )}
                    disabled={isLocked || !isCurrentStage}
                    onClick={() => handleAction(true)}
                >
                    Finalize {stage} <ArrowRight className="ml-6 h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}
