'use client';

import React from 'react';
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
    Info,
    ArrowDown,
    MapPin
} from 'lucide-react';

const SECTIONS = [
    { id: 'summary', label: 'Summary', icon: FileText },
    { id: '5why', label: '5-Why Analysis', icon: Search },
    { id: 'rootcause', label: 'Root Cause', icon: GitBranch },
    { id: 'fishbone', label: 'Fishbone', icon: LayoutGrid },
    { id: 'timeline', label: 'Timeline', icon: History },
    { id: 'interviews', label: 'Interviews', icon: Users },
    { id: 'evidence', label: 'Evidence', icon: Paperclip },
    { id: 'conclusion', label: 'Conclusion', icon: CheckCircle2 },
];

export default function InvestigationStage({ observation, isLocked }: { observation: EhsObservation, isLocked: boolean }) {
    const sData = observation.stages['Investigation'];

    return (
        <div className="space-y-10">
            <Tabs defaultValue="summary" className="w-full">
                <TabsList className="h-12 w-full justify-start gap-8 bg-transparent p-0 border-b rounded-none mb-10 overflow-x-auto no-scrollbar">
                    {SECTIONS.map(s => (
                        <TabsTrigger 
                            key={s.id} 
                            value={s.id}
                            className="h-12 rounded-none border-b-2 border-transparent px-0 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 bg-transparent shadow-none"
                        >
                            <s.icon className="mr-2 h-3.5 w-3.5" /> {s.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value="summary" className="m-0 focus-visible:ring-0">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div className="space-y-8">
                            <SectionHeading icon={MapPin} title="DETAILS" />
                            <div className="space-y-6">
                                <FormItem label="Who was involved?" placeholder="Personnel, contractors, or departments..." isLocked={isLocked} />
                                <FormItem label="Where exactly did it happen?" placeholder="Deck, unit, workshop or specific coordinate..." isLocked={isLocked} />
                                <div className="grid grid-cols-2 gap-6">
                                    <FormItem label="Discovery Date" type="date" isLocked={isLocked} />
                                    <FormItem label="Discovery Time" type="time" isLocked={isLocked} />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-8">
                            <SectionHeading icon={FileText} title="NARRATIVE CONTEXT" />
                            <div className="space-y-6">
                                <FormItem label="Sequence of Events (How)?" type="textarea" placeholder="Describe the chronological sequence..." isLocked={isLocked} />
                                <FormItem label="What was being done at the time?" type="textarea" placeholder="Describe the activity or task being performed..." isLocked={isLocked} />
                                <FormItem label="Immediate Cause (Direct Finding)" type="textarea" placeholder="State the direct reason for the unsafe act/condition..." isLocked={isLocked} isRequired />
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="5why" className="m-0 focus-visible:ring-0">
                    <div className="max-w-3xl mx-auto space-y-10">
                        <div className="text-center space-y-2">
                             <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600">5-Why Root Cause Analysis</h4>
                             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Keep asking "Why?" until a systemic failure is identified</p>
                        </div>
                        
                        <div className="space-y-6">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="flex gap-6 animate-in slide-in-from-left duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                                    <div className="flex flex-col items-center shrink-0">
                                        <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white font-black flex items-center justify-center text-sm shadow-xl">W{i}</div>
                                        {i < 5 && <ArrowDown className="h-4 w-4 text-slate-200 my-2" />}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                            {i === 1 ? 'Why did the immediate cause occur?' : `Why did the condition in W${i-1} exist?`}
                                        </Label>
                                        <Textarea 
                                            disabled={isLocked}
                                            placeholder="Enter technical reasoning..."
                                            className="min-h-[60px] rounded-2xl border-2 border-slate-100 font-bold focus-visible:ring-blue-100"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="conclusion" className="m-0 focus-visible:ring-0">
                    <div className="max-w-2xl mx-auto space-y-10 py-10">
                        <div className="p-8 rounded-[2rem] bg-blue-50 border-2 border-blue-100 space-y-6">
                            <h4 className="text-sm font-black uppercase tracking-tight text-blue-900 flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-blue-600" /> Authorized Conclusion
                            </h4>
                            <div className="space-y-4">
                                <FormItem label="Investigation Finding" type="textarea" isLocked={isLocked} isRequired />
                                <FormItem label="Root Cause" type="textarea" isLocked={isLocked} isRequired />
                                <FormItem label="Recommended Corrective Action" type="textarea" isLocked={isLocked} isRequired />
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function SectionHeading({ icon: Icon, title }: { icon: any, title: string }) {
    return (
        <div className="flex items-center gap-3">
            <Icon className="h-4 w-4 text-[#1769FF]" />
            <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#304B68]">{title}</h4>
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
                    className="min-h-[100px] rounded-xl border-2 border-slate-100 font-bold text-sm bg-white focus-visible:ring-blue-100 shadow-sm"
                />
            ) : (
                <Input 
                    type={type}
                    disabled={isLocked}
                    placeholder={placeholder}
                    className="h-12 rounded-xl border-2 border-slate-100 font-bold text-sm bg-white focus-visible:ring-blue-100 shadow-sm px-4"
                />
            )}
        </div>
    );
}
