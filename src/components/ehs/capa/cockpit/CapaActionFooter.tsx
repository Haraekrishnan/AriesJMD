'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, FileText, CheckCircle, Undo2, CheckCircle2 } from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useEhs } from '@/contexts/ehs-provider';
import { useAuth } from '@/contexts/auth-provider';
import { useFormContext } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
    observation: EhsObservation;
    stage: CapaStage;
    onVerify: () => void;
    onRework: () => void;
}

export default function CapaActionFooter({ observation, stage, onVerify, onRework }: Props) {
    const { user, users } = useAuth();
    const { actionStage } = useEhs();
    const { getValues } = useFormContext();
    
    const sData = observation.stages[stage];
    const isCurrentStage = observation.currentStage === stage;
    const isCompleted = sData?.status === 'Completed';
    const isSubmitted = sData?.status === 'In Progress';
    const isLocked = isCompleted || isSubmitted;

    // GOVERNANCE: Role identification
    const isPhaseAssignee = user?.id === sData?.assigneeId;
    const isSupervisor = user?.role === 'Admin' || user?.role === 'Senior Safety Supervisor' || user?.role === 'Project Coordinator';
    const actionedByUser = users.find(u => u.id === sData?.actionedById);

    const handleAction = (isSubmit: boolean) => {
        if (!isPhaseAssignee) return;
        const formData = getValues();
        actionStage(observation.id, stage, formData, isSubmit);
    };

    return (
        <div className="flex items-center justify-between w-full h-full">
            <div className="flex items-center gap-12 text-left">
                <div className="flex flex-col">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-1.5">Active Milestone</p>
                    <p className="text-sm font-black uppercase text-slate-900 tracking-tight">{stage}</p>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div className="flex flex-col">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-1.5">Stage Status</p>
                    <Badge className={cn(
                        "font-black h-5 text-[8px] border-none uppercase tracking-[0.15em] px-3 rounded-md shadow-sm",
                        isCompleted ? "bg-emerald-500 text-white" : 
                        isSubmitted ? "bg-amber-100 text-amber-700" : 
                        "bg-slate-200 text-slate-600"
                    )}>
                        {isCompleted ? 'VERIFIED' : 
                         isSubmitted ? (isPhaseAssignee ? 'REVIEW PENDING' : `SUBMITTED BY ${actionedByUser?.name?.toUpperCase() || 'PERSONNEL'}`) : 
                         'AWAITING ACTION'}
                    </Badge>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {/* MANAGEMENT ACTION CARD (BLACK BOX) - NOW IN FOOTER */}
                {isCurrentStage && isSubmitted && isSupervisor && (
                    <div className="bg-[#0F172A] px-6 py-2.5 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-right-2 shadow-2xl border border-white/5">
                        <Button 
                            variant="outline" 
                            className="h-9 border-rose-500/30 text-rose-400 hover:bg-rose-600 hover:text-white font-black uppercase tracking-widest text-[9px] px-6 rounded-xl transition-all"
                            onClick={onRework}
                        >
                            <Undo2 className="mr-2.5 h-3.5 w-3.5" /> Instruct Technical Rework
                        </Button>
                        <Button 
                            className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[9px] px-8 rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
                            onClick={onVerify}
                        >
                            <CheckCircle2 className="mr-2.5 h-4 w-4" /> Verify & Continue Lifecycle
                        </Button>
                    </div>
                )}

                <TooltipProvider>
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="outline" 
                            className={cn(
                                "h-11 px-8 rounded-xl font-black text-[10px] uppercase tracking-widest gap-3 border-2 border-slate-100 hover:bg-slate-50 transition-all",
                                (!isPhaseAssignee || isLocked) && "opacity-50 grayscale"
                            )}
                            disabled={isLocked || !isCurrentStage || !isPhaseAssignee}
                            onClick={() => handleAction(false)}
                        >
                            <FileText className="h-4 w-4 text-slate-400" /> Save as Draft
                        </Button>
                        
                        <Button 
                            className={cn(
                                "h-12 px-10 rounded-xl font-black uppercase tracking-[0.15em] text-[10px] active:scale-95 transition-all shadow-xl",
                                "bg-[#2563EB] hover:bg-blue-700 text-white shadow-blue-500/20",
                                (!isPhaseAssignee || isLocked) && "opacity-50 grayscale"
                            )}
                            disabled={isLocked || !isCurrentStage || !isPhaseAssignee}
                            onClick={() => handleAction(true)}
                        >
                            Finalize {stage} <ArrowRight className="ml-4 h-4 w-4 stroke-[3]" />
                        </Button>
                    </div>
                </TooltipProvider>
            </div>
        </div>
    );
}
