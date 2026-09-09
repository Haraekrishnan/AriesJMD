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
  ArrowRight, Lock, FileSearch, Archive, ChevronLeft
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
  'Closure': { label: 'Closure', icon: Lock, color: 'text-slate-500', badge: 'bg-slate-100 text-slate-700' },
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
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-6">
                    <Button variant="ghost" onClick={() => setViewingObservation(null)} className="h-10 w-10 p-0 rounded-full">
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <Badge variant="outline" className={cn("font-black text-[10px] tracking-widest uppercase border-2", severityColors[viewingObservation.severity])}>
                                {viewingObservation.severity} SEVERITY
                            </Badge>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">CASE ID: {viewingObservation.id.slice(-8).toUpperCase()}</span>
                        </div>
                        <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">{viewingObservation.description}</h1>
                    </div>
                </div>
                <div className="flex gap-4">
                    <Badge className={cn("h-10 px-6 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2", stageConfig[viewingObservation.currentStage].badge)}>
                        <Clock className="h-4 w-4" /> Current Stage: {viewingObservation.currentStage}
                    </Badge>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
                {/* Stepper Header */}
                <div className="p-10 pb-10 bg-slate-50 border-b border-slate-200">
                    <div className="flex items-center justify-between gap-4 max-w-5xl mx-auto">
                        {Object.entries(stageConfig).map(([key, config], idx) => {
                            const stageKey = key as CapaStage;
                            const stages = Object.keys(stageConfig) as CapaStage[];
                            const currentIndex = stages.indexOf(viewingObservation.currentStage);
                            const isCompleted = idx < currentIndex;
                            const isActive = stageKey === viewingObservation.currentStage;
                            
                            return (
                                <React.Fragment key={key}>
                                <div className="flex flex-col items-center gap-3 relative group">
                                    <div className={cn(
                                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 border-2",
                                    isCompleted ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-600/20" :
                                    isActive ? "bg-white border-blue-600 text-blue-600 shadow-lg shadow-blue-600/10 scale-110" :
                                    "bg-slate-100 border-slate-200 text-slate-400"
                                    )}>
                                    {isCompleted ? <CheckCircle2 className="h-7 w-7" /> : <config.icon className="h-7 w-7" />}
                                    </div>
                                    <span className={cn(
                                    "text-[10px] font-black uppercase tracking-widest text-center",
                                    isActive ? "text-blue-600" : isCompleted ? "text-emerald-600" : "text-slate-400"
                                    )}>{config.label}</span>
                                </div>
                                {idx < 6 && (
                                    <div className={cn(
                                    "flex-1 h-1 rounded-full mx-2",
                                    idx < currentIndex ? "bg-emerald-600" : "bg-slate-200"
                                    )} />
                                )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                <div className="p-10 flex-1 overflow-y-auto">
                    <div className="max-w-4xl mx-auto space-y-16 pb-20">
                        {/* INITIATION SECTION */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-1.5 h-8 bg-emerald-600 rounded-full" />
                                <h4 className="text-xl font-black uppercase tracking-tight text-slate-900">Stage 1: Initiation Details</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 p-10 bg-slate-50 rounded-[2.5rem] border border-slate-200">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Findings Statement</Label>
                                    <p className="text-xl font-bold leading-relaxed text-slate-800 italic">"{viewingObservation.description}"</p>
                                </div>
                                <div className="space-y-6">
                                    <div className="flex justify-between border-b border-slate-200 pb-3">
                                        <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Reported By</span>
                                        <span className="text-xs font-black text-slate-900">{users.find(u => u.id === viewingObservation.reporterId)?.name}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-200 pb-3">
                                        <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Location</span>
                                        <span className="text-xs font-black text-slate-900">{projects.find(p => p.id === viewingObservation.projectId)?.name} &middot; {viewingObservation.location}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-200 pb-3">
                                        <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Reported At</span>
                                        <span className="text-xs font-black text-slate-900">{format(parseISO(viewingObservation.createdAt), 'PPP p')}</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* RESOLUTION SECTION */}
                        {['Resolution', 'Investigation', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'].includes(viewingObservation.currentStage) && (
                            <section className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-1.5 h-8 bg-emerald-600 rounded-full" />
                                    <h4 className="text-xl font-black uppercase tracking-tight text-slate-900">Stage 2: Immediate Correction</h4>
                                </div>
                                {viewingObservation.currentStage === 'Resolution' ? (
                                    <div className="p-10 bg-slate-50 rounded-[2.5rem] border border-slate-200 space-y-6 shadow-inner">
                                        <Label className="text-sm font-black text-slate-700 uppercase tracking-widest">Correction Action (Immediate):</Label>
                                        <Textarea 
                                            className="bg-white border-slate-200 min-h-[150px] rounded-3xl p-6 text-lg font-bold shadow-sm focus-visible:ring-emerald-600/20" 
                                            placeholder="e.g., Area cordoned off, spill contained using sawdust..."
                                            value={actionPlan}
                                            onChange={(e) => setActionPlan(e.target.value)}
                                        />
                                    </div>
                                ) : (
                                    <div className="p-10 bg-white border-2 border-emerald-600/10 rounded-[2.5rem] shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 bg-emerald-600 text-white rounded-bl-3xl">
                                            <CheckCircle2 className="h-5 w-5" />
                                        </div>
                                        <p className="text-lg font-bold text-slate-800 leading-relaxed">{viewingObservation.immediateActionTaken}</p>
                                        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            <ShieldCheck className="h-4 w-4 text-emerald-600" /> CORRECTION VERIFIED BY EHS OFFICIAL
                                        </div>
                                    </div>
                                )}
                            </section>
                        )}

                        {/* INVESTIGATION SECTION */}
                        {['Investigation', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'].includes(viewingObservation.currentStage) && (
                            <section className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-1.5 h-8 bg-emerald-600 rounded-full" />
                                    <h4 className="text-xl font-black uppercase tracking-tight text-slate-900">Stage 3: Root Cause Analysis (5-Whys)</h4>
                                </div>
                                {viewingObservation.currentStage === 'Investigation' ? (
                                    <div className="space-y-6 p-10 bg-slate-50 rounded-[2.5rem] border border-slate-200">
                                        {rcaWhys.map((why, i) => (
                                        <div key={i} className="flex gap-6 items-center">
                                            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shrink-0 text-sm font-black text-slate-900 border border-slate-200 shadow-sm">WHY {i+1}</div>
                                            <Input 
                                                className="bg-white border-slate-200 h-12 rounded-2xl text-base font-bold px-4 focus-visible:ring-emerald-600/20"
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
                                        <Separator className="bg-slate-200 my-8" />
                                        <Label className="text-emerald-600 font-black uppercase tracking-[0.2em] text-[10px] ml-4">Consolidated Root Cause Findings</Label>
                                        <Textarea 
                                            className="bg-white border-slate-200 rounded-3xl mt-3 p-6 text-lg font-bold min-h-[120px] shadow-sm" 
                                            placeholder="The fundamental cause discovered..." 
                                            value={finalRootCause}
                                            onChange={(e) => setFinalRootCause(e.target.value)}
                                        />
                                    </div>
                                ) : (
                                    <div className="p-10 bg-white border border-slate-200 rounded-[2.5rem] space-y-6 shadow-sm">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {viewingObservation.rootCauseAnalysis?.whys.filter(w => w.trim()).map((why, i) => (
                                            <div key={i} className="flex items-center gap-4 text-sm text-slate-700 font-bold p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                                <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-[10px] font-black shrink-0 text-slate-900 border border-slate-200">{i+1}</div>
                                                {why}
                                            </div>
                                        ))}
                                        </div>
                                        <div className="p-8 bg-emerald-50 border-2 border-emerald-100 rounded-3xl mt-4">
                                            <p className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                                <Target className="h-4 w-4" /> Final RCA Conclusion
                                            </p>
                                            <p className="text-xl font-black text-slate-900 uppercase tracking-tight leading-tight">
                                                {viewingObservation.rootCauseAnalysis?.finalRootCause}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </section>
                        )}

                        {/* IMPLEMENTATION SECTION */}
                        {['Implementation', 'Effectiveness Review', 'Reference', 'Closure'].includes(viewingObservation.currentStage) && (
                            <section className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-1.5 h-8 bg-blue-600 rounded-full" />
                                    <h4 className="text-xl font-black uppercase tracking-tight text-slate-900">Stage 4: CAPA Implementation Plan</h4>
                                </div>
                                {viewingObservation.currentStage === 'Implementation' ? (
                                    <div className="space-y-8 p-10 bg-slate-50 rounded-[2.5rem] border border-slate-200 shadow-inner">
                                        <div className="space-y-3">
                                            <Label className="text-sm font-black text-slate-700 uppercase tracking-widest">Long-Term Preventive Action Strategy:</Label>
                                            <Textarea 
                                                className="bg-white border-slate-200 min-h-[150px] rounded-3xl p-6 text-lg font-bold shadow-sm" 
                                                placeholder="Define structural changes to prevent recurrence..."
                                                value={actionPlan}
                                                onChange={(e) => setActionPlan(e.target.value)}
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-4">Action Owner</Label>
                                                <Select onValueChange={setActionOwnerId} value={actionOwnerId}>
                                                    <SelectTrigger className="bg-white border-slate-200 h-14 rounded-2xl font-bold shadow-sm px-6">
                                                        <SelectValue placeholder="Select responsible personnel" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-4">Compliance Target Date</Label>
                                                <Input type="date" className="bg-white border-slate-200 h-14 rounded-2xl font-bold shadow-sm px-6" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <div className="md:col-span-2 p-10 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm">
                                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4">Strategic Preventive Measures</p>
                                            <p className="text-lg font-bold leading-relaxed text-slate-800">{viewingObservation.correctiveActionPlan}</p>
                                        </div>
                                        <div className="p-10 bg-slate-50 border border-slate-200 rounded-[2.5rem] space-y-8 flex flex-col justify-center">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Stage Owner</p>
                                                <p className="text-base font-black text-slate-900 truncate">{users.find(u => u.id === viewingObservation.actionOwnerId)?.name || 'UNASSIGNED'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Completion Target</p>
                                                <p className="text-base font-black text-slate-900">{viewingObservation.dueDate ? format(parseISO(viewingObservation.dueDate), 'dd MMM yyyy') : 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </section>
                        )}

                        {/* EFFECTIVENESS REVIEW SECTION */}
                        {['Effectiveness Review', 'Reference', 'Closure'].includes(viewingObservation.currentStage) && (
                            <section className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-1.5 h-8 bg-indigo-600 rounded-full" />
                                    <h4 className="text-xl font-black uppercase tracking-tight text-slate-900">Stage 5: Effectiveness Review</h4>
                                </div>
                                {viewingObservation.currentStage === 'Effectiveness Review' ? (
                                    <div className="space-y-8 p-10 bg-slate-50 rounded-[2.5rem] border border-slate-200">
                                        <div className="space-y-3">
                                            <Label className="text-sm font-black text-slate-700 uppercase tracking-widest">Verification Result & Validation Evidence:</Label>
                                            <Textarea 
                                                className="bg-white border-slate-200 min-h-[150px] rounded-3xl p-6 text-lg font-bold shadow-sm" 
                                                placeholder="Provide technical evidence of hazard elimination..."
                                                value={verificationResult}
                                                onChange={(e) => setVerificationResult(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
                                            <Label className="text-sm font-black text-slate-900 uppercase tracking-widest">Validated Outcome:</Label>
                                            <div className="flex gap-3">
                                                <Button 
                                                    variant={isSuccess ? 'default' : 'outline'} 
                                                    className={cn("h-11 px-8 rounded-xl font-black uppercase tracking-widest text-[10px]", isSuccess ? "bg-emerald-600 hover:bg-emerald-700" : "bg-white")} 
                                                    onClick={() => setIsSuccess(true)}
                                                >
                                                    Success / Pass
                                                </Button>
                                                <Button 
                                                    variant={!isSuccess ? 'destructive' : 'outline'} 
                                                    className="h-11 px-8 rounded-xl font-black uppercase tracking-widest text-[10px]" 
                                                    onClick={() => setIsSuccess(false)}
                                                >
                                                    Fail / Revise
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-10 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm">
                                        <div className="flex justify-between items-start mb-10">
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Technical Validation Log</p>
                                                <p className="text-lg font-bold leading-relaxed text-slate-800">{viewingObservation.effectivenessVerification?.result}</p>
                                            </div>
                                            <Badge className={cn("h-10 px-8 rounded-xl font-black uppercase tracking-widest", viewingObservation.effectivenessVerification?.successful ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-200' : 'bg-rose-100 text-rose-700 border-2 border-rose-200')}>
                                                {viewingObservation.effectivenessVerification?.successful ? 'VALIDATED: PASSED' : 'REVISION REQUIRED'}
                                            </Badge>
                                        </div>
                                        <div className="pt-6 border-t border-slate-100 flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                            <Avatar className="h-8 w-8 border-2 border-slate-200">
                                                <AvatarImage src={users.find(u => u.id === viewingObservation.effectivenessVerification?.verifiedBy)?.avatar} />
                                                <AvatarFallback>{users.find(u => u.id === viewingObservation.effectivenessVerification?.verifiedBy)?.name?.[0]}</AvatarFallback>
                                            </Avatar>
                                            Verified By: <span className="text-slate-900">{users.find(u => u.id === viewingObservation.effectivenessVerification?.verifiedBy)?.name}</span> &middot; {format(parseISO(viewingObservation.effectivenessVerification!.verificationDate), 'PPP')}
                                        </div>
                                    </div>
                                )}
                            </section>
                        )}

                        {/* REFERENCE SECTION */}
                        {['Reference', 'Closure'].includes(viewingObservation.currentStage) && (
                            <section className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-1.5 h-8 bg-blue-600 rounded-full" />
                                    <h4 className="text-xl font-black uppercase tracking-tight text-slate-900">Stage 6: Final Documentation & Archiving</h4>
                                </div>
                                <div className="p-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] text-center">
                                    <Archive className="h-16 w-16 text-slate-300 mx-auto mb-6" />
                                    <p className="text-lg font-black text-slate-900 uppercase tracking-widest">Ready for Organizational Archive</p>
                                    <p className="text-sm text-slate-500 mt-2 font-medium">All technical evidence, method statements, and training records have been linked.</p>
                                </div>
                            </section>
                        )}

                        {/* CLOSURE SECTION */}
                        {viewingObservation.currentStage === 'Closure' && (
                            <section className="animate-in zoom-in-95 duration-700">
                                <div className="p-16 bg-emerald-600 rounded-[4rem] text-center space-y-8 shadow-2xl shadow-emerald-600/30">
                                    <div className="w-24 h-24 rounded-full bg-white mx-auto flex items-center justify-center shadow-inner">
                                        <CheckCircle2 className="h-14 w-14 text-emerald-600" />
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-4xl font-black uppercase tracking-tighter text-white">CAPA Lifecycle Completed</h4>
                                        <p className="text-emerald-50 text-xl font-bold">The safety risk has been structurally mitigated and the case is closed.</p>
                                        <p className="text-[10px] text-emerald-200 font-black uppercase tracking-[0.4em] pt-6">FINAL SIGN-OFF: {format(parseISO(viewingObservation.closedAt!), 'PPP p')}</p>
                                    </div>
                                </div>
                            </section>
                        )}
                    </div>
                </div>

                {/* Sticky Footer Actions */}
                <div className="p-8 border-t border-slate-200 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.03)] flex justify-between items-center px-12">
                    <div className="flex gap-4">
                        {viewingObservation.currentStage !== 'Closure' && (user?.role === 'Admin' || user?.role === 'Senior Safety Supervisor') && (
                            <Button 
                                className="bg-blue-600 hover:bg-blue-700 text-white h-14 rounded-2xl px-12 font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-blue-600/20 active:scale-95 transition-all"
                                onClick={handleNextStage}
                            >
                                {nextStageLabel} <ArrowRight className="ml-3 h-5 w-5" />
                            </Button>
                        )}
                    </div>
                    <Button variant="ghost" className="text-slate-400 hover:text-slate-900 font-black uppercase tracking-widest text-[10px]" onClick={() => setViewingObservation(null)}>
                        Exit Detailed Management View
                    </Button>
                </div>
            </div>
        </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">CAPA Management Registry</h1>
          <p className="text-slate-600 text-lg mt-1 font-medium">Structured lifecycle tracking of safety observations and corrective actions.</p>
        </div>
        
        <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest h-14 px-10 rounded-2xl shadow-xl shadow-emerald-600/10">
              <Plus className="mr-3 h-5 w-5" /> Register New Find
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900">Initiate CAPA Case</DialogTitle>
              <DialogDescription className="text-slate-500 font-medium">Register an initial safety finding to begin the corrective action lifecycle.</DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onReportSubmit)} className="space-y-6 py-6">
               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest">Category</Label>
                    <Controller
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="h-12 rounded-xl font-bold">
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
                    <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest">Initial Severity</Label>
                    <Controller
                      control={form.control}
                      name="severity"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="h-12 rounded-xl font-bold">
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
                    <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest">Site / Project</Label>
                    <Controller
                      control={form.control}
                      name="projectId"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="h-12 rounded-xl font-bold">
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
                    <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest">Specific Location</Label>
                    <Input {...form.register('location')} className="h-12 rounded-xl font-bold" placeholder="e.g., Workshop B" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest">Observation Description</Label>
                  <Textarea {...form.register('description')} className="min-h-[120px] rounded-2xl p-4 font-bold" placeholder="Factual details of the unsafe condition or act..." />
                </div>

                <DialogFooter className="pt-4 gap-4">
                  <Button variant="outline" type="button" onClick={() => setIsReportDialogOpen(false)} className="h-12 rounded-xl font-bold px-8">Cancel</Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-black h-12 rounded-xl px-10 shadow-lg shadow-emerald-600/10">Start CAPA Stream</Button>
                </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Open CAPAs" value={stats.openObservations} icon={TrendingUp} description="Active Lifecycles" className="bg-white border-slate-200" />
        <StatCard title="Total LTIs" value={stats.totalLTIs} icon={AlertCircle} description="Past 12 Months" className="bg-white border-slate-200" />
        <StatCard title="Audit Score" value={`${stats.avgAuditScore.toFixed(0)}%`} icon={FileCheck} description="Org Compliance" className="bg-white border-slate-200" />
        <StatCard title="Training Hrs" value={stats.trainingHours} icon={Users} description="Staff Competency" className="bg-white border-slate-200" />
      </div>

      {/* Excel-like Table View */}
      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden rounded-2xl">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                    placeholder="Quick search registry..." 
                    className="pl-10 h-11 bg-white border-slate-200 rounded-xl font-medium focus-visible:ring-emerald-600/20 shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex gap-2">
                <Badge variant="outline" className="h-9 px-4 font-black uppercase text-[10px] tracking-widest border-2 bg-white">
                    TOTAL RECORDS: {filteredObservations.length}
                </Badge>
            </div>
        </div>
        
        <div className="overflow-x-auto">
            <Table>
                <TableHeader className="bg-slate-100/50 border-b-2 border-slate-200">
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="w-20 font-black uppercase text-[10px] tracking-widest text-slate-600 text-center h-12 border-r">ID</TableHead>
                        <TableHead className="min-w-[280px] font-black uppercase text-[10px] tracking-widest text-slate-600 h-12 border-r px-6">Observation Details</TableHead>
                        <TableHead className="w-40 font-black uppercase text-[10px] tracking-widest text-slate-600 h-12 border-r text-center">Category</TableHead>
                        <TableHead className="w-36 font-black uppercase text-[10px] tracking-widest text-slate-600 h-12 border-r text-center">Severity</TableHead>
                        <TableHead className="w-56 font-black uppercase text-[10px] tracking-widest text-slate-600 h-12 border-r px-6">Lifecycle Stage</TableHead>
                        <TableHead className="w-40 font-black uppercase text-[10px] tracking-widest text-slate-600 h-12 border-r text-center">Status</TableHead>
                        <TableHead className="w-24 text-right font-black uppercase text-[10px] tracking-widest text-slate-600 h-12 px-6">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredObservations.map((obs) => {
                        const site = projects.find(p => p.id === obs.projectId);
                        const currentStage = stageConfig[obs.currentStage];
                        const owner = users.find(u => u.id === obs.actionOwnerId);

                        return (
                            <TableRow key={obs.id} className="group hover:bg-slate-50 transition-colors border-b border-slate-100">
                                <TableCell className="text-center font-mono text-[10px] font-black text-slate-400 border-r">{obs.id.slice(-5).toUpperCase()}</TableCell>
                                <TableCell className="border-r px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        <p className="font-bold text-slate-900 leading-tight group-hover:text-emerald-600 transition-colors">{obs.description}</p>
                                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <MapPin className="h-3 w-3" /> {site?.name} &middot; {obs.location}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center border-r">
                                    <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-tight h-5">
                                        {obs.category}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-center border-r">
                                    <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest h-5 px-3 border-2", severityColors[obs.severity])}>
                                        {obs.severity}
                                    </Badge>
                                </TableCell>
                                <TableCell className="border-r px-6">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <currentStage.icon className={cn("h-3.5 w-3.5", currentStage.color)} />
                                            <span className="font-black text-[10px] uppercase tracking-tight text-slate-700">{currentStage.label}</span>
                                        </div>
                                        {owner && <p className="text-[9px] font-bold text-slate-400 uppercase">Owner: {owner.name}</p>}
                                    </div>
                                </TableCell>
                                <TableCell className="text-center border-r">
                                    <Badge className={cn("text-[9px] font-black uppercase px-3 h-5", obs.status === 'Open' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                                        {obs.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right px-6">
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 w-8 p-0 rounded-full hover:bg-emerald-50 hover:text-emerald-600"
                                        onClick={() => setViewingObservation(obs)}
                                    >
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
        
        {filteredObservations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 opacity-20">
                <Inbox className="h-16 w-16 mb-4" />
                <p className="font-black uppercase tracking-[0.2em] text-sm">No Registry Entries Found</p>
            </div>
        )}
      </Card>
    </div>
  );
}
