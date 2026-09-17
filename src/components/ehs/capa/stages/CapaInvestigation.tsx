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
    History, 
    CheckCircle2,
    Activity,
    MessageSquare,
    ArrowDown
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
        <div className="space-y-8 text-left">
            <Tabs defaultValue="summary" className="w-full">
                <div className="border-b mb-8">
                    <TabsList className="h-9 w-full justify-start gap-8 bg-transparent p-0">
                        {SECTIONS.map(s => (
                            <TabsTrigger 
                                key={s.id} 
                                value={s.id}
                                className="h-9 rounded-none border-b-2 border-transparent px-0 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] data-[state=active]:border-slate-800 data-[state=active]:text-slate-900 bg-transparent shadow-none"
                            >
                                <s.icon className="mr-2 h-3.5 w-3.5" /> {s.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <TabsContent value="summary" className="m-0 focus-visible:ring-0 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="space-y-6">
                            <SectionHeading icon={Activity} title="TECHNICAL LOGISTICS" />
                            <div className="space-y-5">
                                <FormItem label="Who was involved?" isRequired placeholder="Personnel or departments..." isLocked={isLocked} />
                                <FormItem label="Exact site position" isRequired placeholder="Specific deck or workshop..." isLocked={isLocked} />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormItem label="Discovery date" type="date" isLocked={isLocked} />
                                    <FormItem label="Discovery time" type="time" isLocked={isLocked} />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <SectionHeading icon={MessageSquare} title="NARRATIVE CONTEXT" />
                            <div className="space-y-5">
                                <FormItem label="Sequence of events" isRequired type="textarea" placeholder="Detailed chronological sequence..." isLocked={isLocked} />
                                <FormItem label="Immediate cause" isRequired type="textarea" placeholder="Direct reason for unsafe finding..." isLocked={isLocked} />
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="5why" className="m-0 focus-visible:ring-0 animate-in fade-in duration-500">
                    <div className="space-y-6">
                        <div className="flex justify-between items-center border-b pb-4">
                            <div className="flex items-center gap-2.5">
                                <Search className="h-3.5 w-3.5 text-slate-600" />
                                <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-700">ROOT CAUSE ANALYSIS (5-WHY)</h4>
                            </div>
                            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">IDENTIFY SYSTEMIC FAILURE POINTS</span>
                        </div>
                        
                        <div className="space-y-3 max-w-4xl py-4">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="flex gap-4 items-center">
                                    <div className="h-8 w-10 rounded border border-slate-300 bg-slate-50 text-slate-500 font-bold flex items-center justify-center text-[10px] uppercase">W{i}</div>
                                    <Input 
                                        disabled={isLocked}
                                        placeholder={i === 1 ? "Primary direct cause?" : "Why did that happen?"}
                                        className="h-10 rounded-md border-slate-300 bg-white font-medium text-xs focus-visible:ring-1 focus-visible:ring-blue-200"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="rootcause" className="m-0 focus-visible:ring-0">
                    <div className="py-20 text-center border border-dashed rounded-lg bg-slate-50/50 border-slate-300">
                        <GitBranch className="h-10 w-10 mx-auto mb-4 text-slate-300" />
                        <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-slate-400">Root Cause Statement TBD after 5-Why Completion</p>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function SectionHeading({ icon: Icon, title }: { icon: any, title: string }) {
    return (
        <div className="flex items-center gap-2.5">
            <Icon className="h-3.5 w-3.5 text-slate-600" />
            <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-700">{title}</h4>
        </div>
    );
}

function FormItem({ label, placeholder, type = 'text', isLocked, isRequired }: { label: string, placeholder?: string, type?: 'text' | 'textarea' | 'date' | 'time', isLocked: boolean, isRequired?: boolean }) {
    return (
        <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-0.5">
                {label} {isRequired && <span className="text-rose-500">*</span>}
            </Label>
            {type === 'textarea' ? (
                <Textarea 
                    disabled={isLocked}
                    placeholder={placeholder}
                    className="min-h-[90px] rounded-md border-slate-300 font-medium text-xs bg-white focus-visible:ring-1 focus-visible:ring-blue-200 p-3 resize-none leading-relaxed"
                />
            ) : (
                <Input 
                    type={type}
                    disabled={isLocked}
                    placeholder={placeholder}
                    className="h-9 rounded-md border-slate-300 font-medium text-xs bg-white focus-visible:ring-1 focus-visible:ring-blue-200 px-3"
                />
            )}
        </div>
    );
}
