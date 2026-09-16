'use client';

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Save, Send, MessageSquare, ShieldAlert, CheckCircle2, Lock, Eye, ArrowRight } from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useEhs } from '@/contexts/ehs-provider';
import { useAuth } from '@/contexts/auth-provider';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

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
            case 'Implementation': return 'SUBMIT IMPLEMENTATION';
            case 'Effectiveness Review': return 'APPROVE EFFECTIVENESS';
            case 'Reference': return 'SUBMIT REFERENCE';
            case 'Closure': return 'CLOSE CAPA';
            default: return 'SUBMIT PHASE';
        }
    }, [stage]);

    return (
        <div className="flex items-center justify-between w-full h-full">
            <div className="flex items-center gap-8">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "h-2 w-2 rounded-full",
                        isCompleted ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : 
                        isSubmitted ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" : 
                        "bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)] animate-pulse"
                    )} />
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">
                        STAGE STATUS: {isCompleted ? 'COMPLETED' : isSubmitted ? 'PENDING REVIEW' : 'ACTIVE'}
                    </span>
                </div>
                
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-10 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all gap-2">
                        <Save className="h-3.5 w-3.5" /> Save Draft
                    </Button>
                    <Button variant="ghost" size="sm" className="h-10 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all gap-2">
                        <MessageSquare className="h-3.5 w-3.5" /> Comment
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {!isCurrentStage || !isAssignee ? (
                    <div className="flex items-center gap-2.5 px-8 py-3 bg-slate-100 border-2 rounded-xl text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">
                        <Eye className="h-4 w-4" /> Viewing Context Only
                    </div>
                ) : isLocked ? (
                    <div className="flex items-center gap-2.5 px-8 py-3 bg-blue-50 border-2 border-blue-200 rounded-xl text-blue-700 font-black uppercase text-[10px] tracking-[0.2em] shadow-sm">
                        <Lock className="h-4 w-4" /> Locked for Review
                    </div>
                ) : (
                    <Button 
                        className="bg-[#2563EB] hover:bg-blue-700 text-white font-black uppercase tracking-[0.3em] text-[11px] h-14 px-12 rounded-xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all ring-offset-4 ring-offset-white focus:ring-4 focus:ring-blue-500/20"
                        onClick={() => actionStage(observation.id, stage, {})}
                    >
                        {buttonLabel} <ArrowRight className="ml-3 h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}
