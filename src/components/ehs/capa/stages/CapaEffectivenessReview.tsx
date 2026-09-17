'use client';

import React from 'react';
import {
    Target,
    Clock3,
    ShieldCheck,
    MessageSquare,
} from 'lucide-react';
import { useFormContext } from 'react-hook-form';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import type { EhsObservation } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';

interface Props {
    observation: EhsObservation;
    isLocked: boolean;
}

export default function CapaEffectivenessReview({ observation, isLocked }: Props) {
    const { users } = useAuth();
    const sData = observation.stages['Effectiveness Review'];
    const currentOwner = users.find(u => u.id === sData?.assigneeId);
    const { register, setValue, watch } = useFormContext();

    return (
        <div className="w-full text-left">
            <section className="overflow-hidden rounded-[18px] border border-[#D9E2EC] bg-white shadow-[0_2px_12px_rgba(16,42,67,0.04)]">
                
                {/* 1. STAGE HEADER */}
                <div className="border-b border-[#E5EBF2] bg-white px-7 py-6">
                    <div className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[15px] border border-[#E5EBF2] bg-white text-[21px] font-extrabold text-[#071B33] shadow-sm">
                                05
                            </div>
                            <div>
                                <div className="mb-1.5 flex items-center gap-2">
                                    <span className="rounded-full bg-[#E7F0FF] px-3 py-1 text-[8px] font-extrabold uppercase tracking-[0.12em] text-[#1769FF]">
                                        TECHNICAL ACTION
                                    </span>
                                </div>
                                <h2 className="text-[25px] font-extrabold uppercase leading-none tracking-tight text-[#071B33]">
                                    EFFECTIVENESS REVIEW
                                </h2>
                            </div>
                        </div>

                        <div className="flex items-center gap-8">
                            <div className="text-right">
                                <p className="text-[8px] font-extrabold uppercase tracking-[0.14em] text-[#8A9AAF]">OWNERSHIP</p>
                                <div className="mt-1 flex items-center gap-2 justify-end">
                                    <p className="text-[10px] font-extrabold uppercase text-[#102A43]">{currentOwner?.name || 'TBD'}</p>
                                    <Avatar className="h-6 w-6 border">
                                        <AvatarImage src={currentOwner?.avatar} />
                                        <AvatarFallback className="text-[8px]">{currentOwner?.name?.[0]}</AvatarFallback>
                                    </Avatar>
                                </div>
                            </div>
                            <div className="h-9 w-px bg-[#E5EBF2]" />
                            <div className="text-right">
                                <p className="text-[8px] font-extrabold uppercase tracking-[0.14em] text-[#8A9AAF]">TARGET</p>
                                <p className="mt-1 flex items-center justify-end gap-1.5 text-[10px] font-extrabold uppercase text-[#102A43]">
                                    <Clock3 className="h-3 w-3 text-slate-400" /> TBD
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-7 space-y-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        {/* LEFT COLUMN */}
                        <div className="space-y-8">
                            <SectionHeading icon={ShieldCheck} title="Technical Recap" />
                            <div className="space-y-6">
                                <div className="p-5 rounded-xl bg-slate-50 border border-[#DCE5EF] space-y-4">
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Implemented Action</p>
                                        <p className="text-xs font-bold text-[#102A43] uppercase leading-relaxed mt-1">
                                            {observation.stages['Implementation']?.data?.corrective || '—'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Root Cause Identification</p>
                                        <p className="text-xs font-bold text-slate-500 uppercase leading-relaxed mt-1">
                                            {observation.stages['Investigation']?.data?.rootCause || '—'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="space-y-8">
                            <SectionHeading icon={Target} title="Validation Workspace" />
                            <div className="space-y-6">
                                <div className="space-y-2.5">
                                    <Label className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#304B68] ml-1">Effectiveness Verdict <span className="text-red-500">*</span></Label>
                                    <Select 
                                        disabled={isLocked}
                                        value={watch('verdict')}
                                        onValueChange={v => setValue('verdict', v)}
                                    >
                                        <SelectTrigger className="h-[42px] rounded-[10px] border-[#DCE5EF] bg-white px-3.5 text-[10px] font-bold uppercase text-[#243B53] focus-visible:border-[#1769FF] focus-visible:ring-2 focus-visible:ring-[#DCEAFF]">
                                            <SelectValue placeholder="Select verdict..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Effective">Highly Effective</SelectItem>
                                            <SelectItem value="Partially">Partially Effective</SelectItem>
                                            <SelectItem value="Ineffective">Ineffective</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2.5">
                                    <Label className="flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#304B68] ml-1">
                                        <MessageSquare className="h-3 w-3 text-[#7A9ABB]" />
                                        Validation Narrative <span className="text-red-500">*</span>
                                    </Label>
                                    <Textarea 
                                        disabled={isLocked}
                                        placeholder="Technical justification for the effectiveness verdict..."
                                        {...register('findings')}
                                        className="min-h-[140px] rounded-[10px] border-[#DCE5EF] bg-white px-3.5 py-3 text-[10px] font-medium leading-relaxed text-[#243B53] shadow-[0_1px_3px_rgba(16,42,67,0.03)] focus-visible:border-[#1769FF] focus-visible:ring-2 focus-visible:ring-[#DCEAFF]"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
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
