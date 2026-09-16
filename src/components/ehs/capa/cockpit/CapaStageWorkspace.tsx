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
    User,
    ChevronRight,
    Undo2
} from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { useEhs } from '@/contexts/ehs-provider';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Stage-Specific Views
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
        <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
            {/* Rework Context Banner */}
            {isReturned && (
                <div className="p-6 rounded-xl bg-rose-50 border-l-4 border-l-rose-500 shadow-sm flex items-start gap-5">
                    <div className="p-2.5 bg-rose-500 rounded-lg shadow-lg shadow-rose-500/20 shrink-0">
                        <AlertTriangle className="h-5 w-5 text-white" />
                    </div>
                    <div className="space-y-1 min-w-0">
                        <p className="text-[11px] font-black text-rose-500 uppercase tracking-widest">Rework Instructed</p>
                        <p className="text-sm font-bold text-rose-900 leading-relaxed italic">
                            "{sData?.comments ? Object.values(sData.comments).reverse().find(c => c.text.includes('[REWORK REQUIRED]'))?.text.replace('[REWORK REQUIRED]', '').trim() : 'Clarification needed.'}"
                        </p>
                    </div>
                </div>
            )}

            {/* Content Container */}
            <div className="bg-white rounded-xl border-2 border-slate-100 shadow-sm overflow-hidden flex flex-col">
                {/* Stage Context Header */}
                <div className="px-8 py-6 border-b bg-slate-50/50 flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                            <span className="font-black text-lg">0{['Initiation', 'Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'].indexOf(stage) + 1}</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <Badge className={cn(
                                    "h-5 font-black uppercase text-[8px] tracking-widest border-none shadow-sm",
                                    isCompleted ? "bg-emerald-500" : isReturned ? "bg-rose-500" : "bg-blue-600"
                                )}>
                                    {isCompleted ? 'VERIFIED MILESTONE' : isReturned ? 'REWORK ACTIVE' : 'TECHNICAL ACTION REQUIRED'}
                                </Badge>
                                {isLocked && <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2"><Lock className="h-2.5 w-2.5" /> Locked</div>}
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{stage}</h3>
                        </div>
                    </div>

                    <div className="flex items-center gap-8">
                        {assignee && (
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ownership</p>
                                    <p className="text-xs font-black text-slate-800 uppercase">{assignee.name}</p>
                                </div>
                                <Avatar className="h-9 w-9 border-2 border-white shadow-md">
                                    <AvatarImage src={assignee.avatar}/>
                                    <AvatarFallback className="text-[10px] font-black bg-blue-50 text-blue-600">{assignee.name?.[0]}</AvatarFallback>
                                </Avatar>
                            </div>
                        )}
                        <div className="text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Deadline</p>
                            <div className="flex items-center gap-1.5 justify-end">
                                <Clock className="h-3 w-3 text-blue-500" />
                                <span className="text-xs font-black text-slate-800">TBD</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Primary Data Workspace */}
                <div className="flex-1 p-10 bg-white">
                    {renderStageContent()}
                </div>
            </div>

            {/* Review Control Panel */}
            {isCurrentStage && isSubmitted && isSupervisor && (
                <div className="p-8 rounded-2xl bg-slate-900 text-white shadow-2xl space-y-6 animate-in slide-in-from-bottom-5 duration-700 border border-white/5">
                    <div className="flex items-center gap-4">
                        <ShieldCheck className="h-10 w-10 text-emerald-500" />
                        <div>
                            <h4 className="text-lg font-black uppercase tracking-tight">Official Verification Workbench</h4>
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-0.5">Governance Validation Cyce</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                         <Button 
                            className="flex-1 h-14 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] rounded-lg shadow-xl"
                            onClick={() => reviewStage(observation.id, stage, 'Completed', 'Documentation verified.')}
                         >
                            <CheckCircle2 className="mr-3 h-4 w-4" /> Verify & Progress Lifecycle
                         </Button>
                         <Button 
                            variant="outline" 
                            className="flex-1 h-14 border-white/10 text-white hover:bg-rose-600 hover:border-rose-600 font-black uppercase tracking-widest text-[10px] rounded-lg"
                            onClick={() => {
                                const comment = prompt("Enter rework instructions:");
                                if (comment) reviewStage(observation.id, stage, 'Returned', comment);
                            }}
                         >
                            <Undo2 className="mr-3 h-4 w-4" /> Request Rework
                         </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

function InitiationView({ observation }: { observation: EhsObservation }) {
    return (
        <div className="space-y-10">
            <div className="p-8 rounded-[2rem] bg-slate-50 border-2 border-dashed border-slate-200">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-4">Finding Discovery Narrative</p>
                <div className="p-8 bg-white border rounded-2xl shadow-sm text-lg font-bold text-slate-800 leading-relaxed italic uppercase tracking-tight">
                    "{observation.description}"
                </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 px-4">
                <MetaCell label="Site" value={observation.projectId} />
                <MetaCell label="Location" value={observation.location} />
                <MetaCell label="Risk" value={observation.severity} />
                <MetaCell label="Reported" value={format(parseISO(observation.createdAt), 'dd MMM yyyy')} />
            </div>
        </div>
    );
}

function MetaCell({ label, value }: { label: string, value: string }) {
    return (
        <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
            <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{value}</p>
        </div>
    );
}
