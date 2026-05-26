'use client';

import React, { useState, useMemo } from 'react';
import { useEhs } from '@/contexts/ehs-provider';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search, MapPin, Calendar, Eye, Users, FileWarning, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

const incidentTypeColors: Record<string, string> = {
  'Near Miss': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'LTI': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  'Minor Injury': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'Environmental': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Property Damage': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const incidentSchema = z.object({
  type: z.enum(['Near Miss', 'Minor Injury', 'LTI', 'Fatality', 'Environmental', 'Property Damage']),
  date: z.string().min(1, 'Date is required'),
  projectId: z.string().min(1, 'Site is required'),
  location: z.string().min(1, 'Specific location is required'),
  description: z.string().min(5, 'Detailed description is required'),
  immediateActions: z.string().min(5, 'Immediate actions taken is required'),
});

type IncidentFormValues = z.infer<typeof incidentSchema>;

export default function EhsIncidentsPage() {
  const { incidents, addIncident } = useEhs();
  const { user } = useAuth();
  const { projects } = useGeneral();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<IncidentFormValues>({
    resolver: zodResolver(incidentSchema),
    defaultValues: { type: 'Near Miss', date: format(new Date(), 'yyyy-MM-dd'), projectId: '' },
  });

  const filteredIncidents = useMemo(() => {
    return incidents.filter(i => {
      const projectName = projects.find(p => p.id === i.projectId)?.name || '';
      return (
        i.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }).sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [incidents, searchTerm, projects]);

  const onSubmit = (data: IncidentFormValues) => {
    if (!user) return;
    
    addIncident({
      ...data,
      reporterId: user.id,
      status: 'Open',
    });
    
    toast({ title: 'Incident Logged', description: 'The safety incident has been reported for investigation.' });
    setIsDialogOpen(false);
    form.reset();
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Incident Management</h1>
          <p className="text-slate-400">Track, investigate and resolve workplace safety incidents.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-rose-500 hover:bg-rose-600 text-white font-bold shadow-lg shadow-rose-500/20 px-6">
              <Plus className="mr-2 h-4 w-4" /> Report New Incident
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-white text-xl">Report Safety Incident</DialogTitle>
              <DialogDescription className="text-slate-400">Immediate reporting of unsafe incidents, near misses, or injuries.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-400">Incident Type</Label>
                    <Controller
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="bg-slate-800 border-slate-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-800 text-white">
                            <SelectItem value="Near Miss">Near Miss</SelectItem>
                            <SelectItem value="Minor Injury">Minor Injury</SelectItem>
                            <SelectItem value="LTI">Lost Time Injury (LTI)</SelectItem>
                            <SelectItem value="Fatality">Fatality</SelectItem>
                            <SelectItem value="Environmental">Environmental</SelectItem>
                            <SelectItem value="Property Damage">Property Damage</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-400">Date of Incident</Label>
                    <Input type="date" {...form.register('date')} className="bg-slate-800 border-slate-700 text-white" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                    <Label className="text-slate-400">Site/Project</Label>
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
                    <Label className="text-slate-400">Specific Location</Label>
                    <Input {...form.register('location')} className="bg-slate-800 border-slate-700 text-white" placeholder="e.g., Workshop B" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-400">Detailed Description</Label>
                  <Textarea {...form.register('description')} className="bg-slate-800 border-slate-700 text-white min-h-[120px] focus:ring-rose-500/20" placeholder="Explain the sequence of events..." />
                  {form.formState.errors.description && <p className="text-xs text-rose-400">{form.formState.errors.description.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-400">Immediate Actions Taken</Label>
                  <Textarea {...form.register('immediateActions')} className="bg-slate-800 border-slate-700 text-white min-h-[100px] focus:ring-emerald-500/20" placeholder="Corrective measures taken to secure the area..." />
                  {form.formState.errors.immediateActions && <p className="text-xs text-rose-400">{form.formState.errors.immediateActions.message}</p>}
                </div>

                <DialogFooter className="pt-2">
                  <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)} className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">Cancel</Button>
                  <Button type="submit" className="bg-rose-500 hover:bg-rose-600 font-bold">Submit Incident Report</Button>
                </DialogFooter>
              </form>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
        <Input 
          placeholder="Search incidents by location, site, type or details..." 
          className="pl-12 h-14 bg-slate-900/50 border-slate-800 text-slate-200 rounded-2xl focus:ring-emerald-500/20"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-6">
        {filteredIncidents.map((incident) => {
          const site = projects.find(p => p.id === incident.projectId);
          return (
            <Card key={incident.id} className="bg-slate-900 border-slate-800 hover:bg-slate-900/80 transition-all border-l-4 border-l-rose-500/50 overflow-hidden shadow-xl">
              <CardContent className="p-0">
                 <div className="flex flex-col md:flex-row md:items-center">
                   <div className="p-8 flex-1 space-y-4">
                      <div className="flex items-center gap-3">
                         <Badge variant="outline" className={cn("uppercase text-[10px] tracking-[0.2em] font-black px-3 py-1", incidentTypeColors[incident.type])}>
                           {incident.type}
                         </Badge>
                         <span className="text-slate-700 font-black">|</span>
                         <span className="text-[11px] text-slate-500 font-black uppercase tracking-widest">{format(parseISO(incident.date), 'PPP')}</span>
                      </div>
                      
                      <h3 className="text-2xl font-bold text-white line-clamp-2 leading-tight">{incident.description}</h3>
                      
                      <div className="flex flex-wrap items-center gap-8 text-sm text-slate-400 pt-2">
                        <div className="flex items-center gap-2.5">
                          <div className="bg-slate-800 p-2 rounded-lg">
                            <MapPin className="h-4 w-4 text-emerald-400" />
                          </div>
                          <span className="font-bold">{site?.name || 'Unknown Site'} &middot; {incident.location}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={cn(
                            "font-black text-[10px] uppercase px-3",
                            incident.status === 'Open' ? "text-rose-400 border-rose-400/20" : 
                            incident.status === 'Under Investigation' ? "text-amber-400 border-amber-400/20" : "text-emerald-400 border-emerald-400/20"
                          )}>
                            {incident.status}
                          </Badge>
                        </div>
                      </div>
                   </div>
                   
                   <div className="p-8 md:border-l border-slate-800 flex items-center gap-4 bg-slate-900/30">
                     <Button variant="outline" className="border-slate-800 bg-slate-800/40 text-slate-300 hover:bg-slate-700 hover:text-white rounded-xl">
                       <Eye className="h-4 w-4 mr-2" /> Details
                     </Button>
                     <Button variant="outline" className="border-slate-800 bg-slate-800/40 text-slate-300 hover:bg-slate-700 hover:text-white rounded-xl">
                       <Users className="h-4 w-4 mr-2" /> Review
                     </Button>
                   </div>
                 </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {filteredIncidents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 text-slate-500 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[2.5rem]">
          <div className="p-6 bg-slate-900 rounded-3xl mb-6 shadow-2xl">
            <FileWarning className="h-12 w-12 opacity-30 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-slate-400 tracking-tight">No incident logs found</p>
          <p className="text-sm mt-2 opacity-60">Reporting unsafe conditions prevents actual accidents.</p>
        </div>
      )}
    </div>
  );
}
