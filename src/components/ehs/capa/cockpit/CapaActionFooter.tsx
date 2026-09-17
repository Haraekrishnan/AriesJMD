'use client';

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Save, ArrowRight, Lock, Eye, MessageSquare } from 'lucide-react';
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
            case 'Resolution': return 'Submit Resolution Plan';
            case 'Implementation': return 'Submit Field Completion';
            case 'Effectiveness Review': return 'Approve Effectiveness';
            case 'Reference': return 'Submit Reference Data';
            case 'Closure': return 'Authorize Case Closure';
            default: return 'Submit Stage Data';
        }
    }, [stage]);

    return (
        <div className="flex items-center justify-between w-full h-full max-w-7xl mx-auto">
            <div className="flex items-center gap-8">
                <div className="flex items-center gap-3 border-r pr-8 border-slate-200">
                    <div className={cn(
                        "h-2 w-2 rounded-full",
                        isCompleted ? "bg-emerald-500" : 
                        isSubmitted ? "bg-amber-500" : "bg-blue-600 animate-pulse"
                    )} />
                    <div className="space-y-0.5">
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">Stage Status</p>
                        <p className="text-[10px] font-bold text-slate-900 uppercase tracking-tight">
                            {isCompleted ? 'Verified Milestone' : isSubmitted ? 'Pending Official Review' : 'Active Management'}
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" className="h-9 px-4 text-[9px] font-bold uppercase tracking-wider text-slate-500 hover:text-blue-600 hover:bg-blue-50 gap-2">
                        <Save className="h-3.5 w-3.5" /> Save Draft
                    </Button>
                    <Button variant="ghost" size="sm" className="h-9 px-4 text-[9px] font-bold uppercase tracking-wider text-slate-500 hover:text-blue-600 hover:bg-blue-50 gap-2">
                        <MessageSquare className="h-3.5 w-3.5" /> Add Comment
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {!isCurrentStage || !isAssignee ? (
                    <div className="flex items-center gap-2 px-6 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 font-bold uppercase text-[9px] tracking-widest">
                        <Eye className="h-3.5 w-3.5 opacity-50" /> Viewing Context Mode
                    </div>
                ) : isLocked ? (
                    <div className="flex items-center gap-2 px-6 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 font-bold uppercase text-[9px] tracking-widest">
                        <Lock className="h-3.5 w-3.5" /> Locked For Validation
                    </div>
                ) : (
                    <Button 
                        className="bg-[#2563EB] hover:bg-blue-700 text-white font-bold uppercase tracking-wider text-[10px] h-11 px-10 rounded-lg shadow-md active:scale-95 transition-all"
                        onClick={() => actionStage(observation.id, stage, {})}
                    >
                        {buttonLabel} <ArrowRight className="ml-2 h-3.5 w-3.5 stroke-[2.5]" />
                    </Button>
                )}
            </div>
        </div>
    );
}