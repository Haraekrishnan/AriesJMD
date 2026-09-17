'use client';

import React from 'react';
import {
    Zap,
    Clock3,
    Activity,
    ShieldAlert,
} from 'lucide-react';
import { useFormContext } from 'react-hook-form';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import type { EhsObservation } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { parseISO, format } from 'date-fns';

interface Props {
    observation: EhsObservation;
    isLocked: boolean;
}

export default function CapaResolution({ observation, isLocked }: Props) {
    const { users } = useAuth();
    const sData = observation.stages?.Resolution;
    const currentOwner = users.find(u => u.id === sData?.assigneeId);
    const { register } = useFormContext();

    return (
        <div className="w-full text-left">
            <section className="overflow-hidden rounded-[18px] border border-[#D9E2EC] bg-white shadow-[0_2px_12px_rgba(16,42,67,0.04)]">
                
                {/* 1. STAGE HEADER */}
                <div className="border-b border-[#E5EBF2] bg-white px-7 py-8">
                    <div className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <div className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-[15px] border border-[#E5EBF2] bg-white text-[24px] font-extrabold text-[#071B33] shadow-sm">
                                03
                            </div>
                            <div>
                                <div className="mb-2 flex items-center gap-2">
                                    <span className="rounded-full bg-[#E7F0FF] px-4 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#1769FF]">
                                        TECHNICAL ACTION
                                    </span>
                                </div>
                                <h2 className="text-[28px] font-extrabold uppercase leading-none tracking-tight text-[#071B33]">
                                    RESOLUTION
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

                <div className="p-10 space-y-12">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                        {/* LEFT COLUMN */}
                        <div className="space-y-10">
                            <SectionHeading icon={Activity} title="Technical Strategy" />
                            <div className="space-y-8">
                                <div className="p-6 rounded-xl bg-slate-50 border border-[#DCE5EF] shadow-inner space-y-3">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Root Cause Recap (W5)</p>
                                    <p className="text-[13px] font-bold text-[#102A43] leading-relaxed uppercase italic">
                                        {observation.stages['Investigation']?.data?.why5 || 'Pending technical investigation.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="space-y-10">
                            <SectionHeading icon={Zap} title="Containment Context" />
                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <Label className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#304B68] ml-1">
                                        <ShieldAlert className="h-4 w-4 text-red-500" />
                                        Immediate Containment Strategy <span className="text-red-500">*</span>
                                    </Label>
                                    <Textarea 
                                        disabled={isLocked}
                                        placeholder="Technical steps taken to control the discovery immediately..."
                                        {...register('action')}
                                        className="min-h-[200px] rounded-[10px] border-[#DCE5EF] bg-white px-4 py-4 text-[12px] font-medium leading-relaxed text-[#243B53] shadow-[0_1px_3px_rgba(16,42,67,0.03)] focus-visible:border-[#1769FF] focus-visible:ring-1 ring-blue-50"
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

function SectionHeading({ icon: Icon, title }: { icon: any; title: string }) {
    return (
        <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 text-[#1769FF]" />
            <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-[#304B68]">{title}</h4>
        </div>
    );
}