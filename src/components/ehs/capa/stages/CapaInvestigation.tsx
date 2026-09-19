'use client';

import React from 'react';
import {
    Activity,
    CalendarDays,
    Clock3,
    FileText,
    MapPin,
    Search,
    ShieldCheck
} from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { EhsObservation } from '@/lib/types';

interface Props {
    observation: EhsObservation;
    isLocked: boolean;
}

export default function CapaInvestigation({ observation, isLocked }: Props) {
    const { register } = useFormContext();

    return (
        <div className="space-y-12 text-left animate-in fade-in duration-700">
            {/* --- TOP ROW: TWO COLUMN LOGISTICS & CONTEXT --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                {/* LEFT COLUMN: TECHNICAL LOGISTICS */}
                <div className="space-y-10">
                    <div className="flex items-center gap-4 border-b-4 border-slate-900 pb-4">
                        <Activity className="h-6 w-6 text-[#2563EB]" />
                        <h4 className="text-[14px] font-black uppercase tracking-[0.3em] text-slate-900">TECHNICAL LOGISTICS</h4>
                    </div>

                    <div className="space-y-8">
                        <div className="space-y-3">
                            <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">WHO WAS INVOLVED? <span className="text-rose-600">*</span></Label>
                            <Input 
                                disabled={isLocked}
                                placeholder="Enter names, teams or departments..." 
                                {...register('who')}
                                className="h-14 rounded-none border-2 border-slate-900 bg-white font-bold text-sm px-5 focus-visible:ring-0 focus-visible:border-[#2563EB] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] transition-all"
                            />
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">EXACT SITE POSITION <span className="text-rose-600">*</span></Label>
                            <Input 
                                disabled={isLocked}
                                placeholder="Identify specific coordinates or unit location..." 
                                {...register('where')}
                                className="h-14 rounded-none border-2 border-slate-900 bg-white font-bold text-sm px-5 focus-visible:ring-0 focus-visible:border-[#2563EB] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] transition-all"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">DISCOVERY DATE <span className="text-rose-600">*</span></Label>
                                <div className="relative">
                                    <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                    <Input disabled={isLocked} type="date" {...register('whenDate')} className="h-14 pl-14 rounded-none border-2 border-slate-900 bg-white font-bold text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] focus-visible:ring-0" />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">DISCOVERY TIME <span className="text-rose-600">*</span></Label>
                                <div className="relative">
                                    <Clock3 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                    <Input disabled={isLocked} type="time" {...register('whenTime')} className="h-14 pl-14 rounded-none border-2 border-slate-900 bg-white font-bold text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] focus-visible:ring-0" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: NARRATIVE CONTEXT */}
                <div className="space-y-10">
                    <div className="flex items-center gap-4 border-b-4 border-slate-900 pb-4">
                        <FileText className="h-6 w-6 text-[#2563EB]" />
                        <h4 className="text-[14px] font-black uppercase tracking-[0.3em] text-slate-900">NARRATIVE CONTEXT</h4>
                    </div>

                    <div className="space-y-8">
                        <div className="space-y-3">
                            <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">SEQUENCE OF EVENTS (HOW)? <span className="text-rose-600">*</span></Label>
                            <Textarea 
                                disabled={isLocked}
                                placeholder="Document the chronological sequence of events leading to this observation..." 
                                {...register('sequence')}
                                className="min-h-[160px] rounded-none border-2 border-slate-900 bg-white px-6 py-5 text-sm font-medium leading-relaxed text-slate-900 focus-visible:ring-0 focus-visible:border-[#2563EB] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] transition-all"
                            />
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">IMMEDIATE CAUSE / DIRECT REASON <span className="text-rose-600">*</span></Label>
                            <Textarea 
                                disabled={isLocked}
                                placeholder="Direct technical reason for the unsafe act or condition..." 
                                {...register('immediateCause')}
                                className="min-h-[120px] rounded-none border-2 border-slate-900 bg-white px-6 py-5 text-sm font-medium leading-relaxed text-slate-900 focus-visible:ring-0 focus-visible:border-[#2563EB] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] transition-all border-l-rose-600 border-l-8"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

