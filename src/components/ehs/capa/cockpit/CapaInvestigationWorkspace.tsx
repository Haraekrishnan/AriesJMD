'use client';

import React, { useState } from 'react';
import { 
    FileSearch, 
    MessageSquare, 
    MapPin,
    Calendar,
    Activity,
    UploadCloud,
    X,
    Loader2,
    ShieldCheck,
    Clock,
    User,
    FileText,
    Send,
    Search,
    Paperclip,
    Trash2,
    Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFormContext } from 'react-hook-form';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-provider';
import { format, parseISO } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function CapaInvestigationWorkspace({ observation }: { observation: EhsObservation }) {
    const { user } = useAuth();
    const { register, setValue, watch } = useFormContext();
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);

    const attachments = observation.stages?.Investigation?.attachments ? Object.values(observation.stages.Investigation.attachments) : [];
    const stageStatus = observation.stages?.Investigation?.status || 'Pending';
    const isLocked = stageStatus === 'Completed' || stageStatus === 'In Progress';

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

    const inputWell = "h-11 rounded-lg border border-slate-200 bg-slate-50 font-bold text-sm px-10 focus-visible:bg-white focus-visible:ring-blue-100 transition-all shadow-inner placeholder:text-slate-300";
    const areaWell = "min-h-[100px] rounded-lg border border-slate-200 bg-slate-50 font-bold text-sm p-4 focus-visible:bg-white focus-visible:ring-blue-100 transition-all shadow-inner resize-none";

    return (
        <div className="space-y-8 text-left animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* 1. TECHNICAL LOGISTICS */}
                <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-8">
                    <div className="flex items-center justify-between border-b pb-4">
                        <div className="flex items-center gap-3">
                            <FileSearch className="h-5 w-5 text-blue-600" />
                            <h4 className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-800">TECHNICAL LOGISTICS</h4>
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Factual incident parameters</p>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-blue-600 ml-1">Who was involved? <span className="text-rose-600">*</span></Label>
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input disabled={isLocked} {...register('who')} placeholder="Enter personnel or teams..." className={inputWell} />
                            </div>
                            <p className="text-[9px] font-medium text-slate-400 ml-1">List personnel, contractors or departments involved.</p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-blue-600 ml-1">Exact site position <span className="text-rose-600">*</span></Label>
                            <div className="relative">
                                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input disabled={isLocked} {...register('where')} placeholder="Specific location..." className={inputWell} />
                            </div>
                            <p className="text-[9px] font-medium text-slate-400 ml-1">Specific deck, unit, workshop or coordinate.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-blue-600 ml-1">Discovery date <span className="text-rose-600">*</span></Label>
                                <div className="relative">
                                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input disabled={isLocked} type="date" {...register('whenDate')} className={inputWell} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-blue-600 ml-1">Discovery time <span className="text-rose-600">*</span></Label>
                                <div className="relative">
                                    <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input disabled={isLocked} type="time" {...register('whenTime')} className={inputWell} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. NARRATIVE CONTEXT */}
                <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-8">
                    <div className="flex items-center justify-between border-b pb-4">
                        <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-blue-600" />
                            <h4 className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-800">NARRATIVE CONTEXT</h4>
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Incident sequence & discovery</p>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-blue-600 ml-1">Sequence of events (How)? <span className="text-rose-600">*</span></Label>
                            <Textarea disabled={isLocked} {...register('sequence')} placeholder="Chronological flow..." className={areaWell} />
                            <p className="text-[9px] font-medium text-slate-400 ml-1">Describe the chronological sequence of events leading to this observation.</p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-blue-600 ml-1">Immediate cause / direct reason <span className="text-rose-600">*</span></Label>
                            <Textarea disabled={isLocked} {...register('immediateCause')} placeholder="Direct reason for unsafe finding..." className={areaWell} />
                            <p className="text-[9px] font-medium text-slate-400 ml-1">State the most immediate and direct cause based on available information.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. PHASE EVIDENCE LEDGER */}
            <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Paperclip className="h-5 w-5 text-blue-600" />
                        <h4 className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-800">PHASE EVIDENCE LEDGER</h4>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Technical documentation registry</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <div className="space-y-3">
                        {attachments.length > 0 ? attachments.map((file) => (
                            <div key={file.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between group hover:bg-white hover:border-blue-200 transition-all shadow-inner">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 bg-white rounded-lg border flex items-center justify-center text-rose-500 font-black text-[10px] uppercase">DOC</div>
                                    <div className="flex flex-col text-left">
                                        <p className="text-xs font-black uppercase text-slate-800 tracking-tight">{file.name}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                                            {isValid(parseISO(file.uploadedAt)) ? format(parseISO(file.uploadedAt), 'dd MMM yyyy, HH:mm') : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 bg-white shadow-sm border opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Download className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 bg-white shadow-sm border opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        )) : (
                            <div className="p-8 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 opacity-30 grayscale text-center">
                                <FileText className="h-10 w-10" />
                                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Registry Empty</p>
                            </div>
                        )}
                    </div>

                    <div className="relative">
                        <div className={cn(
                            "border-2 border-dashed rounded-[1.5rem] p-10 flex flex-col items-center justify-center gap-4 transition-all",
                            isLocked ? "bg-slate-50 border-slate-200 opacity-50" : "bg-blue-50/20 border-blue-200 hover:border-blue-500 hover:bg-blue-50/40 cursor-pointer"
                        )}>
                            {isUploading ? <Loader2 className="h-8 w-8 text-blue-600 animate-spin" /> : <UploadCloud className="h-8 w-8 text-blue-400" />}
                            <div className="text-center space-y-1">
                                <p className="text-xs font-black text-slate-800 uppercase tracking-tight">
                                    Drag and drop files here <span className="text-blue-600">or click to browse</span>
                                </p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                    Supported: PDF, DOC, XLS, JPG, PNG (Max 50MB)
                                </p>
                            </div>
                            {!isLocked && (
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} disabled={isUploading} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
