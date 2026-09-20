'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('new') === '1') {
      setIsDialogOpen(true);
      url.searchParams.delete('new');
      window.history.replaceState(window.history.state, '', url.toString());
    }
  }, []);
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
    <div className="p-5 md:p-8 max-w-[1600px] mx-auto space-y-8 text-slate-900">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Safety Trainings</h1>
          <p className="text-slate-600 font-medium">Track workforce competency and toolbox talk records.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-600/20 px-8 h-12 rounded-xl normal-case text-xs tracking-normal">
               <GraduationCap className="mr-2 h-4 w-4" /> Register Session
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white border-slate-200 text-slate-900 sm:max-w-lg shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-slate-900 font-semibold normal-case">Log Training Session</DialogTitle>
              <DialogDescription className="text-slate-500 font-medium">Record a safety induction, toolbox talk, or specialized training event.</DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-slate-900 font-semibold normal-case text-sm tracking-normal ml-1">Training Module Title</Label>
                <Input {...form.register('topic')} className="h-12 rounded-xl font-bold" placeholder="e.g., Fire Safety Level 1" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-900 font-semibold normal-case text-sm tracking-normal ml-1">Session Type</Label>
                  <Controller
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="h-12 rounded-xl font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Induction">Safety Induction</SelectItem>
                          <SelectItem value="Toolbox">Toolbox Talk</SelectItem>
                          <SelectItem value="Specialized">Specialized Certification</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-900 font-semibold normal-case text-sm tracking-normal ml-1">Date Held</Label>
                  <Input type="date" {...form.register('date')} className="h-12 rounded-xl font-bold" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-900 font-semibold normal-case text-sm tracking-normal ml-1">Participants ({selectedAttendeeIds.length})</Label>
                <Controller
                  control={form.control}
                  name="attendees"
                  render={({ field }) => (
                    <Popover open={isAttendeePopoverOpen} onOpenChange={setIsAttendeePopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-full justify-between bg-white border-slate-200 text-slate-700 h-12 rounded-xl font-bold">
                          {selectedAttendeeIds.length > 0 ? `${selectedAttendeeIds.length} Selected` : "Select attendees..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command className="bg-white">
                          <CommandInput placeholder="Search manpower..." className="font-medium" />
                          <CommandList>
                            <CommandEmpty>No personnel found.</CommandEmpty>
                            <CommandGroup className="text-slate-700">
                              <ScrollArea className="h-64">
                                {manpowerProfiles.map(p => (
                                  <CommandItem
                                    key={p.id}
                                    onSelect={() => {
                                      const isSelected = selectedAttendeeIds.includes(p.id);
                                      field.onChange(isSelected ? selectedAttendeeIds.filter(id => id !== p.id) : [...selectedAttendeeIds, p.id]);
                                    }}
                                    className="hover:bg-slate-50 cursor-pointer font-bold"
                                  >
                                    <Check className={cn("mr-2 h-4 w-4 text-emerald-600", selectedAttendeeIds.includes(p.id) ? "opacity-100" : "opacity-0")} />
                                    {p.name} <span className="text-sm text-slate-400 font-semibold ml-2 normal-case">({p.trade})</span>
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

              <DialogFooter className="pt-4 gap-4">
                <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)} className="h-12 rounded-xl font-bold px-8">Cancel</Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 font-semibold h-12 rounded-xl px-6 shadow-lg shadow-indigo-600/10 normal-case text-xs tracking-normal text-white">Register Session</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-8 text-left">
           <h2 className="text-sm font-semibold text-slate-400 normal-case tracking-normal flex items-center gap-3">
             <Play className="h-4 w-4 text-emerald-600 fill-emerald-600" /> Active Programs
           </h2>
           
           {[
             { title: 'Working at Heights Level 3', progress: 85, attendees: 124, expires: '15 Days', color: 'bg-emerald-600' },
             { title: 'Advanced Fire Fighting', progress: 42, attendees: 32, expires: '3 Months', color: 'bg-amber-600' },
             { title: 'Emergency First Aid at Work', progress: 92, attendees: 256, expires: 'Never', color: 'bg-blue-600' },
           ].map((course, i) => (
             <Card key={i} className="bg-white border-slate-200 shadow-sm overflow-hidden group hover:shadow-md transition-all">
               <CardContent className="p-8">
                 <div className="flex justify-between items-start mb-8">
                   <div>
                     <h3 className="text-slate-900 font-semibold text-xl group-hover:text-emerald-600 transition-colors normal-case tracking-tight">{course.title}</h3>
                     <p className="text-sm text-slate-500 mt-2 normal-case font-semibold tracking-normal">
                       {course.attendees} Employees Enrolled &middot; Org Certified
                     </p>
                   </div>
                   <Badge variant="outline" className="text-sm font-semibold border-slate-200 bg-slate-50 text-slate-700 px-4 py-1.5 normal-case tracking-normal">
                     Cycle: {course.expires}
                   </Badge>
                 </div>
                 
                 <div className="space-y-4">
                   <div className="flex justify-between text-sm font-semibold normal-case tracking-normal">
                     <span className="text-slate-400">Total Compliance Health</span>
                     <span className="text-slate-900">{course.progress}%</span>
                   </div>
                   <Progress value={course.progress} className="h-2.5 bg-slate-100" />
                 </div>
               </CardContent>
             </Card>
           ))}
        </div>

        <div className="space-y-8 text-left">
           <h2 className="text-sm font-semibold text-slate-400 normal-case tracking-normal flex items-center gap-3">
             <Clock className="h-4 w-4 text-indigo-600" /> Activity Log
           </h2>
           
           <div className="space-y-4">
              {sortedTrainings.map(t => (
                <div key={t.id} className="bg-white border border-slate-200 rounded-xl p-6 flex gap-6 items-start hover:shadow-md transition-all shadow-sm">
                  <div className="bg-slate-100 p-3 rounded-2xl">
                    <GraduationCap className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-slate-900 truncate tracking-tight normal-case">{t.topic}</p>
                    <p className="text-sm text-slate-500 mt-2 font-semibold normal-case tracking-normal">{t.trainer} &middot; {format(parseISO(t.date), 'dd MMM')}</p>
                    <div className="mt-4 flex items-center gap-2">
                      <Users className="h-3 w-3 text-emerald-600" />
                      <span className="text-sm font-semibold text-emerald-600 normal-case tracking-normal">{t.attendees.length} PARTICIPANTS</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {trainings.length === 0 && (
                <div className="text-center py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
                   <p className="text-slate-400 font-semibold text-sm normal-case tracking-normal">No recent sessions.</p>
                </div>
              )}
           </div>
           
           <Card className="bg-indigo-600 border-none text-white overflow-hidden relative shadow-2xl rounded-xl">
              <CardContent className="p-8 relative z-10">
                <Trophy className="h-12 w-12 mb-6 opacity-30" />
                <h3 className="text-2xl font-semibold tracking-normal leading-none normal-case">Org Achievement</h3>
                <p className="text-sm opacity-80 mt-2 font-bold leading-relaxed">98% of workforce is currently safety induction compliant for Q1 2026.</p>
                <Button variant="outline" className="mt-8 border-white/20 bg-white/10 hover:bg-white text-indigo-600 hover:text-indigo-600 text-sm font-semibold normal-case tracking-normal h-12 px-8 rounded-xl w-full">
                  View Awards
                </Button>
              </CardContent>
              <div className="absolute top-0 right-0 -mr-8 -mt-8 h-40 w-40 bg-white/10 rounded-full blur-3xl" />
           </Card>
        </div>
      </div>
    </div>
  );
}
