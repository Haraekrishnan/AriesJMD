'use client';

import React, { useState, useMemo } from 'react';
import { useEhs } from '@/contexts/ehs-provider';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, ShieldCheck, MapPin, Calendar, ChevronRight, PlusCircle, Search, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

const riskColors: Record<string, string> = {
  'Low': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Medium': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'High': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'Critical': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const raSchema = z.object({
  activityName: z.string().min(1, 'Activity name is required'),
  projectId: z.string().min(1, 'Location is required'),
  riskLevel: z.enum(['Low', 'Medium', 'High', 'Critical']),
  hazards: z.string().min(1, 'At least one hazard is required'),
  controls: z.string().min(1, 'At least one control measure is required'),
});

type RaFormValues = z.infer<typeof raSchema>;

export default function EhsRiskAssessmentsPage() {
  const { riskAssessments, addRiskAssessment } = useEhs();
  const { user } = useAuth();
  const { projects } = useGeneral();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<RaFormValues>({
    resolver: zodResolver(raSchema),
    defaultValues: { riskLevel: 'Medium', projectId: '' },
  });

  const filteredAssessments = useMemo(() => {
    return riskAssessments.filter(ra => {
      const projectName = projects.find(p => p.id === ra.projectId)?.name || '';
      return (
        ra.activityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        projectName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }).sort((a, b) => parseISO(b.reviewDate).getTime() - parseISO(a.reviewDate).getTime());
  }, [riskAssessments, searchTerm, projects]);

  const onSubmit = (data: RaFormValues) => {
    if (!user) return;

    addRiskAssessment({
      ...data,
      hazards: data.hazards.split(',').map(h => h.trim()),
      controls: data.controls.split(',').map(c => c.trim()),
      reviewedBy: user.name,
      reviewDate: new Date().toISOString(),
    });
    
    toast({ title: 'JSA Registered', description: 'The risk assessment has been successfully added to the system.' });
    setIsDialogOpen(false);
    form.reset();
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Risk Assessments (JSA/HIRA)</h1>
          <p className="text-slate-400">Identify hazards and establish control measures for organizational safety.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/20 px-6">
              <PlusCircle className="mr-2 h-4 w-4" /> New JSA / Assessment
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-white">Create New Assessment</DialogTitle>
              <DialogDescription className="text-slate-400">Document hazard identification and mitigation strategies for site activities.</DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-slate-400">Activity / Task Name</Label>
                <Input {...form.register('activityName')} className="bg-slate-800 border-slate-700 text-white focus:ring-emerald-500/20" placeholder="e.g., Working at Heights - Site Tower" />
                {form.formState.errors.activityName && <p className="text-xs text-rose-400">{form.formState.errors.activityName.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-400">Site Location</Label>
                  <Controller
                    control={form.control}
                    name="projectId"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="bg-slate-800 border-slate-700">
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
                  <Label className="text-slate-400">Residual Risk Level</Label>
                  <Controller
                    control={form.control}
                    name="riskLevel"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="bg-slate-800 border-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                          <SelectItem value="Low">Low Risk</SelectItem>
                          <SelectItem value="Medium">Medium Risk</SelectItem>
                          <SelectItem value="High">High Risk</SelectItem>
                          <SelectItem value="Critical">Critical Risk</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-400">Identified Hazards</Label>
                <Input {...form.register('hazards')} className="bg-slate-800 border-slate-700 text-white" placeholder="Hazard 1, Hazard 2, ..." />
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Separate multiple items with commas</p>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-400">Control Measures</Label>
                <Input {...form.register('controls')} className="bg-slate-800 border-slate-700 text-white" placeholder="Control 1, Control 2, ..." />
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Separate multiple items with commas</p>
              </div>

              <DialogFooter className="pt-4">
                <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)} className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</Button>
                <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600 font-bold">Register Assessment</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
        <Input 
          placeholder="Search assessments by activity name or site location..." 
          className="pl-12 h-14 bg-slate-900/40 border-slate-800 text-slate-200 rounded-2xl focus:ring-emerald-500/20 transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredAssessments.map((ra) => {
          const site = projects.find(p => p.id === ra.projectId);
          return (
            <Card key={ra.id} className="bg-slate-900 border-slate-800 overflow-hidden group shadow-xl">
              <div className="flex items-stretch h-full">
                <div className={cn("w-2", riskColors[ra.riskLevel]?.split(' ')[0] || 'bg-slate-800')} />
                <div className="flex-1 p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-white group-hover:text-emerald-400 transition-colors tracking-tight">{ra.activityName}</h3>
                      <div className="flex items-center gap-6 mt-3 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                         <span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {site?.name || 'Unknown Site'}</span>
                         <span className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> Valid From: {format(parseISO(ra.reviewDate), 'dd MMM yyyy')}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("px-4 py-1.5 font-black uppercase text-[10px] tracking-widest", riskColors[ra.riskLevel])}>
                      {ra.riskLevel} RESIDUAL RISK
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div>
                      <h4 className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] mb-4">Identified Hazards</h4>
                      <div className="flex flex-wrap gap-2">
                        {ra.hazards.map((h, i) => (
                          <span key={i} className="text-xs bg-slate-800/80 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-xl font-semibold">
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] mb-4">Mitigation & Controls</h4>
                      <div className="flex flex-wrap gap-2">
                        {ra.controls.map((c, i) => (
                          <span key={i} className="text-xs bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-xl font-semibold">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-slate-800/60 flex justify-between items-center">
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Reviewed By: {ra.reviewedBy}</p>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-full">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" className="text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl px-6 font-bold text-xs uppercase tracking-widest">
                        Access Method Statement <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      
      {filteredAssessments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 text-slate-500 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem]">
           <ShieldCheck className="h-20 w-20 mb-8 opacity-10 text-emerald-500" />
           <p className="text-2xl font-black text-slate-400 tracking-tight">No assessments in library</p>
           <p className="text-sm opacity-60 mt-2">Create assessments to standardize safety protocols for tasks.</p>
        </div>
      )}
    </div>
  );
}
