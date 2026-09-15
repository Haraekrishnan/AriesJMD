
'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, FileWarning, CheckCircle2, History, MessageSquare, Undo2, ThumbsUp } from 'lucide-react';
import type { EhsObservation, CapaStage, CapaStageRecord } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { cn } from '@/lib/utils';

// Phase-Specific Components
import CapaInvestigation from './stages/CapaInvestigation';
import CapaResolution from './stages/CapaResolution';
import CapaImplementation from './stages/CapaImplementation';
import CapaEffectivenessReview from './stages/CapaEffectivenessReview';
import CapaReference from './stages/CapaReference';
import CapaClosure from './stages/CapaClosure';

interface CapaStageWorkspaceProps {
    observation: EhsObservation;
    stage: CapaStage;
}

export default function CapaStageWorkspace({ observation, stage }: CapaStageWorkspaceProps) {
    const { user } = useAuth();
    const sData = observation.stages[stage];
    
    const isCurrentStage = observation.currentStage === stage;
    const isCompleted = sData?.status === 'Completed';
    const isSubmitted = sData?.status === 'In Progress';
    const isReturned = sData?.status === 'Returned';
    const isLocked = isCompleted || isSubmitted;

    const isAssignee = sData?.assigneeId === user?.id;
    const isSupervisor = user?.role === 'Admin' || user?.role === 'Senior Safety Supervisor';

    const renderStageContent = () => {
        switch (stage) {
            case 'Initiation':
                return <CapaInitiation observation={observation} />;
            case 'Investigation':
                return <CapaInvestigation observation={observation} isLocked={isLocked} />;
            case 'Resolution':
                return <CapaResolution observation={observation} isLocked={isLocked} />;
            case 'Implementation':
                return <CapaImplementation observation={observation} isLocked={isLocked} />;
            case 'Effectiveness Review':
                return <CapaEffectivenessReview observation={observation} isLocked={isLocked} />;
            case 'Reference':
                return <CapaReference observation={observation} isLocked={isLocked} />;
            case 'Closure':
                return <CapaClosure observation={observation} isLocked={isLocked} />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / State Banner */}
            <div className="space-y-4">
                <div className="flex justify-between items-end">
                    <div>
                        <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{stage}</h3>
                        <div className="flex items-center gap-3 mt-2">
                             <Badge className={cn(
                                "h-5 font-black uppercase text-[8px] tracking-[0.2em] border-none shadow-sm",
                                isCompleted ? "bg-emerald-500" : isReturned ? "bg-rose-500" : isSubmitted ? "bg-amber-500" : "bg-blue-600"
                             )}>
                                {isReturned ? 'REWORK REQUIRED' : isSubmitted ? 'AWAITING OFFICIAL REVIEW' : isCompleted ? 'VERIFIED MILESTONE' : 'TECHNICAL ACTION REQUIRED'}
                             </Badge>
                             {isLocked && (
                                <span className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                    <Lock className="h-3 w-3" /> Locked After Submission
                                </span>
                             )}
                        </div>
                    </div>
                </div>

                {isReturned && (
                    <div className="p-6 rounded-3xl bg-rose-50 border-2 border-rose-100 flex items-start gap-4">
                        <div className="p-3 bg-rose-500 rounded-2xl shadow-lg shadow-rose-500/20">
                            <Undo2 className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] mb-1">Official Return Narrative</p>
                            <p className="text-sm font-bold text-rose-900 leading-relaxed italic">
                                "{sData?.comments ? Object.values(sData.comments).reverse()[0]?.text : 'No specific reason provided.'}"
                            </p>
                            <p className="text-[9px] font-bold text-rose-400 uppercase mt-4">Required Action: Please review the findings and resubmit.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Stage Content */}
            <div className={cn("transition-all duration-500", isLocked && "opacity-80 grayscale-[0.3]")}>
                {renderStageContent()}
            </div>

            {/* Review Panel for Supervisors */}
            {isCurrentStage && isSubmitted && isSupervisor && (
                <div className="p-8 rounded-[2rem] bg-slate-900 text-white shadow-2xl space-y-6">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        <h4 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Official Verification Workspace</h4>
                    </div>
                    <p className="text-sm font-medium text-slate-300">Technical data has been submitted by the assignee. Perform validation to proceed to the next lifecycle stage.</p>
                    <div className="flex gap-4 pt-4">
                         <Button className="flex-1 h-14 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-emerald-500/10">
                            <ThumbsUp className="mr-2 h-4 w-4" /> Verify & Continue
                         </Button>
                         <Button variant="outline" className="flex-1 h-14 border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white font-black uppercase tracking-widest text-[10px] rounded-2xl">
                            <Undo2 className="mr-2 h-4 w-4" /> Request Rework
                         </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

function CapaInitiation({ observation }: { observation: EhsObservation }) {
    return (
        <Card className="rounded-[2rem] border-none shadow-inner bg-slate-50 p-8">
            <CardContent className="p-0 space-y-6">
                <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Original Discovery Discovery</p>
                    <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm">
                        <p className="text-sm font-bold text-slate-700 leading-relaxed uppercase">{observation.description}</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Project / Site</p>
                        <p className="text-sm font-black text-slate-900">{observation.projectId}</p>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Specific Location</p>
                        <p className="text-sm font-black text-slate-900">{observation.location}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
