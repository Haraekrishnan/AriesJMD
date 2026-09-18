
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
            <div className="flex items-center gap-10">
                <div className="flex items-center gap-4">
                    <div className="h-8 w-8 rounded-full border-4 border-blue-100 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-blue-600" />
                    </div>
                    <div className="flex flex-col text-left">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Stage</p>
                        <p className="text-sm font-black uppercase text-slate-900 tracking-tight">{stage}</p>
                    </div>
                </div>
                <div className="h-10 w-px bg-slate-200" />
                <div className="flex flex-col text-left">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Status</p>
                    <Badge className="bg-blue-50 text-blue-700 font-black h-5 text-[9px] border-none uppercase tracking-widest px-3 rounded-full">
                        {sData?.status || 'IN PROGRESS'}
                    </Badge>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <Button 
                    variant="outline" 
                    className="h-10 px-5 rounded-lg font-bold text-[11px] uppercase tracking-wider gap-2 border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
                    disabled={isLocked || !isCurrentStage}
                    onClick={() => handleAction(false)}
                >
                    <Save className="h-3.5 w-3.5 text-slate-400" /> Save as Draft
                </Button>
                
                <Button 
                    variant="outline" 
                    className="h-10 px-5 rounded-lg font-bold text-[11px] uppercase tracking-wider gap-2 border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
                    disabled={isLocked || !isCurrentStage}
                >
                    <MessageSquare className="h-3.5 w-3.5 text-slate-400" /> Add Comment
                </Button>

                <Button 
                    variant="outline" 
                    className="h-10 px-5 rounded-lg font-bold text-[11px] uppercase tracking-wider gap-2 border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
                    disabled={isLocked || !isCurrentStage}
                >
                    <UploadCloud className="h-3.5 w-3.5 text-slate-400" /> Upload Evidence
                </Button>
                
                <Button 
                    className={cn(
                        "h-12 px-10 rounded-xl font-black uppercase tracking-widest text-[12px] active:scale-95 transition-all ml-4 shadow-lg shadow-blue-600/20",
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
