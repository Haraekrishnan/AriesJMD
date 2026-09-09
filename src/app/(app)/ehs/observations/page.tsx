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
import StatCard from '@/components/dashboard/stat-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const severityColors: Record<EhsObservationSeverity, string> = {
  'Low': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Medium': 'bg-blue-100 text-blue-700 border-blue-200',
  'High': 'bg-orange-100 text-orange-700 border-orange-200',
  'Critical': 'bg-rose-100 text-rose-700 border-rose-200',
};

const stageConfig: Record<CapaStage, { label: string, icon: any, color: string, badge: string }> = {
  'Initiation': { label: 'Initiation', icon: Plus, color: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
  'Resolution': { label: 'Resolution', icon: FileCheck, color: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
  'Investigation': { label: 'Investigation', icon: Search, color: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
  'Implementation': { label: 'Implementation', icon: Target, color: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
  'Effectiveness Review': { label: 'Effectiveness Review', icon: CheckCircle, color: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700' },
  'Reference': { label: 'Reference', icon: FileSearch, color: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
  'Closure': { label: 'Closure', icon: Lock, color: 'text-slate-600', badge: 'bg-slate-100 text-slate-700' },
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
  const { observations, addObservation, transitionCapaStage, stats } = useEhs();
  const { user, users } = useAuth();
  const { projects } = useGeneral();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [viewingObservation, setViewingObservation] = useState<EhsObservation | null>(null);
  
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
      setRcaWhys(viewingObservation.rootCauseAnalysis?.whys || ['', '', '', '', '']);
      setFinalRootCause(viewingObservation.rootCauseAnalysis?.finalRootCause || '');
      setActionPlan(viewingObservation.correctiveActionPlan || '');
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
    setViewingObservation(prev => prev ? { ...prev, ...updates, currentStage: targetStage } : null);
  };

  const nextStageLabel = useMemo(() => {
    if (!viewingObservation) return '';
    const stages = Object.keys(stageConfig) as CapaStage[];
    const currentIndex = stages.indexOf(viewingObservation.currentStage);
    const next = stages[currentIndex + 1];
    return next ? `Move to ${next}` : 'Close Case';
  }, [viewingObservation]);

  if (viewingObservation) {
    const activeStageIdx = Object.keys(stageConfig).indexOf(viewingObservation.currentStage);
    const reporter = users.find(u => u.id === viewingObservation.reporterId);
    const site = projects.find(p => p.id === viewingObservation.projectId);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Professional Header Bar */}
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-5">
                    <Button variant="outline" onClick={() => setViewingObservation(null)} className="h-10 w-10 p-0 rounded-xl border-slate-200">
                        <ChevronLeft className="h-5 w-5 text-slate-600" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3 mb-0.5">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CAPA SYSTEM &middot; CASE {viewingObservation.id.slice(-6).toUpperCase()}</span>
                            <Badge variant="outline" className={cn("font-black text-[9px] h-4 px-2 border-2", severityColors[viewingObservation.severity])}>
                                {viewingObservation.severity} SEVERITY
                            </Badge>
                        </div>
                        <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">{viewingObservation.description}</h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="h-10 rounded-xl border-slate-200 font-bold text-xs">
                        <Download className="mr-2 h-4 w-4" /> Export PDF
                    </Button>
                    <Badge className={cn("h-10 px-5 rounded-xl font-black uppercase tracking-widest text-[10px] border-2", stageConfig[viewingObservation.currentStage].badge)}>
                        STAGE: {viewingObservation.currentStage}
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[350px,1fr] gap-6 items-start">
                
                {/* Left Column: Case Dossier */}
                <div className="space-y-6">
                    <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b p-5">
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                                <FileText className="h-3.5 w-3.5" /> Case Dossier
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-1">
                                <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Original Discovery</Label>
                                <p className="text-sm font-bold text-slate-800 leading-relaxed italic">"{viewingObservation.description}"</p>
                            </div>
                            <Separator className="bg-slate-100" />
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Reporter</span>
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={reporter?.avatar} />
                                            <AvatarFallback className="text-[8px] font-black">{reporter?.name?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs font-black text-slate-900">{reporter?.name}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Location</span>
                                    <span className="text-xs font-black text-slate-900">{site?.name} &middot; {viewingObservation.location}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Timestamp</span>
                                    <span className="text-xs font-black text-slate-900">{format(parseISO(viewingObservation.createdAt), 'dd MMM yy, p')}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-slate-200 shadow-sm">
                        <CardHeader className="p-5 pb-2">
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Lifecycle Progress</CardTitle>
                        </CardHeader>
                        <CardContent className="p-5">
                            <div className="space-y-3">
                                {Object.entries(stageConfig).map(([key, config], idx) => {
                                    const isDone = idx < activeStageIdx;
                                    const isActive = idx === activeStageIdx;
                                    return (
                                        <div key={key} className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-6 h-6 rounded-full flex items-center justify-center border-2 shrink-0 transition-colors",
                                                isDone ? "bg-emerald-500 border-emerald-500 text-white" :
                                                isActive ? "bg-white border-blue-600 text-blue-600 animate-pulse" :
                                                "border-slate-200 text-slate-300"
                                            )}>
                                                {isDone ? <Check className="h-3 w-3" /> : <span className="text-[9px] font-black">{idx + 1}</span>}
                                            </div>
                                            <span className={cn(
                                                "text-[10px] font-black uppercase tracking-widest",
                                                isDone ? "text-emerald-600" : isActive ? "text-blue-600" : "text-slate-400"
                                            )}>{config.label}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Workflow Workspace */}
                <div className="space-y-6">
                    <Card className="rounded-[2rem] border-slate-200 shadow-xl overflow-hidden min-h-[600px] flex flex-col bg-white">
                        <div className="p-8 bg-slate-50 border-b flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200">
                                    {React.createElement(stageConfig[viewingObservation.currentStage].icon, { className: "h-6 w-6 text-blue-600" })}
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">Active Workspace</h3>
                                    <p className="text-xl font-black text-slate-900 uppercase tracking-tight">Stage {activeStageIdx + 1}: {viewingObservation.currentStage}</p>
                                </div>
                            </div>
                            
                            {(user?.role === 'Admin' || user?.role === 'Senior Safety Supervisor') && viewingObservation.status !== 'Closed' && (
                                <Button 
                                    className="bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl px-8 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                                    onClick={handleNextStage}
                                >
                                    {nextStageLabel} <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            )}
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-10 space-y-12">
                                
                                {/* Completed Stages Summary */}
                                {activeStageIdx > 1 && (
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4">Completed Actions</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {viewingObservation.immediateActionTaken && (
                                                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 relative">
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 absolute top-4 right-4" />
                                                    <span className="text-[9px] font-black uppercase text-emerald-600 tracking-widest">Correction Taken</span>
                                                    <p className="text-sm font-bold text-slate-800 mt-1">{viewingObservation.immediateActionTaken}</p>
                                                </div>
                                            )}
                                            {viewingObservation.rootCauseAnalysis && (
                                                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 relative">
                                                    <Target className="h-4 w-4 text-emerald-500 absolute top-4 right-4" />
                                                    <span className="text-[9px] font-black uppercase text-emerald-600 tracking-widest">Verified Root Cause</span>
                                                    <p className="text-sm font-bold text-slate-800 mt-1">{viewingObservation.rootCauseAnalysis.finalRootCause}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* ACTIVE STAGE INTERFACE */}
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    {viewingObservation.currentStage === 'Resolution' && (
                                        <div className="space-y-4">
                                            <Label className="text-sm font-black text-slate-900 uppercase tracking-widest">Immediate Correction Required:</Label>
                                            <Textarea 
                                                className="min-h-[150px] rounded-3xl p-6 text-lg font-bold border-2 border-slate-200 focus-visible:ring-emerald-500/20" 
                                                placeholder="Document the instant actions taken to secure the area..."
                                                value={actionPlan}
                                                onChange={(e) => setActionPlan(e.target.value)}
                                            />
                                        </div>
                                    )}

                                    {viewingObservation.currentStage === 'Investigation' && (
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3 mb-4">
                                                <Badge className="bg-slate-900 text-white font-black text-[9px] uppercase tracking-widest px-3 h-6">Method: 5-Whys Analysis</Badge>
                                            </div>
                                            <div className="space-y-4">
                                                {rcaWhys.map((why, i) => (
                                                    <div key={i} className="flex gap-4 items-center">
                                                        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 text-xs font-black text-white">W{i+1}</div>
                                                        <Input 
                                                            className="h-12 rounded-xl text-base font-bold border-slate-200"
                                                            placeholder={`Probing cause level ${i+1}...`}
                                                            value={why}
                                                            onChange={(e) => {
                                                                const next = [...rcaWhys];
                                                                next[i] = e.target.value;
                                                                setRcaWhys(next);
                                                            }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-8 pt-8 border-t border-dashed">
                                                <Label className="text-[10px] font-black uppercase text-emerald-600 tracking-widest ml-1">Final Root Cause Conclusion</Label>
                                                <Textarea 
                                                    className="mt-3 min-h-[120px] rounded-3xl p-6 text-xl font-black text-slate-900 border-2 border-emerald-500/20 shadow-inner bg-emerald-50/10" 
                                                    placeholder="Specify the fundamental failure..." 
                                                    value={finalRootCause}
                                                    onChange={(e) => setFinalRootCause(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {viewingObservation.currentStage === 'Implementation' && (
                                        <div className="space-y-8">
                                            <div className="space-y-4">
                                                <Label className="text-sm font-black text-slate-900 uppercase tracking-widest">Long-Term Preventive Strategy:</Label>
                                                <Textarea 
                                                    className="min-h-[150px] rounded-3xl p-6 text-lg font-bold border-2 border-slate-200" 
                                                    placeholder="Define systemic changes to prevent recurrence..."
                                                    value={actionPlan}
                                                    onChange={(e) => setActionPlan(e.target.value)}
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Stage Owner / Responsible</Label>
                                                    <Select onValueChange={setActionOwnerId} value={actionOwnerId}>
                                                        <SelectTrigger className="h-14 rounded-2xl font-bold border-slate-200 px-6">
                                                            <SelectValue placeholder="Select personnel" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Compliance Target Date</Label>
                                                    <Input type="date" className="h-14 rounded-2xl font-bold border-slate-200 px-6" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {viewingObservation.currentStage === 'Effectiveness Review' && (
                                        <div className="space-y-8">
                                            <div className="space-y-4">
                                                <Label className="text-sm font-black text-slate-900 uppercase tracking-widest">Validation Evidence & Outcomes:</Label>
                                                <Textarea 
                                                    className="min-h-[150px] rounded-3xl p-6 text-lg font-bold border-2 border-slate-200" 
                                                    placeholder="Provide technical evidence that the preventive action is working..."
                                                    value={verificationResult}
                                                    onChange={(e) => setVerificationResult(e.target.value)}
                                                />
                                            </div>
                                            <div className="p-6 bg-slate-50 rounded-[2rem] border flex items-center justify-between">
                                                <div>
                                                    <h4 className="text-sm font-black text-slate-900 uppercase">Verification Result</h4>
                                                    <p className="text-xs text-slate-500 font-bold">Mark if the measures have structurally mitigated the risk.</p>
                                                </div>
                                                <div className="flex gap-3">
                                                    <Button 
                                                        variant={isSuccess ? 'default' : 'outline'} 
                                                        className={cn("h-11 px-8 rounded-xl font-black uppercase tracking-widest text-[10px]", isSuccess ? "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20" : "bg-white")} 
                                                        onClick={() => setIsSuccess(true)}
                                                    >
                                                        <CheckCircle2 className="mr-2 h-4 w-4" /> SUCCESSFUL
                                                    </Button>
                                                    <Button 
                                                        variant={!isSuccess ? 'destructive' : 'outline'} 
                                                        className="h-11 px-8 rounded-xl font-black uppercase tracking-widest text-[10px]" 
                                                        onClick={() => setIsSuccess(false)}
                                                    >
                                                        <XCircle className="mr-2 h-4 w-4" /> FAILED / REVISE
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {viewingObservation.currentStage === 'Reference' && (
                                        <div className="p-16 border-2 border-dashed border-slate-200 rounded-[3rem] text-center space-y-6">
                                            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                                                <Archive className="h-10 w-10 text-blue-600" />
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Technical Archiving Stage</h3>
                                                <p className="text-sm text-slate-500 font-bold max-w-sm mx-auto leading-relaxed">Ensure all relevant evidence, training records, and revised SOPs are attached to the dossier before organizational sign-off.</p>
                                            </div>
                                        </div>
                                    )}

                                    {viewingObservation.currentStage === 'Closure' && (
                                        <div className="p-20 bg-emerald-600 rounded-[4rem] text-center space-y-8 shadow-2xl shadow-emerald-600/20 animate-in zoom-in-95 duration-500">
                                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto shadow-inner">
                                                <CheckCircle2 className="h-14 w-14 text-emerald-600" />
                                            </div>
                                            <div className="space-y-2 text-white">
                                                <h3 className="text-4xl font-black uppercase tracking-tighter">CAPA CYCLE COMPLETED</h3>
                                                <p className="text-emerald-50 text-xl font-bold opacity-80">This safety finding has been successfully closed and permanently archived.</p>
                                                <div className="pt-8 flex flex-col items-center gap-2">
                                                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-200">Final Sign-Off Timestamp</span>
                                                    <Badge className="bg-emerald-700 text-white font-mono text-xs px-4 py-1">{format(parseISO(viewingObservation.closedAt!), 'PPP p')}</Badge>
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">CAPA Registry</h1>
          <p className="text-slate-600 text-lg font-bold">Standardized tracking for Corrective and Preventive Actions.</p>
        </div>
        
        <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest h-14 px-10 rounded-2xl shadow-xl shadow-emerald-600/10 active:scale-95 transition-all">
              <Plus className="mr-3 h-5 w-5" /> REGISTER NEW FIND
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl bg-white border-slate-200 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900">Initiate CAPA Case</DialogTitle>
              <DialogDescription className="text-slate-500 font-bold">Record a new site observation to begin the organizational resolution cycle.</DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onReportSubmit)} className="space-y-6 py-6 text-left">
               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest ml-1">Category</Label>
                    <Controller
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="h-12 rounded-xl font-bold border-slate-200 shadow-sm">
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
                    <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest ml-1">Severity Assessment</Label>
                    <Controller
                      control={form.control}
                      name="severity"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="h-12 rounded-xl font-bold border-slate-200 shadow-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Low">Low</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                    <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest ml-1">Project Site</Label>
                    <Controller
                      control={form.control}
                      name="projectId"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="h-12 rounded-xl font-bold border-slate-200 shadow-sm">
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
                    <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest ml-1">Specific Location</Label>
                    <Input {...form.register('location')} className="h-12 rounded-xl font-bold border-slate-200 shadow-sm" placeholder="e.g., Tank 102 Bottom" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest ml-1">Observation Narrative</Label>
                  <Textarea {...form.register('description')} className="min-h-[140px] rounded-2xl p-5 font-bold border-slate-200 shadow-sm focus-visible:ring-emerald-500/20" placeholder="Record facts of the finding..." />
                </div>

                <DialogFooter className="pt-4 gap-4">
                  <Button variant="outline" type="button" onClick={() => setIsReportDialogOpen(false)} className="h-12 rounded-xl font-bold px-8 border-slate-200">Cancel</Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-black h-12 rounded-xl px-10 shadow-lg shadow-emerald-600/10 uppercase tracking-widest text-[10px]">Initiate Stream</Button>
                </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Open CAPAs" value={stats.openObservations} icon={TrendingUp} description={<span className="text-slate-600 font-bold uppercase text-[9px] tracking-widest">Active Lifecycles</span>} className="bg-white border-slate-200 rounded-3xl" />
        <StatCard title="Total LTIs" value={stats.totalLTIs} icon={AlertCircle} description={<span className="text-slate-600 font-bold uppercase text-[9px] tracking-widest">Past 12 Months</span>} className="bg-white border-slate-200 rounded-3xl" />
        <StatCard title="Audit Score" value={`${stats.avgAuditScore.toFixed(0)}%`} icon={FileCheck} description={<span className="text-slate-600 font-bold uppercase text-[9px] tracking-widest">Org Compliance</span>} className="bg-white border-slate-200 rounded-3xl" />
        <StatCard title="Officer Coverage" value={users.filter(u => u.role.includes('Safety')).length} icon={UserRound} description={<span className="text-slate-600 font-bold uppercase text-[9px] tracking-widest">On-Site Staff</span>} className="bg-white border-slate-200 rounded-3xl" />
      </div>

      {/* Modern High-Contrast Registry Table */}
      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden rounded-[2rem]">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-50/50">
            <div className="relative w-full max-w-lg">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input 
                    placeholder="Search registry by location, ID, or details..." 
                    className="pl-12 h-14 bg-white border-slate-200 rounded-2xl font-bold text-slate-900 focus-visible:ring-emerald-500/20 shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex gap-4 items-center">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">{filteredObservations.length} Indexed Cases</p>
            </div>
        </div>
        
        <div className="overflow-x-auto">
            <Table>
                <TableHeader className="bg-slate-50 border-b-2 border-slate-200">
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="w-24 font-black uppercase text-[10px] tracking-widest text-slate-900 text-center h-14 border-r border-slate-100">Case ID</TableHead>
                        <TableHead className="min-w-[320px] font-black uppercase text-[10px] tracking-widest text-slate-900 h-14 border-r border-slate-100 px-8">Safety Observation Summary</TableHead>
                        <TableHead className="w-44 font-black uppercase text-[10px] tracking-widest text-slate-900 h-14 border-r border-slate-100 text-center">Category</TableHead>
                        <TableHead className="w-40 font-black uppercase text-[10px] tracking-widest text-slate-900 h-14 border-r border-slate-100 text-center">Severity</TableHead>
                        <TableHead className="w-64 font-black uppercase text-[10px] tracking-widest text-slate-900 h-14 border-r border-slate-100 px-8">Active Stage</TableHead>
                        <TableHead className="w-40 font-black uppercase text-[10px] tracking-widest text-slate-900 h-14 border-r border-slate-100 text-center">Status</TableHead>
                        <TableHead className="w-28 text-right font-black uppercase text-[10px] tracking-widest text-slate-900 h-14 px-8">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredObservations.map((obs) => {
                        const site = projects.find(p => p.id === obs.projectId);
                        const currentStage = stageConfig[obs.currentStage];
                        const owner = users.find(u => u.id === obs.actionOwnerId);

                        return (
                            <TableRow key={obs.id} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                                <TableCell className="text-center font-mono text-[10px] font-black text-slate-500 border-r border-slate-50 bg-slate-50/20">{obs.id.slice(-5).toUpperCase()}</TableCell>
                                <TableCell className="border-r border-slate-50 px-8 py-6 text-left">
                                    <div className="flex flex-col gap-1.5">
                                        <p className="font-black text-slate-900 text-sm leading-tight uppercase tracking-tight group-hover:text-blue-700 transition-colors">{obs.description}</p>
                                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <MapPin className="h-3 w-3 text-blue-600" /> {site?.name} &middot; {obs.location}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center border-r border-slate-50">
                                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tight h-6 px-4 bg-white border-slate-200">
                                        {obs.category}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-center border-r border-slate-50">
                                    <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest h-6 px-4 border-2", severityColors[obs.severity])}>
                                        {obs.severity}
                                    </Badge>
                                </TableCell>
                                <TableCell className="border-r border-slate-50 px-8 text-left">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("p-1.5 rounded-lg", currentStage.badge)}>
                                                {React.createElement(currentStage.icon, { className: "h-3.5 w-3.5" })}
                                            </div>
                                            <span className="font-black text-[10px] uppercase tracking-tight text-slate-800">{currentStage.label}</span>
                                        </div>
                                        {owner && <p className="text-[9px] font-bold text-slate-400 uppercase ml-9 tracking-wide">Owner: {owner.name}</p>}
                                    </div>
                                </TableCell>
                                <TableCell className="text-center border-r border-slate-50">
                                    <Badge className={cn(
                                        "text-[9px] font-black uppercase px-4 h-6 border-2", 
                                        obs.status === 'Open' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-700 border-slate-200'
                                    )}>
                                        {obs.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right px-8">
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest border-slate-200 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                                        onClick={() => setViewingObservation(obs)}
                                    >
                                        OPEN CASE <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
        
        {filteredObservations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-40 opacity-20 text-center">
                <Inbox className="h-20 w-20 mb-6" />
                <p className="font-black uppercase tracking-[0.4em] text-lg">Empty Registry</p>
            </div>
        )}
      </Card>
    </div>
  );
}
