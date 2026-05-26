'use client';

import React, { useState, useMemo } from 'react';
import { useEhs } from '@/contexts/ehs-provider';
import { useAuth } from '@/contexts/auth-provider';
import { useManpower } from '@/contexts/manpower-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, GraduationCap, Clock, Trophy, Play, Check, ChevronsUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const trainingSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  type: z.enum(['Induction', 'Toolbox', 'Specialized']),
  date: z.string().min(1, 'Date is required'),
  attendees: z.array(z.string()).min(1, 'Select at least one attendee'),
});

type TrainingFormValues = z.infer<typeof trainingSchema>;

export default function EhsTrainingsPage() {
  const { trainings, addTraining } = useEhs();
  const { user } = useAuth();
  const { manpowerProfiles } = useManpower();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAttendeePopoverOpen, setIsAttendeePopoverOpen] = useState(false);

  const form = useForm<TrainingFormValues>({
    resolver: zodResolver(trainingSchema),
    defaultValues: { type: 'Toolbox', date: format(new Date(), 'yyyy-MM-dd'), attendees: [] },
  });

  const selectedAttendeeIds = form.watch('attendees') || [];

  const onSubmit = (data: TrainingFormValues) => {
    if (!user) return;
    
    addTraining({
      ...data,
      trainer: user.name,
    });
    
    toast({ title: 'Session Registered', description: 'Workforce competency record has been updated.' });
    setIsDialogOpen(false);
    form.reset();
  };

  const sortedTrainings = useMemo(() => {
    return [...trainings].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [trainings]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Safety Trainings</h1>
          <p className="text-slate-400">Track workforce competency and toolbox talk records.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/20 px-6">
               <GraduationCap className="mr-2 h-4 w-4" /> Register Training Session
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white">Log Training Session</DialogTitle>
              <DialogDescription className="text-slate-400">Record a safety induction, toolbox talk, or specialized training event.</DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-slate-400">Training Module Title</Label>
                <Input {...form.register('topic')} className="bg-slate-800 border-slate-700 text-white" placeholder="e.g., Fire Safety Level 1" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-400">Session Type</Label>
                  <Controller
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="bg-slate-800 border-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                          <SelectItem value="Induction">Safety Induction</SelectItem>
                          <SelectItem value="Toolbox">Toolbox Talk</SelectItem>
                          <SelectItem value="Specialized">Specialized Certification</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400">Date Held</Label>
                  <Input type="date" {...form.register('date')} className="bg-slate-800 border-slate-700 text-white" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-400">Participants ({selectedAttendeeIds.length})</Label>
                <Controller
                  control={form.control}
                  name="attendees"
                  render={({ field }) => (
                    <Popover open={isAttendeePopoverOpen} onOpenChange={setIsAttendeePopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-full justify-between bg-slate-800 border-slate-700 text-slate-300">
                          {selectedAttendeeIds.length > 0 ? `${selectedAttendeeIds.length} Selected` : "Select attendees..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-slate-900 border-slate-800">
                        <Command className="bg-transparent">
                          <CommandInput placeholder="Search manpower..." className="text-white" />
                          <CommandList>
                            <CommandEmpty>No personnel found.</CommandEmpty>
                            <CommandGroup className="text-slate-400">
                              <ScrollArea className="h-64">
                                {manpowerProfiles.map(p => (
                                  <CommandItem
                                    key={p.id}
                                    onSelect={() => {
                                      const isSelected = selectedAttendeeIds.includes(p.id);
                                      field.onChange(isSelected ? selectedAttendeeIds.filter(id => id !== p.id) : [...selectedAttendeeIds, p.id]);
                                    }}
                                    className="hover:bg-slate-800 aria-selected:bg-slate-800"
                                  >
                                    <Check className={cn("mr-2 h-4 w-4 text-emerald-400", selectedAttendeeIds.includes(p.id) ? "opacity-100" : "opacity-0")} />
                                    {p.name} ({p.trade})
                                  </CommandItem>
                                ))}
                              </ScrollArea>
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                />
              </div>

              <DialogFooter className="pt-4">
                <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)} className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</Button>
                <Button type="submit" className="bg-indigo-500 hover:bg-indigo-600 font-bold">Register Session</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
           <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
             <Play className="h-5 w-5 text-emerald-400 fill-emerald-400" /> Competency Programs
           </h2>
           
           {[
             { title: 'Working at Heights Level 3', progress: 85, attendees: 124, expires: '15 Days' },
             { title: 'Advanced Fire Fighting', progress: 42, attendees: 32, expires: '3 Months' },
             { title: 'Emergency First Aid at Work', progress: 92, attendees: 256, expires: 'Never' },
           ].map((course, i) => (
             <Card key={i} className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden group">
               <CardContent className="p-8">
                 <div className="flex justify-between items-start mb-8">
                   <div>
                     <h3 className="text-white font-bold text-xl group-hover:text-emerald-400 transition-colors">{course.title}</h3>
                     <p className="text-[10px] text-slate-500 mt-2 uppercase font-black tracking-widest">
                       {course.attendees} Employees Enrolled &middot; Org Certified
                     </p>
                   </div>
                   <Badge variant="outline" className="text-[10px] font-black border-indigo-500/20 bg-indigo-500/5 text-indigo-400 px-3 py-1 uppercase tracking-widest">
                     Next Cycle: {course.expires}
                   </Badge>
                 </div>
                 
                 <div className="space-y-3">
                   <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                     <span className="text-slate-400">Total Compliance Status</span>
                     <span className="text-emerald-400">{course.progress}%</span>
                   </div>
                   <Progress value={course.progress} className="h-2 bg-slate-800" />
                 </div>
               </CardContent>
             </Card>
           ))}
        </div>

        <div className="space-y-8">
           <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
             <Clock className="h-5 w-5 text-indigo-400" /> Recent Log
           </h2>
           
           <div className="space-y-4">
              {sortedTrainings.map(t => (
                <div key={t.id} className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 flex gap-6 items-start hover:bg-slate-800/40 transition-colors shadow-lg">
                  <div className="bg-slate-800 p-3 rounded-xl">
                    <GraduationCap className="h-6 w-6 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-slate-200 truncate tracking-tight">{t.topic}</p>
                    <p className="text-xs text-slate-500 mt-2 font-medium">{t.trainer} &middot; {format(parseISO(t.date), 'dd MMM')}</p>
                    <div className="mt-4 flex items-center gap-2">
                      <Users className="h-3 w-3 text-slate-600" />
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{t.attendees.length} Verified Participants</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {trainings.length === 0 && (
                <div className="text-center py-20 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-3xl">
                   <p className="text-slate-600 font-bold text-sm italic">No recent sessions.</p>
                </div>
              )}
           </div>
           
           <Card className="bg-indigo-600 border-none text-white overflow-hidden relative shadow-2xl">
              <CardContent className="p-8">
                <Trophy className="h-12 w-12 mb-6 opacity-30" />
                <h3 className="text-2xl font-black tracking-tight leading-none">Safety Achievement</h3>
                <p className="text-sm opacity-80 mt-2 font-medium">98% of workforce is currently safety induction compliant for Q1.</p>
                <Button variant="outline" className="mt-6 border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase tracking-widest h-10 px-6 rounded-xl">
                  View Achievements
                </Button>
              </CardContent>
              <div className="absolute top-0 right-0 -mr-4 -mt-4 h-32 w-32 bg-white/5 rounded-full blur-2xl" />
           </Card>
        </div>
      </div>
    </div>
  );
}
