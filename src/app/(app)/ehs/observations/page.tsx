'use client';

import React, { useState, useMemo } from 'react';
import { useEhs } from '@/contexts/ehs-provider';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus, Search, MapPin, Calendar, Eye, Users, 
  FileWarning, AlertCircle, CheckCircle, ShieldCheck, 
  Clock, Filter, ArrowRight, MessageSquare, 
  AlertTriangle, CheckCircle2, TrendingUp, Inbox
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format, parseISO } from 'date-fns';
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
import type { EhsObservationStatus, EhsObservationCategory, EhsObservationSeverity, EhsObservation } from '@/lib/types';
import StatCard from '@/components/dashboard/stat-card';

const severityColors: Record<EhsObservationSeverity, string> = {
  'Low': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Medium': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'High': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'Critical': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const categoryIcons: Record<EhsObservationCategory, any> = {
  'Unsafe Act': FileWarning,
  'Unsafe Condition': AlertTriangle,
  'Safe Act': ShieldCheck,
  'Near Miss': Zap,
  'Environmental': TrendingUp,
};

const observationSchema = z.object({
  projectId: z.string().min(1, 'Site is required'),
  location: z.string().min(1, 'Specific location is required'),
  category: z.enum(['Unsafe Act', 'Unsafe Condition', 'Safe Act', 'Near Miss', 'Environmental']),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']),
  description: z.string().min(5, 'Detailed description is required'),
  immediateActionTaken: z.string().optional(),
  correctiveActionPlan: z.string().optional(),
  actionOwnerId: z.string().optional(),
  dueDate: z.string().optional(),
});

type ObservationFormValues = z.infer<typeof observationSchema>;

