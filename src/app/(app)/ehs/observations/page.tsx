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
  ArrowRight, Lock, FileSearch, Archive
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

const severityColors: Record<EhsObservationSeverity, string> = {
  'Low': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Medium': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'High': 'bg-orange-500/10 text-orange-400 border-orange-200/20',
  'Critical': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const stageConfig: Record<CapaStage, { label: string, icon: any, color: string }> = {
  'Initiation': { label: 'Initiation', icon: Plus, color: 'text-emerald-400' },
  'Resolution': { label: 'Resolution', icon: FileCheck, color: 'text-emerald-400' },
  'Investigation': { label: 'Investigation', icon: Search, color: 'text-emerald-400' },
  'Implementation': { label: 'Implementation', icon: Target, color: 'text-blue-400' },
  'Effectiveness Review': { label: 'Effectiveness Review', icon: CheckCircle, color: 'text-indigo-400' },
  'Reference': { label: 'Reference', icon: FileSearch, color: 'text-blue-400' },
  'Closure': { label: 'Closure', icon: Lock, color: 'text-slate-300' },
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
  const { observations, addObservation, transitionCapaStage, addObservationComment, stats } = useEhs();
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

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Full CAPA Lifecycle</h1>
          <p className="text-slate-200 mt-2 font-medium">Closed-loop management of safety observations and preventive measures.</p>
        </div>
        
        <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest h-14 px-8 rounded-2xl shadow-xl shadow-emerald-500/10">
              <Plus className="mr-2 h-5 w-5" /> Initiate Case
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-2xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white">Initiate CAPA</DialogTitle>
              <DialogDescription className="text-slate-300 font-medium">Capture initial findings to start the lifecycle.</DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onReportSubmit)} className="space-y-6 py-4">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-100 font-bold text-xs uppercase tracking-widest">Category</Label>
                    <Controller
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="bg-slate-800 border-slate-700 h-12 rounded-xl text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-800 text-white">
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
                    <Label className="text-slate-100 font-bold text-xs uppercase tracking-widest">Severity</Label>
                    <Controller
                      control={form.control}
                      name="severity"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="bg-slate-800 border-slate-700 h-12 rounded-xl text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-800 text-white">
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
                   <div className="space-y-2">
                    <Label className="text-slate-100 font-bold text-xs uppercase tracking-widest">Site Location</Label>
                    <Controller
                      control={form.control}
                      name="projectId"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="bg-slate-800 border-slate-700 h-12 rounded-xl text-white">
                            <SelectValue placeholder="Select site..." />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-800 text-white">
                            {projects.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-100 font-bold text-xs uppercase tracking-widest">Specific Area</Label>
                    <Input {...form.register('location')} className="bg-slate-800 border-slate-700 h-12 rounded-xl text-white" placeholder="e.g., Boiler House" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-100 font-bold text-xs uppercase tracking-widest">Observation Description</Label>
                  <Textarea {...form.register('description')} className="bg-slate-800 border-slate-700 min-h-[100px] rounded-xl text-white" placeholder="Provide factual details of the finding..." />
                </div>

                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setIsReportDialogOpen(false)} className="bg-transparent border-slate-700 text-slate-200">Cancel</Button>
                  <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600 font-black h-12 rounded-xl px-10">Start Lifecycle</Button>
                </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Open CAPAs" value={stats.openObservations} icon={TrendingUp} description={<span className="text-slate-300 font-medium">Active lifecycles</span>} className="bg-slate-900/60 border-slate-800 [&_div]:text-white [&_.text-sm]:text-slate-100" />
        <StatCard title="Total LTIs" value={stats.totalLTIs} icon={AlertCircle} description={<span className="text-slate-300 font-medium">Past 12 months</span>} className="bg-slate-900/60 border-slate-800 [&_div]:text-white [&_.text-sm]:text-slate-100" />
        <StatCard title="Audit Health" value={`${stats.avgAuditScore.toFixed(0)}%`} icon={FileCheck} description={<span className="text-slate-300 font-medium">Org compliance</span>} className="bg-slate-900/60 border-slate-800 [&_div]:text-white [&_.text-sm]:text-slate-100" />
        <StatCard title="Training Hrs" value={stats.trainingHours} icon={Users} description={<span className="text-slate-300 font-medium">Workforce competency</span>} className="bg-slate-900/60 border-slate-800 [&_div]:text-white [&_.text-sm]:text-slate-100" />
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
        <Input 
          placeholder="Search by ID, site, or findings..." 
          className="pl-12 h-16 bg-slate-900/60 border-slate-800 text-white placeholder:text-slate-400 rounded-3xl"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredObservations.map((obs) => {
          const site = projects.find(p => p.id === obs.projectId);
          const currentStage = stageConfig[obs.currentStage];

          return (
            <Card key={obs.id} className="bg-slate-900 border-slate-800 hover:bg-slate-900/80 transition-all border-l-4 overflow-hidden" style={{ borderLeftColor: obs.severity === 'Critical' ? '#f43f5e' : obs.severity === 'High' ? '#f59e0b' : '#10b981' }}>
              <CardContent className="p-0">
                 <div className="flex flex-col md:flex-row md:items-center">
                   <div className="p-8 flex-1 space-y-4">
                      <div className="flex items-center gap-3">
                         <Badge variant="outline" className={cn("uppercase text-[10px] tracking-[0.2em] font-black px-3 py-1", severityColors[obs.severity])}>
                           {obs.severity} SEVERITY
                         </Badge>
                         <span className="text-slate-700 font-black">|</span>
                         <span className="text-[11px] text-slate-300 font-black uppercase tracking-widest">{format(parseISO(obs.createdAt), 'PPP')}</span>
                      </div>
                      
                      <h3 className="text-2xl font-bold text-white line-clamp-1">{obs.description}</h3>

                      <div className="flex flex-wrap items-center gap-8 text-sm text-slate-200 pt-2">
                        <div className="flex items-center gap-2.5 font-semibold">
                          <MapPin className="h-4 w-4 text-emerald-400" />
                          <span>{site?.name || 'Unknown Site'} &middot; {obs.location}</span>
                        </div>
                        <div className="flex items-center gap-2.5 font-semibold">
                          <currentStage.icon className={cn("h-4 w-4", currentStage.color)} />
                          <span className="uppercase text-[11px] tracking-tight">{currentStage.label} Stage</span>
                        </div>
                        <Badge variant="outline" className={cn(
                          "font-black text-[10px] uppercase px-3",
                          obs.status === 'Open' ? "text-emerald-400 border-emerald-400/20" : "text-slate-100 border-slate-700 bg-slate-800"
                        )}>
                          {obs.status}
                        </Badge>
                      </div>
                   </div>
                   
                   <div className="p-8 md:border-l border-slate-800 flex items-center gap-4 bg-slate-900/30">
                     <Button 
                       variant="outline" 
                       className="border-slate-700 bg-slate-800/40 text-white hover:bg-slate-700 hover:text-white rounded-xl h-12 px-6 font-bold"
                       onClick={() => setViewingObservation(obs)}
                     >
                       Manage Lifecycle <ChevronRight className="h-4 w-4 ml-2" />
                     </Button>
                   </div>
                 </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* FULL LIFECYCLE DIALOG */}
      {viewingObservation && (
        <Dialog open={!!viewingObservation} onOpenChange={(o) => !o && setViewingObservation(null)}>
          <DialogContent className="max-w-6xl h-[95vh] flex flex-col p-0 bg-slate-950 border-slate-800 text-white overflow-hidden shadow-2xl">
            <DialogHeader className="p-10 pb-0 border-b border-slate-800 bg-slate-900/50">
              <div className="flex justify-between items-start mb-6">
                <div>
                   <div className="flex items-center gap-3 mb-2">
                     <Badge variant="outline" className={cn("font-black text-[10px] tracking-widest", severityColors[viewingObservation.severity])}>{viewingObservation.severity} SEVERITY</Badge>
                     <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">ID: {viewingObservation.id.slice(-6).toUpperCase()}</span>
                   </div>
                   <DialogTitle className="text-3xl font-black uppercase tracking-tight text-white">{viewingObservation.description}</DialogTitle>
                </div>
              </div>

              {/* STAGE STEPPER */}
              <div className="pb-10">
                 <div className="flex items-center justify-between gap-4">
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
                               "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300",
                               isCompleted ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" :
                               isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110" :
                               "bg-slate-800 text-slate-500"
                             )}>
                               {isCompleted ? <CheckCircle2 className="h-6 w-6" /> : <config.icon className="h-6 w-6" />}
                             </div>
                             <span className={cn(
                               "text-[10px] font-black uppercase tracking-widest text-center",
                               isActive ? "text-blue-400" : "text-slate-300"
                             )}>{config.label}</span>
                          </div>
                          {idx < 6 && (
                            <div className={cn(
                              "flex-1 h-0.5 rounded-full mx-2",
                              idx < currentIndex ? "bg-emerald-500" : "bg-slate-800"
                            )} />
                          )}
                        </React.Fragment>
                      );
                    })}
                 </div>
              </div>
            </DialogHeader>

            <ScrollArea className="flex-1 p-10">
              <div className="max-w-4xl mx-auto space-y-12 text-left">
                {/* INITIATION DATA */}
                <section className="space-y-6">
                  <div className="flex items-center gap-3">
                    <Plus className="h-5 w-5 text-emerald-400" />
                    <h4 className="text-xl font-black uppercase tracking-tight text-white">Stage 1: Initiation Details</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 bg-slate-900/40 rounded-[2rem] border border-slate-800">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-slate-300 tracking-widest">Findings Statement</Label>
                      <p className="text-lg font-medium leading-relaxed italic text-white">"{viewingObservation.description}"</p>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between border-b border-slate-800 pb-2">
                        <span className="text-xs text-slate-300 font-bold uppercase">Reported By</span>
                        <span className="text-xs font-black text-white">{users.find(u => u.id === viewingObservation.reporterId)?.name}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-800 pb-2">
                        <span className="text-xs text-slate-300 font-bold uppercase">Location</span>
                        <span className="text-xs font-black text-white">{projects.find(p => p.id === viewingObservation.projectId)?.name} &middot; {viewingObservation.location}</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* RESOLUTION DATA */}
                {['Resolution', 'Investigation', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'].includes(viewingObservation.currentStage) && (
                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                      <FileCheck className="h-5 w-5 text-emerald-400" />
                      <h4 className="text-xl font-black uppercase tracking-tight text-white">Stage 2: Immediate Correction</h4>
                    </div>
                    {viewingObservation.currentStage === 'Resolution' ? (
                       <div className="p-8 bg-slate-900/40 rounded-[2rem] border border-slate-800">
                          <Label className="mb-4 block text-slate-100 font-bold">Action taken to address the symptom immediately:</Label>
                          <Textarea 
                            className="bg-slate-800 border-slate-700 min-h-[120px] rounded-2xl text-white" 
                            placeholder="e.g., Cleaned up spill, quarantined faulty tool..."
                            value={actionPlan}
                            onChange={(e) => setActionPlan(e.target.value)}
                          />
                       </div>
                    ) : (
                      <div className="p-8 bg-slate-800/40 border border-slate-800 rounded-[2rem] shadow-inner">
                         <p className="text-sm font-bold text-white leading-relaxed">{viewingObservation.immediateActionTaken || 'Immediate action recorded.'}</p>
                         <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-4">Correction Verified by Reporter</p>
                      </div>
                    )}
                  </section>
                )}

                {/* INVESTIGATION DATA */}
                {['Investigation', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'].includes(viewingObservation.currentStage) && (
                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                      <Search className="h-5 w-5 text-emerald-400" />
                      <h4 className="text-xl font-black uppercase tracking-tight text-white">Stage 3: Root Cause Analysis (5-Whys)</h4>
                    </div>
                    {viewingObservation.currentStage === 'Investigation' ? (
                      <div className="space-y-4 p-8 bg-slate-900/40 rounded-[2rem] border border-slate-800">
                        {rcaWhys.map((why, i) => (
                          <div key={i} className="flex gap-4">
                             <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0 text-xs font-black text-slate-300 border border-slate-700">W{i+1}</div>
                             <Input 
                               className="bg-slate-800 border-slate-700 h-10 rounded-xl text-white focus:ring-emerald-500/20"
                               placeholder={`Why did this happen?`}
                               value={why}
                               onChange={(e) => {
                                 const next = [...rcaWhys];
                                 next[i] = e.target.value;
                                 setRcaWhys(next);
                               }}
                             />
                          </div>
                        ))}
                        <Separator className="bg-slate-800 my-6" />
                        <Label className="text-emerald-400 font-black uppercase tracking-widest text-[10px]">Identified Root Cause</Label>
                        <Textarea 
                          className="bg-slate-800 border-slate-700 rounded-xl mt-2 text-white" 
                          placeholder="Final conclusion of the investigation..." 
                          value={finalRootCause}
                          onChange={(e) => setFinalRootCause(e.target.value)}
                        />
                      </div>
                    ) : (
                      <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-[2rem] space-y-4 shadow-inner">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {viewingObservation.rootCauseAnalysis?.whys.filter(w => w.trim()).map((why, i) => (
                             <div key={i} className="flex items-center gap-3 text-sm text-slate-200 font-bold">
                               <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black shrink-0 text-slate-100 border border-slate-700">{i+1}</div>
                               {why}
                             </div>
                           ))}
                        </div>
                        <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl mt-4">
                          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2"><Target className="h-3 w-3" /> Investigation Outcome</p>
                          <p className="text-base font-black text-white uppercase tracking-tight leading-snug">{viewingObservation.rootCauseAnalysis?.finalRootCause}</p>
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {/* IMPLEMENTATION DATA */}
                {['Implementation', 'Effectiveness Review', 'Reference', 'Closure'].includes(viewingObservation.currentStage) && (
                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                      <Target className="h-5 w-5 text-blue-400" />
                      <h4 className="text-xl font-black uppercase tracking-tight text-white">Stage 4: CAPA Implementation Plan</h4>
                    </div>
                    {viewingObservation.currentStage === 'Implementation' ? (
                       <div className="space-y-6 p-8 bg-slate-900/40 rounded-[2rem] border border-slate-800">
                          <div className="space-y-2">
                             <Label className="text-slate-100 font-bold">Preventive Action Plan</Label>
                             <Textarea 
                               className="bg-slate-800 border-slate-700 min-h-[120px] rounded-2xl text-white" 
                               placeholder="Specify actions to prevent recurrence..."
                               value={actionPlan}
                               onChange={(e) => setActionPlan(e.target.value)}
                             />
                          </div>
                          <div className="grid grid-cols-2 gap-6">
                             <div className="space-y-2">
                               <Label className="text-slate-100 font-bold">Action Owner</Label>
                               <Select onValueChange={setActionOwnerId} value={actionOwnerId}>
                                  <SelectTrigger className="bg-slate-800 border-slate-700 h-11 rounded-xl text-white"><SelectValue /></SelectTrigger>
                                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                    {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                                  </SelectContent>
                               </Select>
                             </div>
                             <div className="space-y-2">
                               <Label className="text-slate-100 font-bold">Target Date</Label>
                               <Input type="date" className="bg-slate-800 border-slate-700 h-11 rounded-xl text-white" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                             </div>
                          </div>
                       </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 p-8 bg-slate-900/40 border border-slate-800 rounded-[2rem] shadow-inner">
                          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">Preventive Action Strategy</p>
                          <p className="text-sm font-bold leading-relaxed text-white">{viewingObservation.correctiveActionPlan}</p>
                        </div>
                        <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-[2rem] space-y-6 shadow-inner">
                           <div>
                             <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Owner</p>
                             <p className="text-sm font-black text-white truncate">{users.find(u => u.id === viewingObservation.actionOwnerId)?.name || 'N/A'}</p>
                           </div>
                           <div>
                             <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Target Date</p>
                             <p className="text-sm font-black text-white">{viewingObservation.dueDate ? format(parseISO(viewingObservation.dueDate), 'dd MMM yyyy') : 'N/A'}</p>
                           </div>
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {/* EFFECTIVENESS REVIEW */}
                {['Effectiveness Review', 'Reference', 'Closure'].includes(viewingObservation.currentStage) && (
                   <section className="space-y-6">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-indigo-400" />
                      <h4 className="text-xl font-black uppercase tracking-tight text-white">Stage 5: Effectiveness Review</h4>
                    </div>
                    {viewingObservation.currentStage === 'Effectiveness Review' ? (
                       <div className="space-y-6 p-8 bg-slate-900/40 rounded-[2rem] border border-slate-800">
                          <div className="space-y-2">
                             <Label className="text-slate-100 font-bold">Verification Result & Validation Evidence</Label>
                             <Textarea 
                               className="bg-slate-800 border-slate-700 min-h-[120px] rounded-2xl text-white focus:ring-indigo-500/20" 
                               placeholder="Have the actions prevented recurrence? Provide details..."
                               value={verificationResult}
                               onChange={(e) => setVerificationResult(e.target.value)}
                             />
                          </div>
                          <div className="flex items-center gap-4">
                             <Label className="text-slate-100 font-bold">Has the action been successful?</Label>
                             <div className="flex gap-2">
                               <Button variant={isSuccess ? 'default' : 'outline'} className={cn(isSuccess && "bg-emerald-500 hover:bg-emerald-600")} size="sm" onClick={() => setIsSuccess(true)}>Yes, Successful</Button>
                               <Button variant={!isSuccess ? 'destructive' : 'outline'} size="sm" onClick={() => setIsSuccess(false)}>No, Requires Revision</Button>
                             </div>
                          </div>
                       </div>
                    ) : (
                      <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-[2rem] shadow-inner">
                        <div className="flex justify-between items-start mb-6">
                           <div className="space-y-1">
                             <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Verification Status</p>
                             <p className="text-sm font-bold leading-relaxed text-white">{viewingObservation.effectivenessVerification?.result}</p>
                           </div>
                           <Badge variant={viewingObservation.effectivenessVerification?.successful ? 'success' : 'destructive'} className="uppercase font-black px-4 h-6">
                             {viewingObservation.effectivenessVerification?.successful ? 'PASSED' : 'FAILED'}
                           </Badge>
                        </div>
                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest border-t border-slate-800 pt-4 flex items-center gap-2">
                           <Avatar className="h-5 w-5 border border-slate-700"><AvatarImage src={users.find(u => u.id === viewingObservation.effectivenessVerification?.verifiedBy)?.avatar} /></Avatar>
                           Verified By: {users.find(u => u.id === viewingObservation.effectivenessVerification?.verifiedBy)?.name} &middot; {format(parseISO(viewingObservation.effectivenessVerification!.verificationDate), 'PPP')}
                        </div>
                      </div>
                    )}
                   </section>
                )}

                {/* REFERENCE STAGE */}
                {['Reference', 'Closure'].includes(viewingObservation.currentStage) && (
                   <section className="space-y-6">
                    <div className="flex items-center gap-3">
                      <FileSearch className="h-5 w-5 text-blue-400" />
                      <h4 className="text-xl font-black uppercase tracking-tight text-white">Stage 6: Final Documentation & Archiving</h4>
                    </div>
                    <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-[2rem] shadow-inner text-center">
                       <Archive className="h-10 w-10 text-slate-600 mx-auto mb-4" />
                       <p className="text-sm font-bold text-slate-200">The CAPA case is ready for final archiving.</p>
                       <p className="text-[11px] text-slate-500 mt-1 uppercase font-bold tracking-widest">Ensure all method statements and evidence are linked in the document library.</p>
                    </div>
                   </section>
                )}

                {/* CLOSURE SIGN OFF */}
                {viewingObservation.currentStage === 'Closure' && (
                  <div className="p-12 bg-emerald-500/10 border-2 border-emerald-500/20 rounded-[3rem] text-center space-y-6 animate-in zoom-in-95 duration-500">
                     <div className="w-20 h-20 rounded-full bg-emerald-500 mx-auto flex items-center justify-center shadow-2xl shadow-emerald-500/20 border-4 border-white/20">
                        <CheckCircle2 className="h-10 w-10 text-white" />
                     </div>
                     <div className="space-y-2">
                        <h4 className="text-3xl font-black uppercase tracking-tighter text-emerald-400">CAPA Case Closed</h4>
                        <p className="text-slate-200 text-lg font-bold">This safety lifecycle is complete. Resolution verified by HQ.</p>
                        <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.3em] mt-4">Closed on {viewingObservation.closedAt ? format(parseISO(viewingObservation.closedAt), 'PPP p') : 'N/A'}</p>
                     </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <DialogFooter className="p-8 border-t border-slate-800 bg-slate-950 flex sm:justify-between items-center w-full shrink-0 shadow-[0_-10px_50px_rgba(0,0,0,0.5)]">
               <div className="flex gap-4">
                  {viewingObservation.currentStage !== 'Closure' && (user?.role === 'Admin' || user?.role === 'Senior Safety Supervisor') && (
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700 h-14 rounded-2xl px-10 font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 text-xs active:scale-95 transition-all"
                      onClick={handleNextStage}
                    >
                      {nextStageLabel} <ArrowRight className="ml-3 h-5 w-5" />
                    </Button>
                  )}
               </div>
               <Button variant="ghost" className="text-slate-400 hover:text-white font-bold h-12 rounded-xl text-[11px] uppercase tracking-widest" onClick={() => setViewingObservation(null)}>Exit Management View</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {filteredObservations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-40 text-slate-300 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem]">
          <Inbox className="h-16 w-16 mb-6 opacity-20 text-emerald-500" />
          <p className="text-2xl font-black text-slate-100 tracking-tight uppercase">No lifecycle records found</p>
          <p className="text-sm mt-2 opacity-80 font-medium">Systematic lifecycle management ensures safety permanence.</p>
        </div>
      )}
    </div>
  );
}
