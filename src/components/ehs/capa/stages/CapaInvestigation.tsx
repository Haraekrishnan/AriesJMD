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
} from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { format, parseISO } from 'date-fns';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

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
                    toast({ title: 'Establishing data stream...', description: 'Transmitting forensic capture to institutional Dropbox.' });
                    const formData = new FormData();
                    formData.append("file", blob, `Forensic_Paste_Investigation_${Date.now()}.png`);
                    try {
                        const res = await fetch("/api/upload/dropbox", { method: "POST", body: formData });
                        const uploadData = await res.json();
                        if (uploadData.success) {
                            addStageAttachment(observation.id, 'Investigation', `Forensic_Capture_${Date.now()}`, uploadData.downloadLink);
                            toast({ title: 'Evidence Secured' });
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
                <div className="px-8 border-b border-slate-100 bg-white">
                    <TabsList className="h-12 w-full justify-start gap-10 bg-transparent p-0">
                        {[
                            { id: 'summary', label: 'Investigation Summary', icon: FileText },
                            { id: '5why', label: '5-Why Root Cause', icon: GitBranch },
                            { id: 'rootcause', label: 'Systemic Root Cause', icon: Activity },
                            { id: 'conclusion', label: 'Phase Conclusion', icon: CheckCircle2 }
                        ].map(tab => (
                            <TabsTrigger 
                                key={tab.id} 
                                value={tab.id}
                                className="h-12 rounded-none border-b-2 border-transparent px-0 text-[11px] font-black uppercase tracking-widest text-slate-400 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 bg-transparent shadow-none"
                            >
                                <tab.icon className="mr-2.5 h-4 w-4" /> {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <div className="flex-1">
                    <TabsContent value="summary" className="m-0 p-8 space-y-12">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                            {/* TECHNICAL LOGISTICS */}
                            <div className="space-y-8">
                                <div className="flex items-center gap-3">
                                    <Activity className="h-5 w-5 text-blue-600" />
                                    <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-500">TECHNICAL LOGISTICS</h4>
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

                            {/* NARRATIVE CONTEXT */}
                            <div className="space-y-8">
                                <div className="flex items-center gap-3">
                                    <MessageSquare className="h-5 w-5 text-blue-600" />
                                    <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-500">NARRATIVE CONTEXT</h4>
                                </div>
                                <div className="space-y-8">
                                    <FormItem label="Sequence of events (How)?" isRequired type="textarea" placeholder="Describe the chronological sequence of events leading to this observation." isLocked={isLocked} name="sequence" icon={MessageSquare} onPaste={handlePaste} minHeight="120px" />
                                    <FormItem label="Immediate cause / direct reason" isRequired type="textarea" placeholder="Direct reason for unsafe finding..." isLocked={isLocked} name="immediateCause" icon={AlertTriangle} onPaste={handlePaste} minHeight="120px" />
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="5why" className="m-0 p-8">
                         <div className="flex flex-col items-center justify-center py-20 opacity-30">
                            <GitBranch className="h-12 w-12 mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">5-Why Analysis Interface Restricted</p>
                        </div>
                    </TabsContent>

                    <TabsContent value="rootcause" className="m-0 p-8">
                         <div className="flex flex-col items-center justify-center py-20 opacity-30">
                            <Activity className="h-12 w-12 mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Root Cause Determination Bench Restricted</p>
                        </div>
                    </TabsContent>

                    <TabsContent value="conclusion" className="m-0 p-8">
                         <div className="flex flex-col items-center justify-center py-20 opacity-30">
                            <CheckCircle2 className="h-12 w-12 mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Final Verification Interface Restricted</p>
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
            <Label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#071B33] ml-1">
                {label} {isRequired && <span className="text-rose-500">*</span>}
            </Label>
            {type === 'textarea' ? (
                <div className="space-y-2">
                    <Textarea 
                        disabled={isLocked}
                        placeholder={placeholder}
                        {...register(name)}
                        onPaste={onPaste}
                        style={{ minHeight: minHeight || '100px' }}
                        className="rounded-xl border-[#DCE5EF] bg-white px-5 py-4 text-sm font-bold leading-relaxed text-slate-900 shadow-sm placeholder:text-slate-300 focus-visible:ring-blue-100 transition-all"
                    />
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">{placeholder}</p>
                </div>
            ) : (
                <div className="space-y-2">
                    <Input 
                        type={type}
                        disabled={isLocked}
                        placeholder={placeholder}
                        {...register(name)}
                        className="h-12 rounded-xl border-[#DCE5EF] bg-white px-5 text-sm font-black text-[#071B33] shadow-sm placeholder:text-slate-300 focus-visible:ring-blue-100 transition-all"
                    />
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">{placeholder}</p>
                </div>
            )}
        </div>
    );
}

import { FileText } from 'lucide-react';
