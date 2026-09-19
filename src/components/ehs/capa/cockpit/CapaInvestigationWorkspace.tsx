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
    ShieldCheck,
    Clock,
    User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFormContext } from 'react-hook-form';
import type { EhsObservation } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-provider';
import { format, parseISO } from 'date-fns';

export default function CapaInvestigationWorkspace({ observation }: { observation: EhsObservation }) {
    const { user } = useAuth();
    const { register, setValue, watch } = useFormContext();
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);

    const discoveryAttachment = watch('discoveryAttachmentUrl');
    const stageStatus = observation.stages?.Investigation?.status || 'Pending';
    const isLocked = stageStatus === 'Completed' || stageStatus === 'In Progress';
    const assignedById = observation.stages?.Investigation?.assignedById;
    
    const canDeleteDocs = (user?.id === assignedById || user?.role === 'Admin') && !isLocked;

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

    const handleRemoveEvidence = () => {
        if (!canDeleteDocs) return;
        setValue('discoveryAttachmentUrl', null);
        toast({ title: 'Evidence Removed', variant: 'destructive' });
    };

    // Modern SaaS styling: Recessed, subtle shadow, soft border
    const wellClasses = "rounded-xl border-2 border-slate-200 bg-slate-50 font-bold text-xs px-5 focus-visible:bg-white focus-visible:ring-blue-100 transition-all shadow-inner placeholder:text-slate-300";

    return (
        <div className="flex flex-col gap-12 text-left">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
                {/* 1. TECHNICAL LOGISTICS */}
                <div className="space-y-12">
                    <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-blue-600 flex items-center gap-4">
                        <FileSearch className="h-5 w-5" /> TECHNICAL LOGISTICS
                    </h4>
                    
                    <div className="space-y-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Who was involved? <span className="text-rose-600">*</span></Label>
                            <Input disabled={isLocked} {...register('who')} placeholder="Personnel, contractors, or departments..." className={cn("h-12", wellClasses)} />
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Exact site position <span className="text-rose-600">*</span></Label>
                            <Input disabled={isLocked} {...register('where')} placeholder="Deck, unit, workshop or coordinate..." className={cn("h-12", wellClasses)} />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Discovery date <span className="text-rose-600">*</span></Label>
                                <Input disabled={isLocked} type="date" {...register('whenDate')} className={cn("h-12", wellClasses)} />
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Discovery time</Label>
                                <Input disabled={isLocked} type="time" {...register('whenTime')} className={cn("h-12", wellClasses)} />
                            </div>
                        </div>

                        {/* SPATIALLY OPTIMIZED UPLOAD (Just below date) */}
                        <div className="space-y-3 pt-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Primary Discovery Evidence</Label>
                            {discoveryAttachment ? (
                                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-between shadow-sm animate-in zoom-in-95">
                                    <div className="flex items-center gap-4">
                                        <div className="h-14 w-20 bg-white rounded-xl border-2 border-emerald-200 flex items-center justify-center overflow-hidden shadow-sm">
                                            <img src={discoveryAttachment} alt="Evidence" className="h-full w-full object-contain" />
                                        </div>
                                        <div className="text-left">
                                            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest block">EVIDENCE CAPTURED</span>
                                            <span className="text-[9px] font-bold text-emerald-600/60 uppercase">Technical Visual Registry</span>
                                        </div>
                                    </div>
                                    {canDeleteDocs && (
                                        <Button variant="ghost" size="icon" className="h-9 w-9 text-rose-500 hover:bg-rose-100 rounded-full" onClick={handleRemoveEvidence}>
                                            <X className="h-5 w-5" />
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className={cn(
                                    "border-2 border-dashed rounded-3xl flex flex-col items-center justify-center p-8 gap-3 transition-all relative overflow-hidden group",
                                    isLocked ? "bg-slate-50 border-slate-200" : "border-blue-200 bg-blue-50/30 hover:border-blue-500 cursor-pointer hover:bg-blue-50/60"
                                )}>
                                    {isUploading ? <Loader2 className="h-7 w-7 text-blue-600 animate-spin" /> : <UploadCloud className="h-7 w-7 text-blue-400 group-hover:scale-110 transition-transform" />}
                                    <div className="text-center">
                                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">TRANSMIT DISCOVERY PROOF</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Dropbox Cloud Sync</p>
                                    </div>
                                    {!isLocked && (
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} disabled={isUploading} />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. NARRATIVE CONTEXT */}
                <div className="space-y-12">
                    <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-blue-600 flex items-center gap-4">
                        <MessageSquare className="h-5 w-5" /> NARRATIVE CONTEXT
                    </h4>
                    
                    <div className="space-y-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Sequence of events (How?) <span className="text-rose-600">*</span></Label>
                            <Textarea disabled={isLocked} {...register('sequence')} placeholder="Document the chronological sequence leading to discovery..." className={cn("min-h-[140px] p-5 leading-relaxed", wellClasses)} />
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Activity during discovery</Label>
                            <Textarea disabled={isLocked} {...register('how')} placeholder="Describe the specific operation or task being performed..." className={cn("min-h-[140px] p-5 leading-relaxed", wellClasses)} />
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Immediate cause <span className="text-rose-600">*</span></Label>
                            <Textarea disabled={isLocked} {...register('immediateCause')} placeholder="Direct reason for the unsafe act or condition discovered..." className={cn("min-h-[110px] p-5 border-l-rose-600 border-l-4", wellClasses)} />
                        </div>
                    </div>
                </div>
            </div>

            {/* STATUS LEDGER */}
            <div className="pt-12 border-t-2 border-slate-100">
                <div className="p-8 rounded-[2.5rem] bg-slate-900 text-white flex flex-col md:flex-row justify-between items-center gap-8 shadow-2xl border border-white/5">
                    <div className="flex items-center gap-6">
                        <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <ShieldCheck className="h-7 w-7 text-white" />
                        </div>
                        <div className="text-left">
                            <Badge className="bg-blue-500 text-white border-none px-4 h-6 text-[9px] font-black tracking-widest uppercase mb-2">{stageStatus.toUpperCase()}</Badge>
                            <p className="text-lg font-black uppercase tracking-tight leading-none">Investigation Milestone Active</p>
                        </div>
                    </div>
                    <div className="flex gap-12 text-left">
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Phase Initiation</p>
                            <p className="text-sm font-bold text-white uppercase mt-1">{format(parseISO(observation.createdAt), 'dd MMM yyyy')}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Target Delivery</p>
                            <div className="flex items-center gap-2 mt-1">
                                <Clock className="h-4 w-4 text-blue-400" />
                                <span className="text-sm font-bold uppercase tracking-widest text-blue-400">Within Window</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
