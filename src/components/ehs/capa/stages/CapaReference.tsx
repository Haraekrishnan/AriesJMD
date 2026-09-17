'use client';

import React from 'react';
import {
    BookMarked,
    Clock3,
    Link as LinkIcon,
    FilePlus,
    FileText,
} from 'lucide-react';
import { useFormContext } from 'react-hook-form';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import type { EhsObservation } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';

interface Props {
    observation: EhsObservation;
    isLocked: boolean;
}

export default function CapaReference({ observation, isLocked }: Props) {
    const { users } = useAuth();
    const sData = observation.stages['Reference'];
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
                                06
                            </div>
                            <div>
                                <div className="mb-2 flex items-center gap-2">
                                    <span className="rounded-full bg-[#E7F0FF] px-4 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#1769FF]">
                                        TECHNICAL ACTION
                                    </span>
                                </div>
                                <h2 className="text-[28px] font-extrabold uppercase leading-none tracking-tight text-[#071B33]">
                                    REFERENCE
                                </h2>
                            </div>
                        </div>

                        <div className="flex items-center gap-10">
                            <div className="text-right">
                                <p className="text-[8px] font-extrabold uppercase tracking-[0.14em] text-[#8A9AAF]">OWNERSHIP</p>
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
                                <p className="text-[8px] font-extrabold uppercase tracking-[0.14em] text-[#8A9AAF]">TARGET</p>
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
                            <SectionHeading icon={BookMarked} title="Institutional Archival" />
                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <Label className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#304B68] ml-1">
                                        <LinkIcon className="h-4 w-4 text-[#7A9ABB]" />
                                        Work Order / ARC Reference
                                    </Label>
                                    <Input 
                                        disabled={isLocked}
                                        placeholder="e.g. WO-2026-442-A"
                                        {...register('workOrder')}
                                        className="h-[52px] rounded-[10px] border-[#DCE5EF] bg-white px-4 text-[12px] font-medium text-[#243B53] shadow-[0_1px_3px_rgba(16,42,67,0.03)] focus-visible:border-[#1769FF] focus-visible:ring-1 ring-blue-50"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <Label className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#304B68] ml-1">
                                        <FilePlus className="h-4 w-4 text-[#7A9ABB]" />
                                        Related Dossier ID
                                    </Label>
                                    <Input 
                                        disabled={isLocked}
                                        placeholder="e.g. INC-SEZ-012"
                                        {...register('incidentRef')}
                                        className="h-[52px] rounded-[10px] border-[#DCE5EF] bg-white px-4 text-[12px] font-medium text-[#243B53] shadow-[0_1px_3px_rgba(16,42,67,0.03)] focus-visible:border-[#1769FF] focus-visible:ring-1 ring-blue-50"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="space-y-10">
                            <SectionHeading icon={FileText} title="Knowledge Dossier" />
                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <Label className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#304B68] ml-1">
                                        Lessons Learned & Metadata
                                    </Label>
                                    <Textarea 
                                        disabled={isLocked}
                                        placeholder="Final technical metadata or lessons learned for forensic audit..."
                                        {...register('notes')}
                                        className="min-h-[180px] rounded-[10px] border-[#DCE5EF] bg-white px-4 py-4 text-[12px] font-medium leading-relaxed text-[#243B53] shadow-[0_1px_3px_rgba(16,42,67,0.03)] focus-visible:border-[#1769FF] focus-visible:ring-1 ring-blue-50"
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
            <Icon className="h-5 w-5 text-[#1769FF]" />
            <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-[#304B68]">{title}</h4>
        </div>
    );
}