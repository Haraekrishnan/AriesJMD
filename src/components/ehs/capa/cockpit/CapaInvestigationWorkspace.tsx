'use client';

import React, { useState } from 'react';
import { 
    FileSearch, 
    MessageSquare, 
    MapPin,
    Calendar,
    Target,
    Activity,
    UploadCloud,
    X,
    Loader2,
    Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFormContext } from 'react-hook-form';
import type { EhsObservation } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function CapaInvestigationWorkspace({ observation }: { observation: EhsObservation }) {
    const { register, setValue, watch } = useFormContext();
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);

    const discoveryAttachment = watch('discoveryAttachmentUrl');
    const isLocked = observation.stages?.Investigation?.status === 'Completed' || observation.stages?.Investigation?.status === 'In Progress';

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || isLocked) return;

        setIsUploading(true);
        toast({ title: 'Transmitting Evidence', description: 'Uploading to technical registry...' });

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
                toast({ title: 'Evidence Captured' });
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Upload Failed', description: error.message || 'System error.' });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
            {/* TECHNICAL LOGISTICS */}
            <div className="space-y-10">
                <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-blue-600 flex items-center gap-4">
                    <FileSearch className="h-5 w-5" /> TECHNICAL LOGISTICS
                </h4>
                <div className="space-y-8">
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Who was involved? <span className="text-rose-600">*</span></Label>
                        <Input disabled={isLocked} {...register('who')} placeholder="Personnel, contractors, or departments..." className="h-14 rounded-2xl bg-slate-50 border-transparent font-bold text-xs px-6 focus-visible:bg-white focus-visible:ring-blue-100 transition-all shadow-inner" />
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Exact site position <span className="text-rose-600">*</span></Label>
                        <Input disabled={isLocked} {...register('where')} placeholder="Deck, unit, workshop or coordinate..." className="h-14 rounded-2xl bg-slate-50 border-transparent font-bold text-xs px-6 focus-visible:bg-white focus-visible:ring-blue-100 transition-all shadow-inner" />
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Discovery date <span className="text-rose-600">*</span></Label>
                            <Input disabled={isLocked} type="text" placeholder="dd-mm-yyyy" className="h-14 rounded-2xl bg-slate-50 border-transparent font-bold text-xs px-6 shadow-inner" />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Discovery time</Label>
                            <Input disabled={isLocked} type="text" placeholder="--:--" className="h-14 rounded-2xl bg-slate-50 border-transparent font-bold text-xs px-6 shadow-inner" />
                        </div>
                    </div>

                    <div className="space-y-4 pt-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Primary Evidence Capture</Label>
                        {discoveryAttachment ? (
                            <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-100 flex items-center justify-between group shadow-sm">
                                <div className="flex items-center gap-5">
                                    <div className="h-14 w-20 bg-white rounded-xl border-2 border-emerald-200 flex items-center justify-center overflow-hidden">
                                        <img src={discoveryAttachment} alt="E" className="h-full w-full object-contain" />
                                    </div>
                                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.2em]">EVIDENCE CAPTURED</span>
                                </div>
                                {!isLocked && (
                                    <Button variant="ghost" size="icon" className="h-10 w-10 text-rose-500 hover:bg-rose-100 rounded-full" onClick={() => setValue('discoveryAttachmentUrl', null)}>
                                        <X className="h-5 w-5" />
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className={cn(
                                "border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center p-12 gap-4 transition-all relative overflow-hidden group",
                                isLocked ? "bg-slate-50 border-slate-200" : "border-blue-200 bg-blue-50/20 hover:border-blue-500 cursor-pointer hover:bg-blue-50/40"
                            )}>
                                {isUploading ? <Loader2 className="h-8 w-8 text-blue-600 animate-spin" /> : <UploadCloud className="h-8 w-8 text-blue-400 group-hover:scale-110 transition-transform" />}
                                <div className="text-center">
                                    <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.3em]">TRANSMIT DISCOVERY PROOF</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Direct Cloud Submission</p>
                                </div>
                                {!isLocked && (
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} disabled={isUploading} />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* NARRATIVE CONTEXT */}
            <div className="space-y-10">
                <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-blue-600 flex items-center gap-4">
                    <MessageSquare className="h-5 w-5" /> NARRATIVE CONTEXT
                </h4>
                <div className="space-y-10">
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Sequence of events (How?) <span className="text-rose-600">*</span></Label>
                        <Textarea disabled={isLocked} {...register('sequence')} placeholder="Document the chronological sequence..." className="min-h-[160px] rounded-[2rem] bg-white border-2 border-slate-100 font-bold text-sm p-8 focus-visible:ring-blue-100 shadow-sm leading-relaxed" />
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Activity during discovery</Label>
                        <Textarea disabled={isLocked} {...register('how')} placeholder="State the operation being performed..." className="min-h-[160px] rounded-[2rem] bg-white border-2 border-slate-100 font-bold text-sm p-8 focus-visible:ring-blue-100 shadow-sm leading-relaxed" />
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Immediate cause <span className="text-rose-600">*</span></Label>
                        <Textarea disabled={isLocked} {...register('immediateCause')} placeholder="Direct reason for unsafe act/condition..." className="min-h-[120px] rounded-[2rem] bg-rose-50/20 border-2 border-rose-100 font-bold text-sm p-8 focus-visible:ring-rose-100 shadow-sm" />
                    </div>
                </div>
            </div>
        </div>
    );
}