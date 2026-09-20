
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useAuth } from '@/contexts/auth-provider';
import { useEhs } from '@/contexts/ehs-provider';
import { useGeneral } from '@/contexts/general-provider';
import { useToast } from '@/hooks/use-toast';
import { 
  Info, 
  AlertTriangle, 
  BarChart3, 
  MapPin, 
  Building2, 
  Send, 
  Paperclip, 
  X,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const initiateSchema = z.object({
  description: z.string().optional().default(''),
  category: z.enum(['Unsafe Act', 'Unsafe Condition', 'Safe Act', 'Near Miss', 'Environmental']).default('Unsafe Act'),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
  projectId: z.string().min(1, 'Please select an operational site.'),
  location: z.string().optional().default(''),
  discoveryAttachmentUrl: z.string().optional().nullable(),
}).refine(data => {
  const hasText = data.description && data.description.trim().length >= 5;
  const hasImage = !!data.discoveryAttachmentUrl;
  // Valid if has enough text OR an image
  return hasText || hasImage;
}, {
  message: 'Provide a detailed description or attach discovery evidence.',
  path: ['description'],
});

type FormValues = z.infer<typeof initiateSchema>;

export default function CapaInitiateDialog({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) {
  const { addObservation } = useEhs();
  const { user } = useAuth();
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
    if (!user) return;
    addObservation({ ...data, reporterId: user.id });
    onOpenChange(false);
    setPastedImage(null);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { onOpenChange(v); if(!v) { setPastedImage(null); form.reset(); } }}>
      <DialogContent className="sm:max-w-3xl bg-white p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
        <DialogHeader className="p-8 pb-4">
          <DialogTitle className="text-2xl font-semibold text-[#0F172A] normal-case tracking-tight">New safety observation</DialogTitle>
          <DialogDescription className="text-xs font-bold text-slate-400 normal-case tracking-normal">PHASE 01: INITIAL DISCOVERY & CAPTURE</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[80vh]">
          <div className="p-8 pt-2 space-y-8">
            {/* Info Box */}
            <div className="flex items-start gap-4 p-5 bg-[#EFF6FF] border border-[#DBEAFE] rounded-xl animate-in fade-in duration-500">
                <div className="bg-[#2563EB] h-6 w-6 rounded-full flex items-center justify-center shrink-0">
                    <Info className="h-3.5 w-3.5 text-white" />
                </div>
                <p className="text-[13px] font-medium text-[#1E40AF] leading-relaxed">
                    Report any unsafe act, unsafe condition, near miss or positive safety observation. Your input helps us maintain a safe and healthy workplace.
                </p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Step 1: Narrative */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="h-6 w-6 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-sm font-semibold">1</div>
                        <Label className="text-sm font-semibold normal-case tracking-normal text-[#0F172A]">Safety Finding Narrative <span className="text-rose-500">*</span></Label>
                    </div>
                    <span className="text-sm font-medium text-slate-400">Provide a clear and concise description.</span>
                </div>
                <div className="relative group">
                    <Textarea 
                        {...form.register('description')} 
                        onPaste={handlePaste}
                        placeholder="Describe the unsafe act or condition precisely..." 
                        className="min-h-[140px] rounded-xl p-6 font-medium text-sm bg-white border border-slate-200 focus-visible:ring-blue-100 focus-visible:border-blue-500 transition-all resize-none shadow-sm"
                    />
                    <div className="absolute bottom-3 right-4 flex items-center gap-4 text-sm font-bold text-slate-400 normal-case tracking-tight">
                        <div className="flex items-center gap-1.5 opacity-60">
                            <Paperclip className="h-3 w-3" /> 
                            <span>Paste images supported</span>
                        </div>
                        <span>{form.watch('description')?.length || 0}/2000</span>
                    </div>
                </div>
                {pastedImage && (
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg animate-in zoom-in-95">
                        <div className="h-10 w-14 rounded border bg-white overflow-hidden shrink-0 flex items-center justify-center">
                            <img src={pastedImage} alt="Pasted" className="max-w-full max-h-full object-contain" />
                        </div>
                        <p className="flex-1 text-sm font-semibold text-emerald-700 normal-case tracking-normal">EHS DISCOVERY IMAGE ATTACHED</p>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => { setPastedImage(null); form.setValue('discoveryAttachmentUrl', null); }}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}
                {form.formState.errors.description && <p className="text-xs text-rose-600 font-bold ml-1">{form.formState.errors.description.message}</p>}
              </div>

              {/* Steps 2 & 3: Category & Risk */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="h-6 w-6 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-sm font-semibold">2</div>
                            <Label className="text-sm font-semibold normal-case tracking-normal text-[#0F172A]">Observation Category <span className="text-rose-500">*</span></Label>
                        </div>
                        <span className="text-sm font-medium text-slate-400 ml-9">Select the category that best describes this observation.</span>
                    </div>
                    <Controller
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                            <div className="relative">
                                <AlertTriangle className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#2563EB] z-10" />
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger className="h-12 pl-11 rounded-xl font-bold text-sm bg-white border border-slate-200">
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
                            </div>
                        )}
                    />
                </div>

                <div className="space-y-4">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="h-6 w-6 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-sm font-semibold">3</div>
                            <Label className="text-sm font-semibold normal-case tracking-normal text-[#0F172A]">Risk Severity Index <span className="text-rose-500">*</span></Label>
                        </div>
                        <span className="text-sm font-medium text-slate-400 ml-9">Select the assessed risk level.</span>
                    </div>
                    <Controller
                        control={form.control}
                        name="severity"
                        render={({ field }) => (
                            <div className="relative">
                                <BarChart3 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#2563EB] z-10" />
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger className="h-12 pl-11 rounded-xl font-bold text-sm bg-white border border-slate-200">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Low">Low Risk</SelectItem>
                                        <SelectItem value="Medium">Medium Risk</SelectItem>
                                        <SelectItem value="High">High Risk</SelectItem>
                                        <SelectItem value="Critical">Critical Risk</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    />
                </div>
              </div>

              {/* Steps 4 & 5: Site & Area */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                <div className="space-y-4">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="h-6 w-6 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-sm font-semibold">4</div>
                            <Label className="text-sm font-semibold normal-case tracking-normal text-[#0F172A]">Operational Site <span className="text-rose-500">*</span></Label>
                        </div>
                        <span className="text-sm font-medium text-slate-400 ml-9">Select the site where the observation occurred.</span>
                    </div>
                    <Controller
                        control={form.control}
                        name="projectId"
                        render={({ field }) => (
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#2563EB] z-10" />
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger className="h-12 pl-11 rounded-xl font-bold text-sm bg-white border border-slate-200">
                                        <SelectValue placeholder="Select operational site" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    />
                </div>

                <div className="space-y-4">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="h-6 w-6 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-sm font-semibold">5</div>
                            <Label className="text-sm font-semibold normal-case tracking-normal text-[#0F172A]">Specific Area / Unit</Label>
                        </div>
                        <span className="text-sm font-medium text-slate-400 ml-9">Provide the specific area, unit or equipment (if applicable).</span>
                    </div>
                    <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#2563EB] z-10" />
                        <Input 
                            {...form.register('location')} 
                            placeholder="e.g. Tank 201-A, Level 3" 
                            className="h-12 pl-11 rounded-xl font-bold text-sm bg-white border border-slate-200 shadow-sm"
                        />
                    </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="pt-6 flex justify-end gap-3">
                <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => onOpenChange(false)}
                    className="h-12 px-8 rounded-xl font-semibold normal-case tracking-normal text-sm border-2"
                >
                    Cancel
                </Button>
                <Button 
                    type="submit" 
                    className="h-12 px-8 bg-[#2563EB] hover:bg-blue-700 text-white font-semibold normal-case tracking-normal text-sm rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                >
                    <Send className="mr-2 h-4 w-4" /> Create Observation
                </Button>
              </div>
            </form>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
