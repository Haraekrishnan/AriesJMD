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
                <div className="border-b border-[#E5EBF2] bg-white px-7 py-6">
                    <div className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[12px] border border-slate-200 bg-white text-[21px] font-extrabold text-slate-700 shadow-sm">
                                03
                            </div>
                            <div>
                                <div className="mb-1 flex items-center gap-2">
                                    <Badge variant="outline" className="rounded-full bg-[#E7F0FF] border-none px-3 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.12em] text-[#1769FF]">
                                        TECHNICAL ACTION
                                    </Badge>
                                </div>
                                <h2 className="text-[25px] font-extrabold uppercase leading-none tracking-tight text-[#071B33]">
                                    RESOLUTION
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
                            <SectionHeading icon={Activity} title="Technical Strategy" />
                            <div className="space-y-6">
                                <div className="p-4 rounded-xl bg-slate-50 border border-[#DCE5EF] space-y-2">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Root Cause Recap (W5)</p>
                                    <p className="text-xs font-bold text-[#102A43] leading-relaxed uppercase italic">
                                        {observation.stages['Investigation']?.data?.why5 || 'Pending technical investigation.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="space-y-8">
                            <SectionHeading icon={Zap} title="Containment Context" />
                            <div className="space-y-6">
                                <div className="space-y-2.5">
                                    <Label className="flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#304B68] ml-1">
                                        <ShieldAlert className="h-3 w-3 text-red-500" />
                                        Immediate Containment Strategy <span className="text-red-500">*</span>
                                    </Label>
                                    <Textarea 
                                        disabled={isLocked}
                                        placeholder="Technical steps taken to control the discovery immediately..."
                                        {...register('action')}
                                        className="min-h-[160px] rounded-[10px] border-[#DCE5EF] bg-white px-3.5 py-3 text-[10px] font-medium leading-relaxed text-[#243B53] shadow-[0_1px_3px_rgba(16,42,67,0.03)] focus-visible:border-[#1769FF] focus-visible:ring-2 focus-visible:ring-[#DCEAFF]"
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
