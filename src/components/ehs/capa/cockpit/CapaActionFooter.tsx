'use client';

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Save, ArrowRight, ShieldCheck, MessageSquare, Paperclip } from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useEhs } from '@/contexts/ehs-provider';
import { useAuth } from '@/contexts/auth-provider';
import { useFormContext } from 'react-hook-form';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Props {
    observation: EhsObservation;
    stage: CapaStage;
}

export default function CapaActionFooter({ observation, stage }: Props) {
    const { user } = useAuth();
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
            <div className="flex items-center gap-8">
                <div className="flex flex-col">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">STAGE</p>
                    <p className="text-xs font-black uppercase text-slate-900">{stage}</p>
                </div>
                <div className="h-8 w-px bg-slate-100" />
                <div className="flex flex-col">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">STATUS</p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <div className={cn("h-2 w-2 rounded-full", isCompleted ? "bg-emerald-500" : isSubmitted ? "bg-amber-500" : "bg-blue-600")} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">{sData?.status || 'PENDING'}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <Button 
                    variant="outline" 
                    className="h-11 px-8 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest gap-2 bg-white"
                    disabled={isLocked || !isCurrentStage}
                    onClick={() => handleAction(false)}
                >
                    <Save className="h-4 w-4 text-slate-400" /> SAVE AS DRAFT
                </Button>
                
                <Button variant="outline" className="h-11 px-8 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest gap-2 bg-white">
                    <MessageSquare className="h-4 w-4 text-slate-400" /> ADD COMMENT
                </Button>
                
                <Button variant="outline" className="h-11 px-8 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest gap-2 bg-white">
                    <Paperclip className="h-4 w-4 text-slate-400" /> UPLOAD EVIDENCE
                </Button>

                <Button 
                    className="h-11 px-10 bg-[#1769FF] hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all ml-4"
                    disabled={isLocked || !isCurrentStage}
                    onClick={() => handleAction(true)}
                >
                    {isCompleted ? 'PHASE FINALIZED' : `FINALIZE ${stage.toUpperCase()}`} <ArrowRight className="ml-3 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
