'use client';

import React from 'react';
import { 
    Clock, 
    FileText, 
    MapPin,
    User,
    Calendar,
    Target,
    CheckCircle2,
    Activity,
    FileSearch,
    MessageSquare,
    Users,
    Paperclip,
    ExternalLink,
    ShieldAlert,
    ShieldCheck,
    History,
    UserCircle,
    CheckCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFormContext } from 'react-hook-form';
import type { EhsObservation } from '@/lib/types';

export default function CapaInvestigationWorkspace({ observation }: { observation: EhsObservation }) {
    const { register } = useFormContext();

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
                                            <Input {...register('who')} placeholder="Personnel, contractors, or departments..." className="h-11 rounded-lg border-slate-200 bg-[#F9FAFB] font-medium text-sm px-4" />
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight ml-1">List all persons or departments involved in this incident</p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-600">Exact site position <span className="text-rose-500">*</span></Label>
                                            <Input {...register('where')} placeholder="Specific deck, unit, workshop or coordinate..." className="h-11 rounded-lg border-slate-200 bg-[#F9FAFB] font-medium text-sm px-4" />
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight ml-1">Provide the exact location where the incident occurred</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-600">Discovery date <span className="text-rose-500">*</span></Label>
                                                <div className="relative">
                                                    <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                    <Input type="text" placeholder="dd-mm-yyyy" className="h-11 rounded-lg border-slate-200 bg-[#F9FAFB] font-medium text-sm px-4" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-600">Discovery time</Label>
                                                <div className="relative">
                                                    <Clock className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                    <Input type="text" placeholder="--:--" className="h-11 rounded-lg border-slate-200 bg-[#F9FAFB] font-medium text-sm px-4" />
                                                </div>
                                            </div>
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
                                            <Textarea {...register('sequence')} placeholder="Describe the chronological sequence of events..." className="min-h-[100px] rounded-lg border-slate-200 bg-[#F9FAFB] font-medium text-sm px-4 py-3" />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-600">Activity during discovery</Label>
                                            <Textarea {...register('how')} placeholder="What was being done at the time of the incident..." className="min-h-[100px] rounded-lg border-slate-200 bg-[#F9FAFB] font-medium text-sm px-4 py-3" />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-600">Immediate finding (Direct cause) <span className="text-rose-500">*</span></Label>
                                            <Textarea {...register('immediateCause')} placeholder="State the direct reason for the unsafe act/condition..." className="min-h-[100px] rounded-lg border-slate-200 bg-[#F9FAFB] font-medium text-sm px-4 py-3" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* INVESTIGATION STATUS & EVIDENCE FOOTER */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-12 pt-12 border-t">
                                <div className="space-y-6">
                                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-700 flex items-center gap-3 mb-4">
                                        <Activity className="h-4 w-4" /> INVESTIGATION STATUS
                                    </h4>
                                    <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-slate-100 flex flex-col gap-6">
                                        <div className="flex justify-between items-start">
                                            <Badge className="bg-[#DBEAFE] text-blue-700 border-none px-4 h-7 text-[10px] font-black">IN PROGRESS</Badge>
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

                                <div className="space-y-6">
                                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-700 flex items-center gap-3 mb-4">
                                        <Paperclip className="h-4 w-4" /> INITIAL EVIDENCE
                                    </h4>
                                    <div className="h-full min-h-[160px] border-2 border-dashed border-blue-200 bg-[#F9FAFF] rounded-2xl flex flex-col items-center justify-center p-8 gap-3 group hover:bg-blue-50 transition-all cursor-pointer">
                                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                                            <UploadCloud className="h-5 w-5" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-slate-600">Drag and drop files here</p>
                                            <p className="text-[10px] font-bold text-slate-400">or <span className="text-blue-600 underline">click to browse</span></p>
                                        </div>
                                        <Button variant="outline" size="sm" className="mt-2 h-9 px-6 font-bold text-blue-700 border-blue-200 uppercase tracking-widest text-[9px] bg-white gap-2">
                                            <UploadCloud className="h-3.5 w-3.5" /> Upload Document
                                        </Button>
                                        <p className="text-[9px] font-bold text-slate-300 mt-2 uppercase">Supported formats: PDF, DOC, XLS, JPG, PNG (Max 50MB)</p>
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

import { UploadCloud } from 'lucide-react';