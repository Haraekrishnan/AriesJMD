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
import { format, parseISO, isValid } from 'date-fns';
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
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import type { EhsObservationStatus, EhsObservationSeverity, EhsObservation, CapaStage } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const severityConfig: Record<EhsObservationSeverity, { bg: string, text: string, border: string }> = {
  'Low': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Medium': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'High': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  'Critical': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
};

const stageConfig: Record<CapaStage, { label: string, icon: any, color: string, badge: string, description: string }> = {
  'Initiation': { label: 'Initiation', icon: Plus, color: 'text-slate-600', badge: 'bg-slate-100 text-slate-700', description: 'Initial recording of the site observation.' },
  'Resolution': { label: 'Resolution', icon: FileCheck, color: 'text-emerald-600', badge: 'bg-emerald-50 text-emerald-700', description: 'Immediate correction and containment actions.' },
  'Investigation': { label: 'Investigation', icon: Search, color: 'text-blue-600', badge: 'bg-blue-50 text-blue-700', description: 'Root cause analysis using 5-Whys methodology.' },
  'Implementation': { label: 'Implementation', icon: Target, color: 'text-indigo-600', badge: 'bg-indigo-50 text-indigo-700', description: 'Long-term preventive action deployment.' },
  'Effectiveness Review': { label: 'Effectiveness Review', icon: CheckCircle, color: 'text-amber-600', badge: 'bg-amber-50 text-amber-700', description: 'Validation that actions prevented recurrence.' },
  'Reference': { label: 'Reference', icon: FileSearch, color: 'text-slate-600', badge: 'bg-slate-50 text-slate-700', description: 'Technical archiving of documentation.' },
  'Closure': { label: 'Closure', icon: Lock, color: 'text-slate-900', badge: 'bg-slate-900 text-white', description: 'Final organizational sign-off and closure.' },
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
  
  const [activeViewStage, setActiveViewStage] = useState<CapaStage | null>(null);

  const [rcaWhys, setRcaWhys] = useState<string[]>(['', '', '', '', '']);
  const [finalRootCause, setFinalRootCause] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [actionOwnerId, setActionOwnerId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [verificationResult, setVerificationResult] = useState('');
  const [isSuccess, setIsSuccess] = useState(true);

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
    setActiveViewStage(targetStage);
  };

  const nextStageLabel = useMemo(() => {
    if (!viewingObservation) return '';
    const stages = Object.keys(stageConfig) as CapaStage[];
    const currentIndex = stages.indexOf(viewingObservation.currentStage);
    const next = stages[currentIndex + 1];
    return next ? `PROCEED TO ${next.toUpperCase()}` : 'CLOSE CAPA CYCLE';
  }, [viewingObservation]);

  if (viewingObservation && activeViewStage) {
    const activeStageIdx = Object.keys(stageConfig).indexOf(viewingObservation.currentStage);
    const reporter = users.find(u => u.id === viewingObservation.reporterId);
    const site = projects.find(p => p.id === viewingObservation.projectId);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Action Bar */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => setViewingObservation(null)} className="h-10 w-10 p-0 rounded-lg hover:bg-slate-100">
                        <ChevronLeft className="h-5 w-5 text-slate-600" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                CASE ID: {viewingObservation.id.slice(-8).toUpperCase()}
                            </span>
                            <Badge variant="outline" className={cn("text-[9px] font-bold h-4 px-2 uppercase border-2", severityConfig[viewingObservation.severity].border, severityConfig[viewingObservation.severity].text)}>
                                {viewingObservation.severity}
                            </Badge>
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">{viewingObservation.description}</h1>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="font-bold text-xs">
                        <Download className="mr-2 h-4 w-4" /> PDF Report
                    </Button>
                    <Badge className={cn("h-8 px-4 rounded-lg font-bold uppercase text-[10px] tracking-widest", stageConfig[viewingObservation.currentStage].badge)}>
                        {viewingObservation.currentStage}
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[340px,1fr] gap-6 items-start">
                {/* Left Sidebar: Dossier & Nav */}
                <div className="space-y-6">
                    <Card className="rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b p-4">
                            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2">
                                <FileText className="h-3.5 w-3.5 text-slate-500" /> Finding Dossier
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-6 bg-white text-left">
                            <div className="space-y-1.5">
                                <Label className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">Initial Finding</Label>
                                <p className="text-sm font-semibold text-slate-800 leading-snug border-l-2 border-slate-200 pl-3">"{viewingObservation.description}"</p>
                            </div>
                            <div className="grid grid-cols-1 gap-4 pt-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Reporter</span>
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6 border">
                                            <AvatarImage src={reporter?.avatar} />
                                            <AvatarFallback className="text-[10px] font-bold bg-slate-50">{reporter?.name?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs font-bold text-slate-900">{reporter?.name}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Site Location</span>
                                    <span className="text-xs font-bold text-slate-900">{site?.name} &middot; {viewingObservation.location}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Logged On</span>
                                    <span className="text-xs font-bold text-slate-900">{format(parseISO(viewingObservation.createdAt), 'dd MMM yyyy, p')}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-xl border border-slate-200 shadow-sm bg-white text-left">
                        <CardHeader className="p-4 pb-2 border-b bg-slate-50">
                            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-900">CAPA Lifecycle Progress</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3">
                            <nav className="space-y-1">
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
                                                "w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all group",
                                                isCurrentView ? "bg-slate-900 border-slate-900 shadow-sm text-white" : "bg-white border-transparent hover:bg-slate-50",
                                                isLocked && "opacity-40 grayscale cursor-not-allowed"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-6 h-6 rounded-md flex items-center justify-center border shrink-0 transition-colors",
                                                isDone ? "bg-emerald-500 border-emerald-500 text-white" :
                                                isActive ? "bg-white border-blue-600 text-blue-600" :
                                                "border-slate-200 text-slate-400",
                                                isCurrentView && "bg-white border-white text-slate-900"
                                            )}>
                                                {isDone ? <Check className="h-3.5 w-3.5" /> : <span className="text-[9px] font-bold">{idx + 1}</span>}
                                            </div>
                                            <div className="text-left flex-1 min-w-0">
                                                <span className={cn(
                                                    "block text-[10px] font-bold uppercase tracking-widest",
                                                    isCurrentView ? "text-white" : isDone ? "text-emerald-600" : isActive ? "text-blue-600" : "text-slate-400"
                                                )}>{config.label}</span>
                                            </div>
                                        </button>
                                    )
                                })}
                            </nav>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Workspace: Active Stage Content */}
                <div className="space-y-6">
                    <Card className="rounded-xl border border-slate-200 shadow-sm min-h-[600px] flex flex-col bg-white text-left">
                        <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-lg shadow-sm border">
                                    {React.createElement(stageConfig[activeViewStage].icon, { className: "h-6 w-6 text-blue-600" })}
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900 tracking-tight">{activeViewStage}</p>
                                    <p className="text-xs text-slate-500 font-medium">{stageConfig[activeViewStage].description}</p>
                                </div>
                            </div>
                            
                            {(user?.role === 'Admin' || user?.role === 'Senior Safety Supervisor') && 
                             activeViewStage === viewingObservation.currentStage && 
                             viewingObservation.status !== 'Closed' && (
                                <Button 
                                    className="bg-blue-600 hover:bg-blue-700 text-white h-11 rounded-lg px-8 font-bold uppercase tracking-wider text-[10px] shadow-md shadow-blue-600/10 active:scale-95 transition-all"
                                    onClick={handleNextStage}
                                >
                                    {nextStageLabel} <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            )}

                            {activeViewStage !== viewingObservation.currentStage && (
                                <Badge variant="secondary" className="h-8 px-4 font-bold text-[9px] uppercase tracking-widest rounded-lg border-2">
                                    ARCHIVE VIEW
                                </Badge>
                            )}
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-8">
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    {activeViewStage === 'Initiation' && (
                                        <div className="space-y-8">
                                            <div className="p-6 border rounded-xl bg-slate-50/50">
                                                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 mb-4">Original Site Report</h3>
                                                <div className="grid grid-cols-2 gap-8">
                                                    <div className="space-y-1">
                                                        <Label className="text-[9px] font-bold uppercase text-slate-400">Risk Severity</Label>
                                                        <Badge variant="outline" className={cn("font-bold text-[10px] border-2", severityConfig[viewingObservation.severity].border, severityConfig[viewingObservation.severity].text)}>
                                                            {viewingObservation.severity}
                                                        </Badge>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[9px] font-bold uppercase text-slate-400">Finding Category</Label>
                                                        <p className="text-xs font-bold text-slate-900">{viewingObservation.category}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeViewStage === 'Resolution' && (
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest ml-1">Documented Correction Action</Label>
                                                <Textarea 
                                                    className="min-h-[140px] rounded-xl p-4 text-sm font-bold text-slate-900 border-2 border-slate-100 focus-visible:ring-emerald-500/20 bg-slate-50/50" 
                                                    placeholder="Specify the exact steps taken to contain the hazard immediately..."
                                                    value={actionPlan}
                                                    onChange={(e) => setActionPlan(e.target.value)}
                                                    disabled={activeViewStage !== viewingObservation.currentStage}
                                                />
                                            </div>
                                            <Alert className="bg-emerald-50 border-emerald-100 rounded-xl py-4">
                                                <AlertCircle className="h-4 w-4 text-emerald-600" />
                                                <AlertTitle className="text-[9px] font-bold uppercase text-emerald-900 tracking-widest">Correction Standards</AlertTitle>
                                                <AlertDescription className="text-xs text-emerald-800 font-bold mt-0.5">Immediate actions should resolve the instant danger while the root cause investigation is pending.</AlertDescription>
                                            </Alert>
                                        </div>
                                    )}

                                    {activeViewStage === 'Investigation' && (
                                        <div className="space-y-8">
                                            <div className="flex items-center gap-2 mb-4 bg-slate-900 text-white px-3 py-1.5 rounded-lg w-fit">
                                                <Zap className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                                                <span className="font-bold text-[9px] uppercase tracking-widest">5-Whys Root Cause Analysis</span>
                                            </div>
                                            <div className="space-y-4">
                                                {rcaWhys.map((why, i) => (
                                                    <div key={i} className="flex gap-4 items-center">
                                                        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex flex-col items-center justify-center shrink-0">
                                                            <span className="text-[10px] font-bold text-slate-900">0{i+1}</span>
                                                        </div>
                                                        <Input 
                                                            className="h-10 rounded-lg text-sm font-bold text-slate-900 border-2 border-slate-50 bg-white focus-visible:ring-blue-600/20"
                                                            placeholder={`Ask why did the level ${i} failure occur?`}
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
                                            <div className="mt-8 pt-6 border-t border-slate-100">
                                                <Label className="text-[10px] font-bold uppercase text-rose-600 tracking-widest ml-1">Root Cause Identification</Label>
                                                <Textarea 
                                                    className="mt-2 min-h-[100px] rounded-xl p-4 text-lg font-bold text-slate-900 border-2 border-rose-500/10 bg-rose-50/20" 
                                                    placeholder="Synthesize the findings into a single core failure..." 
                                                    value={finalRootCause}
                                                    onChange={(e) => setFinalRootCause(e.target.value)}
                                                    disabled={activeViewStage !== viewingObservation.currentStage}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {activeViewStage === 'Implementation' && (
                                        <div className="space-y-8">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest ml-1">Long-Term Preventive Strategy</Label>
                                                <Textarea 
                                                    className="min-h-[180px] rounded-xl p-6 text-sm font-bold text-slate-900 border-2 border-blue-50 bg-slate-50/30" 
                                                    placeholder="Define systemic organizational changes to ensure this specific failure never recurs..."
                                                    value={actionPlan}
                                                    onChange={(e) => setActionPlan(e.target.value)}
                                                    disabled={activeViewStage !== viewingObservation.currentStage}
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <Label className="text-[9px] font-bold uppercase text-slate-400 tracking-widest ml-1">Action Owner</Label>
                                                    <Select onValueChange={setActionOwnerId} value={actionOwnerId} disabled={activeViewStage !== viewingObservation.currentStage}>
                                                        <SelectTrigger className="h-10 rounded-lg font-bold text-slate-900 border-2 border-slate-50 bg-white">
                                                            <SelectValue placeholder="Select stage manager" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[9px] font-bold uppercase text-slate-400 tracking-widest ml-1">Target Date</Label>
                                                    <Input 
                                                        type="date" 
                                                        className="h-10 rounded-lg font-bold text-slate-900 border-2 border-slate-50 bg-white" 
                                                        value={dueDate} 
                                                        onChange={e => setDueDate(e.target.value)} 
                                                        disabled={activeViewStage !== viewingObservation.currentStage}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeViewStage === 'Effectiveness Review' && (
                                        <div className="space-y-8">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest ml-1">Validation Audit Evidence</Label>
                                                <Textarea 
                                                    className="min-h-[140px] rounded-xl p-6 text-sm font-bold text-slate-900 border-2 border-slate-100 bg-slate-50/20" 
                                                    placeholder="Document objective evidence that the preventive action is functioning as designed..."
                                                    value={verificationResult}
                                                    onChange={(e) => setVerificationResult(e.target.value)}
                                                    disabled={activeViewStage !== viewingObservation.currentStage}
                                                />
                                            </div>
                                            <div className="p-6 bg-slate-900 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
                                                <div className="text-center md:text-left">
                                                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Final Verification Verdict</h4>
                                                    <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">Has the risk been mitigated?</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button 
                                                        size="sm"
                                                        variant={isSuccess ? 'default' : 'outline'} 
                                                        className={cn(
                                                            "h-9 px-6 rounded-lg font-bold uppercase tracking-widest text-[9px] border-2", 
                                                            isSuccess ? "bg-emerald-600 border-emerald-600 text-white" : "bg-transparent border-white/20 text-white hover:bg-white/10"
                                                        )} 
                                                        onClick={() => setIsSuccess(true)}
                                                        disabled={activeViewStage !== viewingObservation.currentStage}
                                                    >
                                                        <CheckCircle2 className="mr-2 h-4 w-4" /> PASSED
                                                    </Button>
                                                    <Button 
                                                        size="sm"
                                                        variant={!isSuccess ? 'destructive' : 'outline'} 
                                                        className={cn(
                                                            "h-9 px-6 rounded-lg font-bold uppercase tracking-widest text-[9px] border-2",
                                                            !isSuccess ? "bg-rose-600 border-rose-600 text-white" : "bg-transparent border-white/20 text-white hover:bg-white/10"
                                                        )} 
                                                        onClick={() => setIsSuccess(false)}
                                                        disabled={activeViewStage !== viewingObservation.currentStage}
                                                    >
                                                        <XCircle className="mr-2 h-4 w-4" /> FAILED
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeViewStage === 'Reference' && (
                                        <div className="py-20 border-2 border-dashed border-slate-100 rounded-xl text-center space-y-6 bg-slate-50/20">
                                            <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mx-auto shadow-sm border border-slate-100">
                                                <Archive className="h-8 w-8 text-blue-600" />
                                            </div>
                                            <div className="space-y-2 max-w-sm mx-auto px-4">
                                                <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Technical Archiving</h3>
                                                <p className="text-xs text-slate-500 font-bold leading-relaxed uppercase tracking-wider">Finalize documentation andrevised SOPs before organizational closure.</p>
                                            </div>
                                        </div>
                                    )}

                                    {activeViewStage === 'Closure' && (
                                        <div className="py-24 bg-slate-900 rounded-xl text-center space-y-8 animate-in zoom-in-95 duration-700">
                                            <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                                                <CheckCircle2 className="h-10 w-10 text-white" />
                                            </div>
                                            <div className="space-y-2 text-white">
                                                <h3 className="text-3xl font-bold uppercase tracking-tight">CAPA CYCLE CLOSED</h3>
                                                <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Organizational Verification Complete</p>
                                                <div className="pt-8">
                                                    <Badge className="bg-slate-800 text-slate-400 font-bold text-[9px] px-4 py-1 rounded-md">
                                                        {viewingObservation.closedAt ? format(parseISO(viewingObservation.closedAt), 'dd MMM yyyy p') : 'N/A'}
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
    <div className="space-y-8 animate-in fade-in duration-500 flex flex-col h-full overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 text-left">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight uppercase leading-none">CAPA Master Tracker</h1>
          <p className="text-slate-500 text-sm font-semibold mt-1.5 uppercase tracking-wide">Organizational Registry for Safety Lifecycle Management.</p>
        </div>
        
        <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-10 px-8 rounded-lg shadow-sm active:scale-95 transition-all text-xs tracking-wider">
              <Plus className="mr-2 h-4 w-4" /> NEW FINDING
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl bg-white border border-slate-200 shadow-2xl rounded-xl">
            <DialogHeader className="text-left">
              <DialogTitle className="text-lg font-bold uppercase tracking-tight text-slate-900">Initiate Lifecycle Case</DialogTitle>
              <DialogDescription className="text-slate-500 font-medium text-xs">Log a new site observation to trigger the CAPA workflow.</DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onReportSubmit)} className="space-y-6 py-4 text-left">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-0.5">Finding Category</Label>
                    <Controller
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="h-10 rounded-lg font-bold border-slate-200 text-slate-900">
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
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-0.5">Severity</Label>
                    <Controller
                      control={form.control}
                      name="severity"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="h-10 rounded-lg font-bold border-slate-200 text-slate-900">
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

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-0.5">Site / Project</Label>
                    <Controller
                      control={form.control}
                      name="projectId"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="h-10 rounded-lg font-bold border-slate-200 text-slate-900">
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
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-0.5">Specific Location</Label>
                    <Input {...form.register('location')} className="h-10 rounded-lg font-bold border-slate-200" placeholder="e.g., Tank 42" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-0.5">Detailed Narrative</Label>
                  <Textarea {...form.register('description')} className="min-h-[120px] rounded-lg p-3 font-medium border-slate-200 focus-visible:ring-slate-100 text-slate-900 text-sm" placeholder="State exactly what was observed..." />
                </div>

                <DialogFooter className="pt-4 gap-2">
                  <Button variant="outline" type="button" onClick={() => setIsReportDialogOpen(false)} className="h-10 rounded-lg font-bold px-6 text-xs">CANCEL</Button>
                  <Button type="submit" className="bg-slate-900 hover:bg-black text-white font-bold h-10 px-8 rounded-lg shadow-sm text-xs">OPEN CASE</Button>
                </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-white border border-slate-200 shadow-sm overflow-hidden rounded-xl flex flex-col flex-1">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50 shrink-0">
            <div className="relative w-full max-w-xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                    placeholder="Search Tracker by Narrative, Location or ID..." 
                    className="pl-9 h-10 bg-white border-slate-200 rounded-lg font-semibold text-slate-900 text-xs uppercase tracking-tight"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex gap-4 items-center shrink-0">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                    {filteredObservations.length} REGISTERED CASES
                </span>
            </div>
        </div>
        
        <div className="flex-1 overflow-hidden relative">
          <ScrollArea className="h-full w-full">
            <Table className="border-collapse text-[11px]">
                <TableHeader className="bg-slate-100 sticky top-0 z-40">
                    <TableRow className="hover:bg-transparent border-b border-slate-300">
                        <TableHead className="w-16 font-bold uppercase text-[9px] tracking-widest text-slate-900 text-center h-10 border-r border-slate-300 sticky left-0 z-50 bg-slate-100">ID</TableHead>
                        <TableHead className="min-w-[280px] font-bold uppercase text-[9px] tracking-widest text-slate-900 h-10 border-r border-slate-300 px-4 sticky left-16 z-50 bg-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Finding Narrative</TableHead>
                        <TableHead className="w-28 font-bold uppercase text-[9px] tracking-widest text-slate-900 h-10 border-r border-slate-300 text-center">Category</TableHead>
                        <TableHead className="w-24 font-bold uppercase text-[9px] tracking-widest text-slate-900 h-10 border-r-2 border-slate-300 text-center">Severity</TableHead>
                        
                        {Object.values(stageConfig).map(cfg => (
                           <TableHead key={cfg.label} className="w-28 font-bold uppercase text-[8px] tracking-tighter text-slate-600 h-10 border-r border-slate-200 text-center leading-tight">
                              {cfg.label.split(' ').join('\n')}
                           </TableHead>
                        ))}

                        <TableHead className="w-24 text-right font-bold uppercase text-[9px] tracking-widest text-slate-900 h-10 px-4 sticky right-0 z-50 bg-slate-100 shadow-[-2px_0_5px_rgba(0,0,0,0.05)]">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredObservations.map((obs) => {
                        const site = projects.find(p => p.id === obs.projectId);
                        const stages = Object.keys(stageConfig) as CapaStage[];
                        const currentStageIdx = stages.indexOf(obs.currentStage);

                        return (
                            <TableRow key={obs.id} className="group hover:bg-blue-50/30 transition-colors border-b border-slate-200">
                                <TableCell className="text-center font-mono text-[10px] font-bold text-slate-600 border-r border-slate-200 sticky left-0 z-20 bg-slate-50/20">
                                  {obs.id.slice(-5).toUpperCase()}
                                </TableCell>
                                <TableCell className="border-r border-slate-200 px-4 py-3 text-left sticky left-16 z-20 bg-white group-hover:bg-slate-50 transition-colors">
                                    <div className="flex flex-col gap-0.5">
                                        <p className="font-bold text-slate-900 text-xs leading-tight tracking-tight line-clamp-1">{obs.description}</p>
                                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                            <MapPin className="h-2 w-2 text-slate-400" /> {site?.name} &middot; {obs.location}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center border-r border-slate-200">
                                    <span className="text-[9px] font-bold uppercase tracking-tight text-slate-600">
                                        {obs.category}
                                    </span>
                                </TableCell>
                                <TableCell className="text-center border-r-2 border-slate-300">
                                    <Badge variant="outline" className={cn("text-[9px] font-bold uppercase tracking-widest h-4 px-2 border", severityConfig[obs.severity].border, severityConfig[obs.severity].text)}>
                                        {obs.severity}
                                    </Badge>
                                </TableCell>

                                {stages.map((stage, idx) => {
                                  const isDone = idx < currentStageIdx || obs.status === 'Closed';
                                  const isActive = idx === currentStageIdx && obs.status !== 'Closed';
                                  
                                  return (
                                    <TableCell key={stage} className={cn(
                                      "border-r border-slate-200 text-center p-0",
                                      isActive && "bg-blue-50/10",
                                      isDone && "bg-emerald-50/10"
                                    )}>
                                       <div className="flex items-center justify-center py-2">
                                          {isDone ? (
                                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                                          ) : isActive ? (
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                                          ) : (
                                            <div className="w-1 h-1 rounded-full bg-slate-200" />
                                          )}
                                       </div>
                                    </TableCell>
                                  )
                                })}

                                <TableCell className="text-right px-4 sticky right-0 z-20 bg-white group-hover:bg-slate-50 border-l border-slate-200 transition-colors">
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-7 px-3 rounded-lg font-bold text-[9px] uppercase tracking-widest border-slate-200 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                                        onClick={() => setViewingObservation(obs)}
                                    >
                                        MANAGE
                                    </Button>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
        
        {filteredObservations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 text-center bg-slate-50/10">
                <div className="p-8 bg-white rounded-xl shadow-sm mb-4 border border-dashed border-slate-200">
                    <Inbox className="h-12 w-12 text-slate-200" />
                </div>
                <p className="font-bold uppercase tracking-widest text-lg text-slate-300">Empty Registry</p>
                <p className="text-slate-400 font-medium mt-1 uppercase text-[10px]">Waiting for first site observation report...</p>
            </div>
        )}
      </Card>
    </div>
  );
}
