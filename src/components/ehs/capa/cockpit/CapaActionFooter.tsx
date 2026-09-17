'use client';

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Save, ArrowRight, MessageSquare, ShieldCheck } from 'lucide-react';
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
            case 'Investigation': return 'Submit Investigation';
            case 'Resolution': return 'Submit Resolution';
            case 'Implementation': return 'Finalize Field Actions';
            case 'Closure': return 'Authorize Case Closure';
            default: return `Submit ${stage}`;
        }
    }, [stage]);

    return (
        <div className="flex items-center justify-between w-full h-full max-w-[1400px] mx-auto">
            <div className="flex items-center gap-6">
                <Button variant="outline" size="sm" className="h-10 px-6 text-[10px] font-black uppercase tracking-widest text-slate-900 border-2 gap-2 hover:bg-slate-50 transition-all">
                    <Save className="h-4 w-4 text-slate-400" /> Save Draft
                </Button>
                <Button variant="ghost" size="sm" className="h-10 px-6 text-[10px] font-black uppercase tracking-widest text-slate-900 gap-2 hover:bg-slate-100 transition-all">
                    <MessageSquare className="h-4 w-4 text-slate-400" /> Add Comment
                </Button>
            </div>

            <div className="flex items-center gap-4">
                {(!isCurrentStage || !isAssignee) && !isLocked ? (
                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 pr-6">
                       <ShieldCheck className="h-4 w-4" /> Operational Oversight Mode
                   </div>
                ) : null}
                
                <Button 
                    className="bg-[#2563EB] hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] text-[10px] h-12 px-12 rounded-xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all disabled:bg-slate-300"
                    disabled={isLocked || !isCurrentStage}
                    onClick={() => actionStage(observation.id, stage, { submitted: true })}
                >
                    {isLocked ? 'STAGE FINALIZED' : buttonLabel} <ArrowRight className="ml-3 h-4 w-4 stroke-[3]" />
                </Button>
            </div>
        </div>
    );
}
