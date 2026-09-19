'use client';

import React, { useState } from 'react';
import { 
    Clock, 
    FileText, 
    MapPin,
    Calendar,
    Target,
    Activity,
    FileSearch,
    MessageSquare,
    Paperclip,
    ShieldCheck,
    CheckCircle,
    UploadCloud,
    X,
    Loader2,
    Zap,
    History,
    Search,
    UserCircle,
    ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useFormContext, Controller } from 'react-hook-form';
import type { EhsObservation } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

export default function CapaInvestigationWorkspace({ observation }: { observation: EhsObservation }) {
    const { register, setValue, watch, control } = useFormContext();
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);

    const discoveryAttachment = watch('discoveryAttachmentUrl');
    const stageStatus = observation.stages?.Investigation?.status;
    const isLocked = stageStatus === 'In Progress' || stageStatus === 'Completed';

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || isLocked) return;

        setIsUploading(true);
        toast({ title: 'Transmitting Evidence', description: 'Uploading to Dropbox Registry...' });

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload/dropbox', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();

            if (data.success) {
                setValue('discoveryAttachmentUrl', data.downloadLink);
                toast({ title: 'Evidence Registered' });
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
            toast({ 
                variant: 'destructive', 
                title: 'Transmission Failed', 
                description: error.message || 'System error.' 
            });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-10 text-left animate-in fade-in duration-1000">
            {/* --- PHASE TABS --- */}
            <Tabs defaultValue="summary" className="w-full">
                <div className="px-10 bg-slate-50/50 border-b">
                    <TabsList className="h-16 w-full justify-start gap-10 bg-transparent p-0">
                        {[
                            { id: 'summary', label: 'Technical Summary', icon: FileText },
                            { id: '5why', label: '5-Why Analysis', icon: Activity },
                            { id: 'rootcause', label: 'Systemic Root Cause', icon: Target },
                            { id: 'conclusion', label: 'Phase Conclusion', icon: CheckCircle },
                        ].map(tab => (
                            <TabsTrigger 
                                key={tab.id} 
                                value={tab.id}
                                className="h-16 rounded-none border-b-4 border-transparent px-0 text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 bg-transparent shadow-none"
                            >
                                <tab.icon className="mr-3 h-4 w-4" /> {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>
                
                <TabsContent value="summary" className="p-10 m-0 outline-none space-y-12">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                        {/* TECHNICAL LOGISTICS */}
                        <div className="space-y-8">
                            <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-blue-600 flex items-center gap-4">
                                <FileSearch className="h-5 w-5" /> TECHNICAL LOGISTICS
                            </h4>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Who was involved? <span className="text-rose-600">*</span></Label>
                                    <Input disabled={isLocked} {...register('who')} placeholder="Personnel, contractors, or departments..." className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold text-xs px-5 focus-visible:bg-white transition-all shadow-inner" />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Exact site position <span className="text-rose-600">*</span></Label>
                                    <Input disabled={isLocked} {...register('where')} placeholder="Deck, unit, workshop or coordinate..." className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold text-xs px-5 focus-visible:bg-white transition-all shadow-inner" />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Discovery date <span className="text-rose-600">*</span></Label>
                                        <Input disabled={isLocked} type="text" placeholder="dd-mm-yyyy" className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold text-xs px-5 shadow-inner" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Discovery time</Label>
                                        <Input disabled={isLocked} type="text" placeholder="--:--" className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold text-xs px-5 shadow-inner" />
                                    </div>
                                </div>

                                {/* EVIDENCE CAPTURE RELOCATED BENEATH DATE/TIME */}
                                <div className="space-y-4 pt-4">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Primary Evidence Capture</Label>
                                    {discoveryAttachment ? (
                                        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-between group shadow-sm">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 bg-white rounded-lg border border-emerald-200 flex items-center justify-center overflow-hidden">
                                                    <img src={discoveryAttachment} alt="E" className="h-full w-full object-contain" />
                                                </div>
                                                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">TECHNICAL EVIDENCE LINKED</span>
                                            </div>
                                            {!isLocked && (
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-100" onClick={() => setValue('discoveryAttachmentUrl', null)}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className={cn(
                                            "border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 gap-3 transition-all",
                                            isLocked ? "bg-slate-50 border-slate-200" : "border-blue-200 bg-blue-50/30 hover:border-blue-500 cursor-pointer"
                                        )}>
                                            {isUploading ? <Loader2 className="h-6 w-6 text-blue-600 animate-spin" /> : <UploadCloud className="h-6 w-6 text-blue-400" />}
                                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Transmit Discovery Proof</p>
                                            {!isLocked && (
                                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} disabled={isUploading} />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* NARRATIVE CONTEXT */}
                        <div className="space-y-8">
                            <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-blue-600 flex items-center gap-4">
                                <MessageSquare className="h-5 w-5" /> NARRATIVE CONTEXT
                            </h4>
                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Sequence of events (How?) <span className="text-rose-600">*</span></Label>
                                    <Textarea disabled={isLocked} {...register('sequence')} placeholder="Document the chronological sequence..." className="min-h-[140px] rounded-2xl bg-white border-slate-200 font-medium text-sm p-6 focus-visible:ring-blue-100 shadow-sm leading-relaxed" />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Activity during discovery</Label>
                                    <Textarea disabled={isLocked} {...register('how')} placeholder="State the operation being performed..." className="min-h-[140px] rounded-2xl bg-white border-slate-200 font-medium text-sm p-6 focus-visible:ring-blue-100 shadow-sm leading-relaxed" />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Immediate cause <span className="text-rose-600">*</span></Label>
                                    <Textarea disabled={isLocked} {...register('immediateCause')} placeholder="Direct reason for unsafe act/condition..." className="min-h-[140px] rounded-2xl bg-rose-50/30 border-rose-100 font-medium text-sm p-6 focus-visible:ring-rose-100 shadow-sm border-l-4 border-l-rose-500" />
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="5why" className="p-10 m-0 outline-none space-y-10">
                    <div className="max-w-3xl mx-auto space-y-12">
                        <div className="p-8 rounded-[2.5rem] bg-blue-50 border border-blue-100 flex items-start gap-6 shadow-inner">
                            <div className="bg-blue-600 h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
                                <Search className="h-5 w-5 text-white" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-blue-700 uppercase tracking-[0.3em]">Causal Chain Analysis</p>
                                <p className="text-sm font-bold text-blue-900/70 leading-relaxed uppercase tracking-tight">Identify the direct cause and keep asking "WHY?" until a systemic failure is identified.</p>
                            </div>
                        </div>

                        <div className="space-y-8">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="flex gap-8 group animate-in slide-in-from-left duration-500" style={{ animationDelay: `${i * 150}ms` }}>
                                    <div className="flex flex-col items-center shrink-0">
                                        <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white font-black flex items-center justify-center text-sm shadow-xl group-hover:scale-110 transition-transform">W{i}</div>
                                        {i < 5 && <div className="w-1 flex-1 bg-slate-100 my-2 rounded-full" />}
                                    </div>
                                    <div className="flex-1 space-y-3 pb-8">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                            {i === 1 ? 'Primary Discovery Reasoning' : `Logical connection to W${i-1}`}
                                        </Label>
                                        <Textarea 
                                            disabled={isLocked}
                                            {...register(`why${i}`)}
                                            placeholder="Enter technical reasoning..."
                                            className="min-h-[80px] rounded-3xl border-2 border-slate-100 bg-white font-bold text-sm p-6 focus-visible:ring-blue-100 shadow-sm"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="rootcause" className="p-10 m-0 outline-none">
                     <div className="max-w-3xl mx-auto space-y-10 py-10">
                        <div className="p-12 rounded-[3rem] bg-slate-900 text-white shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10"><Target className="h-32 w-32" /></div>
                            <h4 className="text-sm font-black uppercase tracking-[0.4em] text-blue-400 mb-8 flex items-center gap-3">
                                <ShieldCheck className="h-5 w-5" /> ROOT CAUSE DEFINITION
                            </h4>
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Validated Systemic Root Cause</Label>
                                <Textarea 
                                    disabled={isLocked}
                                    {...register('finalRootCause')}
                                    placeholder="State the final, systemic root cause identified..."
                                    className="min-h-[180px] rounded-3xl bg-white/5 border-white/10 text-white font-black text-xl p-8 uppercase tracking-tight focus-visible:ring-blue-500/20 shadow-inner"
                                />
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] text-center">THIS FINDING WILL BE USED FOR ALL FUTURE REMEDIATION STRATEGIES</p>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="conclusion" className="p-10 m-0 outline-none">
                    <div className="max-w-3xl mx-auto space-y-10 py-10">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="p-8 rounded-[2rem] bg-white border shadow-sm space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">PHASE SUMMARY</h4>
                                <Textarea disabled={isLocked} {...register('conclusionSummary')} placeholder="Final technical summary..." className="min-h-[120px] rounded-2xl border-slate-100 font-bold" />
                            </div>
                            <div className="p-8 rounded-[2rem] bg-emerald-50 border border-emerald-100 space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700">RECOMMENDATIONS</h4>
                                <Textarea disabled={isLocked} {...register('recommendations')} placeholder="Actionable safety improvements..." className="min-h-[120px] rounded-2xl border-emerald-200 bg-white font-bold" />
                            </div>
                         </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}