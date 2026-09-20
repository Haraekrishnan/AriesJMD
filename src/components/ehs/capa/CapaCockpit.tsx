'use client';

import React, { useState, useEffect } from 'react';
import { 
    ChevronLeft, 
    MapPin, 
    User, 
    Calendar, 
    CheckCircle2, 
    Undo2, 
    PanelRight,
    Lock,
    Save,
    ArrowRight,
    Clock,
    RotateCcw,
    ThumbsUp,
    ShieldCheck
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { useEhs } from '@/contexts/ehs-provider';
import { useForm, FormProvider } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { CAPA_STAGES } from '@/lib/ehs-observations';
import CapaLifecycleStepper from './cockpit/CapaLifecycleStepper';
import CapaRightSidebar from './cockpit/CapaRightSidebar';
import CapaStageWorkspace from './cockpit/CapaStageWorkspace';

export default function CapaCockpit({ observation, onClose }: { observation: EhsObservation; onClose: () => void }) {
    const { user, users } = useAuth();
    const { projects } = useGeneral();
    const { reviewStage, actionStage } = useEhs();
    
    const [viewingStage, setViewingStage] = useState<CapaStage>(observation.currentStage || 'Initiation');
    const [reviewAction, setReviewAction] = useState<'Completed' | 'Returned' | null>(null);
    const [reviewComment, setReviewComment] = useState('');
    const [detailsOpen, setDetailsOpen] = useState(false);

    const sData = observation.stages[viewingStage];
    const isSupervisor = user?.role === 'Admin' || user?.role === 'Senior Safety Supervisor' || user?.role === 'Project Coordinator';
    const canReview = observation.currentStage === viewingStage && sData?.status === 'In Progress' && isSupervisor;
    const isSubmitted = sData?.status === 'In Progress';
    const isAssignee = user?.id === sData?.assigneeId;

    const methods = useForm({
        defaultValues: sData?.data || {}
    });

    useEffect(() => {
        methods.reset(sData?.data || {});
    }, [viewingStage, sData, methods]);

    const completed = CAPA_STAGES.filter(s => observation.stages[s]?.status === 'Completed').length;
    const progress = Math.round(completed / CAPA_STAGES.length * 100);
    const project = projects.find(p => p.id === observation.projectId);
    const reporter = users.find(u => u.id === observation.reporterId);
    
    const changeStage = (next: CapaStage) => {
        setViewingStage(next);
    };

    return (
        <FormProvider {...methods}>
            <div className="flex flex-col h-full bg-[#F5F7FB] text-slate-900 overflow-hidden">
                <header className="shrink-0 border-b bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 md:px-7">
                        <div className="flex flex-wrap items-center gap-3">
                            <Button variant="ghost" onClick={onClose} className="gap-1 px-2 text-blue-600">
                                <ChevronLeft className="h-4 w-4" />
                                <span className="hidden sm:inline">Observations</span>
                            </Button>
                            <span className="hidden h-6 w-px bg-slate-200 sm:block" />
                            <h1 className="text-xl font-semibold tracking-tight uppercase">CAPA-{observation.id.slice(-6).toUpperCase()}</h1>
                            <Badge variant="outline" className={cn(
                                'rounded-md px-2.5 py-1 text-xs font-black uppercase tracking-widest',
                                observation.severity === 'Low' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' :
                                observation.severity === 'Medium' ? 'border-amber-100 bg-amber-50 text-amber-700' :
                                'border-rose-100 bg-rose-50 text-rose-700'
                            )}>
                                {observation.severity} risk
                            </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4">
                             {canReview && (
                                <div className="bg-[#0F172A] p-1.5 rounded-xl flex items-center gap-2 shadow-2xl border border-white/10">
                                    <Button 
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-[0.2em] text-[9px] h-9 px-4 rounded-lg shadow-lg active:scale-95 transition-all"
                                        onClick={() => setReviewAction('Completed')}
                                    >
                                        VERIFY & CONTINUE
                                    </Button>
                                    <Button 
                                        variant="outline"
                                        className="border-rose-500/30 text-rose-400 hover:bg-rose-600 hover:text-white hover:border-rose-600 font-black uppercase tracking-[0.2em] text-[9px] h-9 px-4 rounded-lg transition-all active:scale-95"
                                        onClick={() => setReviewAction('Returned')}
                                    >
                                        INSTRUCT REWORK
                                    </Button>
                                </div>
                            )}
                            <Button variant="outline" className="gap-2 xl:hidden font-black uppercase tracking-widest text-[10px]" onClick={() => setDetailsOpen(true)}>
                                <PanelRight className="h-4 w-4" />Details
                            </Button>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 text-xs text-slate-500 md:px-8 md:text-sm font-bold uppercase tracking-widest">
                        <span className="flex items-center gap-2 text-slate-400">
                            <MapPin className="h-4 w-4 text-blue-600" />
                            {project?.name || 'Site not provided'}
                        </span>
                        <span className="flex items-center gap-2 text-slate-400">
                            <User className="h-4 w-4 text-blue-600" />
                            Reported by {reporter?.name || 'Unknown'}
                        </span>
                        <span className="flex items-center gap-2 text-slate-400">
                            <Calendar className="h-4 w-4 text-blue-600" />
                            {isValid(parseISO(observation.createdAt)) ? format(parseISO(observation.createdAt), 'dd MMM yyyy') : 'Date unavailable'}
                        </span>
                    </div>
                    <div className="flex items-center overflow-x-auto border-t bg-slate-50/60 px-4 md:px-7">
                        <div className="mr-5 hidden w-[150px] shrink-0 md:block">
                            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                {completed} of 7 complete <strong className="ml-2 text-blue-600">{progress}%</strong>
                            </p>
                            <div role="progressbar" aria-label="Case completion" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                                <div className="h-full rounded-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]" style={{ width: progress + '%' }} />
                            </div>
                        </div>
                        <CapaLifecycleStepper observation={observation} viewingStage={viewingStage} onStageSelect={changeStage} />
                    </div>
                </header>

                <div className="flex min-h-0 flex-1 overflow-hidden">
                    <main className="flex min-w-0 flex-1 flex-col">
                        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
                            <CapaStageWorkspace key={viewingStage} observation={observation} stage={viewingStage} />
                        </div>
                        <footer className="shrink-0 border-t bg-white px-4 py-4 md:px-6">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    {isSubmitted ? (
                                        <div className="flex items-center gap-3 bg-blue-600 text-white px-6 py-2.5 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.8)] animate-pulse border-2 border-blue-400/30">
                                            <Clock className="h-5 w-5 text-white" />
                                            <span className="text-[11px] font-black uppercase tracking-[0.2em]">STAGE STATUS: REVIEW PENDING</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-full bg-blue-50">
                                                <RotateCcw className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black uppercase tracking-tight">STAGE IN PROGRESS</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Technical findings under development</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-3">
                                    {isAssignee && !isSubmitted && viewingStage !== 'Initiation' && (
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" className="font-black uppercase text-[10px] h-11 tracking-widest px-6" onClick={() => actionStage(observation.id, viewingStage, methods.getValues(), false)}>
                                                <Save className="mr-2 h-4 w-4" /> Save as Draft
                                            </Button>
                                            <Button className="bg-[#2563EB] hover:bg-blue-700 text-white font-black uppercase text-[10px] h-11 tracking-widest px-8 shadow-lg shadow-blue-500/20" onClick={() => actionStage(observation.id, viewingStage, methods.getValues(), true)}>
                                                Finalize {viewingStage} <ArrowRight className="ml-2 h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </footer>
                    </main>
                    <aside className="hidden w-[330px] shrink-0 overflow-y-auto pb-6 pr-6 pt-6 xl:block">
                        <CapaRightSidebar observation={observation} activeStage={viewingStage} />
                    </aside>
                </div>

                <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
                    <SheetContent className="overflow-y-auto bg-slate-50">
                        <SheetTitle className="mb-1 uppercase font-black text-slate-900">Case Overview</SheetTitle>
                        <SheetDescription className="mb-5 font-bold uppercase text-[9px] tracking-widest">Details and recorded activity for this case.</SheetDescription>
                        <CapaRightSidebar observation={observation} activeStage={viewingStage} />
                    </SheetContent>
                </Sheet>

                <Dialog open={!!reviewAction} onOpenChange={open => !open && setReviewAction(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="font-black uppercase tracking-tight text-slate-900">{reviewAction === 'Completed' ? 'Verify Phase Findings' : 'Instruct Technical Rework'}</DialogTitle>
                            <DialogDescription className="text-slate-500 font-bold text-xs uppercase tracking-widest">Record your validation notes for the permanent institutional ledger.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2 py-3 text-left">
                            <Label htmlFor="review-comment" className="font-black text-[10px] uppercase tracking-widest text-blue-600">Verification Notes / Instructions</Label>
                            <Textarea id="review-comment" value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="Explain your decision…" className="min-h-[130px] rounded-xl bg-slate-50 border-slate-200 font-bold text-sm shadow-inner p-4" />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setReviewAction(null)} className="h-12 px-6 rounded-xl font-bold uppercase tracking-widest text-xs">Cancel</Button>
                            <Button 
                                className={cn(
                                    "h-12 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg",
                                    reviewAction === 'Completed' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'
                                )}
                                onClick={() => {
                                    if (!reviewAction || !canReview) return;
                                    reviewStage(observation.id, viewingStage, reviewAction, reviewComment);
                                    setReviewAction(null);
                                    setReviewComment('');
                                }}
                            >
                                {reviewAction === 'Completed' ? 'Approve & Verified' : 'Confirm Rework'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </FormProvider>
    );
}
