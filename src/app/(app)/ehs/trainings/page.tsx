'use client';

import React, { useState, useMemo } from 'react';
import { useEhs } from '@/contexts/ehs-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, GraduationCap, Clock, Trophy, Play } from 'lucide-react';
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

const trainingSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  type: z.enum(['Induction', 'Toolbox', 'Specialized']),
  date: z.string().min(1, 'Date is required'),
  trainer: z.string().min(1, 'Trainer name is required'),
  attendeesCount: z.coerce.number().min(1, 'At least one attendee required'),
});

type TrainingFormValues = z.infer<typeof trainingSchema>;

export default function EhsTrainingsPage() {
  const { trainings, addTraining } = useEhs();
  const { toast } = useToast();
  const [isDialogOpen, setIsOpen] = useState(false);

  const form = useForm<TrainingFormValues>({
    resolver: zodResolver(trainingSchema),
    defaultValues: { type: 'Toolbox', date: format(new Date(), 'yyyy-MM-dd') },
  });

  const onSubmit = (data: TrainingFormValues) => {
    addTraining({
      ...data,
      attendees: Array(data.attendeesCount).fill('attendee-id'),
    });
    toast({ title: 'Training Registered', description: 'The training session has been successfully logged.' });
    setIsOpen(false);
    form.reset();
  };

  const sortedTrainings = useMemo(() => {
    return [...trainings].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [trainings]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Safety Trainings</h1>
          <p className="text-slate-400">Track workforce competency and toolbox talk records.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold">
               Register Training Session
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-800 text-white">
            <DialogHeader>
              <DialogTitle>Log Training Session</DialogTitle>
              <DialogDescription className="text-slate-400">Record a safety induction, toolbox talk, or specialized training event.</DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Topic / Module Title</Label>
                <Input {...form.register('topic')} className="bg-slate-800 border-slate-700" placeholder="e.g., Fire Safety Level 1" />
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
                          <SelectItem value="Induction">Safety Induction</SelectItem>
                          <SelectItem value="Toolbox">Toolbox Talk</SelectItem>
                          <SelectItem value="Specialized">Specialized Certification</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" {...form.register('date')} className="bg-slate-800 border-slate-700" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Trainer / Issuer</Label>
                  <Input {...form.register('trainer')} className="bg-slate-800 border-slate-700" placeholder="Name" />
                </div>
                <div className="space-y-2">
                  <Label>Attendees Count</Label>
                  <Input type="number" {...form.register('attendeesCount')} className="bg-slate-800 border-slate-700" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpen(false)} className="bg-transparent border-slate-700 text-slate-300">Cancel</Button>
                <Button type="submit" className="bg-indigo-500 hover:bg-indigo-600">Register</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
           <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
             <Play className="h-5 w-5 text-emerald-400" /> Current Competency Programs
           </h2>
           
           {[
             { title: 'Working at Heights Level 3', progress: 85, attendees: 124, expires: '15 Days' },
             { title: 'Advanced Fire Fighting', progress: 42, attendees: 32, expires: '3 Months' },
             { title: 'Emergency First Aid at Work', progress: 92, attendees: 256, expires: 'Never' },
           ].map((course, i) => (
             <Card key={i} className="bg-slate-900 border-slate-800">
               <CardContent className="p-6">
                 <div className="flex justify-between items-start mb-6">
                   <div>
                     <h3 className="text-white font-bold text-lg">{course.title}</h3>
                     <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">
                       {course.attendees} Employees Enrolled
                     </p>
                   </div>
                   <Badge variant="outline" className="text-[10px] border-indigo-500/50 text-indigo-400">
                     Recertification: {course.expires}
                   </Badge>
                 </div>
                 
                 <div className="space-y-2">
                   <div className="flex justify-between text-xs font-semibold">
                     <span className="text-slate-400">Compliance Progress</span>
                     <span className="text-emerald-400">{course.progress}%</span>
                   </div>
                   <Progress value={course.progress} className="h-2 bg-slate-800" />
                 </div>
               </CardContent>
             </Card>
           ))}
        </div>

        <div className="space-y-6">
           <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
             <Clock className="h-5 w-5 text-indigo-400" /> Recent Sessions
           </h2>
           
           <div className="space-y-4">
              {sortedTrainings.map(t => (
                <div key={t.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex gap-4 items-start">
                  <div className="bg-slate-800 p-2 rounded-lg">
                    <GraduationCap className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-200 truncate">{t.topic}</p>
                    <p className="text-xs text-slate-500 mt-1">{t.trainer} &middot; {format(parseISO(t.date), 'dd MMM')}</p>
                    <div className="mt-3 flex items-center gap-1">
                      <Users className="h-3 w-3 text-slate-600" />
                      <span className="text-[10px] font-bold text-slate-600 uppercase">{t.attendees.length} Participants</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {trainings.length === 0 && (
                <p className="text-center text-slate-600 text-sm py-10 italic">No recent training records.</p>
              )}
           </div>
           
           <Card className="bg-indigo-600 border-none text-white overflow-hidden relative">
              <CardContent className="p-6">
                <Trophy className="h-12 w-12 mb-4 opacity-30" />
                <h3 className="text-xl font-bold">Training Excellence</h3>
                <p className="text-sm opacity-80 mt-1">98% of workforce is currently safety induction compliant.</p>
                <Button variant="outline" className="mt-4 border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs">
                  View Achievements
                </Button>
              </CardContent>
              <div className="absolute top-0 right-0 -mr-4 -mt-4 h-24 w-24 bg-white/5 rounded-full blur-2xl" />
           </Card>
        </div>
      </div>
    </div>
  );
}
