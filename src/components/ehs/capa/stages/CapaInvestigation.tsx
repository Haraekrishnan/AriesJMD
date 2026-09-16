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
    MapPin,
    User,
    Calendar,
    Clock
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

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
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* --- WORKBENCH HEADER --- */}
            <div className="flex items-center gap-6 mb-10">
                <div className="h-16 w-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-2xl shadow-blue-600/30 ring-4 ring-blue-50">
                    <span className="font-black text-2xl">02</span>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">Phase Implementation</p>
                    <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Investigation Workbench</h3>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-tight">Perform detailed root cause analysis and technical forensics.</p>
                </div>
            </div>

            <Tabs defaultValue="summary" className="w-full">
                <div className="bg-white p-1.5 rounded-xl border-2 border-slate-100 mb-8 shadow-sm max-w-fit">
                    <TabsList className="h-10 bg-transparent p-0 flex gap-1">
                        {SECTIONS.map(s => (
                            <TabsTrigger 
                                key={s.id} 
                                value={s.id}
                                className="h-8 rounded-lg px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                            >
                                <s.icon className="mr-2 h-3.5 w-3.5" /> {s.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <TabsContent value="summary" className="m-0 focus-visible:ring-0">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <Card className="p-8 border-2 border-slate-100 shadow-sm rounded-2xl space-y-8">
                            <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-blue-600 border-b pb-3 flex items-center gap-2">
                                <FileText className="h-4 w-4" /> Technical Logistics
                            </h4>
                            <div className="space-y-6">
                                <FormItem label="Who was involved?" placeholder="Personnel, contractors, or departments..." isLocked={isLocked} icon={User} />
                                <FormItem label="Exact Site Position" placeholder="Specific deck, unit, workshop or coordinate..." isLocked={isLocked} icon={MapPin} />
                                <div className="grid grid-cols-2 gap-6">
                                    <FormItem label="Discovery Date" type="date" isLocked={isLocked} icon={Calendar} />
                                    <FormItem label="Discovery Time" type="time" isLocked={isLocked} icon={Clock} />
                                </div>
                            </div>
                        </Card>
                        
                        <Card className="p-8 border-2 border-slate-100 shadow-sm rounded-2xl space-y-8">
                            <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-blue-600 border-b pb-3 flex items-center gap-2">
                                <History className="h-4 w-4" /> Narrative Context
                            </h4>
                            <div className="space-y-6">
                                <FormItem label="Sequence of Events (How)?" type="textarea" placeholder="Describe the chronological sequence..." isLocked={isLocked} />
                                <FormItem label="Immediate Finding" type="textarea" placeholder="State the direct reason for the unsafe act..." isLocked={isLocked} isRequired />
                            </div>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="5why" className="m-0 focus-visible:ring-0">
                    <div className="max-w-4xl mx-auto space-y-10 py-6">
                        <div className="text-center space-y-2">
                             <h4 className="text-sm font-black uppercase tracking-[0.4em] text-blue-600">Root Cause Methodology (5-Why)</h4>
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Ask "Why?" until the systemic organizational failure is revealed</p>
                        </div>
                        
                        <div className="space-y-6">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="flex gap-8 items-start animate-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                                    <div className="flex flex-col items-center shrink-0 pt-2">
                                        <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white font-black flex items-center justify-center text-sm shadow-xl ring-4 ring-slate-50">W{i}</div>
                                        {i < 5 && <ArrowDown className="h-5 w-5 text-slate-200 my-4" />}
                                    </div>
                                    <Card className="flex-1 p-6 border-2 border-slate-100 shadow-sm rounded-2xl hover:border-blue-200 transition-colors">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block">
                                            {i === 1 ? "Why did the immediate finding occur?" : `Why did the condition in WHY ${i-1} exist?`}
                                        </Label>
                                        <Textarea 
                                            disabled={isLocked}
                                            placeholder="Enter technical reasoning..."
                                            className="min-h-[60px] border-none bg-slate-50/50 p-4 font-bold focus-visible:ring-0 text-slate-800"
                                        />
                                    </Card>
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="conclusion" className="m-0 focus-visible:ring-0">
                    <div className="max-w-3xl mx-auto space-y-8 py-4">
                        <Card className="rounded-[2.5rem] border-2 border-slate-100 p-10 shadow-sm bg-white">
                            <h4 className="text-lg font-black uppercase tracking-tight text-slate-900 mb-10 flex items-center gap-3">
                                <CheckCircle2 className="h-6 w-6 text-emerald-500" /> Executive Conclusion & Sign-off
                            </h4>
                            <div className="space-y-8">
                                <FormItem label="Formal Investigation Finding" type="textarea" isLocked={isLocked} isRequired />
                                <FormItem label="Identified Systemic Root Cause" type="textarea" isLocked={isLocked} isRequired />
                                <FormItem label="Recommended Strategy" type="textarea" isLocked={isLocked} isRequired />
                            </div>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function FormItem({ label, placeholder, type = 'text', isLocked, isRequired, icon: Icon }: { label: string, placeholder?: string, type?: 'text' | 'textarea' | 'date' | 'time', isLocked: boolean, isRequired?: boolean, icon?: any }) {
    return (
        <div className="space-y-2.5">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 flex items-center gap-2">
                {Icon && <Icon className="h-3 w-3 text-slate-400" />}
                {label} {isRequired && <span className="text-rose-600">*</span>}
            </Label>
            {type === 'textarea' ? (
                <Textarea 
                    disabled={isLocked}
                    placeholder={placeholder}
                    className="min-h-[120px] rounded-xl border-2 border-slate-100 font-bold text-sm bg-slate-50/30 focus-visible:ring-blue-100 px-5 py-4 shadow-inner"
                />
            ) : (
                <Input 
                    type={type}
                    disabled={isLocked}
                    placeholder={placeholder}
                    className="h-12 rounded-xl border-2 border-slate-100 font-bold text-sm bg-slate-50/30 focus-visible:ring-blue-100 px-5 shadow-inner"
                />
            )}
        </div>
    );
}