'use client';

import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { EhsObservation } from '@/lib/types';
import { 
    FileText, 
    Search, 
    GitBranch, 
    LayoutGrid, 
    History, 
    CheckCircle2,
    ArrowDown,
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
        <div className="space-y-8">
            <Tabs defaultValue="summary" className="w-full">
                <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200 mb-8 shadow-sm max-w-fit">
                    <TabsList className="h-10 bg-transparent p-0 flex gap-1">
                        {SECTIONS.map(s => (
                            <TabsTrigger 
                                key={s.id} 
                                value={s.id}
                                className="h-8 rounded-lg px-5 text-[9px] font-black text-slate-400 uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all"
                            >
                                <s.icon className="mr-2 h-3.5 w-3.5" /> {s.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <TabsContent value="summary" className="m-0 focus-visible:ring-0 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="space-y-8">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600 border-b pb-2">Technical Logistics</h4>
                            <div className="space-y-6">
                                <FormItem label="Who was involved?" placeholder="Personnel, contractors, or departments..." isLocked={isLocked} />
                                <FormItem label="Exact Site Position" placeholder="Specific deck, unit, workshop or coordinate..." isLocked={isLocked} />
                                <div className="grid grid-cols-2 gap-6">
                                    <FormItem label="Discovery Date" type="date" isLocked={isLocked} />
                                    <FormItem label="Discovery Time" type="time" isLocked={isLocked} />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-8">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600 border-b pb-2">Narrative Context</h4>
                            <div className="space-y-6">
                                <FormItem label="Sequence of Events (How)?" type="textarea" placeholder="Describe the chronological sequence..." isLocked={isLocked} />
                                <FormItem label="Immediate Finding" type="textarea" placeholder="State the direct reason for the unsafe act..." isLocked={isLocked} isRequired />
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="5why" className="m-0 focus-visible:ring-0 animate-in fade-in duration-500">
                    <div className="max-w-4xl mx-auto space-y-8">
                        <div className="flex justify-between items-center px-2">
                             <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600">Root Cause Analysis (5-Why)</h4>
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ask why until systemic failure is revealed</p>
                        </div>
                        
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="flex gap-6 items-start animate-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                                    <div className="flex flex-col items-center shrink-0 pt-1">
                                        <div className="h-10 w-10 rounded-xl bg-slate-900 text-white font-black flex items-center justify-center text-xs shadow-lg">Why {i}</div>
                                        {i < 5 && <ArrowDown className="h-4 w-4 text-slate-200 my-2" />}
                                    </div>
                                    <div className="flex-1">
                                        <Input 
                                            disabled={isLocked}
                                            placeholder={i === 1 ? "Why did the immediate finding occur?" : "Why did the previous cause exist?"}
                                            className="h-12 rounded-xl border-2 border-slate-100 font-bold text-sm bg-white focus-visible:ring-blue-100 shadow-sm"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="conclusion" className="m-0 focus-visible:ring-0 animate-in fade-in duration-500">
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
        <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 ml-1">
                {label} {isRequired && <span className="text-rose-600">*</span>}
            </Label>
            {type === 'textarea' ? (
                <Textarea 
                    disabled={isLocked}
                    placeholder={placeholder}
                    className="min-h-[100px] rounded-xl border-2 border-slate-100 font-bold text-sm bg-slate-50/30 focus-visible:ring-blue-100 px-5 py-4 shadow-sm"
                />
            ) : (
                <Input 
                    type={type}
                    disabled={isLocked}
                    placeholder={placeholder}
                    className="h-11 rounded-xl border-2 border-slate-100 font-bold text-sm bg-slate-50/30 focus-visible:ring-blue-100 px-5 shadow-sm"
                />
            )}
        </div>
    );
}
