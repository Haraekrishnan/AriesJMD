'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
    Clock, 
    FileText, 
    Download, 
    Trash2,
    Paperclip,
    ShieldCheck,
    CheckCircle2,
    Target,
    Activity,
    UploadCloud,
    AlertTriangle,
    ThumbsUp,
    Undo2,
    Lock
} from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { useEhs } from '@/contexts/ehs-provider';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Phase-Specific Components
import CapaInvestigation from '../stages/CapaInvestigation';
import Capa5Why from '../stages/Capa5Why';
import CapaSystemicRootCause from '../stages/CapaSystemicRootCause';
import CapaInvestigationConclusion from '../stages/CapaInvestigationConclusion';
import CapaResolution from '../stages/CapaResolution';
import CapaImplementation from '../stages/CapaImplementation';
import CapaEffectivenessReview from '../stages/CapaEffectivenessReview';
import CapaReference from '../stages/CapaReference';
import CapaClosure from '../stages/CapaClosure';

interface CapaStageWorkspaceProps {
    observation: EhsObservation;
    stage: CapaStage;
}

export default function CapaStageWorkspace({ observation, stage }: CapaStageWorkspaceProps) {
    const { user, users } = useAuth();
    const { reviewStage } = useEhs();
    const sData = observation.stages[stage];
    
    const isCurrentStage = observation.currentStage === stage;
    const isCompleted = sData?.status === 'Completed';
    const isSubmitted = sData?.status === 'In Progress';
    const isReturned = sData?.status === 'Returned';
    const isLocked = isCompleted || isSubmitted;

    const isSupervisor = user?.role === 'Admin' || user?.role === 'Senior Safety Supervisor';
    const currentOwner = users.find(u => u.id === sData?.assigneeId);

    const renderStageContent = () => {
        switch (stage) {
            case 'Investigation':
                return (
                    <Tabs defaultValue="summary" className="w-full">
                        <div className="px-8 bg-slate-50/50 border-b">
                            <TabsList className="h-12 w-full justify-start gap-10 bg-transparent p-0">
                                {[
                                    { id: 'summary', label: 'Investigation Summary', icon: FileText },
                                    { id: '5why', label: '5-Why Root Cause', icon: Activity },
                                    { id: 'systemic', label: 'Systemic Root Cause', icon: Target },
                                    { id: 'conclusion', label: 'Phase Conclusion', icon: CheckCircle2 },
                                ].map(tab => (
                                    <TabsTrigger 
                                        key={tab.id} 
                                        value={tab.id}
                                        className="h-12 rounded-none border-b-2 border-transparent px-0 text-[10px] font-black uppercase tracking-widest text-slate-400 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 bg-transparent shadow-none"
                                    >
                                        <tab.icon className="mr-2 h-4 w-4" /> {tab.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </div>
                        <TabsContent value="summary" className="p-10 m-0"><CapaInvestigation observation={observation} isLocked={isLocked} /></TabsContent>
                        <TabsContent value="5why" className="p-10 m-0"><Capa5Why isLocked={isLocked} /></TabsContent>
                        <TabsContent value="systemic" className="p-10 m-0"><CapaSystemicRootCause isLocked={isLocked} /></TabsContent>
                        <TabsContent value="conclusion" className="p-10 m-0"><CapaInvestigationConclusion isLocked={isLocked} /></TabsContent>
                    </Tabs>
                );
            case 'Resolution': return <div className="p-10"><CapaResolution observation={observation} isLocked={isLocked} /></div>;
            case 'Implementation': return <div className="p-10"><CapaImplementation observation={observation} isLocked={isLocked} /></div>;
            case 'Effectiveness Review': return <div className="p-10"><CapaEffectivenessReview observation={observation} isLocked={isLocked} /></div>;
            case 'Reference': return <div className="p-10"><CapaReference observation={observation} isLocked={isLocked} /></div>;
            case 'Closure': return <div className="p-10"><CapaClosure observation={observation} isLocked={isLocked} /></div>;
            default: return <div className="p-20 text-center opacity-30 font-black uppercase tracking-widest">Workspace Offline</div>;
        }
    };

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 text-left">
            {/* --- PHASE HEADER & ALERTS --- */}
            <div className="space-y-6">
                <div className="flex justify-between items-end">
                    <div className="flex items-center gap-6">
                        <div className="h-14 w-14 rounded-none border-4 border-slate-900 bg-[#2563EB] flex items-center justify-center text-white text-2xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            0{['Initiation', 'Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'].indexOf(stage) + 1}
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <Badge className={cn(
                                    "h-5 font-black uppercase text-[8px] tracking-[0.2em] border-none shadow-sm rounded-none",
                                    isCompleted ? "bg-emerald-600" : isReturned ? "bg-rose-600" : isSubmitted ? "bg-amber-500" : "bg-blue-600"
                                )}>
                                    {isReturned ? 'REWORK REQUIRED' : isSubmitted ? 'AWAITING OFFICIAL REVIEW' : isCompleted ? 'VERIFIED MILESTONE' : 'TECHNICAL ACTION REQUIRED'}
                                </Badge>
                            </div>
                            <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">{stage}</h3>
                        </div>
                    </div>

                    <div className="flex items-center gap-10">
                        <div className="text-right space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">PHASE OWNER</p>
                            <div className="flex items-center gap-3">
                                <div className="leading-tight">
                                    <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{currentOwner?.name || 'UNASSIGNED'}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Operational Lead</p>
                                </div>
                                <Avatar className="h-10 w-10 border-2 border-slate-900 rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                    <AvatarImage src={currentOwner?.avatar} />
                                    <AvatarFallback className="text-[10px] font-black bg-blue-50 text-blue-600">{currentOwner?.name?.[0]}</AvatarFallback>
                                </Avatar>
                            </div>
                        </div>
                        <div className="h-12 w-1.5 bg-slate-900" />
                        <div className="text-right space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TARGET DELIVERY</p>
                            <p className="text-base font-black text-slate-900 flex items-center justify-end gap-2 tracking-tighter">
                                <Clock className="h-4 w-4 text-blue-600" /> {sData?.targetDate ? format(parseISO(sData.targetDate), 'dd MMM yyyy') : 'TBD'}
                            </p>
                        </div>
                    </div>
                </div>

                {isReturned && (
                    <div className="p-8 rounded-none border-4 border-rose-600 bg-rose-50 flex items-start gap-6 shadow-[8px_8px_0px_0px_rgba(225,29,72,0.1)]">
                        <div className="p-4 bg-rose-600 rounded-none shadow-lg">
                            <AlertTriangle className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 space-y-4">
                            <div>
                                <p className="text-[10px] font-black text-rose-600 uppercase tracking-[0.3em] mb-1">Official Review Correction instructed</p>
                                <p className="text-lg font-bold text-rose-900 leading-relaxed italic">
                                    "{sData?.comments ? Object.values(sData.comments).reverse()[0]?.text : 'Technical details require clarification.'}"
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* --- PHASE WORKSPACE --- */}
            <Card className="bg-white border-4 border-slate-900 rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                {renderStageContent()}
            </Card>

            {/* --- OFFICIAL REVIEW PANEL --- */}
            {isCurrentStage && isSubmitted && isSupervisor && (
                <div className="p-10 rounded-none bg-slate-900 text-white shadow-[12px_12px_0px_0px_rgba(0,0,0,0.3)] space-y-8 border-4 border-slate-800 animate-in slide-in-from-bottom-10 duration-1000">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-none bg-emerald-600 flex items-center justify-center shadow-lg">
                            <ShieldCheck className="h-7 w-7 text-white" />
                        </div>
                        <div>
                            <h4 className="text-xl font-black uppercase tracking-tight">Official Verification Workspace</h4>
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Lifecycle Governance & Compliance Validation</p>
                        </div>
                    </div>
                    
                    <div className="p-6 rounded-none bg-white/5 border-2 border-white/10 space-y-2">
                         <p className="text-sm font-medium text-slate-300 leading-relaxed italic">
                            Technical data and evidence have been uploaded by the assignee. Validate the findings to proceed to the next lifecycle stage or request immediate rework if the documentation is insufficient.
                         </p>
                    </div>

                    <div className="flex gap-4">
                         <Button 
                            className="flex-1 h-16 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-[0.2em] text-xs rounded-none shadow-xl active:scale-95 transition-all"
                            onClick={() => reviewStage(observation.id, stage, 'Completed', 'Documentation verified and approved.')}
                         >
                            <ThumbsUp className="mr-3 h-5 w-5" /> Verify & Continue Lifecycle
                         </Button>
                         <Button 
                            variant="outline" 
                            className="flex-1 h-16 border-rose-600 text-rose-500 hover:bg-rose-600 hover:text-white font-black uppercase tracking-[0.2em] text-xs rounded-none transition-all active:scale-95"
                            onClick={() => reviewStage(observation.id, stage, 'Returned', 'Technical data requires clarification.')}
                         >
                            <Undo2 className="mr-3 h-5 w-5" /> Instruct Rework
                         </Button>
                    </div>
                </div>
            )}

            {/* --- PHASE DOCUMENT LEDGER --- */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 pl-1">
                    <Paperclip className="h-4 w-4 text-blue-600" />
                    <h4 className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-900">PHASE DOCUMENT LEDGER</h4>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-white border-2 border-slate-900 rounded-none p-4 flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-none bg-slate-50 border-2 border-slate-200 flex items-center justify-center">
                                <FileText className="h-6 w-6 text-slate-400" />
                            </div>
                            <div>
                                <p className="text-[13px] font-black text-slate-900 uppercase tracking-tight">DISCOVERY_EVIDENCE.PDF</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PHASE 01 ATTACHMENT &middot; 2.4 MB</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-blue-600 hover:bg-blue-50 border-2 border-transparent hover:border-blue-600 rounded-none"><Download className="h-5 w-5" /></Button>
                    </Card>
                    
                    <div className="h-full border-4 border-dashed border-slate-200 rounded-none bg-white p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-slate-50 hover:border-blue-600 transition-all group">
                        <div className="h-10 w-10 bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <UploadCloud className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="text-center">
                            <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest">DROP TECHNICAL DOCUMENT HERE</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">OR CLICK TO BROWSE LOCAL DIRECTORY</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
