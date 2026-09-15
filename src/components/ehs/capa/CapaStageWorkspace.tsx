'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
    Lock, 
    CheckCircle2, 
    Undo2, 
    ThumbsUp,
    AlertCircle,
    Info,
    ShieldCheck,
    AlertTriangle
} from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { cn } from '@/lib/utils';
import { useEhs } from '@/contexts/ehs-provider';

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
    const { reviewStage } = useEhs();
    const sData = observation.stages[stage];
    
    const isCurrentStage = observation.currentStage === stage;
    const isCompleted = sData?.status === 'Completed';
    const isSubmitted = sData?.status === 'In Progress';
    const isReturned = sData?.status === 'Returned';
    const isLocked = isCompleted || isSubmitted;

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
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* --- PHASE HEADER & ALERTS --- */}
            <div className="space-y-6">
                <div className="flex justify-between items-end">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                             <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                                <span className="font-black text-xs">0{['Initiation', 'Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'].indexOf(stage) + 1}</span>
                             </div>
                             <Badge className={cn(
                                "h-5 font-black uppercase text-[8px] tracking-[0.2em] border-none shadow-sm",
                                isCompleted ? "bg-emerald-500" : isReturned ? "bg-rose-500" : isSubmitted ? "bg-amber-500" : "bg-blue-600"
                             )}>
                                {isReturned ? 'REWORK REQUIRED' : isSubmitted ? 'AWAITING OFFICIAL REVIEW' : isCompleted ? 'VERIFIED MILESTONE' : 'TECHNICAL ACTION REQUIRED'}
                             </Badge>
                        </div>
                        <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tight">{stage}</h3>
                    </div>
                    {isLocked && (
                        <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest bg-slate-100 px-4 py-2 rounded-full">
                            <Lock className="h-3 w-3" /> Locked For Audit Protection
                        </div>
                    )}
                </div>

                {isReturned && (
                    <div className="p-8 rounded-[2rem] bg-rose-50 border-2 border-rose-100 flex items-start gap-6 shadow-sm">
                        <div className="p-4 bg-rose-500 rounded-2xl shadow-xl shadow-rose-500/20">
                            <AlertTriangle className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 space-y-4">
                            <div>
                                <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] mb-1">Official Review Correction instructed</p>
                                <p className="text-lg font-bold text-rose-900 leading-relaxed italic">
                                    "{sData?.comments ? Object.values(sData.comments).reverse()[0]?.text : 'Technical details require clarification.'}"
                                </p>
                            </div>
                            <div className="flex items-center gap-6 pt-2">
                                <div className="text-[9px] font-black text-rose-400 uppercase tracking-widest">
                                    Returned By: <span className="text-rose-900">Safety HQ</span>
                                </div>
                                <div className="text-[9px] font-black text-rose-400 uppercase tracking-widest">
                                    Required Action: <span className="text-rose-900 underline underline-offset-4 decoration-2">Edit & Resubmit Phase</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* --- PHASE WORKSPACE --- */}
            <div className={cn("transition-all duration-700", isLocked && "opacity-90 grayscale-[0.2]")}>
                {renderStageContent()}
            </div>

            {/* --- OFFICIAL REVIEW PANEL --- */}
            {isCurrentStage && isSubmitted && isSupervisor && (
                <div className="p-10 rounded-[3rem] bg-slate-900 text-white shadow-2xl space-y-8 animate-in slide-in-from-bottom-10 duration-1000 border border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                            <ShieldCheck className="h-7 w-7 text-white" />
                        </div>
                        <div>
                            <h4 className="text-xl font-black uppercase tracking-tight">Official Verification Workspace</h4>
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Lifecycle Governance & Compliance Validation</p>
                        </div>
                    </div>
                    
                    <div className="p-6 rounded-[1.5rem] bg-white/5 border border-white/10 space-y-2">
                         <p className="text-sm font-medium text-slate-300 leading-relaxed italic">
                            Technical data and evidence have been uploaded by the assignee. Validate the findings to proceed to the next lifecycle stage or request immediate rework if the documentation is insufficient.
                         </p>
                    </div>

                    <div className="flex gap-4">
                         <Button 
                            className="flex-1 h-16 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-2xl shadow-emerald-500/20 active:scale-95 transition-all"
                            onClick={() => reviewStage(observation.id, stage, 'Completed', 'Documentation verified and approved.')}
                         >
                            <ThumbsUp className="mr-3 h-5 w-5" /> Verify & Continue Lifecycle
                         </Button>
                         <Button 
                            variant="outline" 
                            className="flex-1 h-16 border-rose-500/30 text-rose-400 hover:bg-rose-600 hover:text-white hover:border-rose-600 font-black uppercase tracking-[0.2em] text-xs rounded-2xl transition-all active:scale-95"
                            onClick={() => reviewStage(observation.id, stage, 'Returned', 'Technical data requires clarification.')}
                         >
                            <Undo2 className="mr-3 h-5 w-5" /> Instruct Rework
                         </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

function CapaInitiation({ observation }: { observation: EhsObservation }) {
    return (
        <Card className="rounded-[2.5rem] border-none shadow-inner bg-slate-50 p-10 border-2 border-dashed border-slate-200">
            <CardContent className="p-0 space-y-10">
                <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                        <Info className="h-3 w-3" /> Reported Safety Finding
                    </p>
                    <div className="p-8 rounded-[2rem] bg-white border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-2 h-full bg-blue-500" />
                        <p className="text-lg font-bold text-slate-800 leading-relaxed uppercase tracking-tight">
                            {observation.description}
                        </p>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    <MetaItem label="Operational Site" value={observation.projectId} icon={MapPin} />
                    <MetaItem label="Specific Area" value={observation.location} icon={MapPin} />
                    <MetaItem label="Reported On" value={format(parseISO(observation.createdAt), 'dd MMM yyyy')} icon={Calendar} />
                    <MetaItem label="Discovery Risk" value={observation.severity} icon={AlertCircle} />
                </div>
            </CardContent>
        </Card>
    );
}

function MetaItem({ label, value, icon: Icon }: { label: string, value: string, icon: any }) {
    return (
        <div className="space-y-1.5">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">{label}</p>
            <div className="flex items-center gap-2.5">
                <div className="h-6 w-6 rounded-lg bg-white border border-slate-100 flex items-center justify-center">
                    <Icon className="h-3 w-3 text-slate-400" />
                </div>
                <span className="text-[11px] font-black text-slate-900 uppercase truncate">{value}</span>
            </div>
        </div>
    );
}
