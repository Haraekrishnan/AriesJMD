'use client';

import React from 'react';
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
    CheckCircle2,
    MapPin,
    User,
    Calendar,
    Clock,
    Activity,
    MessageSquare,
    AlertTriangle,
    ShieldAlert
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
    const sData = observation.stages['Investigation'];

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-700 text-left">
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600">Technical Action Required</p>
                    <Badge variant="outline" className="h-5 rounded-sm bg-blue-50 text-blue-700 border-none font-black text-[9px] px-2.5">PHASE IMPLEMENTATION</Badge>
                </div>
                <h3 className="text-4xl font-black text-[#0F172A] uppercase tracking-tighter">INVESTIGATION</h3>
            </div>

            <Tabs defaultValue="summary" className="w-full">
                <div className="border-b mb-8">
                    <TabsList className="h-12 w-full justify-start gap-10 bg-transparent p-0">
                        {SECTIONS.map(s => (
                            <TabsTrigger 
                                key={s.id} 
                                value={s.id}
                                className="h-12 rounded-none border-b-2 border-transparent px-0 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 bg-transparent shadow-none transition-all"
                            >
                                <s.icon className="mr-2 h-3.5 w-3.5" /> {s.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <TabsContent value="summary" className="m-0 focus-visible:ring-0">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div className="space-y-10">
                            <SectionHeading icon={Activity} title="TECHNICAL LOGISTICS" />
                            <div className="space-y-6">
                                <FormItem label="Who was involved?" isRequired placeholder="Personnel, contractors, or departments..." isLocked={isLocked} />
                                <FormItem label="Exact site position" isRequired placeholder="Specific deck, unit, workshop or coordinate..." isLocked={isLocked} />
                                <div className="grid grid-cols-2 gap-6">
                                    <FormItem label="Discovery date" type="date" isLocked={isLocked} />
                                    <FormItem label="Discovery time" type="time" isLocked={isLocked} />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-10">
                            <SectionHeading icon={MessageSquare} title="NARRATIVE CONTEXT" />
                            <div className="space-y-6">
                                <FormItem label="Sequence of events (How?)" type="textarea" placeholder="Describe the chronological sequence..." isLocked={isLocked} isRequired />
                                <FormItem label="Immediate finding" type="textarea" placeholder="State the direct reason for the unsafe act..." isLocked={isLocked} isRequired />
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 space-y-8">
                        <div className="flex justify-between items-center">
                            <SectionHeading icon={ShieldAlert} title="ROOT CAUSE ANALYSIS (5-WHY)" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Keep asking why until a systemic failure is identified</span>
                        </div>
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="flex gap-4 items-center group">
                                    <div className="h-10 w-12 rounded-lg bg-blue-50 text-blue-600 font-black flex items-center justify-center text-[10px] shadow-sm border border-blue-100">Why {i}</div>
                                    <Input 
                                        disabled={isLocked}
                                        placeholder={i === 1 ? "Why did the immediate finding occur?" : "Why did the previous cause occur?"}
                                        className="h-11 rounded-xl border-slate-200 bg-white font-medium text-xs focus-visible:ring-blue-100 shadow-sm"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="5why" className="m-0 focus-visible:ring-0">
                    <div className="py-20 text-center opacity-30">
                        <Search className="h-16 w-16 mx-auto mb-4" />
                        <p className="font-black uppercase tracking-widest text-xs">Analysis Visualizer Encrypted</p>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function SectionHeading({ icon: Icon, title }: { icon: any, title: string }) {
    return (
        <div className="flex items-center gap-3">
            <Icon className="h-4 w-4 text-blue-600" />
            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-900">{title}</h4>
        </div>
    );
}

function FormItem({ label, placeholder, type = 'text', isLocked, isRequired }: { label: string, placeholder?: string, type?: 'text' | 'textarea' | 'date' | 'time', isLocked: boolean, isRequired?: boolean }) {
    return (
        <div className="space-y-2">
            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">
                {label} {isRequired && <span className="text-rose-600">*</span>}
            </Label>
            {type === 'textarea' ? (
                <Textarea 
                    disabled={isLocked}
                    placeholder={placeholder}
                    className="min-h-[100px] rounded-xl border-2 border-slate-100 font-bold text-xs bg-white focus-visible:ring-blue-100 shadow-sm"
                />
            ) : (
                <Input 
                    type={type}
                    disabled={isLocked}
                    placeholder={placeholder}
                    className="h-12 rounded-xl border-2 border-slate-100 font-bold text-xs bg-white focus-visible:ring-blue-100 shadow-sm px-4"
                />
            )}
        </div>
    );
}
