'use client';

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Save, ArrowRight, ShieldCheck } from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useEhs } from '@/contexts/ehs-provider';
import { useAuth } from '@/contexts/auth-provider';
import { cn } from '@/lib/utils';

interface Props {
    observation: EhsObservation;
    stage: CapaStage;
}

export default function CapaActionFooter({ observation, stage }: Props) {
    const { user } = useAuth();
    const { actionStage } = useEhs();
    
    const sData = observation.stages[stage];
    const isCurrentStage = observation.currentStage === stage;
    const isCompleted = sData?.status === 'Completed';
    const isSubmitted = sData?.status === 'In Progress';
    const isLocked = isCompleted || isSubmitted;
    const isAssignee = user?.id === sData?.assigneeId;

    const buttonLabel = useMemo(() => {
        switch(stage) {
            case 'Investigation': return 'SUBMIT INVESTIGATION';
            case 'Resolution': return 'SUBMIT RESOLUTION';
            case 'Implementation': return 'FINALIZE FIELD ACTIONS';
            case 'Closure': return 'AUTHORIZE CASE CLOSURE';
            default: return `SUBMIT ${stage.toUpperCase()}`;
        }
    }, [stage]);

    return (
        <div className="flex items-center justify-between w-full h-full max-w-[1000px] mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" className="h-9 px-5 text-[10px] font-black uppercase tracking-widest text-slate-900 border border-slate-300 gap-2 bg-white hover:bg-slate-50">
                    <Save className="h-3.5 w-3.5" /> SAVE AS DRAFT
                </Button>
            </div>

            <div className="flex items-center gap-6">
                {!isLocked && (!isCurrentStage || !isAssignee) && (
                   <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                       <ShieldCheck className="h-3.5 w-3.5" /> OVERSIGHT MODE ACTIVE
                   </div>
                )}
                
                <Button 
                    className="bg-slate-900 hover:bg-black text-white font-black uppercase tracking-[0.15em] text-[10px] h-10 px-10 rounded-sm shadow-sm transition-all disabled:bg-slate-200"
                    disabled={isLocked || !isCurrentStage}
                    onClick={() => actionStage(observation.id, stage, { submitted: true })}
                >
                    {isLocked ? 'STAGE FINALIZED' : buttonLabel} <ArrowRight className="ml-3 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}