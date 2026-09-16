'use client';

import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { EhsObservation } from '@/lib/types';
import { 
    FileText, 
    Search, 
    GitBranch, 
    LayoutGrid, 
    History, 
    Users, 
    Paperclip, 
    CheckCircle2,
    ArrowDown,
    MapPin,
    Calendar,
    Activity
} from 'lucide-react';

const SECTIONS = [
    { id: 'summary', label: 'Summary', icon: FileText },
    { id: '5why', label: '5-Why Analysis', icon: Search },
    { id: 'rootcause', label: 'Root Cause', icon: GitBranch },
    { id: 'fishbone', label: 'Fishbone', icon: LayoutGrid },
    { id: 'timeline', label: 'Timeline', icon: History },
    { id: 'conclusion', label: 'Conclusion', icon: CheckCircle2 },
];

export default function CapaInvestigation({ observation, isLocked }: { observation: EhsObservation, isLocked: boolean }) {
    return (
        <div className="space-y-10">
            <Tabs defaultValue="summary" className="w-full">
                <div className="bg-slate-50 p-2 rounded-2xl border-2 border-slate-100 mb-10 shadow-sm">
                    <TabsList className="h-12 w-full justify-start gap-4 bg-transparent p-0 overflow-x-auto no-scrollbar">
                        {SECTIONS.map(s => (
                            <TabsTrigger 
                                key={s.id} 
                                value={s.id}
                                className="h-10 rounded-xl px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all"
                            >
                                <s.icon className="mr-2 h-4 w-4" /> {s.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <TabsContent value="summary" className="m-0 focus-visible:ring-0">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div className="space-y-10">
                            <h4 className="text-[11px] font-black uppercase tracking-[0.5em] text-blue-600 border-b-2 border-blue-100 pb-3">Technical Logistics</h4>
                            <div className="space-y-8">
                                <FormItem label="Who was involved?" placeholder="Personnel, contractors, or departments..." isLocked={isLocked} />
                                <FormItem label="Exact Site Position" placeholder="Specific deck, unit, workshop or coordinate..." isLocked={isLocked} />
                                <div className="grid grid-cols-2 gap-8">
                                    <FormItem label="Discovery Date" type="date" isLocked={isLocked} />
                                    <FormItem label="Discovery Time" type="time" isLocked={isLocked} />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-10">
                            <h4 className="text-[11px] font-black uppercase tracking-[0.5em] text-blue-600 border-b-2 border-blue-100 pb-3">Narrative Context</h4>
                            <div className="space-y-8">
                                <FormItem label="Sequence of Events (How)?" type="textarea" placeholder="Describe the chronological sequence..." isLocked={isLocked} />
                                <FormItem label="Immediate Finding" type="textarea" placeholder="State the direct reason for the unsafe act..." isLocked={isLocked} isRequired />
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="5why" className="m-0 focus-visible:ring-0">
                    <div className="max-w-4xl mx-auto space-y-12">
                        <div className="p-6 bg-blue-600 rounded-3xl text-white flex items-start gap-5 shadow-2xl shadow-blue-500/20">
                            <Search className="h-8 w-8 shrink-0 opacity-50" />
                            <div className="space-y-1">
                                <p className="text-sm font-black uppercase tracking-widest">Root Cause Methodology</p>
                                <p className="text-xs font-medium opacity-80 leading-relaxed">Systemic failure identification: Continue probing the causal chain until the underlying organizational breakdown is revealed.</p>
                            </div>
                        </div>
                        
                        <div className="space-y-8">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="flex gap-8 items-start animate-in fade-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                                    <div className="flex flex-col items-center shrink-0 pt-2">
                                        <div className="h-14 w-14 rounded-2xl bg-slate-900 text-white font-black flex items-center justify-center text-lg shadow-2xl ring-8 ring-slate-50">W{i}</div>
                                        {i < 5 && <ArrowDown className="h-6 w-6 text-slate-200 my-4" />}
                                    </div>
                                    <Card className="flex-1 rounded-[2rem] border-2 border-slate-100 shadow-sm overflow-hidden bg-white">
                                        <div className="p-6 space-y-3">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                                                {i === 1 ? 'Direct Causal Factor?' : `Why did W${i-1} occur?`}
                                            </Label>
                                            <Textarea 
                                                disabled={isLocked}
                                                placeholder="Perform technical reasoning..."
                                                className="min-h-[80px] rounded-2xl border-none p-0 focus-visible:ring-0 font-bold text-lg text-slate-800 bg-transparent shadow-none resize-none"
                                            />
                                        </div>
                                    </Card>
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="conclusion" className="m-0 focus-visible:ring-0">
                    <div className="max-w-3xl mx-auto py-10">
                        <Card className="rounded-[3rem] border-2 border-blue-100 p-12 shadow-2xl bg-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 -mr-16 -mt-16 h-48 w-48 bg-blue-50 rounded-full blur-3xl" />
                            <h4 className="text-xl font-black uppercase tracking-tight text-slate-900 mb-10 flex items-center gap-4 relative z-10">
                                <CheckCircle2 className="h-8 w-8 text-blue-600" /> Executive Sign-off Dossier
                            </h4>
                            <div className="space-y-10 relative z-10">
                                <FormItem label="Formal Investigation Finding" type="textarea" isLocked={isLocked} isRequired />
                                <FormItem label="Primary Root Cause" type="textarea" isLocked={isLocked} isRequired />
                                <FormItem label="Recommended Strategy" type="textarea" isLocked={isLocked} isRequired />
                            </div>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function FormItem({ label, placeholder, type = 'text', isLocked, isRequired }: { label: string, placeholder?: string, type?: 'text' | 'textarea' | 'date' | 'time', isLocked: boolean, isRequired?: boolean }) {
    return (
        <div className="space-y-3">
            <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">
                {label} {isRequired && <span className="text-rose-600">*</span>}
            </Label>
            {type === 'textarea' ? (
                <Textarea 
                    disabled={isLocked}
                    placeholder={placeholder}
                    className="min-h-[140px] rounded-2xl border-2 border-slate-100 font-bold text-sm bg-slate-50/20 focus-visible:ring-blue-100 px-6 py-5 shadow-sm transition-all focus:bg-white"
                />
            ) : (
                <Input 
                    type={type}
                    disabled={isLocked}
                    placeholder={placeholder}
                    className="h-14 rounded-2xl border-2 border-slate-100 font-bold text-sm bg-slate-50/20 focus-visible:ring-blue-100 px-6 shadow-sm transition-all focus:bg-white"
                />
            )}
        </div>
    );
}
