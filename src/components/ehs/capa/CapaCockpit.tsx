'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
    ChevronLeft, 
    Clock, 
    MapPin,
    User,
    Calendar,
    MoreVertical,
    CheckCircle2,
    Undo2,
    ShieldCheck,
    ThumbsUp,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { useEhs } from '@/contexts/ehs-provider';
import { useForm, FormProvider } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import CapaLifecycleStepper from './cockpit/CapaLifecycleStepper';
import CapaRightSidebar from './cockpit/CapaRightSidebar';
import CapaStageWorkspace from './cockpit/CapaStageWorkspace';
import CapaActionFooter from './cockpit/CapaActionFooter';

const STAGES: CapaStage[] = ['Initiation', 'Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'];

export default function CapaCockpit({ observation, onClose }: { observation: EhsObservation; onClose: () => void; }) {
    const { user, users } = useAuth();
    const { projects } = useGeneral();
    const { reviewStage } = useEhs();
    const [viewingStage, setViewingStage] = useState<CapaStage>(observation.currentStage || 'Initiation');
    
    // Review Dialog State
    const [reviewAction, setReviewAction] = useState<'Completed' | 'Returned' | null>(null);
    const [reviewComment, setReviewComment] = useState('');

    const project = projects.find(p => p.id === observation.projectId);
    const reporter = users.find(u => u.id === observation.reporterId);
    
    const sData = observation.stages[viewingStage];
    const isCurrentStage = observation.currentStage === viewingStage;
    const isSubmitted = sData?.status === 'In Progress';
    const isSupervisor = user?.role === 'Admin' || user?.role === 'Senior Safety Supervisor' || user?.role === 'Project Coordinator';

    const methods = useForm({
        defaultValues: sData?.data || {}
    });

    // CRITICAL: Reset form when switching stages to ensure historical data loads
    useEffect(() => {
        if (sData?.data) {
            methods.reset(sData.data);
        } else {
            methods.reset({});
        }
    }, [viewingStage, sData, methods]);

    const progress = useMemo(() => {
        const completedCount = STAGES.filter(s => observation.stages[s]?.status === 'Completed').length;
        return Math.round((completedCount / STAGES.length) * 100);
    }, [observation]);

    const handleReviewSubmit = () => {
        if (!reviewAction) return;
        reviewStage(observation.id, viewingStage, reviewAction, reviewComment);
        setReviewAction(null);
        setReviewComment('');
    };

    return (
        <FormProvider {...methods}>
            <div className="fixed inset-0 z-40 flex flex-col bg-[#F3F7FB] text-slate-900 font-sans overflow-hidden">
                
                {/* --- EXECUTIVE HEADER --- */}
                <header className="shrink-0 bg-white border-b z-30 shadow-sm flex flex-col text-left">
                    {/* Tier 1: Identity & Management Actions */}
                    <div className="px-8 py-3 flex items-center justify-between bg-white border-b">
                        <div className="flex items-center gap-6">
                            <Button 
                                variant="outline" 
                                size="icon" 
                                onClick={onClose} 
                                className="h-8 w-8 rounded-md text-slate-400 hover:bg-slate-50 border-slate-200"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="flex items-center gap-3">
                                <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                                    CAPA-{observation.id.slice(-6).toUpperCase()}
                                </h1>
                                <Badge className="bg-amber-100 text-amber-700 border-none font-black uppercase text-[9px] px-2.5 h-6 rounded-sm tracking-widest">
                                    {observation.severity.toUpperCase()} RISK
                                </Badge>
                                <Badge className="bg-blue-600 text-white border-none font-black uppercase text-[9px] px-3 h-6 rounded-sm tracking-widest">
                                    {observation.status.toUpperCase()}
                                </Badge>
                            </div>
                        </div>

                        <div className="flex items-center gap-8">
                            {/* MANAGEMENT VERIFICATION COMMANDS */}
                            {isCurrentStage && isSubmitted && isSupervisor && (
                                <div className="flex items-center gap-3 animate-in fade-in zoom-in-95 bg-[#0F172A] p-2 rounded-xl">
                                    <Button 
                                        variant="outline"
                                        className="h-10 text-rose-400 hover:bg-rose-400/10 border-rose-400/30 font-black uppercase tracking-[0.1em] text-[9px] px-6 rounded-lg transition-all"
                                        onClick={() => setReviewAction('Returned')}
                                    >
                                        <Undo2 className="mr-2 h-4 w-4" /> INSTRUCT REWORK
                                    </Button>
                                    <Button 
                                        className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-[0.1em] text-[9px] px-8 rounded-lg shadow-lg shadow-emerald-500/10"
                                        onClick={() => setReviewAction('Completed')}
                                    >
                                        <CheckCircle2 className="mr-2 h-4 w-4" /> VERIFY & CONTINUE
                                    </Button>
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="h-9 px-4 border-slate-200 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50/50">
                                    GOVERNANCE: OPTIMAL
                                </Badge>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
                                    <MoreVertical className="h-4 w-4 text-slate-400" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Tier 2: Metadata Registry */}
                    <div className="px-8 py-2.5 flex items-center gap-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] bg-white border-b">
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-slate-300" />
                            <span className="text-slate-600 font-black">{project?.name?.toUpperCase() || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 border-l pl-8 border-slate-100">
                            <User className="h-4 w-4 text-slate-300" />
                            <span><span className="text-slate-400">REPORTER:</span> <span className="text-slate-600 font-black">{reporter?.name?.toUpperCase() || 'OFFICIAL RECORD'}</span></span>
                        </div>
                        <div className="flex items-center gap-2 border-l pl-8 border-slate-100">
                            <Calendar className="h-4 w-4 text-slate-300" />
                            <span>{format(parseISO(observation.createdAt), 'dd MMM yyyy').toUpperCase()}</span>
                        </div>
                    </div>

                    {/* Tier 3: Progress & Stepper */}
                    <div className="h-20 shrink-0 bg-[#F8FAFC] px-10 flex items-center justify-between border-b shadow-inner">
                        <div className="flex items-center gap-12 w-full">
                            <div className="flex flex-col shrink-0">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Overall Progress</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl font-black text-blue-600 tracking-tighter leading-none">{progress}%</span>
                                    <div className="w-40 h-1.5 bg-slate-200 rounded-full overflow-hidden border border-white shadow-inner">
                                        <div className="h-full bg-blue-600 transition-all duration-1000 shadow-[0_0_8px_rgba(37,99,235,0.4)]" style={{ width: `${progress}%` }} />
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1">
                                <CapaLifecycleStepper 
                                    observation={observation} 
                                    viewingStage={viewingStage} 
                                    onStageSelect={setViewingStage} 
                                />
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 flex overflow-hidden">
                    <main className="flex-1 flex flex-col overflow-hidden relative bg-[#F8FAFC]">
                        <ScrollArea className="flex-1 no-scrollbar">
                            <div className="p-10 space-y-10">
                                <CapaStageWorkspace observation={observation} stage={viewingStage} />
                            </div>
                        </ScrollArea>

                        {/* FIXED ACTION FOOTER */}
                        <footer className="h-20 shrink-0 bg-white border-t px-10 flex items-center z-40 shadow-2xl">
                            <CapaActionFooter 
                                observation={observation} 
                                stage={viewingStage} 
                            />
                        </footer>
                    </main>

                    {/* INTELLIGENCE SIDEBAR */}
                    <aside className="w-[380px] shrink-0 border-l bg-white flex flex-col z-20 overflow-hidden relative shadow-lg text-left">
                        <ScrollArea className="h-full no-scrollbar">
                           <CapaRightSidebar observation={observation} activeStage={viewingStage} />
                        </ScrollArea>
                    </aside>
                </div>

                {/* Review Dialog */}
                <Dialog open={!!reviewAction} onOpenChange={(o) => !o && setReviewAction(null)}>
                    <DialogContent className="bg-white border-slate-200 text-slate-900 shadow-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-slate-900 uppercase font-black tracking-tight">
                                {reviewAction === 'Completed' ? 'Authorize Milestone' : 'Instruct Technical Rework'}
                            </DialogTitle>
                            <DialogDescription className="text-slate-500 font-medium">
                                Validation of lifecycle findings by the Higher Official.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4 text-left">
                            <div className="space-y-2">
                                <Label className="text-slate-900 font-black uppercase text-[10px] tracking-widest ml-1">
                                    Validation Notes / Official Instructions
                                </Label>
                                <Textarea 
                                    className="bg-slate-50 border-slate-200 text-slate-900 min-h-[120px] rounded-xl font-bold p-4 focus-visible:ring-blue-100 shadow-inner" 
                                    placeholder="Enter technical feedback for the activity log..."
                                    value={reviewComment}
                                    onChange={(e) => setReviewComment(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter className="gap-2">
                            <Button variant="outline" className="h-12 px-6 rounded-xl font-bold" onClick={() => setReviewAction(null)}>
                                Cancel
                            </Button>
                            <Button 
                                className={cn(
                                    "font-black uppercase text-[10px] h-12 px-8 rounded-xl shadow-lg",
                                    reviewAction === 'Completed' ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-rose-600 hover:bg-rose-700 text-white"
                                )}
                                onClick={handleReviewSubmit}
                            >
                                {reviewAction === 'Completed' ? 'Authorize Findings' : 'Submit Rework order'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </FormProvider>
    );
}