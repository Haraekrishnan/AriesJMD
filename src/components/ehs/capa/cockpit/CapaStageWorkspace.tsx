'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
    Lock, 
    ShieldCheck, 
    AlertTriangle,
    Info,
    CheckCircle2,
    Clock,
    User
} from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { useEhs } from '@/contexts/ehs-provider';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Stage-Specific Views
import InvestigationStage from './stages/InvestigationStage';

interface Props {
    observation: EhsObservation;
    stage: CapaStage;
}

export default function CapaStageWorkspace({ observation, stage }: Props) {
    const { user, users } = useAuth();
    const { reviewStage } = useEhs();
    
    const sData = observation.stages[stage];
    const isCurrentStage = observation.currentStage === stage;
    const isCompleted = sData?.status === 'Completed';
    const isSubmitted = sData?.status === 'In Progress';
    const isReturned = sData?.status === 'Returned';
    const isLocked = isCompleted || isSubmitted;

    const assignee = users.find(u => u.id === sData?.assigneeId);
    const isAssignee = user?.id === sData?.assigneeId;
    const isSupervisor = user?.role === 'Admin' || user?.role === 'Senior Safety Supervisor';

    const renderStageContent = () => {
        switch (stage) {
            case 'Investigation':
                return <InvestigationStage observation={observation} isLocked={isLocked} />;
            // Future stages will be mapped here as they are detailed
            default:
                return (
                    <div className="flex flex-col items-center justify-center py-32 text-center opacity-40 grayscale">
                        <div className="p-8 rounded-full bg-slate-100 mb-6">
                            <Shield className="h-16 w-16 text-slate-300" />
                        </div>
                        <h4 className="text-xl font-black uppercase tracking-tight text-slate-400">{stage} Workspace</h4>
                        <p className="text-sm font-bold text-slate-300 uppercase tracking-widest mt-2">TECHNICAL DATA PENDING PREVIOUS STAGE COMPLETION</p>
                    </div>
                );
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Rework Banner */}
            {isReturned && (
                <div className="p-6 rounded-xl bg-rose-50 border-2 border-rose-200 border-dashed flex items-start gap-5 shadow-sm">
                    <div className="p-3 bg-rose-500 rounded-xl shadow-lg shadow-rose-500/20">
                        <AlertTriangle className="h-5 w-5 text-white" />
                    </div>
                    <div className="space-y-1 flex-1">
                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em]">Rework Required</p>
                        <p className="text-sm font-bold text-rose-900 italic leading-relaxed">
                            "{sData?.comments ? Object.values(sData.comments).reverse()[0]?.text : 'The technical data provided requires clarification.'}"
                        </p>
                        <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest pt-2">Instructed by Senior Safety Official</p>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl border-2 border-slate-100 shadow-sm overflow-hidden">
                {/* Stage Context Header */}
                <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                            <span className="font-black text-xl">0{['Initiation', 'Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'].indexOf(stage) + 1}</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Badge className={cn(
                                    "h-5 font-black uppercase text-[8px] tracking-widest border-none shadow-sm",
                                    isCompleted ? "bg-emerald-500" : isReturned ? "bg-rose-500" : "bg-blue-600"
                                )}>
                                    {isCompleted ? 'VERIFIED MILESTONE' : isReturned ? 'REWORK ACTIVE' : 'TECHNICAL ACTION REQUIRED'}
                                </Badge>
                                {isLocked && <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2"><Lock className="h-2.5 w-2.5" /> Data Locked</div>}
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{stage.toUpperCase()}</h3>
                        </div>
                    </div>

                    <div className="flex items-center gap-10">
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Assigned To</p>
                                <p className="text-xs font-black text-slate-800 uppercase">{assignee?.name || 'Unassigned'}</p>
                            </div>
                            <Avatar className="h-10 w-10 border-2 border-white shadow-md">
                                <AvatarImage src={assignee?.avatar}/>
                                <AvatarFallback className="text-[10px] font-black bg-blue-50 text-blue-600">{assignee?.name?.[0]}</AvatarFallback>
                            </Avatar>
                        </div>

                        <div className="text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Due Date</p>
                            <div className="flex items-center gap-2 justify-end">
                                <Clock className="h-3 w-3 text-blue-500" />
                                <span className="text-xs font-black text-slate-800">19 Jan 2026</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Technical Content */}
                <div className="p-10">
                    {renderStageContent()}
                </div>
            </div>

            {/* Review Panel for Supervisors */}
            {isCurrentStage && isSubmitted && isSupervisor && (
                <div className="p-10 rounded-2xl bg-slate-900 text-white shadow-2xl space-y-8 animate-in slide-in-from-bottom-10 duration-700">
                    <div className="flex items-center gap-4">
                        <ShieldCheck className="h-10 w-10 text-emerald-500" />
                        <div>
                            <h4 className="text-xl font-black uppercase tracking-tight">Official Verification</h4>
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Lifecycle Governance Validation</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                         <Button 
                            className="flex-1 h-14 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] rounded-lg shadow-xl"
                            onClick={() => reviewStage(observation.id, stage, 'Completed', 'Technical documentation verified.')}
                         >
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Verify & Continue
                         </Button>
                         <Button 
                            variant="outline" 
                            className="flex-1 h-14 border-white/10 text-white hover:bg-rose-600 hover:border-rose-600 font-black uppercase tracking-widest text-[10px] rounded-lg"
                            onClick={() => reviewStage(observation.id, stage, 'Returned', 'Clarification required.')}
                         >
                            <Undo2 className="mr-2 h-4 w-4" /> Instruct Rework
                         </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

import { Shield } from 'lucide-react';
