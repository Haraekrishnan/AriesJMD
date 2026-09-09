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
  'Low': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Medium': 'bg-amber-100 text-amber-700 border-amber-200',
  'High': 'bg-orange-100 text-orange-700 border-orange-200',
  'Critical': 'bg-rose-100 text-rose-700 border-rose-200',
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
    
    toast({ title: 'Risk Assessment Registered', description: 'The risk assessment has been successfully added to the system.' });
    setIsDialogOpen(false);
    form.reset();
  };

  return (
    <div className="space-y-8 text-slate-900">
      <div className="flex justify-between items-center text-left">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Risk Assessments</h1>
          <p className="text-slate-600 text-lg font-medium">Identify hazards and establish control measures for organizational safety.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg shadow-emerald-600/10 px-8 h-12 uppercase tracking-widest text-xs rounded-xl">
              <PlusCircle className="mr-2 h-4 w-4" /> New Risk Assessment
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white border-slate-200 text-slate-900 sm:max-w-xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-slate-900 uppercase font-black tracking-tight">Create New Assessment</DialogTitle>
              <DialogDescription className="text-slate-500 font-medium">Document hazard identification and mitigation strategies for site activities.</DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 text-left">
              <div className="space-y-2">
                <Label className="text-slate-900 font-black uppercase text-[10px] tracking-widest ml-1">Activity / Task Name</Label>
                <Input {...form.register('activityName')} className="h-12 rounded-xl font-bold focus-visible:ring-emerald-600/20" placeholder="e.g., Working at Heights - Site Tower" />
                {form.formState.errors.activityName && <p className="text-xs text-rose-600 font-bold">{form.formState.errors.activityName.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-900 font-black uppercase text-[10px] tracking-widest ml-1">Site Location</Label>
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
                  <Label className="text-slate-900 font-black uppercase text-[10px] tracking-widest ml-1">Residual Risk Level</Label>
                  <Controller
                    control={form.control}
                    name="riskLevel"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="h-12 rounded-xl font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
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
                <Label className="text-slate-900 font-black uppercase text-[10px] tracking-widest ml-1">Identified Hazards</Label>
                <Input {...form.register('hazards')} className="h-12 rounded-xl font-bold" placeholder="Hazard 1, Hazard 2, ..." />
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.15em] ml-1">Separate multiple items with commas</p>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-900 font-black uppercase text-[10px] tracking-widest ml-1">Control Measures</Label>
                <Input {...form.register('controls')} className="h-12 rounded-xl font-bold" placeholder="Control 1, Control 2, ..." />
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.15em] ml-1">Separate multiple items with commas</p>
              </div>

              <DialogFooter className="pt-4 gap-4">
                <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)} className="h-12 rounded-xl font-bold px-8">Cancel</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-10 uppercase text-xs tracking-widest h-12 rounded-xl shadow-lg shadow-emerald-600/10">Register Assessment</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input 
          placeholder="Search assessments by activity name or site location..." 
          className="pl-12 h-14 bg-white border-slate-200 text-slate-900 rounded-2xl focus-visible:ring-emerald-600/20 transition-all font-medium shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 text-left">
        {filteredAssessments.map((ra) => {
          const site = projects.find(p => p.id === ra.projectId);
          return (
            <Card key={ra.id} className="bg-white border-slate-200 overflow-hidden group shadow-sm hover:shadow-md hover:border-emerald-600/20 transition-all duration-300">
              <div className="flex items-stretch h-full">
                <div className={cn("w-2", riskColors[ra.riskLevel]?.split(' ')[0] || 'bg-slate-300')} />
                <div className="flex-1 p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 group-hover:text-emerald-600 transition-colors tracking-tight uppercase">{ra.activityName}</h3>
                      <div className="flex items-center gap-6 mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                         <span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-emerald-600" /> {site?.name || 'Unknown Site'}</span>
                         <span className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-emerald-600" /> Valid From: {format(parseISO(ra.reviewDate), 'dd MMM yyyy')}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("px-4 py-1.5 font-black uppercase text-[10px] tracking-widest bg-white border-2", riskColors[ra.riskLevel])}>
                      {ra.riskLevel} RESIDUAL RISK
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div>
                      <h4 className="text-[10px] uppercase font-black text-emerald-600 tracking-[0.25em] mb-4 border-b border-emerald-600/10 pb-2">Identified Hazards</h4>
                      <div className="flex flex-wrap gap-2">
                        {ra.hazards.map((h, i) => (
                          <span key={i} className="text-xs bg-slate-50 border border-slate-100 text-slate-700 px-3 py-1.5 rounded-xl font-bold tracking-tight">
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[10px] uppercase font-black text-blue-600 tracking-[0.25em] mb-4 border-b border-blue-600/10 pb-2">Mitigation & Controls</h4>
                      <div className="flex flex-wrap gap-2">
                        {ra.controls.map((c, i) => (
                          <span key={i} className="text-xs bg-blue-50 border border-blue-100 text-blue-700 px-3 py-1.5 rounded-xl font-bold tracking-tight">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Reviewed By: <span className="text-slate-900">{ra.reviewedBy}</span></p>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" className="text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl px-6 font-black text-[10px] uppercase tracking-[0.2em]">
                        Access Method Statement <ChevronRight className="ml-2 h-4 w-4 text-emerald-600" />
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
        <div className="flex flex-col items-center justify-center py-32 text-slate-400 bg-white border-2 border-dashed border-slate-200 rounded-[3rem]">
           <ShieldCheck className="h-20 w-20 mb-8 opacity-20 text-emerald-600" />
           <p className="text-2xl font-black text-slate-900 tracking-tight uppercase">No assessments in library</p>
           <p className="text-sm opacity-80 mt-2 font-medium">Create assessments to standardize safety protocols for site tasks.</p>
        </div>
      )}
    </div>
  );
}
