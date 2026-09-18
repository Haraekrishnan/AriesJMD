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
    UserRound,
} from 'lucide-react';
import { useFormContext } from 'react-hook-form';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import type { EhsObservation } from '@/lib/types';

interface Props {
    observation: EhsObservation;
    isLocked: boolean;
}

export default function CapaInvestigation({ observation, isLocked }: Props) {
    const { register } = useFormContext();

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 text-left">
            {/* LEFT COLUMN: TECHNICAL LOGISTICS */}
            <div className="space-y-8">
                <div className="flex justify-between items-center border-b pb-2">
                    <div className="flex items-center gap-2.5">
                        <div className="bg-blue-100 p-1.5 rounded">
                            <Activity className="h-4 w-4 text-blue-700" />
                        </div>
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">TECHNICAL LOGISTICS</h4>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Provide key factual details</span>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Who was involved? <span className="text-rose-500">*</span></Label>
                        <div className="relative">
                            <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                                disabled={isLocked}
                                placeholder="List personnel, contractors or departments involved." 
                                {...register('who')}
                                className="h-11 pl-10 rounded-lg border-slate-200 bg-white font-semibold text-xs"
                            />
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter ml-1">List personnel, contractors or departments involved.</p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Exact site position <span className="text-rose-500">*</span></Label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                                disabled={isLocked}
                                placeholder="Specific deck, unit, workshop or coordinate." 
                                {...register('where')}
                                className="h-11 pl-10 rounded-lg border-slate-200 bg-white font-semibold text-xs"
                            />
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter ml-1">Specific deck, unit, workshop or coordinate.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Discovery date <span className="text-rose-500">*</span></Label>
                            <div className="relative">
                                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input disabled={isLocked} type="date" {...register('whenDate')} className="h-11 pl-10 rounded-lg border-slate-200 bg-white font-semibold text-xs" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Discovery time <span className="text-rose-500">*</span></Label>
                            <div className="relative">
                                <Clock3 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input disabled={isLocked} type="time" {...register('whenTime')} className="h-11 pl-10 rounded-lg border-slate-200 bg-white font-semibold text-xs" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: NARRATIVE CONTEXT */}
            <div className="space-y-8">
                <div className="flex justify-between items-center border-b pb-2">
                    <div className="flex items-center gap-2.5">
                        <div className="bg-blue-100 p-1.5 rounded">
                            <MessageSquare className="h-4 w-4 text-blue-700" />
                        </div>
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">NARRATIVE CONTEXT</h4>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Describe what happened in sequence</span>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Sequence of events (How)? <span className="text-rose-500">*</span></Label>
                        <Textarea 
                            disabled={isLocked}
                            placeholder="Describe the chronological sequence of events leading to this observation." 
                            {...register('sequence')}
                            className="min-h-[140px] rounded-xl border-slate-200 bg-white px-4 py-3 text-xs font-bold leading-relaxed text-slate-900 shadow-sm"
                        />
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter ml-1">Describe the chronological sequence of events leading to this observation.</p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Immediate cause / direct reason <span className="text-rose-500">*</span></Label>
                        <Textarea 
                            disabled={isLocked}
                            placeholder="Direct reason for unsafe finding..." 
                            {...register('immediateCause')}
                            className="min-h-[120px] rounded-xl border-slate-200 bg-white px-4 py-3 text-xs font-bold leading-relaxed text-slate-900 shadow-sm"
                        />
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter ml-1">State the most immediate and direct cause based on available information.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
