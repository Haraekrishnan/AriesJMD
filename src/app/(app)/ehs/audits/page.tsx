'use client';

import React, { useState, useMemo } from 'react';
import { useEhs } from '@/contexts/ehs-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search, Calendar, MapPin, ClipboardList, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';

const auditSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum(['Safety', 'Environmental', 'Health', 'Fire']),
  location: z.string().min(1, 'Location is required'),
  date: z.string().min(1, 'Date is required'),
  score: z.coerce.number().min(0).max(100),
});

type AuditFormValues = z.infer<typeof auditSchema>;

export default function EhsAuditsPage() {
  const { audits, addAudit } = useEhs();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsOpen] = useState(false);

  const form = useForm<AuditFormValues>({
    resolver: zodResolver(auditSchema),
    defaultValues: { type: 'Safety', score: 100, date: format(new Date(), 'yyyy-MM-dd') },
  });

  const filteredAudits = useMemo(() => {
    return audits.filter(a => 
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.location.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [audits, searchTerm]);

  const onSubmit = (data: AuditFormValues) => {
    addAudit({
      ...data,
      inspectorId: 'current-user', // In a real app, this would be user.id
      findings: [],
      status: 'Finalized',
    });
    toast({ title: 'Audit Scheduled', description: 'The audit record has been saved successfully.' });
    setIsOpen(false);
    form.reset();
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Audits & Inspections</h1>
          <p className="text-slate-400">Manage site walkthroughs and compliance verification.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold">
              <Plus className="mr-2 h-4 w-4" /> Schedule New Audit
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-800 text-white">
            <DialogHeader>
              <DialogTitle>Schedule Site Audit</DialogTitle>
              <DialogDescription className="text-slate-400">Create a new inspection record for safety compliance tracking.</DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Audit Title</Label>
                <Input {...form.register('title')} className="bg-slate-800 border-slate-700" placeholder="e.g., Weekly Site Walkthrough" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Controller
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="bg-slate-800 border-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                          <SelectItem value="Safety">Safety</SelectItem>
                          <SelectItem value="Environmental">Environmental</SelectItem>
                          <SelectItem value="Health">Health</SelectItem>
                          <SelectItem value="Fire">Fire</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input {...form.register('location')} className="bg-slate-800 border-slate-700" placeholder="e.g., Site A" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" {...form.register('date')} className="bg-slate-800 border-slate-700" />
                </div>
                <div className="space-y-2">
                  <Label>Initial Score (%)</Label>
                  <Input type="number" {...form.register('score')} className="bg-slate-800 border-slate-700" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpen(false)} className="bg-transparent border-slate-700 text-slate-300">Cancel</Button>
                <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600">Save Record</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Search audits by title or site..." 
            className="pl-10 bg-slate-900 border-slate-800 text-slate-200 placeholder:text-slate-600"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredAudits.map((audit) => (
          <Card key={audit.id} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                   <Badge variant="outline" className="bg-slate-800 border-slate-700 text-emerald-400 mb-2">
                     {audit.type} Inspection
                   </Badge>
                  <CardTitle className="text-white text-xl">{audit.title}</CardTitle>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-emerald-400">{audit.score}%</div>
                  <p className="text-[10px] uppercase font-bold text-slate-500">Compliance</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  {format(parseISO(audit.date), 'dd MMM yyyy')}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-500" />
                  {audit.location}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500 uppercase tracking-wider">Score Visualization</span>
                  <span className="text-white">{audit.score}%</span>
                </div>
                <Progress value={audit.score} className="h-2 bg-slate-800" />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  {audit.status}
                </div>
                <Button variant="ghost" size="sm" className="text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300">
                  View Full Report
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {filteredAudits.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
          <ClipboardList className="h-12 w-12 mb-4 opacity-20" />
          <p className="text-lg">No audit records found.</p>
          <p className="text-sm">Matching scheduled audits will appear here.</p>
        </div>
      )}
    </div>
  );
}
