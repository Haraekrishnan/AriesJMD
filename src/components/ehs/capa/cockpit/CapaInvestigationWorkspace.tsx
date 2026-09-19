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
        toast({ title: 'Transmitting Evidence', description: 'Uploading to Dropbox Technical Registry...' });

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
        <div className="space-y-6 text-left animate-in fade-in duration-700">
            {/* --- PHASE IDENTIFIER CARD --- */}
            <div className="bg-white border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600" />
                
                <div className="flex items-center gap-8">
                    <div className="h-16 w-16 rounded-2xl bg-[#E9F0FE] border-2 border-blue-100 flex items-center justify-center text-blue-700 text-2xl font-black shadow-inner">
                        02
                    </div>
                    <div>
                        <Badge className="bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE] font-black uppercase text-[10px] h-6 px-4 mb-2">TECHNICAL ACTION REQUIRED</Badge>
                        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">INVESTIGATION</h2>
                        <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-wide">Determine what happened, why it happened and identify the root cause.</p>
                    </div>
                </div>

                <div className="flex items-center gap-10">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">CURRENT OWNER</p>
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-sm font-black text-slate-900 uppercase">Mujeeb</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">EHS Officer</p>
                            </div>
                            <Avatar className="h-10 w-10 border-2 border-white shadow-sm ring-1 ring-slate-100">
                                <AvatarFallback className="bg-blue-50 text-blue-600 font-black text-[10px]">M</AvatarFallback>
                            </Avatar>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">TARGET DELIVERY</p>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
                                <Calendar className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-slate-900">19 Jan 2026</p>
                                <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">In 120 days</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- PHASE TABS --- */}
            <div className="bg-white border rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 bg-slate-50/50 border-b">
                    <Tabs defaultValue="summary" className="w-full">
                        <TabsList className="h-14 w-full justify-start gap-8 bg-transparent p-0">
                            {[
                                { id: 'summary', label: 'Summary', icon: FileText },
                                { id: '5why', label: '5-Why Analysis', icon: Clock },
                                { id: 'rootcause', label: 'Root Cause', icon: Target },
                                { id: 'fishbone', label: 'Fishbone', icon: Activity },
                                { id: 'timeline', label: 'Timeline', icon: History },
                                { id: 'interviews', label: 'Interviews', icon: UserCircle },
                                { id: 'evidence', label: 'Evidence', icon: Paperclip },
                                { id: 'conclusion', label: 'Conclusion', icon: CheckCircle },
                            ].map(tab => (
                                <TabsTrigger 
                                    key={tab.id} 
                                    value={tab.id}
                                    className="h-14 rounded-none border-b-2 border-transparent px-0 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 bg-transparent shadow-none"
                                >
                                    <tab.icon className="mr-2 h-4 w-4" /> {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                        
                        <TabsContent value="summary" className="py-8 m-0 outline-none">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                {/* TECHNICAL LOGISTICS */}
                                <div className="space-y-6">
                                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-700 flex items-center gap-3 mb-4">
                                        <FileSearch className="h-4 w-4" /> TECHNICAL LOGISTICS
                                    </h4>
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-600">Who was involved? <span className="text-rose-500">*</span></Label>
                                            <Input disabled={isLocked} {...register('who')} placeholder="Personnel, contractors, or departments..." className="h-11 rounded-lg border-slate-200 bg-[#F9FAFB] font-medium text-sm px-4" />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-600">Exact site position <span className="text-rose-500">*</span></Label>
                                            <Input disabled={isLocked} {...register('where')} placeholder="Specific deck, unit, workshop or coordinate..." className="h-11 rounded-lg border-slate-200 bg-[#F9FAFB] font-medium text-sm px-4" />
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-600">Discovery date <span className="text-rose-500">*</span></Label>
                                                <div className="relative">
                                                    <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                    <Input disabled={isLocked} type="text" placeholder="dd-mm-yyyy" className="h-11 rounded-lg border-slate-200 bg-[#F9FAFB] font-medium text-sm px-4" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-600">Discovery time</Label>
                                                <div className="relative">
                                                    <Clock className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                    <Input disabled={isLocked} type="text" placeholder="--:--" className="h-11 rounded-lg border-slate-200 bg-[#F9FAFB] font-medium text-sm px-4" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* RELOCATED EVIDENCE MODULE */}
                                        <div className="space-y-4 pt-4 border-t border-dashed">
                                            <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-700 flex items-center gap-3">
                                                <Paperclip className="h-4 w-4" /> INITIAL EVIDENCE
                                            </h4>
                                            
                                            {discoveryAttachment ? (
                                                <div className="p-4 border-2 border-slate-200 bg-[#F9FAFB] rounded-xl flex items-center justify-between group">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 bg-white border rounded flex items-center justify-center overflow-hidden shadow-sm">
                                                            {discoveryAttachment.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/) ? (
                                                                <img src={discoveryAttachment} alt="Evidence" className="h-full w-full object-contain" />
                                                            ) : (
                                                                <FileText className="h-5 w-5 text-blue-500" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[11px] font-black text-slate-900 uppercase truncate">Primary Evidence Capture</p>
                                                            <a href={discoveryAttachment} target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-blue-600 uppercase hover:underline">View Document</a>
                                                        </div>
                                                    </div>
                                                    {!isLocked && (
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-full"
                                                            onClick={() => setValue('discoveryAttachmentUrl', null)}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className={cn(
                                                    "border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 gap-3 transition-all",
                                                    isLocked ? "bg-slate-50 border-slate-200 cursor-not-allowed" : "border-blue-200 bg-[#F9FAFF] hover:bg-blue-50 cursor-pointer"
                                                )}>
                                                    {isUploading ? (
                                                        <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                                                    ) : (
                                                        <UploadCloud className="h-6 w-6 text-blue-400" />
                                                    )}
                                                    <div className="text-center">
                                                        <p className="text-xs font-bold text-slate-600 uppercase">Transmit Evidence</p>
                                                        {!isLocked && (
                                                            <div className="relative mt-2">
                                                                <input 
                                                                    type="file" 
                                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                                                    onChange={handleFileUpload}
                                                                    disabled={isUploading}
                                                                />
                                                                <Button variant="outline" size="sm" className="h-8 px-4 font-bold text-blue-700 border-blue-200 uppercase tracking-widest text-[9px] bg-white">
                                                                    Select File
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
                                <div className="space-y-6">
                                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-700 flex items-center gap-3 mb-4">
                                        <MessageSquare className="h-4 w-4" /> NARRATIVE CONTEXT
                                    </h4>
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-600">Sequence of events (How?) <span className="text-rose-500">*</span></Label>
                                            <Textarea disabled={isLocked} {...register('sequence')} placeholder="Describe the chronological sequence of events..." className="min-h-[100px] rounded-lg border-slate-200 bg-[#F9FAFB] font-medium text-sm px-4 py-3" />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-600">Activity during discovery</Label>
                                            <Textarea disabled={isLocked} {...register('how')} placeholder="What was being done at the time of the incident..." className="min-h-[100px] rounded-lg border-slate-200 bg-[#F9FAFB] font-medium text-sm px-4 py-3" />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-600">Immediate finding (Direct cause) <span className="text-rose-500">*</span></Label>
                                            <Textarea disabled={isLocked} {...register('immediateCause')} placeholder="State the direct reason for the unsafe act/condition..." className="min-h-[100px] rounded-lg border-slate-200 bg-[#F9FAFB] font-medium text-sm px-4 py-3" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* INVESTIGATION STATUS FOOTER ONLY */}
                            <div className="mt-12 pt-12 border-t">
                                <div className="space-y-6">
                                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-700 flex items-center gap-3 mb-4">
                                        <Activity className="h-4 w-4" /> INVESTIGATION STATUS
                                    </h4>
                                    <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-slate-100 flex flex-col gap-6">
                                        <div className="flex justify-between items-start">
                                            <Badge className="bg-[#DBEAFE] text-blue-700 border-none px-4 h-7 text-[10px] font-black">{stageStatus?.toUpperCase() || 'IN PROGRESS'}</Badge>
                                            <div className="flex gap-10">
                                                <div className="text-left">
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Started on</p>
                                                    <p className="text-[10px] font-bold text-slate-800 flex items-center gap-1.5 mt-1"><Calendar className="h-3 w-3 text-blue-600" /> 15 Sep 2026</p>
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Last updated</p>
                                                    <p className="text-[10px] font-bold text-slate-800 flex items-center gap-1.5 mt-1"><Clock className="h-3 w-3 text-blue-600" /> 15 Sep 2026, 14:30</p>
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Updated by</p>
                                                    <p className="text-[10px] font-bold text-slate-800 flex items-center gap-1.5 mt-1">👤 Mujeeb</p>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-xs font-bold text-slate-400 leading-relaxed uppercase">Investigation is in progress. Complete all sections and attach relevant evidence before submission.</p>
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
