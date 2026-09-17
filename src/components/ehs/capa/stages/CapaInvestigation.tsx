'use client';

import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { EhsObservation } from '@/lib/types';
import { 
    FileText, 
    Search, 
    GitBranch, 
    LayoutGrid, 
    History, 
    CheckCircle2,
    Activity,
    MessageSquare,
    AlertTriangle,
} from 'lucide-react';

const SECTIONS = [
    { id: 'summary', label: 'Summary', icon: FileText },
    { id: '5why', label: '5-Why Analysis', icon: Search },
    { id: 'rootcause', label: 'Root Cause', icon: GitBranch },
    { id: 'timeline', label: 'Timeline', icon: History },
    { id: 'conclusion', label: 'Conclusion', icon: CheckCircle2 },
];

export default function CapaInvestigation({ observation, isLocked }: { observation: EhsObservation, isLocked: boolean }) {
    return (
        <div className="space-y-10 text-left">
            {/* WORKBENCH HEADER */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600">Technical Action Required</p>
                        <Badge variant="outline" className="h-5 rounded-sm bg-blue-50 text-blue-700 border-none font-black text-[9px] px-2.5">PHASE INVESTIGATION</Badge>
                    </div>
                    <h3 className="text-4xl font-black text-[#0F172A] uppercase tracking-tighter">Investigation Workbench</h3>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-tight">Systematic root cause identification and technical forensics.</p>
                </div>
            </div>

            <Tabs defaultValue="summary" className="w-full">
                <div className="border-b-2 border-slate-100 mb-10">
                    <TabsList className="h-12 w-full justify-start gap-10 bg-transparent p-0">
                        {SECTIONS.map(s => (
                            <TabsTrigger 
                                key={s.id} 
                                value={s.id}
                                className="h-12 rounded-none border-b-[3px] border-transparent px-0 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 bg-transparent shadow-none"
                            >
                                <s.icon className="mr-2 h-4 w-4" /> {s.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <TabsContent value="summary" className="m-0 focus-visible:ring-0 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div className="space-y-10">
                            <SectionHeading icon={Activity} title="TECHNICAL LOGISTICS" />
                            <div className="space-y-8">
                                <FormItem label="Who was involved?" isRequired placeholder="Personnel, contractors, or departments..." isLocked={isLocked} />
                                <FormItem label="Exact site position" isRequired placeholder="Specific deck, unit, workshop or coordinate..." isLocked={isLocked} />
                                <div className="grid grid-cols-2 gap-8">
                                    <FormItem label="Discovery date" type="date" isLocked={isLocked} />
                                    <FormItem label="Discovery time" type="time" isLocked={isLocked} />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-10">
                            <SectionHeading icon={MessageSquare} title="NARRATIVE CONTEXT" />
                            <div className="space-y-8">
                                <FormItem label="Sequence of events (How?)" type="textarea" placeholder="Detailed chronological sequence of findings..." isLocked={isLocked} isRequired />
                                <FormItem label="Immediate cause" type="textarea" placeholder="State the direct reason for the unsafe act or condition..." isLocked={isLocked} isRequired danger />
                            </div>
                        </div>
                    </div>

                    <div className="mt-16 pt-12 border-t-2 border-slate-50 space-y-10">
                        <div className="flex justify-between items-center">
                            <SectionHeading icon={Search} title="ROOT CAUSE ANALYSIS (5-WHY)" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Maintain focus until systemic failure is identified</span>
                        </div>
                        <div className="space-y-4 max-w-4xl">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="flex gap-6 items-start group">
                                    <div className="h-10 w-14 rounded-xl bg-slate-900 text-white font-black flex items-center justify-center text-[10px] border-b-4 border-blue-600 uppercase shadow-lg shrink-0">W{i}</div>
                                    <Input 
                                        disabled={isLocked}
                                        placeholder={i === 1 ? "What was the immediate cause?" : "Why did the previous condition occur?"}
                                        className="h-10 rounded-xl border-2 border-slate-100 bg-white font-bold text-sm focus-visible:ring-blue-100 shadow-sm px-6"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="5why" className="m-0 focus-visible:ring-0">
                    <div className="py-32 text-center border-4 border-dashed rounded-[3rem] bg-slate-50 border-slate-100">
                        <Search className="h-16 w-16 mx-auto mb-4 text-slate-200" />
                        <p className="font-black uppercase text-xs tracking-[0.3em] text-slate-400">Visual Root Cause Module Offline</p>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function SectionHeading({ icon: Icon, title }: { icon: any, title: string }) {
    return (
        <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 text-slate-900" />
            <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-900">{title}</h4>
        </div>
    );
}

function FormItem({ label, placeholder, type = 'text', isLocked, isRequired, danger = false }: { label: string, placeholder?: string, type?: 'text' | 'textarea' | 'date' | 'time', isLocked: boolean, isRequired?: boolean, danger?: boolean }) {
    return (
        <div className="space-y-3">
            <Label className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-500 ml-1">
                {label} {isRequired && <span className="text-rose-600">*</span>}
            </Label>
            {type === 'textarea' ? (
                <Textarea 
                    disabled={isLocked}
                    placeholder={placeholder}
                    className={cn(
                        "min-h-[140px] rounded-2xl border-2 border-slate-100 font-bold text-sm bg-white focus-visible:ring-blue-100 shadow-sm p-6 resize-none leading-relaxed",
                        danger && "border-rose-100 bg-rose-50/20"
                    )}
                />
            ) : (
                <Input 
                    type={type}
                    disabled={isLocked}
                    placeholder={placeholder}
                    className="h-12 rounded-2xl border-2 border-slate-100 font-bold text-sm bg-white focus-visible:ring-blue-100 shadow-sm px-6"
                />
            )}
        </div>
    );
}
