'use client';

import React, { useState, useMemo } from 'react';
import { useEhs } from '@/contexts/ehs-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search, MapPin, Calendar, Eye, Users, FileWarning } from 'lucide-react';
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
  location: z.string().min(1, 'Location is required'),
  description: z.string().min(5, 'Detailed description is required'),
  immediateActions: z.string().min(5, 'Immediate actions taken is required'),
});

type IncidentFormValues = z.infer<typeof incidentSchema>;

export default function EhsIncidentsPage() {
  const { incidents, addIncident } = useEhs();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsOpen] = useState(false);

  const form = useForm<IncidentFormValues>({
    resolver: zodResolver(incidentSchema),
    defaultValues: { type: 'Near Miss', date: format(new Date(), 'yyyy-MM-dd') },
  });

  const filteredIncidents = useMemo(() => {
    return incidents.filter(i => 
      i.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.type.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [incidents, searchTerm]);

  const onSubmit = (data: IncidentFormValues) => {
    addIncident({
      ...data,
      reporterId: 'current-user',
      status: 'Open',
    });
    toast({ title: 'Incident Reported', description: 'The safety incident has been logged for investigation.' });
    setIsOpen(false);
    form.reset();
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Incident Management</h1>
          <p className="text-slate-400">Track, investigate and resolve workplace safety incidents.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-rose-500 hover:bg-rose-600 text-white font-semibold">
              <Plus className="mr-2 h-4 w-4" /> Report New Incident
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Report Safety Incident</DialogTitle>
              <DialogDescription className="text-slate-400">Immediate reporting of unsafe incidents, near misses, or injuries.</DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Incident Type</Label>
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
                  <Label>Date of Incident</Label>
                  <Input type="date" {...form.register('date')} className="bg-slate-800 border-slate-700" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Specific Location</Label>
                <Input {...form.register('location')} className="bg-slate-800 border-slate-700" placeholder="e.g., Workshop B, Floor 2" />
              </div>
              <div className="space-y-2">
                <Label>Detailed Description</Label>
                <Textarea {...form.register('description')} className="bg-slate-800 border-slate-700 min-h-[100px]" placeholder="Explain what happened..." />
              </div>
              <div className="space-y-2">
                <Label>Immediate Actions Taken</Label>
                <Textarea {...form.register('immediateActions')} className="bg-slate-800 border-slate-700" placeholder="Corrective measures taken immediately..." />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpen(false)} className="bg-transparent border-slate-700 text-slate-300">Cancel</Button>
                <Button type="submit" className="bg-rose-500 hover:bg-rose-600">Submit Report</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Search incidents by location, type or description..." 
            className="pl-10 bg-slate-900 border-slate-800 text-slate-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredIncidents.map((incident) => (
          <Card key={incident.id} className="bg-slate-900 border-slate-800 hover:bg-slate-900/80 transition-all border-l-4 border-l-rose-500/50">
            <CardContent className="p-0">
               <div className="flex flex-col md:flex-row md:items-center">
                 <div className="p-6 flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                       <Badge variant="outline" className={cn("uppercase text-[10px] tracking-widest font-black", incidentTypeColors[incident.type])}>
                         {incident.type}
                       </Badge>
                       <span className="text-slate-600">/</span>
                       <span className="text-xs text-slate-500 font-bold">{format(parseISO(incident.date), 'PPP')}</span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white line-clamp-1">{incident.description}</h3>
                    
                    <div className="flex flex-wrap items-center gap-6 text-sm text-slate-400">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-500" />
                        {incident.location}
                      </div>
                      <div className="flex items-center gap-2 text-xs bg-slate-800 px-2 py-1 rounded">
                        <Badge variant="outline" className={cn(
                          incident.status === 'Open' ? "text-rose-400" : 
                          incident.status === 'Under Investigation' ? "text-amber-400" : "text-emerald-400"
                        )}>
                          {incident.status}
                        </Badge>
                      </div>
                    </div>
                 </div>
                 
                 <div className="p-6 md:border-l border-slate-800 flex items-center gap-4 bg-slate-900/40">
                   <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800">
                     <Eye className="h-5 w-5 mr-2" />
                     Details
                   </Button>
                   <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800">
                     <Users className="h-5 w-5 mr-2" />
                     Involve
                   </Button>
                 </div>
               </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {filteredIncidents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
          <FileWarning className="h-12 w-12 mb-4 opacity-20" />
          <p className="text-lg font-semibold">No incidents found.</p>
          <p className="text-sm">Matching reported incidents will appear here.</p>
        </div>
      )}
    </div>
  );
}
