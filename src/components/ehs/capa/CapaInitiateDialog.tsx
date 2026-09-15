
'use client';

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEhs } from '@/contexts/ehs-provider';
import { useGeneral } from '@/contexts/general-provider';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, MapPin, AlertCircle, Plus, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const initiateSchema = z.object({
  description: z.string().min(5, 'Description must be technical and detailed.'),
  category: z.enum(['Unsafe Act', 'Unsafe Condition', 'Safe Act', 'Near Miss', 'Environmental']),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']),
  projectId: z.string().min(1, 'Site location is mandatory.'),
  location: z.string().min(1, 'Specific unit/area is mandatory.'),
});

type FormValues = z.infer<typeof initiateSchema>;

export default function CapaInitiateDialog({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) {
  const { addObservation } = useEhs();
  const { projects } = useGeneral();
  const { toast } = useToast();
  const [step, setStep] = useState(1);

  const form = useForm<FormValues>({
    resolver: zodResolver(initiateSchema),
    defaultValues: { category: 'Unsafe Act', severity: 'Medium' }
  });

  const onSubmit = (data: FormValues) => {
    addObservation(data);
    onOpenChange(false);
    setStep(1);
    form.reset();
  };

  const nextStep = async () => {
    const fieldsToValidate = step === 1 ? ['description'] : step === 2 ? ['category', 'severity'] : ['projectId', 'location'];
    const isValid = await form.trigger(fieldsToValidate as any);
    if (isValid) setStep(s => s + 1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { onOpenChange(v); if(!v) setStep(1); }}>
      <DialogContent className="sm:max-w-2xl bg-white border-none shadow-2xl p-0 overflow-hidden rounded-[2.5rem]">
        <div className="flex">
          {/* Sidebar Info */}
          <div className="w-48 bg-slate-900 p-8 text-white flex flex-col justify-between shrink-0">
            <div className="space-y-8">
                <div className="bg-emerald-500 h-10 w-10 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <ShieldCheck className="h-6 w-6" />
                </div>
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-3">
                            <div className={cn("h-1.5 w-1.5 rounded-full transition-all duration-500", step === i ? "bg-emerald-500 scale-150" : "bg-slate-700")} />
                            <span className={cn("text-[8px] font-black uppercase tracking-widest", step === i ? "text-white" : "text-slate-500")}>
                                {i === 1 ? 'Discovery' : i === 2 ? 'Classification' : 'Logistics'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
            <p className="text-[9px] font-bold text-slate-500 uppercase leading-relaxed tracking-wider">EHS Governance v4.0</p>
          </div>

          {/* Form Area */}
          <div className="flex-1 p-10">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">Initiate Discovery</DialogTitle>
              <DialogDescription className="font-bold text-slate-400 uppercase text-[9px] tracking-[0.2em]">Safety Lifecycle Stage 01: Initiation</DialogDescription>
            </DialogHeader>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {step === 1 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Safety Finding Narrative</Label>
                        <Textarea 
                            {...form.register('description')} 
                            placeholder="Describe the unsafe act or condition precisely..." 
                            className="min-h-[180px] rounded-3xl p-6 font-bold text-sm bg-slate-50 border-none focus-visible:ring-emerald-500/20 shadow-inner"
                        />
                        {form.formState.errors.description && <p className="text-xs text-rose-600 font-bold">{form.formState.errors.description.message}</p>}
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Observation Classification</Label>
                            <Controller
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger className="h-14 rounded-2xl font-black uppercase text-xs border-2">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
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
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Residual Risk Severity</Label>
                            <Controller
                                control={form.control}
                                name="severity"
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger className="h-14 rounded-2xl font-black uppercase text-xs border-2">
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
                )}

                {step === 3 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Primary Site Location</Label>
                            <Controller
                                control={form.control}
                                name="projectId"
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger className="h-14 rounded-2xl font-black uppercase text-xs border-2">
                                            <SelectValue placeholder="Select Operational Site" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Specific Unit / Area</Label>
                            <Input {...form.register('location')} placeholder="e.g. Tank 201-A, Platform Level 3" className="h-14 rounded-2xl font-bold border-2" />
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center pt-4">
                   {step > 1 ? (
                       <Button type="button" variant="ghost" className="font-black uppercase text-[10px] tracking-widest text-slate-400" onClick={() => setStep(s => s - 1)}>Back</Button>
                   ) : <div />}
                   
                   {step < 3 ? (
                       <Button type="button" className="h-14 px-10 bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl" onClick={nextStep}>Next Phase</Button>
                   ) : (
                       <Button type="submit" className="h-14 px-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl shadow-emerald-500/20">Authorize Initiation</Button>
                   )}
                </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

