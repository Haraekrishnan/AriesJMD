'use client';

import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
    ArrowDown
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const SECTIONS = [
    { id: 'summary', label: 'Summary', icon: FileText },
    { id: '5why', label: '5-Why Analysis', icon: Search },
    { id: 'rootcause', label: 'Root Cause', icon: GitBranch },
    { id: 'fishbone', label: 'Fishbone', icon: LayoutGrid },
    { id: 'timeline', label: 'Timeline', icon: History },
    { id: 'conclusion', label: 'Conclusion', icon: CheckCircle2 },
];

export default function CapaInvestigation({ observation, isLocked }: { observation: EhsObservation, isLocked: boolean }) {
    const sData = observation.stages['Investigation'];

    return (
        <div className="space-y-8 h-full">
            <Tabs defaultValue="summary" className="w-full flex flex-col h-full">
                <div className="overflow-hidden mb-8">
                    <TabsList className="h-11 w-full justify-start gap-4 bg-transparent p-0 border-b rounded-none overflow-x-auto no-scrollbar">
                        {SECTIONS.map(s => (
                            <TabsTrigger 
                                key={s.id} 
                                value={s.id}
                                className="h-11 rounded-none border-b-2 border-transparent px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 bg-transparent shadow-none"
                            >
                                <s.icon className="mr-2 h-3.5 w-3.5" /> {s.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <TabsContent value="summary" className="m-0 focus-visible:ring-0">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600 border-b pb-2">Technical Logistics</h4>
                            <div className="space-y-5">
                                <FormItem label="Who was involved?" placeholder="Personnel, contractors, or departments..." isLocked={isLocked} />
                                <FormItem label="Site Position" placeholder="Specific deck, unit, workshop or coordinate..." isLocked={isLocked} />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormItem label="Date" type="date" isLocked={isLocked} />
                                    <FormItem label="Time" type="time" isLocked={isLocked} />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600 border-b pb-2">Narrative Context</h4>
                            <div className="space-y-5">
                                <FormItem label="Sequence of Events (How)?" type="textarea" placeholder="Describe the chronological sequence..." isLocked={isLocked} />
                                <FormItem label="Activity during Discovery" type="textarea" placeholder="What was being done at the time?" isLocked={isLocked} />
                                <FormItem label="Immediate Finding" type="textarea" placeholder="State the direct reason for the unsafe act..." isLocked={isLocked} isRequired />
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="5why" className="m-0 focus-visible:ring-0">
                    <div className="max-w-3xl mx-auto space-y-10">
                        <div className="p-4 bg-blue-50 border rounded-xl flex items-start gap-3">
                            <Search className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                            <div className="text-xs font-bold text-blue-800 leading-relaxed uppercase tracking-tight">
                                Systemic failure identification: Continue probing the causal chain until the underlying organizational breakdown is revealed.
                            </div>
                        </div>
                        
                        <div className="space-y-6">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="flex gap-6 items-start">
                                    <div className="flex flex-col items-center shrink-0 pt-2">
                                        <div className="h-10 w-10 rounded-xl bg-slate-900 text-white font-black flex items-center justify-center text-xs shadow-md">W{i}</div>
                                        {i < 5 && <ArrowDown className="h-4 w-4 text-slate-200 my-2" />}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                            {i === 1 ? 'Direct Causal Factor?' : `Why did W${i-1} occur?`}
                                        </Label>
                                        <Textarea 
                                            disabled={isLocked}
                                            placeholder="Perform technical reasoning..."
                                            className="min-h-[60px] rounded-xl border-2 border-slate-100 font-bold focus-visible:ring-blue-100"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="conclusion" className="m-0 focus-visible:ring-0">
                    <div className="max-w-2xl mx-auto space-y-8 py-4">
                        <Card className="rounded-2xl border-2 border-slate-100 p-8 shadow-sm">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-blue-600" /> Executive Summary & Sign-off
                            </h4>
                            <div className="space-y-6">
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
        <div className="space-y-1.5">
            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">
                {label} {isRequired && <span className="text-rose-600">*</span>}
            </Label>
            {type === 'textarea' ? (
                <Textarea 
                    disabled={isLocked}
                    placeholder={placeholder}
                    className="min-h-[100px] rounded-lg border-2 border-slate-100 font-bold text-sm bg-slate-50/30 focus-visible:ring-blue-100 px-4 py-3"
                />
            ) : (
                <Input 
                    type={type}
                    disabled={isLocked}
                    placeholder={placeholder}
                    className="h-12 rounded-lg border-2 border-slate-100 font-bold text-sm bg-slate-50/30 focus-visible:ring-blue-100 px-4"
                />
            )}
        </div>
    );
}
