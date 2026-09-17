'use client';

import React, { useState, useCallback } from 'react';
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
import { ShieldCheck, MapPin, AlertCircle, Plus, Info, X, Paperclip, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const initiateSchema = z.object({
  description: z.string().min(5, 'Narrative description must be detailed.'),
  category: z.enum(['Unsafe Act', 'Unsafe Condition', 'Safe Act', 'Near Miss', 'Environmental']).optional().default('Unsafe Act'),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']).optional().default('Medium'),
  projectId: z.string().optional().default(''),
  location: z.string().optional().default(''),
  discoveryAttachmentUrl: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof initiateSchema>;

export default function CapaInitiateDialog({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) {
  const { addObservation } = useEhs();
  const { projects } = useGeneral();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [pastedImage, setPastedImage] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(initiateSchema),
    defaultValues: { 
        category: 'Unsafe Act', 
        severity: 'Medium',
        projectId: '',
        location: '',
        description: '',
        discoveryAttachmentUrl: null
    }
  });

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const base64 = event.target?.result as string;
                    setPastedImage(base64);
                    form.setValue('discoveryAttachmentUrl', base64);
                    toast({ title: 'Image Evidence Captured', description: 'Photo attached to narrative.' });
                };
                reader.readAsDataURL(blob);
            }
        }
    }
  }, [form, toast]);

  const onSubmit = (data: FormValues) => {
    // Explicitly handle optional fields to ensure they don't break the provider
    const submissionData = {
        ...data,
        projectId: data.projectId || 'Unassigned',
        location: data.location || 'Location TBD'
    };
    
    addObservation(submissionData);
    onOpenChange(false);
    setStep(1);
    setPastedImage(null);
    form.reset();
  };

  const nextStep = async () => {
    const fieldsToValidate = step === 1 ? ['description'] : step === 2 ? ['category', 'severity'] : ['projectId', 'location'];
    const isValid = await form.trigger(fieldsToValidate as any);
    if (isValid) setStep(s => s + 1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { onOpenChange(v); if(!v) { setStep(1); setPastedImage(null); form.reset(); } }}>
      <DialogContent className="sm:max-w-3xl bg-white border-none shadow-2xl p-0 overflow-hidden rounded-[1.5rem]">
        <div className="flex h-[600px]">
          {/* --- OLD SCHOOL SIDEBAR --- */}
          <div className="w-56 bg-[#0F172A] p-8 text-white flex flex-col justify-between shrink-0">
            <div className="space-y-10">
                <div className="bg-[#10B981] h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg shadow-[#10B981]/20">
                    <ShieldCheck className="h-7 w-7 text-white" />
                </div>
                
                <nav className="space-y-6">
                    {[
                        { id: 1, label: 'DISCOVERY' },
                        { id: 2, label: 'CLASSIFICATION' },
                        { id: 3, label: 'LOGISTICS' }
                    ].map(item => (
                        <div key={item.id} className="flex items-center gap-4 group">
                            <div className={cn(
                                "h-2 w-2 rounded-full transition-all duration-500",
                                step === item.id ? "bg-[#10B981] ring-4 ring-[#10B981]/20 scale-125" : "bg-slate-700"
                            )} />
                            <span className={cn(
                                "text-[10px] font-black uppercase tracking-[0.2em] transition-colors",
                                step === item.id ? "text-white" : "text-slate-500"
                            )}>
                                {item.label}
                            </span>
                        </div>
                    ))}
                </nav>
            </div>
            
            <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">EHS GOVERNANCE V4.0</p>
                <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">ARIES MARINE GROUP</p>
            </div>
          </div>

          {/* --- MAIN WORKSPACE --- */}
          <div className="flex-1 flex flex-col bg-white relative">
            <div className="p-10 flex-1 overflow-y-auto">
                <DialogHeader className="mb-12">
                <DialogTitle className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-none">INITIATE OBSERVATION</DialogTitle>
                <DialogDescription className="font-bold text-slate-400 uppercase text-[10px] tracking-[0.2em] mt-2">Safety Lifecycle Stage 01: Initiation</DialogDescription>
                </DialogHeader>

                <div className="space-y-10">
                    {step === 1 && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                            <Label className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 ml-1">Safety Finding Narrative</Label>
                            <div className="relative group">
                                <Textarea 
                                    {...form.register('description')} 
                                    onPaste={handlePaste}
                                    placeholder="Describe the unsafe act or condition precisely..." 
                                    className="min-h-[220px] rounded-[1.5rem] p-8 font-bold text-sm bg-slate-50/50 border-2 border-slate-100 focus-visible:ring-[#10B981]/20 focus-visible:border-[#10B981]/50 shadow-inner resize-none leading-relaxed transition-all"
                                />
                                <div className="absolute bottom-4 right-6 flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest pointer-events-none opacity-50">
                                    <Paperclip className="h-3 w-3" /> PASTE IMAGES SUPPORTED
                                </div>
                            </div>
                            {pastedImage && (
                                <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl animate-in zoom-in-95 duration-300">
                                    <div className="h-12 w-12 rounded-lg border-2 border-white shadow-sm overflow-hidden shrink-0">
                                        <img src={pastedImage} alt="Pasted" className="h-full w-full object-cover" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Evidence Captured</p>
                                        <p className="text-[9px] font-bold text-emerald-600/70 uppercase">Image from clipboard attached</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-100 rounded-full" onClick={() => { setPastedImage(null); form.setValue('discoveryAttachmentUrl', null); }}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                            {form.formState.errors.description && <p className="text-xs text-rose-600 font-bold ml-2">{form.formState.errors.description.message}</p>}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="space-y-4">
                                <Label className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 ml-1">Classification (Optional)</Label>
                                <Controller
                                    control={form.control}
                                    name="category"
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className="h-14 rounded-2xl font-black uppercase text-[11px] border-2 border-slate-100 bg-slate-50/30 px-6 shadow-sm">
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
                                <Label className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 ml-1">Severity Index (Optional)</Label>
                                <Controller
                                    control={form.control}
                                    name="severity"
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className="h-14 rounded-2xl font-black uppercase text-[11px] border-2 border-slate-100 bg-slate-50/30 px-6 shadow-sm">
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
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="space-y-4">
                                <Label className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 ml-1">Primary Site (Optional)</Label>
                                <Controller
                                    control={form.control}
                                    name="projectId"
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className="h-14 rounded-2xl font-black uppercase text-[11px] border-2 border-slate-100 bg-slate-50/30 px-6 shadow-sm">
                                                <SelectValue placeholder="Select Operational Site" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="unassigned">Site Unassigned</SelectItem>
                                                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div className="space-y-4">
                                <Label className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 ml-1">Specific Unit/Area (Optional)</Label>
                                <Input {...form.register('location')} placeholder="e.g. Tank 201-A, Level 3" className="h-14 rounded-2xl font-bold border-2 border-slate-100 bg-slate-50/30 px-6 shadow-sm" />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <footer className="p-10 pt-4 bg-white flex justify-between items-center shrink-0">
                {step > 1 ? (
                    <Button type="button" variant="ghost" className="font-black uppercase text-[10px] tracking-[0.2em] text-slate-400 hover:text-slate-900" onClick={() => setStep(s => s - 1)}>
                        Back Track
                    </Button>
                ) : <div />}
                
                {step < 3 ? (
                    <Button 
                        type="button" 
                        className="h-14 px-12 bg-[#0F172A] text-white font-black uppercase text-[11px] tracking-[0.2em] rounded-2xl shadow-xl shadow-[#0F172A]/20 active:scale-95 transition-all" 
                        onClick={nextStep}
                    >
                        Next Phase
                    </Button>
                ) : (
                    <Button 
                        type="submit" 
                        onClick={form.handleSubmit(onSubmit)}
                        className="h-14 px-16 bg-[#10B981] hover:bg-[#059669] text-white font-black uppercase text-[11px] tracking-[0.2em] rounded-2xl shadow-xl shadow-[#10B981]/20 active:scale-95 transition-all"
                    >
                        Authorize Initiation <Check className="ml-3 h-4 w-4" />
                    </Button>
                )}
            </footer>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
