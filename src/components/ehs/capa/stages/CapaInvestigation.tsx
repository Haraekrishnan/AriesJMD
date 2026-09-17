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
        <div className="space-y-8 text-left">
            <Tabs defaultValue="summary" className="w-full">
                <div className="border-b border-slate-200 mb-6">
                    <TabsList className="h-10 w-full justify-start gap-6 bg-transparent p-0">
                        {SECTIONS.map(s => (
                            <TabsTrigger 
                                key={s.id} 
                                value={s.id}
                                className="h-10 rounded-none border-b-2 border-transparent px-0 text-[10px] font-black text-slate-400 uppercase tracking-widest data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 bg-transparent shadow-none"
                            >
                                <s.icon className="mr-2 h-3.5 w-3.5" /> {s.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <TabsContent value="summary" className="m-0 focus-visible:ring-0">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="space-y-8">
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
                        <div className="space-y-8">
                            <SectionHeading icon={MessageSquare} title="NARRATIVE CONTEXT" />
                            <div className="space-y-5">
                                <FormItem label="Sequence of events" type="textarea" placeholder="Detailed chronological sequence..." isLocked={isLocked} isRequired />
                                <FormItem label="Immediate cause" type="textarea" placeholder="Direct reason for unsafe finding..." isLocked={isLocked} isRequired />
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 pt-8 border-t border-slate-100 space-y-6">
                        <div className="flex justify-between items-center">
                            <SectionHeading icon={Search} title="ROOT CAUSE ANALYSIS (5-WHY)" />
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Maintain focus until systemic failure is identified</span>
                        </div>
                        <div className="space-y-2">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="flex gap-3 items-center">
                                    <div className="h-9 w-11 rounded bg-slate-100 text-slate-500 font-black flex items-center justify-center text-[9px] border border-slate-200 uppercase">W{i}</div>
                                    <Input 
                                        disabled={isLocked}
                                        placeholder={i === 1 ? "Primary direct cause?" : "Why did that happen?"}
                                        className="h-9 rounded-sm border-slate-200 bg-white font-medium text-xs focus-visible:ring-slate-200"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="5why" className="m-0 focus-visible:ring-0">
                    <div className="py-20 text-center border border-dashed rounded bg-slate-50">
                        <p className="font-bold uppercase text-[10px] tracking-widest text-slate-400">Visual Analysis Module Offline</p>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function SectionHeading({ icon: Icon, title }: { icon: any, title: string }) {
    return (
        <div className="flex items-center gap-2.5">
            <Icon className="h-3.5 w-3.5 text-slate-900" />
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900">{title}</h4>
        </div>
    );
}

function FormItem({ label, placeholder, type = 'text', isLocked, isRequired }: { label: string, placeholder?: string, type?: 'text' | 'textarea' | 'date' | 'time', isLocked: boolean, isRequired?: boolean }) {
    return (
        <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-0.5">
                {label} {isRequired && <span className="text-red-600">*</span>}
            </Label>
            {type === 'textarea' ? (
                <Textarea 
                    disabled={isLocked}
                    placeholder={placeholder}
                    className="min-h-[90px] rounded-sm border border-slate-300 font-medium text-xs bg-white focus-visible:ring-slate-200 resize-none"
                />
            ) : (
                <Input 
                    type={type}
                    disabled={isLocked}
                    placeholder={placeholder}
                    className="h-9 rounded-sm border border-slate-300 font-medium text-xs bg-white focus-visible:ring-slate-200 px-3"
                />
            )}
        </div>
    );
}