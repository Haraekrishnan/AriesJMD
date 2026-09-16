'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, Send, MessageSquare, Link as LinkIcon, Lock, Eye } from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useEhs } from '@/contexts/ehs-provider';
import { useAuth } from '@/contexts/auth-provider';

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

    return (
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        isCompleted ? "bg-emerald-500" : isSubmitted ? "bg-amber-500" : "bg-blue-500"
                    )} />
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">
                        Stage: {sData?.status || 'Pending'}
                    </span>
                </div>
                
                <div className="h-4 w-px bg-slate-200" />
                
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-9 px-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600">
                        <Save className="mr-2 h-3.5 w-3.5" /> Save Draft
                    </Button>
                    <Button variant="ghost" size="sm" className="h-9 px-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600">
                        <MessageSquare className="mr-2 h-3.5 w-3.5" /> Comment
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {!isCurrentStage || !isAssignee ? (
                    <div className="flex items-center gap-2 px-6 py-2 bg-slate-50 border rounded-xl text-slate-400 font-black uppercase text-[10px] tracking-widest">
                        <Eye className="h-3.5 w-3.5" /> Viewing Mode Only
                    </div>
                ) : isLocked ? (
                    <div className="flex items-center gap-2 px-6 py-2 bg-blue-50 border-2 border-blue-100 rounded-xl text-blue-600 font-black uppercase text-[10px] tracking-widest">
                        <Lock className="h-3.5 w-3.5" /> Data Locked For Review
                    </div>
                ) : (
                    <Button 
                        className="bg-[#2563EB] hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] text-[10px] h-12 px-10 rounded-xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                        onClick={() => actionStage(observation.id, stage, {})}
                    >
                        Submit Technical Milestone <Send className="ml-3 h-3.5 w-3.5" />
                    </Button>
                )}
            </div>
        </div>
    );
}

import { cn } from '@/lib/utils';
