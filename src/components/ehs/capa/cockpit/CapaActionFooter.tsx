'use client';

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Save, Send, MessageSquare, ShieldAlert, CheckCircle2, Lock, Eye, ArrowRight, Loader2 } from 'lucide-react';
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
            case 'Resolution': return 'SUBMIT RESOLUTION PLAN';
            case 'Implementation': return 'SUBMIT FIELD COMPLETION';
            case 'Effectiveness Review': return 'APPROVE EFFECTIVENESS';
            case 'Reference': return 'SUBMIT REFERENCE DATA';
            case 'Closure': return 'AUTHORIZE CASE CLOSURE';
            default: return 'SUBMIT STAGE DATA';
        }
    }, [stage]);

    return (
        <div className="flex items-center justify-between w-full h-full">
            <div className="flex items-center gap-10">
                <div className="flex items-center gap-4 border-r pr-10 border-slate-100">
                    <div className={cn(
                        "h-2.5 w-2.5 rounded-full ring-4",
                        isCompleted ? "bg-emerald-500 ring-emerald-50" : 
                        isSubmitted ? "bg-amber-500 ring-amber-50" : 
                        "bg-blue-600 ring-blue-50 animate-pulse"
                    )} />
                    <div className="space-y-0.5">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">STAGE STATUS</p>
                        <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">
                            {isCompleted ? 'VERIFIED MILESTONE' : isSubmitted ? 'PENDING OFFICIAL REVIEW' : 'ACTIVE IMPLEMENTATION'}
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" className="h-11 px-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all gap-2.5">
                        <Save className="h-4 w-4" /> Save Draft
                    </Button>
                    <Button variant="ghost" size="sm" className="h-11 px-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all gap-2.5">
                        <MessageSquare className="h-4 w-4" /> Add Comment
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {!isCurrentStage || !isAssignee ? (
                    <div className="flex items-center gap-3 px-10 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] shadow-inner">
                        <Eye className="h-4 w-4 opacity-50" /> VIEWING CONTEXT MODE
                    </div>
                ) : isLocked ? (
                    <div className="flex items-center gap-3 px-10 py-3.5 bg-blue-50 border-2 border-blue-200 rounded-xl text-blue-700 font-black uppercase text-[10px] tracking-[0.2em] shadow-sm">
                        <Lock className="h-4 w-4" /> LOCKED FOR OFFICIAL VALIDATION
                    </div>
                ) : (
                    <Button 
                        className="bg-[#2563EB] hover:bg-blue-700 text-white font-black uppercase tracking-[0.3em] text-[11px] h-14 px-14 rounded-2xl shadow-2xl shadow-blue-500/20 active:scale-95 transition-all ring-offset-4 ring-offset-white focus:ring-4 focus:ring-blue-500/20"
                        onClick={() => actionStage(observation.id, stage, {})}
                    >
                        {buttonLabel} <ArrowRight className="ml-3 h-4 w-4 stroke-[3]" />
                    </Button>
                )}
            </div>
        </div>
    );
}
