'use client';

import React, { useState, useMemo } from 'react';
import { useEhs } from '@/contexts/ehs-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, ShieldCheck, MapPin, Calendar, ChevronRight, PlusCircle, Search } from 'lucide-react';
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

const riskColors: Record<string, string> = {
  'Low': 'bg-emerald-500/10 text-emerald-400',
  'Medium': 'bg-amber-500/10 text-amber-400',
  'High': 'bg-orange-500/10 text-orange-400',
  'Critical': 'bg-rose-500/10 text-rose-400',
};

const raSchema = z.object({
  activityName: z.string().min(1, 'Activity name is required'),
  location: z.string().min(1, 'Location is required'),
  riskLevel: z.enum(['Low', 'Medium', 'High', 'Critical']),
  hazards: z.string().min(1, 'At least one hazard is required'),
  controls: z.string().min(1, 'At least one control measure is required'),
});

type RaFormValues = z.infer<typeof raSchema>;

export default function EhsRiskAssessmentsPage() {
  const { riskAssessments, addRiskAssessment } = useEhs();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsOpen] = useState(false);

  const form = useForm<RaFormValues>({
    resolver: zodResolver(raSchema),
    defaultValues: { riskLevel: 'Medium' },
  });

  const filteredAssessments = useMemo(() => {
    return riskAssessments.filter(ra => 
      ra.activityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ra.location.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => parseISO(b.reviewDate).getTime() - parseISO(a.reviewDate).getTime());
  }, [riskAssessments, searchTerm]);

  const onSubmit = (data: RaFormValues) => {
    addRiskAssessment({
      ...data,
      hazards: data.hazards.split(',').map(h => h.trim()),
      controls: data.controls.split(',').map(c => c.trim()),
      reviewedBy: 'Safety Officer',
      reviewDate: new Date().toISOString(),
    });
    toast({ title: 'RA Logged', description: 'New risk assessment has been added to the library.' });
    setIsOpen(false);
    form.reset();
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Risk Assessments (JSA/HIRA)</h1>
          <p className="text-slate-400">Identify hazards and establish control measures for all site activities.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold">
              <PlusCircle className="mr-2 h-4 w-4" /> New Risk Assessment
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>New JSA / Risk Assessment</DialogTitle>
              <DialogDescription className="text-slate-400">Document hazard identification and mitigation strategies for specific tasks.</DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Activity Name</Label>
                <Input {...form.register('activityName')} className="bg-slate-800 border-slate-700" placeholder="e.g., Working at Heights - Tower A" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input {...form.register('location')} className="bg-slate-800 border-slate-700" placeholder="e.g., Site A" />
                </div>
                <div className="space-y-2">
                  <Label>Residual Risk Level</Label>
                  <Controller
                    control={form.control}
                    name="riskLevel"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="bg-slate-800 border-slate-700">
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
              <div className="space-y-2">
                <Label>Identified Hazards (comma separated)</Label>
                <Input {...form.register('hazards')} className="bg-slate-800 border-slate-700" placeholder="e.g., Falling objects, Slippery surface" />
              </div>
              <div className="space-y-2">
                <Label>Control Measures (comma separated)</Label>
                <Input {...form.register('controls')} className="bg-slate-800 border-slate-700" placeholder="e.g., Harness safety, Safety netting" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpen(false)} className="bg-transparent border-slate-700 text-slate-300">Cancel</Button>
                <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600">Register RA</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Search risk assessments by activity or location..." 
            className="pl-10 bg-slate-900 border-slate-800 text-slate-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredAssessments.map((ra) => (
          <Card key={ra.id} className="bg-slate-900 border-slate-800 overflow-hidden group">
            <div className="flex items-stretch h-full">
              <div className={cn("w-2", riskColors[ra.riskLevel]?.split(' ')[0] || 'bg-slate-800')} />
              <div className="flex-1 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">{ra.activityName}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                       <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {ra.location}</span>
                       <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Reviewed: {format(parseISO(ra.reviewDate), 'dd MMM yyyy')}</span>
                    </div>
                  </div>
                  <Badge className={cn("px-4 py-1", riskColors[ra.riskLevel])}>
                    {ra.riskLevel} RISK
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">Identified Hazards</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {ra.hazards.map((h, i) => (
                        <span key={i} className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2 py-1 rounded">
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">Control Measures</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {ra.controls.map((c, i) => (
                        <span key={i} className="text-xs bg-emerald-500/5 border border-emerald-500/10 text-emerald-400/80 px-2 py-1 rounded">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-slate-800 flex justify-end">
                   <Button variant="ghost" className="text-slate-500 hover:text-white">
                     View Document <ChevronRight className="ml-2 h-4 w-4" />
                   </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      
      {filteredAssessments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
           <ShieldCheck className="h-16 w-16 mb-4 opacity-10" />
           <p className="text-lg">No risk assessments found matching your search.</p>
        </div>
      )}
    </div>
  );
}
