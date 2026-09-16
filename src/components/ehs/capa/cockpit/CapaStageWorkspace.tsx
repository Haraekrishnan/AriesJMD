'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Lock, ShieldCheck, AlertTriangle, Info, Clock, User, Zap } from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
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
    const { users } = useAuth();
    const sData = observation.stages[stage];
    const isCompleted = sData?.status === 'Completed';
    const isReturned = sData?.status === 'Returned';
    const assignee = users.find(u => u.id === sData?.assigneeId);

    const renderStageContent = () => {
        const isLocked = isCompleted || sData?.status === 'In Progress';
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
        <div className="space-y-6">
            {/* --- REWORK ALERT --- */}
            {isReturned && (
                <div className="p-6 rounded-2xl bg-rose-50 border-2 border-rose-100 flex items-start gap-4 shadow-sm animate-in slide-in-from-top-4">
                    <div className="p-3 bg-rose-600 rounded-xl shadow-lg shadow-rose-600/20 shrink-0">
                        <AlertTriangle className="h-5 w-5 text-white" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em]">Lifecycle Rework Instructed</p>
                        <p className="text-sm font-bold text-rose-900 italic leading-relaxed">
                            "{sData?.comments ? Object.values(sData.comments).reverse()[0]?.text : 'Technical data requires clarification.'}"
                        </p>
                    </div>
                </div>
            )}

            {/* --- STAGE HEADER --- */}
            <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b bg-slate-50/30 flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-2xl shadow-blue-600/30 ring-4 ring-blue-50">
                            <span className="font-black text-xl">0{['Initiation', 'Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'].indexOf(stage) + 1}</span>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <Badge className={cn(
                                    "h-5 font-black uppercase text-[8px] tracking-[0.2em] border-none shadow-sm",
                                    isCompleted ? "bg-emerald-500" : isReturned ? "bg-rose-500" : "bg-blue-600"
                                )}>
                                    {isCompleted ? 'VERIFIED MILESTONE' : isReturned ? 'REWORK ACTIVE' : 'TECHNICAL ACTION REQUIRED'}
                                </Badge>
                                {isCompleted && <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-widest"><Lock className="h-3 w-3" /> System Locked</div>}
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{stage}</h3>
                        </div>
                    </div>

                    <div className="flex items-center gap-8">
                        {assignee && (
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ownership</p>
                                    <p className="text-xs font-black text-slate-800 uppercase">{assignee.name}</p>
                                </div>
                                <Avatar className="h-10 w-10 border-2 border-white shadow-xl ring-1 ring-slate-100">
                                    <AvatarImage src={assignee.avatar}/>
                                    <AvatarFallback className="text-[10px] font-black bg-blue-50 text-blue-600">{assignee.name?.[0]}</AvatarFallback>
                                </Avatar>
                            </div>
                        )}
                        <div className="text-right border-l pl-8 h-8 flex flex-col justify-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target Delivery</p>
                            <div className="flex items-center gap-1.5 justify-end">
                                <Clock className="h-3.5 w-3.5 text-blue-500" />
                                <span className="text-sm font-black text-slate-900 uppercase">TBD</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-white min-h-[400px]">
                    {renderStageContent()}
                </div>
            </div>
        </div>
    );
}

function InitiationView({ observation }: { observation: EhsObservation }) {
    return (
        <div className="space-y-10">
            <div className="p-8 rounded-[2rem] bg-slate-50 border-2 border-dashed border-slate-200 shadow-inner">
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 mb-4 flex items-center gap-2">
                    <Info className="h-4 w-4" /> Reported Safety Finding
                </p>
                <div className="p-8 bg-white border border-slate-100 rounded-3xl shadow-sm text-xl font-bold text-slate-800 leading-relaxed italic uppercase tracking-tight">
                    "{observation.description}"
                </div>
            </div>
        </div>
    );
}
