'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Lock, AlertTriangle, Clock } from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Phase Views
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
            case 'Investigation': return <CapaInvestigation observation={observation} isLocked={isLocked} />;
            case 'Resolution': return <CapaResolution observation={observation} isLocked={isLocked} />;
            case 'Implementation': return <CapaImplementation observation={observation} isLocked={isLocked} />;
            case 'Effectiveness Review': return <CapaEffectivenessReview observation={observation} isLocked={isLocked} />;
            case 'Reference': return <CapaReference observation={observation} isLocked={isLocked} />;
            case 'Closure': return <CapaClosure observation={observation} isLocked={isLocked} />;
            default: return <div className="py-20 text-center opacity-30"><p className="font-bold uppercase text-sm tracking-widest">TECHNICAL WORKSPACE OFFLINE</p></div>;
        }
    };

    return (
        <div className="space-y-6 max-w-[1000px] mx-auto text-left">
            {/* --- REWORK NOTIFICATION --- */}
            {isReturned && (
                <div className="p-4 rounded border-2 border-red-200 bg-red-50 flex items-start gap-4 shadow-sm">
                    <div className="p-2 bg-red-600 rounded text-white shrink-0">
                        <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-red-700 uppercase tracking-widest">REWORK INSTRUCTIONS</p>
                        <p className="text-sm font-bold text-red-950 italic leading-snug">
                            "{sData?.comments ? Object.values(sData.comments).reverse()[0]?.text : 'Technical details require clarification.'}"
                        </p>
                    </div>
                </div>
            )}

            {/* --- PRIMARY WORKBENCH --- */}
            <div className="bg-white rounded border border-slate-300 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                    <div className="flex items-center gap-5">
                        <div className="h-14 w-14 rounded bg-slate-900 flex items-center justify-center text-white border-b-4 border-blue-600">
                            <span className="font-black text-xl">0{['Initiation', 'Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'].indexOf(stage) + 1}</span>
                        </div>
                        <div className="space-y-1">
                            <Badge className="bg-blue-600 text-white font-bold uppercase text-[8px] h-5 px-2 tracking-widest border-none rounded-sm">TECHNICAL ACTION</Badge>
                            <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{stage}</h3>
                        </div>
                    </div>

                    <div className="flex items-center gap-8">
                        {assignee && (
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">OWNERSHIP</p>
                                    <p className="text-[11px] font-bold text-slate-900 uppercase">{assignee.name}</p>
                                </div>
                                <Avatar className="h-10 w-10 border border-slate-200 rounded">
                                    <AvatarImage src={assignee.avatar}/>
                                    <AvatarFallback className="bg-slate-100 text-slate-600 font-bold text-xs">{assignee.name?.[0]}</AvatarFallback>
                                </Avatar>
                            </div>
                        )}
                        <div className="text-right border-l border-slate-200 pl-8 h-10 flex flex-col justify-center">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">TARGET</p>
                            <div className="flex items-center gap-1.5 justify-end">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                <span className="text-sm font-black text-slate-900">TBD</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8">
                    {renderStageContent()}
                </div>
            </div>
        </div>
    );
}