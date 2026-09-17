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
                    <TabsList className="h-10 w-full justify-start gap-8 bg-transparent p-0">
                        {SECTIONS.map(s => (
                            <TabsTrigger 
                                key={s.id} 
                                value={s.id}
                                className="h-10 rounded-none border-b-2 border-transparent px-0 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 bg-transparent shadow-none"
                            >
                                <s.icon className="mr-2 h-3.5 w-3.5" /> {s.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <TabsContent value="summary" className="m-0 focus-visible:ring-0 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="space-y-8">
                            <SectionHeading icon={Activity} title="TECHNICAL LOGISTICS" />
                            <div className="space-y-6">
                                <FormItem label="Who was involved?" isRequired placeholder="Personnel or departments..." isLocked={isLocked} />
                                <FormItem label="Exact site position" isRequired placeholder="Specific deck or workshop..." isLocked={isLocked} />
                                <div className="grid grid-cols-2 gap-6">
                                    <FormItem label="Discovery date" type="date" isLocked={isLocked} />
                                    <FormItem label="Discovery time" type="time" isLocked={isLocked} />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-8">
                            <SectionHeading icon={MessageSquare} title="NARRATIVE CONTEXT" />
                            <div className="space-y-6">
                                <FormItem label="Sequence of events" isRequired type="textarea" placeholder="Detailed chronological sequence..." isLocked={isLocked} />
                                <FormItem label="Immediate cause" isRequired type="textarea" placeholder="Direct reason for unsafe finding..." isLocked={isLocked} />
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 pt-8 border-t space-y-8">
                        <div className="flex justify-between items-center">
                            <SectionHeading icon={Search} title="ROOT CAUSE ANALYSIS (5-WHY)" />
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">Maintain focus until systemic failure is identified</span>
                        </div>
                        <div className="space-y-3 max-w-4xl">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="flex gap-4 items-center group">
                                    <div className="h-8 w-10 rounded border bg-slate-50 text-slate-400 font-black flex items-center justify-center text-[9px] uppercase shadow-sm">W{i}</div>
                                    <Input 
                                        disabled={isLocked}
                                        placeholder={i === 1 ? "Primary direct cause?" : "Why did that happen?"}
                                        className="h-10 rounded-md border-slate-200 bg-white font-medium text-xs focus-visible:ring-blue-100 shadow-sm"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="5why" className="m-0 focus-visible:ring-0">
                    <div className="py-20 text-center border-2 border-dashed rounded-xl bg-slate-50 border-slate-200">
                        <Search className="h-12 w-12 mx-auto mb-4 text-slate-200" />
                        <p className="font-black uppercase text-[10px] tracking-[0.3em] text-slate-400">Analysis module restricted to summary view</p>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function SectionHeading({ icon: Icon, title }: { icon: any, title: string }) {
    return (
        <div className="flex items-center gap-2.5">
            <Icon className="h-4 w-4 text-slate-900" />
            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-900">{title}</h4>
        </div>
    );
}

function FormItem({ label, placeholder, type = 'text', isLocked, isRequired }: { label: string, placeholder?: string, type?: 'text' | 'textarea' | 'date' | 'time', isLocked: boolean, isRequired?: boolean }) {
    return (
        <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">
                {label} {isRequired && <span className="text-rose-600">*</span>}
            </Label>
            {type === 'textarea' ? (
                <Textarea 
                    disabled={isLocked}
                    placeholder={placeholder}
                    className="min-h-[100px] rounded-md border-slate-200 font-medium text-xs bg-white focus-visible:ring-blue-100 shadow-sm p-4 resize-none leading-relaxed"
                />
            ) : (
                <Input 
                    type={type}
                    disabled={isLocked}
                    placeholder={placeholder}
                    className="h-10 rounded-md border-slate-200 font-medium text-xs bg-white focus-visible:ring-blue-100 shadow-sm px-4"
                />
            )}
        </div>
    );
}
