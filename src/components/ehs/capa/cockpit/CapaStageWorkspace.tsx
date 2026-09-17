'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Lock, AlertTriangle, Info, Clock } from 'lucide-react';
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
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* --- REWORK ALERT --- */}
            {isReturned && (
                <div className="p-5 rounded-xl bg-rose-50 border border-rose-100 flex items-start gap-4 shadow-sm">
                    <div className="p-2 bg-rose-600 rounded-lg shrink-0 shadow-sm">
                        <AlertTriangle className="h-4 w-4 text-white" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-[9px] font-bold text-rose-600 uppercase tracking-widest">Rework Required</p>
                        <p className="text-xs font-semibold text-rose-900 italic leading-relaxed">
                            "{sData?.comments ? Object.values(sData.comments).reverse()[0]?.text : 'Technical data requires clarification.'}"
                        </p>
                    </div>
                </div>
            )}

            {/* --- STAGE WORKSPACE --- */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-8 py-5 border-b bg-slate-50/50 flex justify-between items-center">
                    <div className="flex items-center gap-5">
                        <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/10">
                            <span className="font-bold text-lg">0{['Initiation', 'Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'].indexOf(stage) + 1}</span>
                        </div>
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-3">
                                <Badge className={cn(
                                    "h-4 font-bold uppercase text-[7px] tracking-widest border-none",
                                    isCompleted ? "bg-emerald-500" : isReturned ? "bg-rose-500" : "bg-blue-600"
                                )}>
                                    {isCompleted ? 'Verified Milestone' : isReturned ? 'Rework Active' : 'Technical Action Required'}
                                </Badge>
                                {isCompleted && <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase tracking-widest"><Lock className="h-2.5 w-2.5" /> Locked</div>}
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">{stage}</h3>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {assignee && (
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Ownership</p>
                                    <p className="text-[10px] font-bold text-slate-800 uppercase">{assignee.name}</p>
                                </div>
                                <Avatar className="h-9 w-9 border border-slate-100 shadow-sm">
                                    <AvatarImage src={assignee.avatar}/>
                                    <AvatarFallback className="text-[9px] font-bold bg-blue-50 text-blue-600">{assignee.name?.[0]}</AvatarFallback>
                                </Avatar>
                            </div>
                        )}
                        <div className="text-right border-l pl-6 h-8 flex flex-col justify-center">
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Target Delivery</p>
                            <div className="flex items-center gap-1.5 justify-end">
                                <Clock className="h-3 w-3 text-blue-500" />
                                <span className="text-[11px] font-bold text-slate-900 uppercase">TBD</span>
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
        <div className="space-y-8">
            <div className="p-6 rounded-xl bg-slate-50 border border-dashed border-slate-200">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                    <Info className="h-3 w-3" /> Reported Safety Finding
                </p>
                <div className="p-6 bg-white border border-slate-200 rounded-lg shadow-sm text-lg font-semibold text-slate-800 leading-relaxed uppercase tracking-tight">
                    "{observation.description}"
                </div>
            </div>
        </div>
    );
}