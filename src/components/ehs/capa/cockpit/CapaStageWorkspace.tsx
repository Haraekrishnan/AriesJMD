'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Lock, AlertTriangle, User, Clock } from 'lucide-react';
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
            default: return <div className="py-40 text-center opacity-20"><p className="font-black uppercase text-xl">Technical Workspace Offline</p></div>;
        }
    };

    return (
        <div className="space-y-8 max-w-[1100px] mx-auto text-left">
            {/* --- REWORK ALERT --- */}
            {isReturned && (
                <div className="p-6 rounded-[1.5rem] bg-rose-50 border-2 border-rose-100 flex items-start gap-4 shadow-sm animate-in shake duration-500">
                    <div className="p-2.5 bg-rose-500 rounded-xl shrink-0 shadow-lg shadow-rose-500/20">
                        <AlertTriangle className="h-5 w-5 text-white" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Rework Instructions</p>
                        <p className="text-sm font-bold text-rose-950 italic leading-relaxed">
                            "{sData?.comments ? Object.values(sData.comments).reverse()[0]?.text : 'Technical verification required.'}"
                        </p>
                    </div>
                </div>
            )}

            {/* --- STAGE CARD --- */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden">
                <div className="px-10 py-8 border-b bg-slate-50/50 flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <div className="h-16 w-16 rounded-[1.5rem] bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                            <span className="font-black text-2xl">0{['Initiation', 'Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'].indexOf(stage) + 1}</span>
                        </div>
                        <div className="space-y-1">
                            <Badge className="bg-blue-600 text-white font-black uppercase text-[8px] h-5 px-2.5 tracking-widest border-none">TECHNICAL ACTION REQUIRED</Badge>
                            <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">{stage}</h3>
                        </div>
                    </div>

                    <div className="flex items-center gap-10">
                        {assignee && (
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">OWNERSHIP</p>
                                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{assignee.name}</p>
                                </div>
                                <Avatar className="h-11 w-11 border-2 border-white shadow-xl">
                                    <AvatarImage src={assignee.avatar}/>
                                    <AvatarFallback className="bg-blue-50 text-blue-600 font-black">{assignee.name?.[0]}</AvatarFallback>
                                </Avatar>
                            </div>
                        )}
                        <div className="text-right border-l pl-10 h-10 flex flex-col justify-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TARGET DELIVERY</p>
                            <div className="flex items-center gap-2 justify-end">
                                <Clock className="h-4 w-4 text-blue-500" />
                                <span className="text-base font-black text-slate-900">TBD</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-10">
                    {renderStageContent()}
                </div>
            </div>
        </div>
    );
}
