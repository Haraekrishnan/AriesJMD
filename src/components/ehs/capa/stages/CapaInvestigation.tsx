'use client';

import React from 'react';
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
    History,
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

interface CapaInvestigationProps {
    observation: EhsObservation;
    isLocked: boolean;
}

export default function CapaInvestigation({
    observation,
    isLocked,
}: CapaInvestigationProps) {
    const { users } = useAuth();
    const sData = observation.stages?.Investigation;
    const currentOwner = users.find(u => u.id === sData?.assigneeId);

    return (
        <div className="w-full text-left">
            <section className="overflow-hidden rounded-[18px] border border-[#D9E2EC] bg-white shadow-[0_2px_12px_rgba(16,42,67,0.04)]">
                
                {/* 1. STAGE HEADER */}
                <div className="border-b border-[#E5EBF2] bg-white px-7 py-8">
                    <div className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <div className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-[15px] border border-[#E5EBF2] bg-white text-[24px] font-extrabold text-[#071B33] shadow-sm">
                                02
                            </div>
                            <div>
                                <div className="mb-2 flex items-center gap-2">
                                    <span className="rounded-full bg-[#E7F0FF] px-4 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#1769FF]">
                                        TECHNICAL ACTION
                                    </span>
                                </div>
                                <h2 className="text-[28px] font-extrabold uppercase leading-none tracking-tight text-[#071B33]">
                                    INVESTIGATION
                                </h2>
                            </div>
                        </div>

                        <div className="flex items-center gap-10">
                            <div className="text-right">
                                <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#8A9AAF]">OWNERSHIP</p>
                                <div className="mt-2 flex items-center gap-2 justify-end">
                                    <p className="text-[12px] font-extrabold uppercase text-[#102A43]">{currentOwner?.name || 'TBD'}</p>
                                    <Avatar className="h-8 w-8 border shadow-sm">
                                        <AvatarImage src={currentOwner?.avatar} />
                                        <AvatarFallback className="text-[10px]">{currentOwner?.name?.[0]}</AvatarFallback>
                                    </Avatar>
                                </div>
                            </div>
                            <div className="h-12 w-px bg-[#E5EBF2]" />
                            <div className="text-right">
                                <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#8A9AAF]">TARGET</p>
                                <p className="mt-2 flex items-center justify-end gap-1.5 text-[12px] font-extrabold uppercase text-[#102A43]">
                                    <Clock3 className="h-4 w-4 text-slate-400" /> TBD
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. TECHNICAL NAVIGATION */}
                <Tabs defaultValue="summary" className="w-full">
                    <div className="px-7 border-b border-[#E5EBF2]">
                        <TabsList className="h-14 w-full justify-start gap-10 bg-transparent p-0">
                            {[
                                { id: 'summary', label: 'Summary', icon: Search },
                                { id: '5why', label: '5-Why Analysis', icon: GitBranch },
                                { id: 'rootcause', label: 'Root Cause', icon: Activity },
                                { id: 'timeline', label: 'Timeline', icon: History },
                                { id: 'conclusion', label: 'Conclusion', icon: CheckCircle2 }
                            ].map(tab => (
                                <TabsTrigger 
                                    key={tab.id} 
                                    value={tab.id}
                                    className="h-14 rounded-none border-b-2 border-transparent px-0 text-[11px] font-black uppercase tracking-widest text-[#7B8EA5] data-[state=active]:border-[#1769FF] data-[state=active]:text-[#1769FF] bg-transparent shadow-none"
                                >
                                    <tab.icon className="mr-2 h-4 w-4" /> {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                    <ScrollArea className="flex-1">
                        <TabsContent value="summary" className="m-0 p-10 space-y-12">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                                {/* LEFT COLUMN */}
                                <div className="space-y-10">
                                    <SectionHeading icon={Activity} title="TECHNICAL LOGISTICS" />
                                    <div className="space-y-8">
                                        <FormItem label="Who was involved?" isRequired placeholder="Personnel or departments..." isLocked={isLocked} name="involved" icon={UserRound} />
                                        <FormItem label="Exact site position" isRequired placeholder="Specific deck or workshop..." isLocked={isLocked} name="exactLocation" icon={MapPin} />
                                        <div className="grid grid-cols-2 gap-6">
                                            <FormItem label="Discovery date" type="date" isLocked={isLocked} name="discoveryDate" icon={CalendarDays} />
                                            <FormItem label="Discovery time" type="time" isLocked={isLocked} name="discoveryTime" icon={Clock3} />
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN */}
                                <div className="space-y-10">
                                    <SectionHeading icon={MessageSquare} title="NARRATIVE CONTEXT" />
                                    <div className="space-y-8">
                                        <FormItem label="Sequence of events" isRequired type="textarea" placeholder="Detailed chronological sequence..." isLocked={isLocked} name="sequence" icon={MessageSquare} />
                                        <FormItem label="Immediate cause" isRequired type="textarea" placeholder="Direct reason for unsafe finding..." isLocked={isLocked} name="immediateCause" icon={AlertTriangle} />
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="5why" className="m-0 p-10">
                            <div className="space-y-10 max-w-4xl mx-auto">
                                <SectionHeading icon={Search} title="ROOT CAUSE ANALYSIS (5-WHY)" />
                                <div className="space-y-4 py-6">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <WhyRow key={i} number={i} isLocked={isLocked} />
                                    ))}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="rootcause" className="m-0 p-10">
                            <div className="max-w-3xl mx-auto space-y-8">
                                <SectionHeading icon={Activity} title="SYSTEMIC ROOT CAUSE" />
                                <FormItem label="Final Root Cause Determination" isRequired type="textarea" placeholder="Identify the systemic failure point..." isLocked={isLocked} name="rootCause" />
                            </div>
                        </TabsContent>

                        <TabsContent value="conclusion" className="m-0 p-10">
                            <div className="max-w-3xl mx-auto space-y-8">
                                <SectionHeading icon={CheckCircle2} title="INVESTIGATION CONCLUSION" />
                                <FormItem label="Official Conclusion & Summary" isRequired type="textarea" placeholder="Synthesize findings and recommendations..." isLocked={isLocked} name="conclusion" />
                            </div>
                        </TabsContent>
                    </ScrollArea>
                </Tabs>
            </section>
        </div>
    );
}

