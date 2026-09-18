'use client';

import React, { useCallback } from 'react';
import {
    Activity,
    AlertTriangle,
    CalendarDays,
    Clock3,
    MapPin,
    MessageSquare,
    Search,
    ShieldAlert,
    UserRound,
    GitBranch,
    CheckCircle2,
    ArrowDown,
    FileText,
    Layers,
    ListChecks,
    Info
} from 'lucide-react';
import { useFormContext, Controller } from 'react-hook-form';
import { format, parseISO } from 'date-fns';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import type { EhsObservation } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useEhs } from '@/contexts/ehs-provider';
import { useToast } from '@/hooks/use-toast';

interface CapaInvestigationProps {
    observation: EhsObservation;
    isLocked: boolean;
}

export default function CapaInvestigation({
    observation,
    isLocked,
}: CapaInvestigationProps) {
    const { addStageAttachment } = useEhs();
    const { toast } = useToast();

    const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
        if (isLocked) return;
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    toast({ title: 'Establishing data stream...', description: 'Transmitting document capture to institutional storage.' });
                    const formData = new FormData();
                    formData.append("file", blob, `Document_Paste_Investigation_${Date.now()}.png`);
                    try {
                        const res = await fetch("/api/upload/dropbox", { method: "POST", body: formData });
                        const uploadData = await res.json();
                        if (uploadData.success) {
                            addStageAttachment(observation.id, 'Investigation', `Document_Capture_${Date.now()}`, uploadData.downloadLink);
                            toast({ title: 'Document Secured' });
                        }
                    } catch (err) {
                        toast({ variant: 'destructive', title: 'Storage Error' });
                    }
                }
            }
        }
    }, [isLocked, observation.id, addStageAttachment, toast]);

    return (
        <div className="w-full text-left">
            <Tabs defaultValue="summary" className="w-full">
                <div className="px-8 border-b-2 border-slate-900 bg-white">
                    <TabsList className="h-12 w-full justify-start gap-10 bg-transparent p-0 overflow-x-auto no-scrollbar">
                        {[
                            { id: 'summary', label: 'Investigation Summary', icon: FileText },
                            { id: '5why', label: '5-Why Root Cause', icon: GitBranch },
                            { id: 'rootcause', label: 'Systemic Root Cause', icon: Activity },
                            { id: 'conclusion', label: 'Phase Conclusion', icon: CheckCircle2 }
                        ].map(tab => (
                            <TabsTrigger 
                                key={tab.id} 
                                value={tab.id}
                                className="h-12 rounded-none border-b-2 border-transparent px-0 text-[11px] font-black uppercase tracking-widest text-slate-400 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 bg-transparent shadow-none"
                            >
                                <tab.icon className="mr-2.5 h-4 w-4" /> {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <div className="flex-1">
                    {/* --- SUMMARY TAB --- */}
                    <TabsContent value="summary" className="m-0 p-8 space-y-12 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                            <div className="space-y-8">
                                <div className="flex items-center gap-3">
                                    <Activity className="h-5 w-5 text-slate-900" />
                                    <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-900">TECHNICAL LOGISTICS</h4>
                                </div>
                                <div className="space-y-6">
                                    <FormItem label="Who was involved?" isRequired placeholder="List personnel, contractors or departments involved." isLocked={isLocked} name="who" icon={UserRound} />
                                    <FormItem label="Exact site position" isRequired placeholder="Specific deck, unit, workshop or coordinate." isLocked={isLocked} name="where" icon={MapPin} />
                                    <div className="grid grid-cols-2 gap-6">
                                        <FormItem label="Discovery date" type="date" isLocked={isLocked} name="whenDate" icon={CalendarDays} />
                                        <FormItem label="Discovery time" type="time" isLocked={isLocked} name="whenTime" icon={Clock3} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="flex items-center gap-3">
                                    <MessageSquare className="h-5 w-5 text-slate-900" />
                                    <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-900">NARRATIVE CONTEXT</h4>
                                </div>
                                <div className="space-y-8">
                                    <FormItem label="Sequence of events (How)?" isRequired type="textarea" placeholder="Describe the chronological sequence of events..." isLocked={isLocked} name="sequence" icon={MessageSquare} onPaste={handlePaste} minHeight="120px" />
                                    <FormItem label="Immediate cause / direct reason" isRequired type="textarea" placeholder="Direct reason for unsafe finding..." isLocked={isLocked} name="immediateCause" icon={AlertTriangle} onPaste={handlePaste} minHeight="120px" />
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* --- OLD SCHOOL 5-WHY TAB --- */}
                    <TabsContent value="5why" className="m-0 p-8 animate-in fade-in duration-500">
                        <div className="max-w-4xl mx-auto">
                            <div className="border-2 border-slate-900 mb-8 p-6 bg-slate-50">
                                <h4 className="text-sm font-black uppercase tracking-[0.4em] text-slate-900">5-WHY ROOT CAUSE ANALYSIS PROTOCOL</h4>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Institutional Directive: Trace causal factors to the primary systemic failure.</p>
                            </div>

                            <div className="border-2 border-slate-900 bg-white divide-y-2 divide-slate-900">
                                <div className="grid grid-cols-[100px_1fr] bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest">
                                    <div className="p-3 border-r-2 border-white text-center">STAGE</div>
                                    <div className="p-3 pl-6">INVESTIGATIVE FINDING / LOGICAL REASONING</div>
                                </div>

                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="grid grid-cols-[100px_1fr]">
                                        <div className="bg-slate-100 border-r-2 border-slate-900 flex items-center justify-center font-black text-2xl text-slate-900 shadow-inner">
                                            W{i}
                                        </div>
                                        <div className="p-8 space-y-3 bg-white">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 block italic">
                                                {i === 1 ? 'Q: Why did the primary discovery occur?' : `Q: Why did the condition in W${i-1} exist?`}
                                            </Label>
                                            <Textarea 
                                                disabled={isLocked}
                                                {...useFormContext().register(`why${i}`)}
                                                placeholder={i === 1 ? "Enter immediate investigative finding..." : "Enter technical reasoning for the above factor..."}
                                                className="min-h-[100px] rounded-none border-2 border-slate-200 bg-slate-50/50 font-bold text-xs focus-visible:ring-0 focus-visible:border-slate-900 transition-all resize-none shadow-inner p-4"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </TabsContent>

                    {/* --- ROOT CAUSE TAB --- */}
                    <TabsContent value="rootcause" className="m-0 p-8 space-y-12 animate-in fade-in duration-500">
                        <div className="max-w-4xl mx-auto">
                            <div className="grid grid-cols-1 md:grid-cols-[1fr,2fr] gap-12">
                                <div className="space-y-8">
                                    <div className="flex items-center gap-3">
                                        <Layers className="h-5 w-5 text-slate-900" />
                                        <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-900">SYSTEMIC CATEGORY</h4>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Select Domain failure</Label>
                                            <Controller
                                                name="rootCauseCategory"
                                                control={useFormContext().control}
                                                render={({ field }) => (
                                                    <Select onValueChange={field.onChange} value={field.value} disabled={isLocked}>
                                                        <SelectTrigger className="h-12 rounded-none border-2 border-slate-900 bg-white font-black text-[11px] uppercase tracking-widest">
                                                            <SelectValue placeholder="Categorize Failure" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Human Factor">Human Factor / Competency</SelectItem>
                                                            <SelectItem value="Process">Procedural / Process Gap</SelectItem>
                                                            <SelectItem value="Equipment">Equipment / Asset Failure</SelectItem>
                                                            <SelectItem value="System">Management System Failure</SelectItem>
                                                            <SelectItem value="External">External Factors</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="flex items-center gap-3">
                                        <GitBranch className="h-5 w-5 text-slate-900" />
                                        <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-900">DETAILED ROOT CAUSE</h4>
                                    </div>
                                    <div className="space-y-8">
                                        <FormItem label="Definitive Root Cause Statement" isRequired type="textarea" placeholder="Final technical isolation of the systemic failure..." isLocked={isLocked} name="rootCause" icon={ShieldAlert} minHeight="160px" />
                                        <FormItem label="Contributing Factors" type="textarea" placeholder="Secondary technical or environmental influences..." isLocked={isLocked} name="contributingFactors" icon={Activity} minHeight="100px" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* --- CONCLUSION TAB --- */}
                    <TabsContent value="conclusion" className="m-0 p-8 space-y-12 animate-in fade-in duration-500">
                        <div className="max-w-3xl mx-auto space-y-12">
                             <div className="flex items-center gap-3 border-b-2 border-slate-900 pb-4">
                                <CheckCircle2 className="h-6 w-6 text-slate-900" />
                                <h4 className="text-sm font-black uppercase tracking-tight text-slate-900">AUTHORIZED PHASE CONCLUSION</h4>
                            </div>

                            <div className="space-y-8">
                                <FormItem label="Summary of Investigative Findings" isRequired type="textarea" placeholder="Aggregated technical discovery summary..." isLocked={isLocked} name="investigationFindings" icon={FileText} minHeight="120px" />
                                <FormItem label="Institutional Recommendation" isRequired type="textarea" placeholder="Proposed corrective strategy for the resolution phase..." isLocked={isLocked} name="recommendation" icon={ListChecks} minHeight="120px" />
                            </div>

                            <div className="p-6 rounded-none border-2 border-slate-900 bg-slate-50 flex items-start gap-4">
                                <Info className="h-5 w-5 text-slate-900 shrink-0 mt-0.5" />
                                <p className="text-[11px] font-bold text-slate-600 leading-relaxed uppercase tracking-tight">
                                    Note: Finalizing this phase will trigger an automated notification to the Senior Safety Supervisor for institutional verification and milestone approval.
                                </p>
                            </div>
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}

function FormItem({ label, placeholder, type = 'text', isLocked, isRequired, name, icon: Icon, onPaste, minHeight }: { label: string, placeholder?: string, type?: 'text' | 'textarea' | 'date' | 'time', isLocked: boolean, isRequired?: boolean, name: string, icon?: any, onPaste?: (e: any) => void, minHeight?: string }) {
    const { register } = useFormContext();
    return (
        <div className="space-y-2">
            <Label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-900 ml-1">
                {Icon && <Icon className="h-3.5 w-3.5 opacity-50" />}
                {label} {isRequired && <span className="text-rose-500">*</span>}
            </Label>
            {type === 'textarea' ? (
                <Textarea 
                    disabled={isLocked}
                    placeholder={placeholder}
                    {...register(name)}
                    onPaste={onPaste}
                    style={{ minHeight: minHeight || '100px' }}
                    className="rounded-none border-2 border-slate-200 bg-white px-5 py-4 text-sm font-bold leading-relaxed text-slate-900 shadow-inner placeholder:text-slate-300 focus-visible:ring-0 focus-visible:border-slate-900 transition-all resize-none"
                />
            ) : (
                <Input 
                    type={type}
                    disabled={isLocked}
                    placeholder={placeholder}
                    {...register(name)}
                    className="h-12 rounded-none border-2 border-slate-200 bg-white px-5 text-sm font-black text-slate-900 shadow-inner placeholder:text-slate-300 focus-visible:ring-0 focus-visible:border-slate-900 transition-all"
                />
            )}
        </div>
    );
}
