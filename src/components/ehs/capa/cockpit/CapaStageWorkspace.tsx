'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
    Lock, 
    ShieldCheck, 
    AlertTriangle,
    CheckCircle2,
    Clock,
    User,
    Undo2,
    Zap,
    Info
} from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { useEhs } from '@/contexts/ehs-provider';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Stage Views
import CapaInvestigation from '../stages/CapaInvestigation';
import CapaResolution from '../stages/CapaResolution';
import CapaImplementation from '../stages/CapaImplementation';
import CapaEffectivenessReview from '../stages/CapaEffectivenessReview';
import CapaReference from '../stages/CapaReference';
import CapaClosure from '../stages/CapaClosure';

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
    const isSupervisor = user?.role === 'Admin' || user?.role === 'Senior Safety Supervisor';

    const renderStageContent = () => {
        switch (stage) {
            case 'Initiation': return <InitiationView observation={observation} />;
            case 'Investigation': return <CapaInvestigation observation={observation} isLocked={isLocked} />;
            case 'Resolution': return <CapaResolution observation={observation} isLocked={isLocked} />;
            case 'Implementation': return <CapaImplementation observation={observation} isLocked={isLocked} />;
            case 'Effectiveness Review': return <CapaEffectivenessReview observation={observation} isLocked={isLocked} />;
            case 'Reference': return <CapaReference observation={observation} isLocked={isLocked} />;
            case 'Closure': return <CapaClosure observation={observation} isLocked={isLocked} />;
            default: return null;
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700 max-w-7xl mx-auto">
            {/* --- REWORK ALERT BANNER --- */}
            {isReturned && (
                <div className="p-8 rounded-2xl bg-rose-50 border-2 border-rose-100 shadow-md flex items-start gap-6 animate-in slide-in-from-top-4 duration-500">
                    <div className="p-4 bg-rose-600 rounded-2xl shadow-xl shadow-rose-600/20 shrink-0">
                        <AlertTriangle className="h-7 w-7 text-white" />
                    </div>
                    <div className="space-y-2 min-w-0">
                        <p className="text-[11px] font-black text-rose-600 uppercase tracking-[0.3em]">Lifecycle Rework Instructed</p>
                        <p className="text-lg font-bold text-rose-900 leading-relaxed italic">
                            "{sData?.comments ? Object.values(sData.comments).reverse().find(c => c.text.includes('[REWORK]'))?.text.replace('[REWORK]', '').trim() : 'Phase rejected. Please review findings.'}"
                        </p>
                    </div>
                </div>
            )}

            {/* --- STAGE HEADER CARD --- */}
            <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="px-10 py-8 border-b bg-slate-50/30 flex justify-between items-center">
                    <div className="flex items-center gap-8">
                        <div className="h-16 w-16 rounded-[1.25rem] bg-blue-600 flex items-center justify-center text-white shadow-2xl shadow-blue-600/30 ring-8 ring-blue-50">
                            <span className="font-black text-2xl">0{['Initiation', 'Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'].indexOf(stage) + 1}</span>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <Badge className={cn(
                                    "h-6 font-black uppercase text-[9px] tracking-[0.2em] border-none shadow-sm",
                                    isCompleted ? "bg-emerald-500" : isReturned ? "bg-rose-500" : "bg-blue-600"
                                )}>
                                    {isCompleted ? 'VERIFIED MILESTONE' : isReturned ? 'REWORK ACTIVE' : 'TECHNICAL ACTION REQUIRED'}
                                </Badge>
                                {isLocked && <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest"><Lock className="h-3 w-3" /> System Locked</div>}
                            </div>
                            <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">{stage}</h3>
                        </div>
                    </div>

                    <div className="flex items-center gap-10">
                        {assignee && (
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ownership</p>
                                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{assignee.name}</p>
                                </div>
                                <Avatar className="h-12 w-12 border-2 border-white shadow-xl ring-2 ring-slate-100">
                                    <AvatarImage src={assignee.avatar}/>
                                    <AvatarFallback className="text-[12px] font-black bg-blue-50 text-blue-600">{assignee.name?.[0]}</AvatarFallback>
                                </Avatar>
                            </div>
                        )}
                        <div className="text-right border-l pl-10 h-10 flex flex-col justify-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Delivery</p>
                            <div className="flex items-center gap-2 justify-end">
                                <Clock className="h-4 w-4 text-blue-500" />
                                <span className="text-base font-black text-slate-900 uppercase">TBD</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- PRIMARY CONTENT REGION --- */}
                <div className="p-10 bg-white">
                    {renderStageContent()}
                </div>
            </div>

            {/* --- EXECUTIVE REVIEW WORKBENCH --- */}
            {isCurrentStage && isSubmitted && isSupervisor && (
                <div className="p-10 rounded-[3rem] bg-slate-900 text-white shadow-2xl space-y-10 animate-in slide-in-from-bottom-8 duration-1000 border border-white/10">
                    <div className="flex items-center gap-6">
                        <div className="h-16 w-16 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
                            <ShieldCheck className="h-10 w-10 text-white" />
                        </div>
                        <div>
                            <h4 className="text-2xl font-black uppercase tracking-tight">Executive Validation Workspace</h4>
                            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-1">Lifecycle Governance & Audit Integrity Check</p>
                        </div>
                    </div>
                    <div className="flex gap-6">
                         <Button 
                            className="flex-1 h-20 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-[0.3em] text-xs rounded-2xl shadow-2xl shadow-emerald-500/20 transition-all active:scale-95"
                            onClick={() => reviewStage(observation.id, stage, 'Completed', 'Documentation verified.')}
                         >
                            <CheckCircle2 className="mr-3 h-6 w-6" /> Authorize Phase Completion
                         </Button>
                         <Button 
                            variant="outline" 
                            className="flex-1 h-20 border-white/10 text-white hover:bg-rose-600 hover:border-rose-600 font-black uppercase tracking-[0.3em] text-xs rounded-2xl transition-all active:scale-95"
                            onClick={() => {
                                const comment = prompt("Enter required technical corrections:");
                                if (comment) reviewStage(observation.id, stage, 'Returned', `[REWORK] ${comment}`);
                            }}
                         >
                            <Undo2 className="mr-3 h-6 w-6" /> Instruct Corrections
                         </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

function InitiationView({ observation }: { observation: EhsObservation }) {
    return (
        <div className="space-y-12">
            <div className="p-10 rounded-[2.5rem] bg-slate-50 border-2 border-dashed border-slate-200 shadow-inner">
                <p className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-400 mb-6 flex items-center gap-3">
                    <Info className="h-4 w-4" /> Discovery Narrative
                </p>
                <div className="p-10 bg-white border-2 border-slate-100 rounded-3xl shadow-sm text-2xl font-bold text-slate-800 leading-relaxed italic uppercase tracking-tight">
                    "{observation.description}"
                </div>
            </div>
        </div>
    );
}
