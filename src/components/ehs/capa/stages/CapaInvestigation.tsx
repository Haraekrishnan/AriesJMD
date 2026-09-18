
'use client';

import React from 'react';
import {
    Activity,
    AlertTriangle,
    CalendarDays,
    Clock3,
    MapPin,
    MessageSquare,
    UserRound,
    Info,
    ArrowDown,
    FileText,
    PencilLine
} from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { Badge } from '@/components/ui/badge';
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
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                    <Activity className="h-5 w-5 text-blue-600" />
                    <h4 className="text-[12px] font-black uppercase tracking-[0.25em] text-slate-900">TECHNICAL LOGISTICS</h4>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-blue-900 ml-1">Who was involved? <span className="text-rose-600">*</span></Label>
                        <Input 
                            disabled={isLocked}
                            placeholder="CFVF" 
                            {...register('who')}
                            className="h-12 rounded-xl border-slate-200 bg-white font-bold text-sm px-4 focus-visible:ring-blue-100 focus-visible:border-blue-400 shadow-sm"
                        />
                        <p className="text-[9px] font-medium text-slate-400 uppercase tracking-tight ml-1">List personnel, contractors or departments involved.</p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-blue-900 ml-1">Exact site position <span className="text-rose-600">*</span></Label>
                        <Input 
                            disabled={isLocked}
                            placeholder="XCVX" 
                            {...register('where')}
                            className="h-12 rounded-xl border-slate-200 bg-white font-bold text-sm px-4 focus-visible:ring-blue-100 focus-visible:border-blue-400 shadow-sm"
                        />
                        <p className="text-[9px] font-medium text-slate-400 uppercase tracking-tight ml-1">Specific deck, unit, workshop or coordinate.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-blue-900 ml-1">Discovery date <span className="text-rose-600">*</span></Label>
                            <div className="relative">
                                <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input disabled={isLocked} type="date" {...register('whenDate')} className="h-12 pl-12 rounded-xl border-slate-200 bg-white font-bold text-sm shadow-sm focus-visible:ring-blue-100" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-blue-900 ml-1">Discovery time <span className="text-rose-600">*</span></Label>
                            <div className="relative">
                                <Clock3 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input disabled={isLocked} type="time" {...register('whenTime')} className="h-12 pl-12 rounded-xl border-slate-200 bg-white font-bold text-sm shadow-sm focus-visible:ring-blue-100" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: NARRATIVE CONTEXT */}
            <div className="space-y-8">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <h4 className="text-[12px] font-black uppercase tracking-[0.25em] text-slate-900">NARRATIVE CONTEXT</h4>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-blue-900 ml-1">Sequence of events (How)? <span className="text-rose-600">*</span></Label>
                        <Textarea 
                            disabled={isLocked}
                            placeholder="CXCVXC" 
                            {...register('sequence')}
                            className="min-h-[140px] rounded-2xl border-slate-200 bg-white px-5 py-4 text-sm font-bold leading-relaxed text-slate-900 focus-visible:ring-blue-100 shadow-sm transition-all"
                        />
                        <p className="text-[9px] font-medium text-slate-400 uppercase tracking-tight ml-1">Describe the chronological sequence of events leading to this observation.</p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-blue-900 ml-1">Immediate cause / direct reason <span className="text-rose-600">*</span></Label>
                        <Textarea 
                            disabled={isLocked}
                            placeholder="Direct reason for unsafe finding..." 
                            {...register('immediateCause')}
                            className="min-h-[100px] rounded-2xl border-slate-200 bg-white px-5 py-4 text-sm font-bold leading-relaxed text-slate-900 focus-visible:ring-blue-100 shadow-sm transition-all border-l-rose-500 border-l-4"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
