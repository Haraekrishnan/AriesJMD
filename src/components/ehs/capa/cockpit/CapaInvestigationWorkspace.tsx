'use client';

import React, { useState } from 'react';
import { 
    Clock, 
    FileText, 
    MapPin,
    Calendar,
    Target,
    CheckCircle2,
    Activity,
    FileSearch,
    MessageSquare,
    Paperclip,
    ShieldAlert,
    ShieldCheck,
    History,
    UserCircle,
    CheckCircle,
    UploadCloud,
    X,
    Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useFormContext, Controller } from 'react-hook-form';
import type { EhsObservation } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

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
        toast({ title: 'Transmitting Evidence', description: 'Uploading to Technical Registry...' });

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
                toast({ title: 'Upload Successful', description: 'Evidence linked to case.' });
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
            toast({ 
                variant: 'destructive', 
                title: 'Upload Failed', 
                description: error.message || 'System connectivity error.' 
            });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-8 text-left animate-in fade-in duration-700">
            {/* --- PHASE IDENTIFIER CARD --- */}
            <div className="bg-white border-2 border-slate-900 rounded-none p-8 flex flex-col md:flex-row justify-between items-center gap-10 relative overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <div className="absolute top-0 left-0 w-2 h-full bg-blue-600" />
                
                <div className="flex items-center gap-10">
                    <div className="h-20 w-20 rounded-none border-4 border-slate-900 bg-slate-50 flex items-center justify-center text-slate-900 text-3xl font-black shadow-inner">
                        02
                    </div>
                    <div>
                        <Badge className="bg-blue-600 text-white border-none font-black uppercase text-[10px] h-6 px-4 mb-2 rounded-none tracking-widest">TECHNICAL ACTION REQUIRED</Badge>
                        <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">INVESTIGATION</h2>
                        <p className="text-sm font-bold text-slate-400 mt-3 uppercase tracking-wide">Determine root cause and sequence of event logistics.</p>
                    </div>
                </div>

                <div className="flex items-center gap-12">
                    <div className="text-right space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">PHASE OWNER</p>
                        <div className="flex items-center gap-4">
                            <div className="text-right leading-tight">
                                <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Assignee</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">EHS Lead</p>
                            </div>
                            <Avatar className="h-12 w-12 border-2 border-slate-900 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                                <AvatarFallback className="bg-slate-100 text-slate-900 font-black text-[12px]">T</AvatarFallback>
                            </Avatar>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- PHASE TABS --- */}
            <div className="bg-white border-2 border-slate-900 rounded-none overflow-hidden flex flex-col shadow-[8px_8px_0px_0px_rgba(0,0,0,0.05)]">
                <div className="px-8 bg-slate-50 border-b-2 border-slate-900">
                    <Tabs defaultValue="summary" className="w-full">
                        <TabsList className="h-16 w-full justify-start gap-10 bg-transparent p-0">
                            {[
                                { id: 'summary', label: 'Technical Summary', icon: FileText },
                                { id: '5why', label: '5-Why Analysis', icon: Activity },
                                { id: 'rootcause', label: 'Root Cause', icon: Target },
                                { id: 'conclusion', label: 'Phase Conclusion', icon: CheckCircle },
                            ].map(tab => (
                                <TabsTrigger 
                                    key={tab.id} 
                                    value={tab.id}
                                    className="h-16 rounded-none border-b-4 border-transparent px-0 text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 bg-transparent shadow-none transition-all"
                                >
                                    <tab.icon className="mr-3 h-4 w-4" /> {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                        
                        <TabsContent value="summary" className="py-10 m-0 outline-none">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                {/* TECHNICAL LOGISTICS */}
                                <div className="space-y-8">
                                    <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-blue-700 flex items-center gap-4 mb-6">
                                        <FileSearch className="h-5 w-5" /> TECHNICAL LOGISTICS
                                    </h4>
                                    <div className="space-y-8">
                                        <div className="space-y-2.5">
                                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-600 ml-1">Who was involved? <span className="text-rose-600">*</span></Label>
                                            <Input disabled={isLocked} {...register('who')} placeholder="Personnel, contractors, or departments..." className="h-12 rounded-none border-2 border-slate-200 bg-white font-bold text-sm px-5 focus-visible:border-blue-600 focus-visible:ring-0 shadow-inner" />
                                        </div>

                                        <div className="space-y-2.5">
                                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-600 ml-1">Exact site position <span className="text-rose-600">*</span></Label>
                                            <Input disabled={isLocked} {...register('where')} placeholder="Specific deck, unit, workshop or coordinate..." className="h-12 rounded-none border-2 border-slate-200 bg-white font-bold text-sm px-5 focus-visible:border-blue-600 focus-visible:ring-0 shadow-inner" />
                                        </div>

                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="space-y-2.5">
                                                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-600 ml-1">Discovery date <span className="text-rose-600">*</span></Label>
                                                <div className="relative">
                                                    <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                    <Input disabled={isLocked} type="text" placeholder="dd-mm-yyyy" className="h-12 rounded-none border-2 border-slate-200 bg-white font-bold text-sm px-5 focus-visible:border-blue-600 focus-visible:ring-0 shadow-inner" />
                                                </div>
                                            </div>
                                            <div className="space-y-2.5">
                                                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-600 ml-1">Discovery time</Label>
                                                <div className="relative">
                                                    <Clock className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                    <Input disabled={isLocked} type="text" placeholder="--:--" className="h-12 rounded-none border-2 border-slate-200 bg-white font-bold text-sm px-5 focus-visible:border-blue-600 focus-visible:ring-0 shadow-inner" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* SPATIALLY OPTIMIZED EVIDENCE MODULE */}
                                        <div className="space-y-4 pt-6 border-t-2 border-dashed border-slate-200">
                                            <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-700 flex items-center gap-3">
                                                <Paperclip className="h-4 w-4" /> PRIMARY EVIDENCE CAPTURE
                                            </h4>
                                            
                                            {discoveryAttachment ? (
                                                <div className="p-5 border-2 border-slate-900 bg-slate-50 rounded-none flex items-center justify-between group shadow-sm">
                                                    <div className="flex items-center gap-5">
                                                        <div className="h-12 w-12 bg-white border-2 border-slate-900 rounded-none flex items-center justify-center overflow-hidden shadow-inner">
                                                            {discoveryAttachment.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/) ? (
                                                                <img src={discoveryAttachment} alt="Evidence" className="h-full w-full object-contain" />
                                                            ) : (
                                                                <FileText className="h-6 w-6 text-slate-400" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[12px] font-black text-slate-900 uppercase truncate tracking-tight">Discovery Photo / Document</p>
                                                            <a href={discoveryAttachment} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-blue-600 uppercase hover:underline flex items-center gap-1.5 mt-1">VIEW ORIGINAL <ShieldCheck className="h-3 w-3" /></a>
                                                        </div>
                                                    </div>
                                                    {!isLocked && (
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-10 w-10 text-rose-600 hover:bg-rose-50 rounded-none border-2 border-transparent hover:border-rose-600"
                                                            onClick={() => setValue('discoveryAttachmentUrl', null)}
                                                        >
                                                            <X className="h-5 w-5" />
                                                        </Button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className={cn(
                                                    "border-4 border-dashed rounded-none flex flex-col items-center justify-center p-8 gap-4 transition-all",
                                                    isLocked ? "bg-slate-50 border-slate-200 cursor-not-allowed" : "border-slate-300 bg-white hover:border-blue-600 hover:bg-blue-50 cursor-pointer"
                                                )}>
                                                    {isUploading ? (
                                                        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                                                    ) : (
                                                        <UploadCloud className="h-8 w-8 text-slate-300" />
                                                    )}
                                                    <div className="text-center">
                                                        <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Transmit Technical Evidence</p>
                                                        {!isLocked && (
                                                            <div className="relative mt-4">
                                                                <input 
                                                                    type="file" 
                                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                                                    onChange={handleFileUpload}
                                                                    disabled={isUploading}
                                                                />
                                                                <Button variant="outline" className="h-10 px-8 font-black text-slate-900 border-2 border-slate-900 uppercase tracking-widest text-[10px] bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                                                    SELECT FILE
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* NARRATIVE CONTEXT */}
                                <div className="space-y-8">
                                    <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-blue-700 flex items-center gap-4 mb-6">
                                        <MessageSquare className="h-5 w-5" /> NARRATIVE CONTEXT
                                    </h4>
                                    <div className="space-y-8">
                                        <div className="space-y-2.5">
                                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-600 ml-1">Sequence of events (How?) <span className="text-rose-500">*</span></Label>
                                            <Textarea disabled={isLocked} {...register('sequence')} placeholder="Describe the chronological sequence of events leading to discovery..." className="min-h-[140px] rounded-none border-2 border-slate-200 bg-white font-medium text-sm px-5 py-4 focus-visible:border-blue-600 focus-visible:ring-0 shadow-inner leading-relaxed" />
                                        </div>

                                        <div className="space-y-2.5">
                                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-600 ml-1">Activity during discovery</Label>
                                            <Textarea disabled={isLocked} {...register('how')} placeholder="State the specific operation being performed..." className="min-h-[140px] rounded-none border-2 border-slate-200 bg-white font-medium text-sm px-5 py-4 focus-visible:border-blue-600 focus-visible:ring-0 shadow-inner leading-relaxed" />
                                        </div>

                                        <div className="space-y-2.5">
                                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-600 ml-1">Immediate cause (Direct reason) <span className="text-rose-500">*</span></Label>
                                            <Textarea disabled={isLocked} {...register('immediateCause')} placeholder="State the direct reason for the unsafe act or condition..." className="min-h-[140px] rounded-none border-2 border-slate-900 bg-white font-medium text-sm px-5 py-4 focus-visible:border-blue-600 focus-visible:ring-0 shadow-inner leading-relaxed border-l-8 border-l-rose-600" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* INVESTIGATION STATUS LEDGER */}
                            <div className="mt-12 pt-12 border-t-2 border-slate-100">
                                <div className="space-y-6">
                                    <h4 className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-900 flex items-center gap-4 mb-4">
                                        <Activity className="h-5 w-5 text-blue-600" /> PHASE STATUS LEDGER
                                    </h4>
                                    <div className="p-8 rounded-none bg-slate-900 text-white border-2 border-slate-900 flex flex-col gap-8 shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)]">
                                        <div className="flex justify-between items-start">
                                            <Badge className="bg-blue-600 text-white border-none px-6 h-8 text-[11px] font-black tracking-widest rounded-none">{stageStatus?.toUpperCase() || 'PHASE ACTIVE'}</Badge>
                                            <div className="flex gap-12">
                                                <div className="text-left">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Phase Initiation</p>
                                                    <p className="text-[11px] font-black text-white flex items-center gap-2 mt-1.5 uppercase"><Calendar className="h-3.5 w-3.5 text-blue-400" /> 15 Sep 2026</p>
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Last Entry</p>
                                                    <p className="text-[11px] font-black text-white flex items-center gap-2 mt-1.5 uppercase"><Clock className="h-3.5 w-3.5 text-blue-400" /> Synchronized</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10">
                                            <ShieldAlert className="h-4 w-4 text-blue-400" />
                                            <p className="text-[10px] font-bold text-slate-300 leading-relaxed uppercase tracking-widest">TECHNICAL INVESTIGATION IN PROGRESS. DATA INTEGRITY PROTECTED BY INSTITUTIONAL LOCK.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