function SectionHeading({ icon: Icon, title }: { icon: any, title: string }) {
    return (
        <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 text-[#1769FF]" />
            <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-[#304B68]">{title}</h4>
        </div>
    );
}

function FormItem({ label, placeholder, type = 'text', isLocked, isRequired, name, icon: Icon }: { label: string, placeholder?: string, type?: 'text' | 'textarea' | 'date' | 'time', isLocked: boolean, isRequired?: boolean, name: string, icon?: any }) {
    const { register } = useFormContext();
    return (
        <div className="space-y-3">
            <Label className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#304B68] ml-1">
                {Icon && <Icon className="h-4 w-4 text-[#7A9ABB]" />}
                {label} {isRequired && <span className="text-red-500">*</span>}
            </Label>
            {type === 'textarea' ? (
                <Textarea 
                    disabled={isLocked}
                    placeholder={placeholder}
                    {...register(name)}
                    className="min-h-[140px] rounded-[10px] border-[#DCE5EF] bg-white px-4 py-3 text-[12px] font-medium leading-relaxed text-[#243B53] shadow-[0_1px_3px_rgba(16,42,67,0.03)] placeholder:text-[#9AAABD] focus-visible:border-[#1769FF] focus-visible:ring-1 ring-blue-50"
                />
            ) : (
                <Input 
                    type={type}
                    disabled={isLocked}
                    placeholder={placeholder}
                    {...register(name)}
                    className="h-[52px] rounded-[10px] border-[#DCE5EF] bg-white px-4 text-[12px] font-medium text-[#243B53] shadow-[0_1px_3px_rgba(16,42,67,0.03)] placeholder:text-[#9AAABD] focus-visible:border-[#1769FF] focus-visible:ring-1 ring-blue-50"
                />
            )}
        </div>
    );
}

function WhyRow({ number, isLocked }: { number: number, isLocked: boolean }) {
    const { register } = useFormContext();
    return (
        <div className="grid grid-cols-[40px_1fr] items-center gap-6">
            <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-[10px] text-[10px] font-extrabold",
                number === 1 ? "bg-[#0D3B66] text-white shadow-md" : "border border-[#DCE5EF] bg-white text-[#60758A]"
            )}>
                W{number}
            </div>
            <Input 
                disabled={isLocked}
                placeholder={number === 1 ? "Primary direct cause?" : "Why did that happen?"}
                {...register(`why${number}`)}
                className="h-[52px] rounded-[10px] border-[#DCE5EF] bg-white px-5 text-[12px] font-medium text-[#243B53] focus-visible:border-[#1769FF] focus-visible:ring-1 ring-blue-50"
            />
        </div>
    );
}
