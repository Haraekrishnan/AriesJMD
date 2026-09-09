'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useEhs } from '@/contexts/ehs-provider';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus, Search, MapPin, Calendar, Eye, Users, 
  FileWarning, AlertCircle, CheckCircle, ShieldCheck, 
  Clock, MessageSquare, 
  AlertTriangle, CheckCircle2, TrendingUp, Inbox,
  Zap, Send, Target, ChevronRight, FileCheck, HelpCircle,
  ArrowRight, Lock, FileSearch, Archive, ChevronLeft,
  FileText, Download, UserRound, Check, XCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format, parseISO, isPast, formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { EhsObservationStatus, EhsObservationCategory, EhsObservationSeverity, EhsObservation, CapaStage } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const severityColors: Record<EhsObservationSeverity, string> = {
  'Low': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Medium': 'bg-blue-100 text-blue-700 border-blue-200',
  'High': 'bg-orange-100 text-orange-700 border-orange-200',
  'Critical': 'bg-rose-100 text-rose-700 border-rose-200',
};

const stageConfig: Record<CapaStage, { label: string, icon: any, color: string, badge: string, description: string }> = {
  'Initiation': { label: 'Initiation', icon: Plus, color: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700', description: 'Initial recording of the site observation.' },
  'Resolution': { label: 'Resolution', icon: FileCheck, color: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700', description: 'Immediate correction and containment actions.' },
  'Investigation': { label: 'Investigation', icon: Search, color: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700', description: 'Root cause analysis using 5-Whys methodology.' },
  'Implementation': { label: 'Implementation', icon: Target, color: 'text-blue-600', badge: 'bg-blue-100 text-blue-700', description: 'Long-term preventive action deployment.' },
  'Effectiveness Review': { label: 'Effectiveness Review', icon: CheckCircle, color: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700', description: 'Validation that actions prevented recurrence.' },
  'Reference': { label: 'Reference', icon: FileSearch, color: 'text-blue-600', badge: 'bg-blue-100 text-blue-700', description: 'Technical archiving of documentation.' },
  'Closure': { label: 'Closure', icon: Lock, color: 'text-slate-600', badge: 'bg-slate-100 text-slate-700', description: 'Final organizational sign-off.' },
};

const observationSchema = z.object({
  projectId: z.string().min(1, 'Site is required'),
  location: z.string().min(1, 'Specific location is required'),
  category: z.enum(['Unsafe Act', 'Unsafe Condition', 'Safe Act', 'Near Miss', 'Environmental']),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']),
  description: z.string().min(5, 'Detailed description is required'),
});

type ObservationFormValues = z.infer<typeof observationSchema>;

export default function EhsObservationsPage() {
  const { observations, addObservation, transitionCapaStage } = useEhs();
  const { user, users } = useAuth();
  const { projects } = useGeneral();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [viewingObservation, setViewingObservation] = useState<EhsObservation | null>(null);
  
  // Interactive Nav State
  const [activeViewStage, setActiveViewStage] = useState<CapaStage | null>(null);

  // Transition Form States
  const [rcaWhys, setRcaWhys] = useState<string[]>(['', '', '', '', '']);
  const [finalRootCause, setFinalRootCause] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [actionOwnerId, setActionOwnerId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [verificationResult, setVerificationResult] = useState('');
  const [isSuccess, setIsSuccess] = useState(true);

  // Sync internal state with selected observation
  useEffect(() => {
    if (viewingObservation) {
      setActiveViewStage(viewingObservation.currentStage);
      setRcaWhys(viewingObservation.rootCauseAnalysis?.whys || ['', '', '', '', '']);
      setFinalRootCause(viewingObservation.rootCauseAnalysis?.finalRootCause || '');
      setActionPlan(viewingObservation.correctiveActionPlan || viewingObservation.immediateActionTaken || '');
      setActionOwnerId(viewingObservation.actionOwnerId || '');
      setDueDate(viewingObservation.dueDate || '');
      setVerificationResult(viewingObservation.effectivenessVerification?.result || '');
      setIsSuccess(viewingObservation.effectivenessVerification?.successful ?? true);
    }
  }, [viewingObservation]);

  const form = useForm<ObservationFormValues>({
    resolver: zodResolver(observationSchema),
    defaultValues: { category: 'Unsafe Act', severity: 'Medium', projectId: '' },
  });

  const filteredObservations = useMemo(() => {
    return observations.filter(o => {
      const projectName = projects.find(p => p.id === o.projectId)?.name || '';
      return (
        o.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }).sort((a, b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime());
  }, [observations, searchTerm, projects]);

  const onReportSubmit = (data: ObservationFormValues) => {
    addObservation(data);
    setIsReportDialogOpen(false);
    form.reset();
  };

  const handleNextStage = () => {
    if (!viewingObservation) return;
    
    let updates: Partial<EhsObservation> = {};
    let targetStage: CapaStage = viewingObservation.currentStage;

    const stages = Object.keys(stageConfig) as CapaStage[];
    const currentIndex = stages.indexOf(viewingObservation.currentStage);

    switch (viewingObservation.currentStage) {
      case 'Initiation':
        targetStage = 'Resolution';
        break;
      case 'Resolution':
        if (!actionPlan.trim()) return toast({ title: 'Correction Required', description: 'Specify immediate actions taken.', variant: 'destructive' });
        updates = { immediateActionTaken: actionPlan };
        targetStage = 'Investigation';
        break;
      case 'Investigation':
        if (!finalRootCause.trim()) return toast({ title: 'RCA Required', description: 'Complete the root cause analysis.', variant: 'destructive' });
        updates = { rootCauseAnalysis: { method: '5-Whys', whys: rcaWhys, finalRootCause } };
        targetStage = 'Implementation';
        break;
      case 'Implementation':
        if (!actionPlan.trim() || !actionOwnerId) return toast({ title: 'Plan Required', description: 'Define the preventive plan and owner.', variant: 'destructive' });
        updates = { correctiveActionPlan: actionPlan, actionOwnerId, dueDate };
        targetStage = 'Effectiveness Review';
        break;
      case 'Effectiveness Review':
        if (!verificationResult.trim()) return toast({ title: 'Verification Required', description: 'Enter validation results.', variant: 'destructive' });
        updates = { effectivenessVerification: { verifiedBy: user!.id, verificationDate: new Date().toISOString(), result: verificationResult, successful: isSuccess } };
        targetStage = 'Reference';
        break;
      case 'Reference':
        targetStage = 'Closure';
        break;
    }

    transitionCapaStage(viewingObservation.id, targetStage, updates);
    // After transition, sync the view stage
    setActiveViewStage(targetStage);
  };

  const nextStageLabel = useMemo(() => {
    if (!viewingObservation) return '';
    const stages = Object.keys(stageConfig) as CapaStage[];
    const currentIndex = stages.indexOf(viewingObservation.currentStage);
    const next = stages[currentIndex + 1];
    return next ? `MOVE TO ${next.toUpperCase()}` : 'CLOSE CASE';
  }, [viewingObservation]);

  if (viewingObservation && activeViewStage) {
    const activeStageIdx = Object.keys(stageConfig).indexOf(viewingObservation.currentStage);
    const viewingStageIdx = Object.keys(stageConfig).indexOf(activeViewStage);
    const reporter = users.find(u => u.id === viewingObservation.reporterId);
    const site = projects.find(p => p.id === viewingObservation.projectId);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Enterprise Header Bar */}
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-md">
                <div className="flex items-center gap-6">
                    <Button variant="outline" onClick={() => setViewingObservation(null)} className="h-12 w-12 p-0 rounded-2xl border-2 border-slate-200 hover:bg-slate-100">
                        <ChevronLeft className="h-6 w-6 text-slate-900" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <span className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] bg-slate-100 px-2 py-0.5 rounded">
                                CASE ID: {viewingObservation.id.slice(-8).toUpperCase()}
                            </span>
                            <Badge variant="outline" className={cn("font-black text-[10px] h-5 px-3 border-2 uppercase tracking-widest", severityColors[viewingObservation.severity])}>
                                {viewingObservation.severity} SEVERITY
                            </Badge>
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">{viewingObservation.description}</h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="h-12 rounded-2xl border-2 border-slate-200 font-black text-[10px] uppercase tracking-widest px-6 shadow-sm">
                        <Download className="mr-2 h-4 w-4" /> Export Report
                    </Button>
                    <div className={cn("h-12 px-6 rounded-2xl font-black uppercase tracking-widest text-[11px] border-2 flex items-center shadow-md", stageConfig[viewingObservation.currentStage].badge)}>
                        CURRENT STAGE: {viewingObservation.currentStage}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[380px,1fr] gap-8 items-start">
                
                {/* Left Column: Dossier & Interactive Stepper */}
                <div className="space-y-8">
                    <Card className="rounded-[2rem] border-2 border-slate-200 shadow-lg overflow-hidden">
                        <CardHeader className="bg-slate-900 text-white p-6">
                            <CardTitle className="text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-3">
                                <FileText className="h-4 w-4" /> Case Discovery Dossier
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8 bg-white">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-900 tracking-widest">Initial Finding Narrative</Label>
                                <p className="text-lg font-black text-slate-800 leading-tight uppercase tracking-tight italic border-l-4 border-slate-200 pl-4">"{viewingObservation.description}"</p>
                            </div>
                            <Separator className="bg-slate-100" />
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Reporting Officer</span>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8 border-2 border-slate-200">
                                            <AvatarImage src={reporter?.avatar} />
                                            <AvatarFallback className="text-[10px] font-black bg-slate-100 text-slate-600">{reporter?.name?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-black text-slate-900 uppercase">{reporter?.name}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Site / Area</span>
                                    <span className="text-sm font-black text-slate-900 uppercase">{site?.name} &middot; {viewingObservation.location}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Submission Date</span>
                                    <span className="text-sm font-black text-slate-900 uppercase">{format(parseISO(viewingObservation.createdAt), 'dd MMM yyyy, p')}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-[2rem] border-2 border-slate-200 shadow-lg bg-white">
                        <CardHeader className="p-6 pb-2">
                            <CardTitle className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900">Lifecycle Navigation</CardTitle>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Click any stage below to review details</p>
                        </CardHeader>
                        <CardContent className="p-6">
                            <nav className="space-y-4">
                                {Object.entries(stageConfig).map(([key, config], idx) => {
                                    const isDone = idx < activeStageIdx;
                                    const isActive = idx === activeStageIdx;
                                    const isCurrentView = activeViewStage === key;
                                    const isLocked = idx > activeStageIdx;

                                    return (
                                        <button 
                                            key={key} 
                                            disabled={isLocked}
                                            onClick={() => setActiveViewStage(key as CapaStage)}
                                            className={cn(
                                                "w-full flex items-center gap-4 p-3 rounded-2xl border-2 transition-all group",
                                                isCurrentView ? "bg-slate-900 border-slate-900 shadow-md translate-x-2" : "bg-white border-slate-100 hover:border-slate-300",
                                                isLocked && "opacity-40 grayscale cursor-not-allowed border-dashed"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-8 h-8 rounded-xl flex items-center justify-center border-2 shrink-0 transition-colors",
                                                isDone ? "bg-emerald-500 border-emerald-500 text-white" :
                                                isActive ? "bg-white border-blue-600 text-blue-600" :
                                                "border-slate-200 text-slate-400",
                                                isCurrentView && "bg-white border-white text-slate-900"
                                            )}>
                                                {isDone ? <Check className="h-4 w-4" /> : <span className="text-[10px] font-black">{idx + 1}</span>}
                                            </div>
                                            <div className="text-left flex-1 min-w-0">
                                                <span className={cn(
                                                    "block text-[10px] font-black uppercase tracking-widest",
                                                    isCurrentView ? "text-white" : isDone ? "text-emerald-600" : isActive ? "text-blue-600" : "text-slate-400"
                                                )}>{config.label}</span>
                                            </div>
                                            {!isLocked && !isCurrentView && <ChevronRight className="h-4 w-4 text-slate-300 group-hover:translate-x-1 transition-transform" />}
                                        </button>
                                    )
                                })}
                            </nav>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Workflow Workspace */}
                <div className="space-y-8">
                    <Card className="rounded-[3rem] border-2 border-slate-200 shadow-2xl overflow-hidden min-h-[700px] flex flex-col bg-white">
                        <div className="p-10 bg-slate-50 border-b-2 flex justify-between items-center">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-white rounded-2xl shadow-md border-2 border-slate-200">
                                    {React.createElement(stageConfig[activeViewStage].icon, { className: "h-8 w-8 text-blue-600" })}
                                </div>
                                <div>
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Active Lifecycle Workspace</h3>
                                    <p className="text-2xl font-black text-slate-900 uppercase tracking-tight">{activeViewStage}</p>
                                    <p className="text-sm text-slate-600 font-bold mt-1">{stageConfig[activeViewStage].description}</p>
                                </div>
                            </div>
                            
                            {(user?.role === 'Admin' || user?.role === 'Senior Safety Supervisor') && 
                             activeViewStage === viewingObservation.currentStage && 
                             viewingObservation.status !== 'Closed' && (
                                <Button 
                                    className="bg-blue-600 hover:bg-blue-700 text-white h-14 rounded-2xl px-10 font-black uppercase tracking-widest text-[11px] shadow-xl shadow-blue-600/20 active:scale-95 transition-all"
                                    onClick={handleNextStage}
                                >
                                    {nextStageLabel} <ArrowRight className="ml-3 h-5 w-5" />
                                </Button>
                            )}

                            {activeViewStage !== viewingObservation.currentStage && (
                                <Badge className="h-10 px-6 bg-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-xl">
                                    READ-ONLY ARCHIVE VIEW
                                </Badge>
                            )}
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-12">
                                {/* ACTIVE STAGE INTERFACE */}
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    
                                    {activeViewStage === 'Initiation' && (
                                        <div className="p-10 border-4 border-dashed border-slate-100 rounded-[3rem] text-center space-y-6">
                                            <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto shadow-inner">
                                                <Plus className="h-12 w-12 text-emerald-600" />
                                            </div>
                                            <div className="space-y-4 max-w-xl mx-auto">
                                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Stage 1: Observation Logged</h3>
                                                <p className="text-slate-700 text-base font-bold leading-relaxed">This case was initiated by the reporting officer. The original findings have been permanently locked in the dossier on the left for legal and organizational integrity.</p>
                                                <div className="pt-8 grid grid-cols-2 gap-4">
                                                    <div className="p-4 bg-slate-50 rounded-2xl">
                                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Severity</span>
                                                        <Badge variant="outline" className={cn("font-black text-[10px] border-2", severityColors[viewingObservation.severity])}>{viewingObservation.severity}</Badge>
                                                    </div>
                                                    <div className="p-4 bg-slate-50 rounded-2xl">
                                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Category</span>
                                                        <Badge variant="outline" className="font-black text-[10px] border-2 border-slate-200">{viewingObservation.category}</Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeViewStage === 'Resolution' && (
                                        <div className="space-y-8">
                                            <div className="space-y-4">
                                                <Label className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] ml-2">Documented Immediate Correction:</Label>
                                                <Textarea 
                                                    className="min-h-[180px] rounded-[2rem] p-8 text-xl font-black text-slate-900 border-4 border-slate-100 focus-visible:ring-emerald-500/20 bg-slate-50/50 shadow-inner" 
                                                    placeholder="Specify the exact steps taken to contain the hazard immediately..."
                                                    value={actionPlan}
                                                    onChange={(e) => setActionPlan(e.target.value)}
                                                    disabled={activeViewStage !== viewingObservation.currentStage}
                                                />
                                            </div>
                                            <Alert className="bg-emerald-50 border-emerald-100 rounded-2xl py-6">
                                                <AlertCircle className="h-5 w-5 text-emerald-600" />
                                                <AlertTitle className="text-emerald-900 font-black uppercase text-xs tracking-widest">Correction Standards</AlertTitle>
                                                <AlertDescription className="text-emerald-800 font-bold text-sm mt-1">Immediate actions should resolve the instant danger while the root cause investigation is pending.</AlertDescription>
                                            </Alert>
                                        </div>
                                    )}

                                    {activeViewStage === 'Investigation' && (
                                        <div className="space-y-10">
                                            <div className="flex items-center gap-4 mb-4 bg-slate-900 text-white p-4 rounded-2xl w-fit">
                                                <Zap className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                                                <span className="font-black text-[11px] uppercase tracking-[0.2em]">Scientific Method: 5-Whys Deep Probe</span>
                                            </div>
                                            <div className="space-y-6">
                                                {rcaWhys.map((why, i) => (
                                                    <div key={i} className="flex gap-6 items-center">
                                                        <div className="w-14 h-14 rounded-2xl bg-slate-100 border-2 border-slate-200 flex flex-col items-center justify-center shrink-0 shadow-sm">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase leading-none mb-0.5">LEVEL</span>
                                                            <span className="text-xl font-black text-slate-900">0{i+1}</span>
                                                        </div>
                                                        <Input 
                                                            className="h-14 rounded-2xl text-lg font-black text-slate-900 border-2 border-slate-100 bg-white focus-visible:ring-blue-600/20 shadow-sm"
                                                            placeholder={`Ask WHY did the level ${i} failure occur?`}
                                                            value={why}
                                                            onChange={(e) => {
                                                                const next = [...rcaWhys];
                                                                next[i] = e.target.value;
                                                                setRcaWhys(next);
                                                            }}
                                                            disabled={activeViewStage !== viewingObservation.currentStage}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-12 pt-10 border-t-4 border-slate-100">
                                                <Label className="text-xs font-black uppercase text-rose-600 tracking-[0.3em] ml-4">Root Cause Identification</Label>
                                                <Textarea 
                                                    className="mt-4 min-h-[140px] rounded-[2.5rem] p-10 text-2xl font-black text-slate-900 border-4 border-rose-500/10 shadow-2xl bg-rose-50/20" 
                                                    placeholder="Synthesize the findings into a single core failure..." 
                                                    value={finalRootCause}
                                                    onChange={(e) => setFinalRootCause(e.target.value)}
                                                    disabled={activeViewStage !== viewingObservation.currentStage}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {activeViewStage === 'Implementation' && (
                                        <div className="space-y-12">
                                            <div className="space-y-4">
                                                <Label className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] ml-4">Long-Term Preventive Strategy</Label>
                                                <Textarea 
                                                    className="min-h-[220px] rounded-[3rem] p-10 text-xl font-black text-slate-900 border-4 border-blue-100 shadow-inner bg-blue-50/10" 
                                                    placeholder="Define systemic organizational changes to ensure this specific failure never recurs..."
                                                    value={actionPlan}
                                                    onChange={(e) => setActionPlan(e.target.value)}
                                                    disabled={activeViewStage !== viewingObservation.currentStage}
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                                <div className="space-y-3">
                                                    <Label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.3em] ml-6">Action Owner</Label>
                                                    <Select onValueChange={setActionOwnerId} value={actionOwnerId} disabled={activeViewStage !== viewingObservation.currentStage}>
                                                        <SelectTrigger className="h-16 rounded-[1.5rem] font-black text-slate-900 border-2 border-slate-100 px-8 bg-white shadow-sm text-base uppercase">
                                                            <SelectValue placeholder="Select stage manager" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-3">
                                                    <Label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.3em] ml-6">Target Date</Label>
                                                    <Input 
                                                        type="date" 
                                                        className="h-16 rounded-[1.5rem] font-black text-slate-900 border-2 border-slate-100 px-8 bg-white shadow-sm text-base" 
                                                        value={dueDate} 
                                                        onChange={e => setDueDate(e.target.value)} 
                                                        disabled={activeViewStage !== viewingObservation.currentStage}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeViewStage === 'Effectiveness Review' && (
                                        <div className="space-y-10">
                                            <div className="space-y-4">
                                                <Label className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] ml-4">Validation Audit Evidence</Label>
                                                <Textarea 
                                                    className="min-h-[200px] rounded-[3rem] p-10 text-xl font-bold text-slate-900 border-4 border-slate-100 bg-slate-50/30" 
                                                    placeholder="Document objective evidence (Audit No., Photo Ref., etc.) that the preventive action is functioning as designed..."
                                                    value={verificationResult}
                                                    onChange={(e) => setVerificationResult(e.target.value)}
                                                    disabled={activeViewStage !== viewingObservation.currentStage}
                                                />
                                            </div>
                                            <div className="p-10 bg-slate-900 rounded-[3rem] border-2 border-slate-800 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
                                                <div className="text-center md:text-left">
                                                    <h4 className="text-lg font-black text-white uppercase tracking-tight">Final Verification Verdict</h4>
                                                    <p className="text-xs text-slate-400 font-bold uppercase mt-1">Has the organizational risk been structurally mitigated?</p>
                                                </div>
                                                <div className="flex gap-4">
                                                    <Button 
                                                        variant={isSuccess ? 'default' : 'outline'} 
                                                        className={cn(
                                                            "h-14 px-10 rounded-2xl font-black uppercase tracking-widest text-[11px] border-2", 
                                                            isSuccess ? "bg-emerald-600 border-emerald-600 text-white shadow-xl shadow-emerald-600/30" : "bg-transparent border-white/20 text-white hover:bg-white/10"
                                                        )} 
                                                        onClick={() => setIsSuccess(true)}
                                                        disabled={activeViewStage !== viewingObservation.currentStage}
                                                    >
                                                        <CheckCircle2 className="mr-3 h-5 w-5" /> PASSED
                                                    </Button>
                                                    <Button 
                                                        variant={!isSuccess ? 'destructive' : 'outline'} 
                                                        className={cn(
                                                            "h-14 px-10 rounded-2xl font-black uppercase tracking-widest text-[11px] border-2",
                                                            !isSuccess ? "bg-rose-600 border-rose-600 text-white" : "bg-transparent border-white/20 text-white hover:bg-white/10"
                                                        )} 
                                                        onClick={() => setIsSuccess(false)}
                                                        disabled={activeViewStage !== viewingObservation.currentStage}
                                                    >
                                                        <XCircle className="mr-3 h-5 w-5" /> FAILED
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeViewStage === 'Reference' && (
                                        <div className="p-24 border-4 border-dashed border-slate-100 rounded-[4rem] text-center space-y-8 bg-slate-50/30">
                                            <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center mx-auto shadow-xl border-2 border-slate-100">
                                                <Archive className="h-10 w-10 text-blue-600" />
                                            </div>
                                            <div className="space-y-4 max-w-lg mx-auto">
                                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Technical Archiving</h3>
                                                <p className="text-sm text-slate-700 font-bold leading-relaxed uppercase">Ensure all relevant evidence, training records, and revised SOPs are attached to the digital dossier before organizational sign-off and closure.</p>
                                            </div>
                                        </div>
                                    )}

                                    {activeViewStage === 'Closure' && (
                                        <div className="p-24 bg-emerald-600 rounded-[5rem] text-center space-y-10 shadow-[0_30px_60px_-12px_rgba(5,150,105,0.4)] animate-in zoom-in-95 duration-700">
                                            <div className="w-28 h-24 bg-white rounded-full flex items-center justify-center mx-auto shadow-2xl border-8 border-emerald-500/20">
                                                <CheckCircle2 className="h-16 w-16 text-emerald-600" />
                                            </div>
                                            <div className="space-y-4 text-white">
                                                <h3 className="text-5xl font-black uppercase tracking-tighter">CAPA CYCLE CLOSED</h3>
                                                <p className="text-emerald-50 text-xl font-bold opacity-80 uppercase tracking-wide">Organizational Sign-off Completed</p>
                                                <div className="pt-12 flex flex-col items-center gap-4">
                                                    <span className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-200">Final Verification Timestamp</span>
                                                    <Badge className="bg-emerald-700 text-white font-black text-[10px] px-8 py-2 rounded-xl shadow-lg">
                                                        {viewingObservation.closedAt ? format(parseISO(viewingObservation.closedAt), 'PPP p') : 'N/A'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </ScrollArea>
                    </Card>
                </div>
            </div>
        </div>
    )
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">CAPA Central Registry</h1>
          <p className="text-slate-700 text-lg font-bold mt-2">Enterprise-grade tracking for site observations and corrective actions.</p>
        </div>
        
        <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-[0.15em] h-16 px-12 rounded-3xl shadow-2xl shadow-emerald-600/20 active:scale-95 transition-all text-xs">
              <Plus className="mr-3 h-6 w-6" /> REGISTER NEW FINDING
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl bg-white border-2 border-slate-200 shadow-2xl rounded-[2.5rem]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900">Initiate Lifecycle Case</DialogTitle>
              <DialogDescription className="text-slate-600 font-bold">Log a new site observation to trigger the organizational CAPA stream.</DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onReportSubmit)} className="space-y-8 py-6 text-left">
               <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest ml-1">Finding Category</Label>
                    <Controller
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="h-14 rounded-2xl font-black border-2 border-slate-100 shadow-sm text-slate-900 uppercase">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Unsafe Act">Unsafe Act</SelectItem>
                            <SelectItem value="Unsafe Condition">Unsafe Condition</SelectItem>
                            <SelectItem value="Safe Act">Safe Act</SelectItem>
                            <SelectItem value="Near Miss">Near Miss</SelectItem>
                            <SelectItem value="Environmental">Environmental</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest ml-1">Risk Severity Assessment</Label>
                    <Controller
                      control={form.control}
                      name="severity"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="h-14 rounded-2xl font-black border-2 border-slate-100 shadow-sm text-slate-900 uppercase">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Low">Low Priority</SelectItem>
                            <SelectItem value="Medium">Medium Priority</SelectItem>
                            <SelectItem value="High">High Priority</SelectItem>
                            <SelectItem value="Critical">Critical Priority</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                   <div className="space-y-2">
                    <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest ml-1">Assigned Site / Project</Label>
                    <Controller
                      control={form.control}
                      name="projectId"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="h-14 rounded-2xl font-black border-2 border-slate-100 shadow-sm text-slate-900 uppercase">
                            <SelectValue placeholder="Select site..." />
                          </SelectTrigger>
                          <SelectContent>
                            {projects.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest ml-1">Unit / Exact Location</Label>
                    <Input {...form.register('location')} className="h-14 rounded-2xl font-black border-2 border-slate-100 shadow-sm text-slate-900 uppercase" placeholder="e.g., Tank 42" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest ml-1">Detailed Observation narrative</Label>
                  <Textarea {...form.register('description')} className="min-h-[160px] rounded-3xl p-6 font-bold border-2 border-slate-100 shadow-sm focus-visible:ring-emerald-500/20 text-slate-900" placeholder="State exactly what was observed..." />
                </div>

                <DialogFooter className="pt-4 gap-4">
                  <Button variant="outline" type="button" onClick={() => setIsReportDialogOpen(false)} className="h-14 rounded-2xl font-black px-10 border-2 border-slate-100 text-[10px] uppercase tracking-widest">Cancel Initiation</Button>
                  <Button type="submit" className="bg-slate-900 hover:bg-black text-white font-black h-14 rounded-2xl px-12 shadow-xl uppercase tracking-widest text-[10px]">Open CAPA Case</Button>
                </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Modern High-Contrast Registry Table */}
      <Card className="bg-white border-2 border-slate-200 shadow-xl overflow-hidden rounded-[2.5rem]">
        <div className="p-10 border-b-2 border-slate-100 flex flex-col md:flex-row justify-between items-center gap-10 bg-slate-50/50">
            <div className="relative w-full max-w-2xl">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400" />
                <Input 
                    placeholder="Search CAPA Registry by Location, Case ID, or Narrative..." 
                    className="pl-14 h-16 bg-white border-2 border-slate-200 rounded-[1.5rem] font-black text-slate-900 focus-visible:ring-emerald-500/20 shadow-sm text-base uppercase tracking-tight"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex gap-6 items-center shrink-0">
                <Badge variant="secondary" className="h-10 px-6 font-black uppercase tracking-[0.2em] text-[10px] bg-white border-2 border-slate-100">
                    {filteredObservations.length} Indexed Cases
                </Badge>
            </div>
        </div>
        
        <div className="overflow-x-auto">
            <Table>
                <TableHeader className="bg-slate-900">
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="w-24 font-black uppercase text-[10px] tracking-widest text-white text-center h-16 border-r border-white/10">ID</TableHead>
                        <TableHead className="min-w-[400px] font-black uppercase text-[10px] tracking-widest text-white h-16 border-r border-white/10 px-10">Safety Observation Summary</TableHead>
                        <TableHead className="w-48 font-black uppercase text-[10px] tracking-widest text-white h-16 border-r border-white/10 text-center">Category</TableHead>
                        <TableHead className="w-40 font-black uppercase text-[10px] tracking-widest text-white h-16 border-r border-white/10 text-center">Severity</TableHead>
                        <TableHead className="w-72 font-black uppercase text-[10px] tracking-widest text-white h-16 border-r border-white/10 px-10 text-center">Active Stage</TableHead>
                        <TableHead className="w-32 text-right font-black uppercase text-[10px] tracking-widest text-white h-16 px-10">Access</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredObservations.map((obs) => {
                        const site = projects.find(p => p.id === obs.projectId);
                        const currentStageConfig = stageConfig[obs.currentStage];

                        return (
                            <TableRow key={obs.id} className="group hover:bg-blue-50/50 transition-colors border-b-2 border-slate-50">
                                <TableCell className="text-center font-mono text-[10px] font-black text-slate-900 border-r border-slate-50 bg-slate-50/20">{obs.id.slice(-5).toUpperCase()}</TableCell>
                                <TableCell className="border-r border-slate-50 px-10 py-8 text-left">
                                    <div className="flex flex-col gap-2">
                                        <p className="font-black text-slate-900 text-base leading-tight uppercase tracking-tight group-hover:text-blue-700 transition-colors">{obs.description}</p>
                                        <div className="flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                            <MapPin className="h-3.5 w-3.5 text-blue-600" /> {site?.name} &middot; {obs.location}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center border-r border-slate-50">
                                    <Badge variant="outline" className="text-[10px] font-black uppercase tracking-tight h-7 px-4 bg-white border-2 border-slate-200 text-slate-900">
                                        {obs.category}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-center border-r border-slate-50">
                                    <Badge variant="outline" className={cn("text-[10px] font-black uppercase tracking-widest h-7 px-4 border-2 shadow-sm", severityColors[obs.severity])}>
                                        {obs.severity}
                                    </Badge>
                                </TableCell>
                                <TableCell className="border-r border-slate-50 px-10 text-center">
                                    <div className={cn("inline-flex items-center gap-3 p-2 pr-6 rounded-2xl border-2 shadow-sm", currentStageConfig.badge)}>
                                        <div className="p-2 bg-white rounded-xl">
                                            {React.createElement(currentStageConfig.icon, { className: "h-4 w-4" })}
                                        </div>
                                        <span className="font-black text-[10px] uppercase tracking-widest">{currentStageConfig.label}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right px-10">
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-12 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 border-slate-200 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-md group-hover:-translate-y-1"
                                        onClick={() => setViewingObservation(obs)}
                                    >
                                        MANAGE <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
        
        {filteredObservations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-48 text-center bg-slate-50/30">
                <div className="p-10 bg-white rounded-full shadow-inner mb-8 border-2 border-dashed border-slate-200">
                    <Inbox className="h-20 w-20 text-slate-200" />
                </div>
                <p className="font-black uppercase tracking-[0.4em] text-2xl text-slate-300">Empty Registry</p>
                <p className="text-slate-400 font-bold mt-2 uppercase text-sm">Waiting for first site observation report...</p>
            </div>
        )}
    </div>
  );
}
