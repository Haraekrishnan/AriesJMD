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
            <div className="flex items-center gap-12">
                <div className="flex items-center gap-5">
                    <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center shadow-inner">
                        <div className="h-3 w-3 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
                    </div>
                    <div className="flex flex-col text-left">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-1.5">Active Milestone</p>
                        <p className="text-sm font-black uppercase text-slate-900 tracking-tight">{stage}</p>
                    </div>
                </div>
                <div className="h-10 w-px bg-slate-100" />
                <div className="flex flex-col text-left">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-2">Stage Integrity</p>
                    <Badge className={cn(
                        "font-black h-5 text-[9px] border-none uppercase tracking-[0.2em] px-3 rounded-lg shadow-sm",
                        isCompleted ? "bg-emerald-500" : isSubmitted ? "bg-amber-500" : "bg-blue-600"
                    )}>
                        {sData?.status || 'ACTIVE'}
                    </Badge>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <Button 
                    variant="ghost" 
                    className="h-12 px-6 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] gap-2 hover:bg-slate-50"
                    disabled={isLocked || !isCurrentStage}
                    onClick={() => handleAction(false)}
                >
                    <Save className="h-4 w-4 text-slate-400" /> Save Draft
                </Button>
                
                <div className="flex gap-2 mr-6">
                     <Button 
                        variant="outline" 
                        size="icon"
                        className="h-11 w-11 rounded-2xl border-2 hover:bg-slate-50 shadow-sm"
                        disabled={isLocked || !isCurrentStage}
                    >
                        <MessageSquare className="h-4 w-4 text-slate-400" />
                    </Button>
                    <Button 
                        variant="outline" 
                        size="icon"
                        className="h-11 w-11 rounded-2xl border-2 hover:bg-slate-50 shadow-sm"
                        disabled={isLocked || !isCurrentStage}
                    >
                        <UploadCloud className="h-4 w-4 text-slate-400" />
                    </Button>
                </div>
                
                <Button 
                    className={cn(
                        "h-14 px-10 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] active:scale-95 transition-all shadow-xl",
                        "bg-blue-600 hover:bg-blue-700 text-white"
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