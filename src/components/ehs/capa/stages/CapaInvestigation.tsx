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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

import type { EhsObservation } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-provider';
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
    const { users } = useAuth();
    const { addStageAttachment } = useEhs();
    const { toast } = useToast();
    const sData = observation.stages?.Investigation;

    const handlePaste = useCallback((e: React.ClipboardEvent, fieldName: string) => {
        if (isLocked) return;
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    toast({ title: 'Capturing forensic evidence...', description: 'Image detected in clipboard.' });
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const base64 = event.target?.result as string;
                        addStageAttachment(observation.id, 'Investigation', `Forensic_Paste_${Date.now()}`, base64);
                    };
                    reader.readAsDataURL(blob);
                }
            }
        }
    }, [isLocked, observation.id, addStageAttachment, toast]);

    return (
        <div className="w-full text-left">
            <Tabs defaultValue="summary" className="w-full">
                <div className="px-8 border-b border-slate-100 bg-white">
                    <TabsList className="h-10 w-full justify-start gap-8 bg-transparent p-0">
                        {[
                            { id: 'summary', label: 'Investigation Summary', icon: Search },
                            { id: '5why', label: '5-Why Root Cause', icon: GitBranch },
                            { id: 'rootcause', label: 'Systemic Root Cause', icon: Activity },
                            { id: 'conclusion', label: 'Phase Conclusion', icon: CheckCircle2 }
                        ].map(tab => (
                            <TabsTrigger 
                                key={tab.id} 
                                value={tab.id}
                                className="h-10 rounded-none border-b-2 border-transparent px-0 text-[10px] font-black uppercase tracking-widest text-slate-400 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 bg-transparent shadow-none"
                            >
                                <tab.icon className="mr-2 h-3.5 w-3.5" /> {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <div className="flex-1">
                    <TabsContent value="summary" className="m-0 p-8 space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <div className="flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-blue-600" />
                                    <h4 className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">TECHNICAL LOGISTICS</h4>
                                </div>
                                <div className="space-y-4">
                                    <FormItem label="Who was involved?" isRequired placeholder="Personnel or departments..." isLocked={isLocked} name="involved" icon={UserRound} onPaste={(e) => handlePaste(e, 'involved')} />
                                    <FormItem label="Exact site position" isRequired placeholder="Specific deck or workshop..." isLocked={isLocked} name="exactLocation" icon={MapPin} onPaste={(e) => handlePaste(e, 'exactLocation')} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormItem label="Discovery date" type="date" isLocked={isLocked} name="discoveryDate" icon={CalendarDays} />
                                        <FormItem label="Discovery time" type="time" isLocked={isLocked} name="discoveryTime" icon={Clock3} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4 text-blue-600" />
                                    <h4 className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">NARRATIVE CONTEXT</h4>
                                </div>
                                <div className="space-y-4">
                                    <FormItem label="Sequence of events" isRequired type="textarea" placeholder="Detailed chronological sequence..." isLocked={isLocked} name="sequence" icon={MessageSquare} onPaste={(e) => handlePaste(e, 'sequence')} minHeight="100px" />
                                    <FormItem label="Immediate cause" isRequired type="textarea" placeholder="Direct reason for unsafe finding..." isLocked={isLocked} name="immediateCause" icon={AlertTriangle} onPaste={(e) => handlePaste(e, 'immediateCause')} minHeight="100px" />
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="5why" className="m-0 p-8">
                        <div className="space-y-8 max-w-4xl mx-auto">
                            <div className="flex items-center gap-2">
                                <Search className="h-4 w-4 text-blue-600" />
                                <h4 className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">ROOT CAUSE ANALYSIS (5-WHY)</h4>
                            </div>
                            <div className="space-y-3 py-2">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <WhyRow key={i} number={i} isLocked={isLocked} onPaste={(e) => handlePaste(e, `why${i}`)} />
                                ))}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="rootcause" className="m-0 p-8">
                        <div className="max-w-3xl mx-auto space-y-6">
                            <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-blue-600" />
                                <h4 className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">SYSTEMIC ROOT CAUSE</h4>
                            </div>
                            <FormItem label="Final Root Cause Determination" isRequired type="textarea" placeholder="Identify the systemic failure point..." isLocked={isLocked} name="rootCause" onPaste={(e) => handlePaste(e, 'rootCause')} minHeight="120px" />
                        </div>
                    </TabsContent>

                    <TabsContent value="conclusion" className="m-0 p-8">
                        <div className="max-w-3xl mx-auto space-y-6">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                                <h4 className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">INVESTIGATION CONCLUSION</h4>
                            </div>
                            <FormItem label="Official Conclusion & Summary" isRequired type="textarea" placeholder="Synthesize findings and recommendations..." isLocked={isLocked} name="conclusion" onPaste={(e) => handlePaste(e, 'conclusion')} minHeight="120px" />
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
            <Label className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-500 ml-1">
                {Icon && <Icon className="h-3 w-3 text-slate-300" />}
                {label} {isRequired && <span className="text-rose-500">*</span>}
            </Label>
            {type === 'textarea' ? (
                <Textarea 
                    disabled={isLocked}
                    placeholder={placeholder}
                    {...register(name)}
                    onPaste={onPaste}
                    style={{ minHeight: minHeight || '80px' }}
                    className="rounded-lg border-slate-200 bg-white px-3 py-2 text-[11px] font-bold leading-relaxed text-slate-900 shadow-sm placeholder:text-slate-300 focus-visible:ring-blue-100"
                />
            ) : (
                <Input 
                    type={type}
                    disabled={isLocked}
                    placeholder={placeholder}
                    {...register(name)}
                    onPaste={onPaste}
                    className="h-10 rounded-lg border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-900 shadow-sm placeholder:text-slate-300 focus-visible:ring-blue-100"
                />
            )}
        </div>
    );
}

function WhyRow({ number, isLocked, onPaste }: { number: number, isLocked: boolean, onPaste?: (e: any) => void }) {
    const { register } = useFormContext();
    return (
        <div className="grid grid-cols-[32px_1fr] items-center gap-4">
            <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-[8px] text-[9px] font-extrabold shadow-sm",
                number === 1 ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-400"
            )}>
                W{number}
            </div>
            <Input 
                disabled={isLocked}
                placeholder={number === 1 ? "Primary direct cause?" : "Why did that happen?"}
                {...register(`why${number}`)}
                onPaste={onPaste}
                className="h-10 rounded-lg border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-900 focus-visible:ring-blue-100"
            />
        </div>
    );
}
