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
    
    const phaseNumber = ['Initiation', 'Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'].indexOf(stage) + 1;

    const renderStageContent = () => {
        const isLocked = isCompleted || sData?.status === 'In Progress';
        switch (stage) {
            case 'Investigation': return <CapaInvestigation observation={observation} isLocked={isLocked} />;
            case 'Resolution': return <CapaResolution observation={observation} isLocked={isLocked} />;
            case 'Implementation': return <CapaImplementation observation={observation} isLocked={isLocked} />;
            case 'Effectiveness Review': return <CapaEffectivenessReview observation={observation} isLocked={isLocked} />;
            case 'Reference': return <CapaReference observation={observation} isLocked={isLocked} />;
            case 'Closure': return <CapaClosure observation={observation} isLocked={isLocked} />;
            default: return <div className="py-20 text-center opacity-30"><p className="font-bold uppercase text-xs tracking-widest">TECHNICAL WORKSPACE OFFLINE</p></div>;
        }
    };

    return (
        <div className="space-y-6 max-w-[1200px] mx-auto text-left">
            {/* --- REWORK NOTIFICATION --- */}
            {isReturned && (
                <div className="p-4 rounded border border-rose-200 bg-rose-50 flex items-start gap-4">
                    <div className="p-2 bg-rose-600 rounded-sm text-white shrink-0">
                        <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-rose-700 uppercase tracking-widest">REWORK INSTRUCTIONS</p>
                        <p className="text-sm font-medium text-rose-950 italic leading-snug">
                            "{sData?.comments ? Object.values(sData.comments).reverse()[0]?.text : 'Technical details require clarification.'}"
                        </p>
                    </div>
                </div>
            )}

            {/* --- PRIMARY WORKBENCH --- */}
            <div className="bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-200 bg-slate-50/30 flex justify-between items-center">
                    <div className="flex items-center gap-5">
                        <div className="h-10 w-10 bg-slate-50 border border-slate-300 rounded-md flex items-center justify-center shrink-0">
                            <span className="text-slate-600 font-bold text-base">0{phaseNumber}</span>
                        </div>
                        <div className="space-y-1">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold uppercase text-[9px] tracking-wider px-2 h-5 rounded-sm">TECHNICAL ACTION</Badge>
                            <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight leading-none">{stage}</h3>
                        </div>
                    </div>

                    <div className="flex items-center gap-8">
                        {assignee && (
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">OWNERSHIP</p>
                                    <p className="text-[11px] font-bold text-slate-700 uppercase">{assignee.name}</p>
                                </div>
                                <Avatar className="h-9 w-9 border border-slate-200 rounded-full">
                                    <AvatarImage src={assignee.avatar}/>
                                    <AvatarFallback className="bg-slate-100 text-slate-500 font-bold text-[10px]">{assignee.name?.[0]}</AvatarFallback>
                                </Avatar>
                            </div>
                        )}
                        <div className="text-right border-l border-slate-200 pl-8 h-8 flex flex-col justify-center">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">TARGET</p>
                            <div className="flex items-center gap-1.5 justify-end">
                                <Clock className="h-3 w-3 text-slate-400" />
                                <span className="text-xs font-bold text-slate-800">TBD</span>
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