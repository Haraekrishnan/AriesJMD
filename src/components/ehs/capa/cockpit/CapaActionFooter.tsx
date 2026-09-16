'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, Send, MessageSquare, Link as LinkIcon, Lock } from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useEhs } from '@/contexts/ehs-provider';
import { cn } from '@/lib/utils';
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
    const isLocked = sData?.status === 'Completed' || sData?.status === 'In Progress';
    const isAssignee = user?.id === sData?.assigneeId;

    if (!isCurrentStage || !isAssignee) {
        return (
            <div className="bg-slate-50/80 backdrop-blur-md border-2 border-slate-200/50 rounded-2xl p-4 px-8 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-slate-300" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Viewing Mode Only</span>
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                    Action restricted to current stage owner
                </div>
            </div>
        );
    }

    if (isLocked) {
        return (
            <div className="bg-blue-50/80 backdrop-blur-md border-2 border-blue-200/50 rounded-2xl p-4 px-8 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                    <Lock className="h-4 w-4 text-blue-500" />
                    <span className="text-[10px] font-black text-blue-700 uppercase tracking-[0.2em]">Stage Data Transmitted</span>
                </div>
                <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                    Awaiting Official Review Cycle
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white border-2 border-slate-200 shadow-2xl rounded-2xl p-4 px-8 flex items-center justify-between animate-in slide-in-from-bottom-10 duration-500">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Status: In Progress</span>
                </div>
                <div className="h-4 w-px bg-slate-200" />
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-9 px-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600">
                        <Save className="mr-2 h-3.5 w-3.5" /> Save Draft
                    </Button>
                    <Button variant="ghost" size="sm" className="h-9 px-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600">
                        <MessageSquare className="mr-2 h-3.5 w-3.5" /> Comment
                    </Button>
                    <Button variant="ghost" size="sm" className="h-9 px-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600">
                        <LinkIcon className="mr-2 h-3.5 w-3.5" /> Evidence
                    </Button>
                </div>
            </div>

            <Button 
                className="bg-[#2563EB] hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] text-[10px] h-12 px-10 rounded-xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                onClick={() => actionStage(observation.id, stage, {})}
            >
                Submit {stage.toUpperCase()} <Send className="ml-3 h-3.5 w-3.5" />
            </Button>
        </div>
    );
}