export default function EhsObservationsPage() {
  const { observations, addObservation, updateObservation, addObservationComment, stats } = useEhs();
  const { user, users } = useAuth();
  const { projects } = useGeneral();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [viewingObservation, setViewingObservation] = useState<EhsObservation | null>(null);
  const [newComment, setNewComment] = useState('');

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

  const handleAddComment = () => {
    if (!viewingObservation || !newComment.trim()) return;
    addObservationComment(viewingObservation.id, newComment);
    setNewComment('');
  };

  const handleUpdateStatus = (status: EhsObservationStatus) => {
    if (!viewingObservation) return;
    updateObservation(viewingObservation.id, { 
      status, 
      closedAt: status === 'Closed' ? new Date().toISOString() : undefined 
    });
    toast({ title: 'Status Updated', description: `Observation marked as ${status}.` });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Safety Observations</h1>
          <p className="text-slate-400 mt-2">Identify hazards, acknowledge safe acts, and manage CAPA workflows.</p>
        </div>
        
        <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest h-14 px-8 rounded-2xl shadow-xl shadow-emerald-500/10">
              <Plus className="mr-2 h-5 w-5" /> New Observation
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase tracking-tight">Report Observation</DialogTitle>
              <DialogDescription className="text-slate-500">Document site findings and initiate corrective measures.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              <form onSubmit={form.handleSubmit(onReportSubmit)} className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-400 font-bold text-xs uppercase tracking-widest">Category</Label>
                    <Controller
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="bg-slate-800 border-slate-700 h-12 rounded-xl">
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
                    <Label className="text-slate-400 font-bold text-xs uppercase tracking-widest">Severity</Label>
                    <Controller
                      control={form.control}
                      name="severity"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="bg-slate-800 border-slate-700 h-12 rounded-xl">
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
                    <Label className="text-slate-400 font-bold text-xs uppercase tracking-widest">Site Location</Label>
                    <Controller
                      control={form.control}
                      name="projectId"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="bg-slate-800 border-slate-700 h-12 rounded-xl">
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
                    <Label className="text-slate-400 font-bold text-xs uppercase tracking-widest">Specific Area</Label>
                    <Input {...form.register('location')} className="bg-slate-800 border-slate-700 h-12 rounded-xl" placeholder="e.g., Tank 42 North" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-400 font-bold text-xs uppercase tracking-widest">Findings Description</Label>
                  <Textarea {...form.register('description')} className="bg-slate-800 border-slate-700 min-h-[100px] rounded-xl" placeholder="Explain what was observed..." />
                </div>

                <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/50 space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Corrective Action Plan (CAPA)</h4>
                  <div className="space-y-2">
                    <Label className="text-slate-400 font-bold text-xs">Proposed Correction</Label>
                    <Textarea {...form.register('correctiveActionPlan')} className="bg-slate-800 border-slate-700 h-20 rounded-xl" placeholder="Step-by-step resolution plan..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-400 font-bold text-xs">Action Owner</Label>
                      <Controller
                        control={form.control}
                        name="actionOwnerId"
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className="bg-slate-800 border-slate-700">
                              <SelectValue placeholder="Assign personnel..." />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800 text-white">
                              {users.filter(u => u.status !== 'locked').map(u => (
                                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-400 font-bold text-xs">Target Date</Label>
                      <Input type="date" {...form.register('dueDate')} className="bg-slate-800 border-slate-700 h-10 rounded-lg" />
                    </div>
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button variant="outline" type="button" onClick={() => setIsReportDialogOpen(false)} className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 h-12 rounded-xl">Cancel</Button>
                  <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600 font-black h-12 rounded-xl px-10">Transmit Report</Button>
                </DialogFooter>
              </form>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Open Findings" value={stats.openObservations} icon={Eye} description="Hazards awaiting CAPA closure" className="bg-slate-900/40 border-slate-800" />
        <StatCard title="Unsafe Acts" value={observations.filter(o => o.category === 'Unsafe Act').length} icon={FileWarning} description="Behavioral safety observations" className="bg-slate-900/40 border-slate-800" />
        <StatCard title="Unsafe Conditions" value={observations.filter(o => o.category === 'Unsafe Condition').length} icon={AlertTriangle} description="Physical hazard observations" className="bg-slate-900/40 border-slate-800" />
        <StatCard title="Safe Acts" value={observations.filter(o => o.category === 'Safe Act').length} icon={ShieldCheck} description="Positive safety recognitions" className="bg-slate-900/40 border-slate-800" />
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
        <Input 
          placeholder="Search observations by site, description, or owner..." 
          className="pl-12 h-16 bg-slate-900/40 border-slate-800 text-slate-200 rounded-3xl focus:ring-emerald-500/20"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredObservations.map((obs) => {
          const site = projects.find(p => p.id === obs.projectId);
          const owner = users.find(u => u.id === obs.actionOwnerId);
          const CatIcon = categoryIcons[obs.category] || Eye;

          return (
            <Card key={obs.id} className="bg-slate-900 border-slate-800 hover:bg-slate-900/80 transition-all border-l-4 overflow-hidden shadow-xl" style={{ borderLeftColor: obs.severity === 'Critical' ? '#f43f5e' : obs.severity === 'High' ? '#f59e0b' : '#10b981' }}>
              <CardContent className="p-0">
                 <div className="flex flex-col md:flex-row md:items-center">
                   <div className="p-8 flex-1 space-y-4">
                      <div className="flex items-center gap-3">
                         <Badge variant="outline" className={cn("uppercase text-[10px] tracking-[0.2em] font-black px-3 py-1", severityColors[obs.severity])}>
                           {obs.category} &middot; {obs.severity}
                         </Badge>
                         <span className="text-slate-700 font-black">|</span>
                         <span className="text-[11px] text-slate-500 font-black uppercase tracking-widest">{format(parseISO(obs.createdAt), 'PPP')}</span>
                      </div>
                      
                      <h3 className="text-2xl font-bold text-white line-clamp-2 leading-tight flex items-center gap-3">
                        <CatIcon className="h-6 w-6 text-slate-500" />
                        {obs.description}
                      </h3>

                      <div className="flex flex-wrap items-center gap-8 text-sm text-slate-400 pt-2">
                        <div className="flex items-center gap-2.5">
                          <div className="bg-slate-800 p-2 rounded-lg">
                            <MapPin className="h-4 w-4 text-emerald-400" />
                          </div>
                          <span className="font-bold">{site?.name || 'Unknown Site'} &middot; {obs.location}</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <div className="bg-slate-800 p-2 rounded-lg">
                            <Users className="h-4 w-4 text-indigo-400" />
                          </div>
                          <span className="font-bold">Owner: {owner?.name || 'Unassigned'}</span>
                        </div>
                        <Badge variant="outline" className={cn(
                          "font-black text-[10px] uppercase px-3 h-6",
                          obs.status === 'Open' ? "text-rose-400 border-rose-400/20" : 
                          obs.status === 'Closed' ? "text-emerald-400 border-emerald-400/20" : "text-blue-400 border-blue-400/20"
                        )}>
                          {obs.status}
                        </Badge>
                      </div>
                   </div>
                   
                   <div className="p-8 md:border-l border-slate-800 flex items-center gap-4 bg-slate-900/30">
                     <Button 
                       variant="outline" 
                       className="border-slate-800 bg-slate-800/40 text-slate-300 hover:bg-slate-700 hover:text-white rounded-xl h-12"
                       onClick={() => setViewingObservation(obs)}
                     >
                       <Eye className="h-4 w-4 mr-2" /> CAPA Details
                     </Button>
                   </div>
                 </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* DETAILED VIEW DIALOG */}
      {viewingObservation && (
        <Dialog open={!!viewingObservation} onOpenChange={(o) => !o && setViewingObservation(null)}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-3xl h-[90vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-8 pb-4 border-b border-slate-800">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={cn("uppercase text-[10px] tracking-[0.2em] font-black", severityColors[viewingObservation.severity])}>
                      {viewingObservation.severity} SEVERITY
                    </Badge>
                    <Badge variant="outline" className="text-slate-500 font-black uppercase text-[10px] border-slate-800">
                      REF: #{viewingObservation.id.slice(-6)}
                    </Badge>
                  </div>
                  <DialogTitle className="text-2xl font-black text-white">{viewingObservation.category}</DialogTitle>
                </div>
                <Badge variant={viewingObservation.status === 'Closed' ? 'success' : 'destructive'} className="h-8 px-4 rounded-lg font-black uppercase text-[11px] tracking-widest">
                  {viewingObservation.status}
                </Badge>
              </div>
            </DialogHeader>

            <ScrollArea className="flex-1 p-8">
              <div className="space-y-10 pb-10">
                {/* OBSERVATION DETAILS */}
                <section className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-3">
                    <AlertCircle className="h-4 w-4 text-emerald-400" /> Findings & Observations
                  </h4>
                  <div className="p-6 bg-slate-800/40 border border-slate-800 rounded-3xl space-y-4">
                    <p className="text-slate-200 text-lg font-medium leading-relaxed italic">
                      "{viewingObservation.description}"
                    </p>
                    <div className="flex flex-wrap gap-6 pt-2 border-t border-slate-800/50">
                      <div className="text-[11px]">
                        <span className="block text-slate-500 font-black uppercase tracking-widest">Site</span>
                        <span className="text-white font-bold">{projects.find(p => p.id === viewingObservation.projectId)?.name} &middot; {viewingObservation.location}</span>
                      </div>
                      <div className="text-[11px]">
                        <span className="block text-slate-500 font-black uppercase tracking-widest">Reported On</span>
                        <span className="text-white font-bold">{format(parseISO(viewingObservation.createdAt), 'PPP p')}</span>
                      </div>
                      <div className="text-[11px]">
                        <span className="block text-slate-500 font-black uppercase tracking-widest">Reported By</span>
                        <span className="text-white font-bold">{users.find(u => u.id === viewingObservation.reporterId)?.name}</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* CAPA PLAN */}
                <section className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-indigo-400" /> Corrective Action Plan
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-indigo-500/5 border border-indigo-500/20 rounded-3xl space-y-4">
                       <div>
                         <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest block mb-2">Correction Strategy</span>
                         <p className="text-sm text-slate-300 leading-relaxed">
                           {viewingObservation.correctiveActionPlan || "No formal CAPA documented yet."}
                         </p>
                       </div>
                    </div>
                    <div className="p-6 bg-slate-800/40 border border-slate-800 rounded-3xl space-y-4">
                       <div className="flex justify-between items-center">
                         <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Closure Requirements</span>
                       </div>
                       <div className="space-y-3">
                         <div className="flex justify-between items-center text-xs">
                           <span className="text-slate-500 font-bold">Action Owner:</span>
                           <span className="text-white font-black">{users.find(u => u.id === viewingObservation.actionOwnerId)?.name || 'N/A'}</span>
                         </div>
                         <div className="flex justify-between items-center text-xs">
                           <span className="text-slate-500 font-bold">Target Date:</span>
                           <span className={cn(
                             "font-black px-2 py-0.5 rounded",
                             viewingObservation.dueDate && isPast(parseISO(viewingObservation.dueDate)) ? "bg-rose-500/20 text-rose-400" : "text-white"
                           )}>
                             {viewingObservation.dueDate ? format(parseISO(viewingObservation.dueDate), 'dd MMM yyyy') : 'N/A'}
                           </span>
                         </div>
                       </div>
                    </div>
                  </div>
                </section>

                {/* CHAT/TIMELINE */}
                <section className="space-y-4">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-3">
                    <MessageSquare className="h-4 w-4 text-emerald-400" /> Investigation Timeline
                  </h4>
                  <div className="space-y-4">
                    {Object.values(viewingObservation.comments || {}).sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()).map(comment => (
                      <div key={comment.id} className="flex gap-4 group">
                        <Avatar className="h-10 w-10 border-2 border-slate-800">
                          <AvatarImage src={users.find(u => u.id === comment.userId)?.avatar} />
                          <AvatarFallback>{users.find(u => u.id === comment.userId)?.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 bg-slate-800/40 border border-slate-800 p-4 rounded-2xl">
                          <div className="flex justify-between items-baseline mb-1">
                             <span className="text-xs font-black text-white">{users.find(u => u.id === comment.userId)?.name}</span>
                             <span className="text-[10px] font-bold text-slate-500">{formatDistanceToNow(parseISO(comment.date), { addSuffix: true })}</span>
                          </div>
                          <p className="text-sm text-slate-300">{comment.text}</p>
                        </div>
                      </div>
                    ))}
                    
                    <div className="flex gap-4 pt-4">
                      <div className="relative flex-1">
                        <Textarea 
                          className="bg-slate-800 border-slate-700 text-white rounded-2xl min-h-[80px] pr-14" 
                          placeholder="Add investigate note or closure evidence..." 
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                        />
                        <Button 
                          size="icon" 
                          className="absolute right-3 bottom-3 h-10 w-10 rounded-xl bg-emerald-500 hover:bg-emerald-600"
                          onClick={handleAddComment}
                          disabled={!newComment.trim()}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </ScrollArea>

            <DialogFooter className="p-8 border-t border-slate-800 flex sm:justify-between items-center w-full bg-slate-900/50">
               <div className="flex gap-4">
                 {viewingObservation.status !== 'Closed' && (user?.role === 'Admin' || user?.role === 'Senior Safety Supervisor') && (
                   <Button 
                     className="bg-emerald-500 hover:bg-emerald-600 h-12 rounded-xl font-black uppercase tracking-widest text-[11px] px-8"
                     onClick={() => handleUpdateStatus('Closed')}
                   >
                     Close Observation
                   </Button>
                 )}
                 {viewingObservation.status === 'Open' && (user?.role === 'Admin' || user?.role === 'Senior Safety Supervisor') && (
                   <Button 
                     variant="outline" 
                     className="bg-transparent border-blue-500/30 text-blue-400 hover:bg-blue-500/10 h-12 rounded-xl font-black uppercase tracking-widest text-[11px] px-8"
                     onClick={() => handleUpdateStatus('In Progress')}
                   >
                     Assign To Investigation
                   </Button>
                 )}
               </div>
               <Button variant="ghost" className="text-slate-500 hover:text-white font-bold h-12 rounded-xl" onClick={() => setViewingObservation(null)}>Close Viewer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {filteredObservations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-40 text-slate-500 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem]">
          <Inbox className="h-16 w-16 mb-6 opacity-10 text-emerald-500" />
          <p className="text-2xl font-black text-slate-400 tracking-tight">No safety observations found</p>
          <p className="text-sm mt-2 opacity-60">Systematic observation prevents future incidents.</p>
        </div>
      )}
    </div>
  );
}
