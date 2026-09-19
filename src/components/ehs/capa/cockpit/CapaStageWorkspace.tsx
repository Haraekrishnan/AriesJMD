'use client';

import React, { useState, useMemo, useRef, MouseEvent } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
    Lock, 
    CheckCircle2, 
    Undo2, 
    ThumbsUp,
    AlertCircle,
    Info,
    ShieldCheck,
    AlertTriangle,
    Edit3,
    X,
    Save,
    History,
    FileText,
    MapPin,
    User,
    Calendar,
    Search,
    ZoomIn,
    ZoomOut,
    Download,
    ChevronLeft,
    ChevronRight,
    Paperclip,
    Activity,
    Target,
    Zap
} from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { cn } from '@/lib/utils';
import { useEhs } from '@/contexts/ehs-provider';
import { format, parseISO, isValid } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Document, Page, pdfjs } from 'react-pdf';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
}

// Sub-components
import CapaInvestigationWorkspace from './CapaInvestigationWorkspace';
import Capa5Why from '../stages/Capa5Why';
import CapaSystemicRootCause from '../stages/CapaSystemicRootCause';
import CapaPhaseConclusion from '../stages/CapaPhaseConclusion';
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
            case 'Investigation':
                return (
                    <Tabs defaultValue="summary" className="w-full">
                        <div className="bg-slate-50/50 border-b px-10">
                            <TabsList className="h-16 w-full justify-start gap-12 bg-transparent p-0">
                                {[
                                    { id: 'summary', label: 'Investigation Summary', icon: FileText },
                                    { id: '5why', label: '5-Why Root Cause', icon: Activity },
                                    { id: 'rootcause', label: 'Systemic Root Cause', icon: Target },
                                    { id: 'conclusion', label: 'Phase Conclusion', icon: FileText },
                                ].map(tab => (
                                    <TabsTrigger 
                                        key={tab.id} 
                                        value={tab.id}
                                        className="h-16 rounded-none border-b-4 border-transparent px-0 text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 bg-transparent shadow-none"
                                    >
                                        <tab.icon className="mr-3 h-4 w-4" /> {tab.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </div>
                        <div className="outline-none">
                            <TabsContent value="summary" className="m-0 focus-visible:ring-0 p-10">
                                <CapaInvestigationWorkspace observation={observation} />
                            </TabsContent>
                            <TabsContent value="5why" className="m-0 focus-visible:ring-0 p-10">
                                <Capa5Why isLocked={isLocked} />
                            </TabsContent>
                            <TabsContent value="rootcause" className="m-0 focus-visible:ring-0 p-10">
                                <CapaSystemicRootCause isLocked={isLocked} />
                            </TabsContent>
                            <TabsContent value="conclusion" className="m-0 focus-visible:ring-0 p-10">
                                <CapaPhaseConclusion isLocked={isLocked} />
                            </TabsContent>
                        </div>
                    </Tabs>
                );
            case 'Resolution': return <div className="p-10"><CapaResolution observation={observation} isLocked={isLocked} /></div>;
            case 'Implementation': return <div className="p-10"><CapaImplementation observation={observation} isLocked={isLocked} /></div>;
            case 'Effectiveness Review': return <div className="p-10"><CapaEffectivenessReview observation={observation} isLocked={isLocked} /></div>;
            case 'Reference': return <div className="p-10"><CapaReference observation={observation} isLocked={isLocked} /></div>;
            case 'Closure': return <div className="p-10"><CapaClosure observation={observation} isLocked={isLocked} /></div>;
            default: return null;
        }
    };

    return (
        <div className="space-y-12">
            <div className="bg-white border border-slate-200 rounded-[1.5rem] shadow-sm overflow-hidden">
                {renderStageContent()}
            </div>

            {isCurrentStage && isSubmitted && isSupervisor && (
                <div className="p-10 rounded-[2.5rem] bg-slate-900 text-white shadow-2xl space-y-8 animate-in slide-in-from-bottom-10 duration-1000 border border-white/5 text-left">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                            <ShieldCheck className="h-7 w-7 text-white" />
                        </div>
                        <div>
                            <h4 className="text-lg font-black uppercase tracking-tight">Official Verification Workspace</h4>
                            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Governance Approval Required</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                         <Button className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[11px] rounded-xl shadow-lg active:scale-95 transition-all" onClick={() => reviewStage(observation.id, stage, 'Completed', 'Documentation verified and approved.')}>
                            <ThumbsUp className="mr-3 h-5 w-5" /> Verify & Continue Lifecycle
                         </Button>
                         <Button variant="outline" className="flex-1 h-14 border-rose-500/30 text-rose-400 hover:bg-rose-600 hover:text-white hover:border-rose-600 font-black uppercase tracking-widest text-[11px] rounded-xl transition-all active:scale-95" onClick={() => reviewStage(observation.id, stage, 'Returned', 'Technical data requires clarification.')}>
                            <Undo2 className="mr-3 h-5 w-5" /> Instruct Rework
                         </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

