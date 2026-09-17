
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
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEhs } from '@/contexts/ehs-provider';
import { useGeneral } from '@/contexts/general-provider';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, MapPin, AlertCircle, Plus, Info, X, Paperclip, Check, RotateCcw } from 'lucide-react';
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
                    toast({ title: 'Evidence Captured', description: 'Photo attached to narrative finding.' });
                };
                reader.readAsDataURL(blob);
            }
        }
    }
  }, [form, toast]);

  const onSubmit = (data: FormValues) => {
    const submissionData = {
        ...data,
        projectId: data.projectId || 'Unassigned',
        location: data.location || 'Location TBD'
    };
    
    addObservation(submissionData);
    onOpenChange(false);
    setPastedImage(null);
    form.reset();
  };

  const handleReset = () => {
    form.reset();
    setPastedImage(null);
    toast({ title: 'Interface Reset', description: 'Entries have been cleared.' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { onOpenChange(v); if(!v) { setPastedImage(null); form.reset(); } }}>
      <DialogContent className="sm:max-w-4xl bg-white border-none shadow-2xl p-0 overflow-hidden rounded-[1.5rem]">
        <div className="flex h-[700px]">
          {/* --- INDUSTRIAL SIDEBAR --- */}
          <div className="w-56 bg-[#0F172A] p-8 text-white flex flex-col justify-between shrink-0">
            <div className="space-y-12">
                <div className="bg-[#10B981] h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg shadow-[#10B981]/20">
                    <ShieldCheck className="h-7 w-7 text-white" />
                </div>
                
                <div className="space-y-6">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-white uppercase tracking-[0.2em]">PHASE 01</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-tight">INITIAL DISCOVERY & CAPTURE</p>
                    </div>
                    <Button 
                        variant="ghost" 
                        onClick={handleReset}
                        className="p-0 h-auto text-[9px] font-black text-slate-400 hover:text-white uppercase tracking-[0.2em] gap-2"
                    >
                        <RotateCcw className="h-3 w-3" /> RESET INTERFACE
                    </Button>
                </div>
            </div>
            
            <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">EHS GOVERNANCE V4.0</p>
                <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">ARIES MARINE GROUP</p>
            </div>
          </div>

          {/* --- UNIFIED TECHNICAL WORKSPACE --- */}
          <div className="flex-1 flex flex-col bg-white relative">
            <ScrollArea className="flex-1">
                <div className="p-10 pb-4">
                    <DialogHeader className="mb-10">
                        <DialogTitle className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-none">INITIATE OBSERVATION</DialogTitle>
                        <DialogDescription className="font-bold text-slate-400 uppercase text-[10px] tracking-[0.2em] mt-2">Safety Lifecycle Stage 01: Initiation</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10 text-left">
                        {/* Narrative Finding Section */}
                        <div className="space-y-5 animate-in fade-in duration-700">
                            <Label className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 ml-1 flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-[#10B981]" /> SAFETY FINDING NARRATIVE
                            </Label>
                            <div className="relative group">
                                <Textarea 
                                    {...form.register('description')} 
                                    onPaste={handlePaste}
                                    placeholder="Describe the unsafe act or condition precisely..." 
                                    className="min-h-[200px] rounded-[1.5rem] p-8 font-bold text-sm bg-slate-50/50 border-2 border-slate-100 focus-visible:ring-[#10B981]/20 focus-visible:border-[#10B981]/50 shadow-inner resize-none leading-relaxed transition-all"
                                />
                                <div className="absolute bottom-4 right-6 flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest pointer-events-none opacity-50">
                                    <Paperclip className="h-3 w-3" /> PASTE IMAGES SUPPORTED
                                </div>
                            </div>
                            
                            {pastedImage && (
                                <div className="flex items-center gap-3 p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl animate-in zoom-in-95 duration-300 shadow-sm">
                                    <div className="h-14 w-20 rounded-lg border-2 border-white shadow-md overflow-hidden shrink-0 bg-white flex items-center justify-center">
                                        <img src={pastedImage} alt="Pasted" className="max-w-full max-h-full object-contain" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Evidence Captured</p>
                                        <p className="text-[9px] font-bold text-emerald-600/70 uppercase">Image from clipboard attached as primary discovery photo</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-rose-500 hover:bg-rose-50 rounded-full" onClick={() => { setPastedImage(null); form.setValue('discoveryAttachmentUrl', null); }}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                            {form.formState.errors.description && <p className="text-xs text-rose-600 font-bold ml-2">{form.formState.errors.description.message}</p>}
                        </div>

                        {/* Classification Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                            <div className="space-y-4">
                                <Label className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 ml-1">Observation Category</Label>
                                <Controller
                                    control={form.control}
                                    name="category"
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className="h-12 rounded-xl font-bold uppercase text-[10px] border-2 border-slate-100 bg-slate-50/30 px-6 shadow-sm">
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
                                <Label className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 ml-1">Risk Severity Index</Label>
                                <Controller
                                    control={form.control}
                                    name="severity"
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className="h-12 rounded-xl font-bold uppercase text-[10px] border-2 border-slate-100 bg-slate-50/30 px-6 shadow-sm">
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

                        {/* Logistics Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-100">
                            <div className="space-y-4">
                                <Label className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 ml-1">Operational Site</Label>
                                <Controller
                                    control={form.control}
                                    name="projectId"
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className="h-12 rounded-xl font-bold uppercase text-[10px] border-2 border-slate-100 bg-slate-50/30 px-6 shadow-sm">
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
                                <Label className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 ml-1">Specific Area / Unit</Label>
                                <Input {...form.register('location')} placeholder="e.g. Tank 201-A, Level 3" className="h-12 rounded-xl font-bold border-2 border-slate-100 bg-slate-50/30 px-6 shadow-sm text-sm" />
                            </div>
                        </div>

                        <div className="pt-8 flex justify-end">
                            <Button 
                                type="submit" 
                                className="h-14 px-16 bg-[#0F172A] hover:bg-black text-white font-black uppercase text-[11px] tracking-[0.2em] rounded-2xl shadow-xl shadow-[#0F172A]/20 active:scale-95 transition-all"
                            >
                                Authorize Initiation <Check className="ml-3 h-4 w-4" />
                            </Button>
                        </div>
                    </form>
                </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
