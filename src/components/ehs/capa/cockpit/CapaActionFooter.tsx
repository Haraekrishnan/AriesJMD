'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, ArrowRight, MessageSquare, UploadCloud, FileText } from 'lucide-react';
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
                <div className="flex flex-col text-left">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-1.5">Current Stage</p>
                    <p className="text-sm font-black uppercase text-slate-900 tracking-tight">{stage}</p>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div className="flex flex-col text-left">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-1.5">Stage Status</p>
                    <Badge className={cn(
                        "font-black h-5 text-[8px] border-none uppercase tracking-[0.15em] px-3 rounded-md shadow-sm",
                        isCompleted ? "bg-emerald-500" : isSubmitted ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"
                    )}>
                        {isCompleted ? 'COMPLETED' : isSubmitted ? 'IN PROGRESS' : 'NOT STARTED'}
                    </Badge>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <Button 
                    variant="outline" 
                    className="h-10 px-6 rounded-lg font-black text-[10px] uppercase tracking-widest gap-3 border-2 border-slate-100 hover:bg-slate-50 transition-all"
                    disabled={isLocked || !isCurrentStage}
                    onClick={() => handleAction(false)}
                >
                    <FileText className="h-4 w-4 text-slate-400" /> Save as Draft
                </Button>
                
                <Button 
                    variant="outline" 
                    className="h-10 px-6 rounded-lg font-black text-[10px] uppercase tracking-widest gap-3 border-2 border-slate-100 hover:bg-slate-50 transition-all"
                    disabled={isLocked || !isCurrentStage}
                >
                    <MessageSquare className="h-4 w-4 text-slate-400" /> Add Comment
                </Button>

                <Button 
                    variant="outline" 
                    className="h-10 px-6 rounded-lg font-black text-[10px] uppercase tracking-widest gap-3 border-2 border-slate-100 hover:bg-slate-50 transition-all"
                    disabled={isLocked || !isCurrentStage}
                >
                    <UploadCloud className="h-4 w-4 text-slate-400" /> Upload Evidence
                </Button>
                
                <Button 
                    className={cn(
                        "h-11 px-10 rounded-xl font-black uppercase tracking-[0.15em] text-[10px] active:scale-95 transition-all shadow-xl ml-4",
                        "bg-[#2563EB] hover:bg-blue-700 text-white shadow-blue-500/20"
                    )}
                    disabled={isLocked || !isCurrentStage}
                    onClick={() => handleAction(true)}
                >
                    Finalize {stage} <ArrowRight className="ml-4 h-4 w-4 stroke-[3]" />
                </Button>
            </div>
        </div>
    );
}

