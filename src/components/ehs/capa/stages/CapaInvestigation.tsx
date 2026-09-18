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
                <div className="flex justify-between items-center border-b-4 border-slate-900 pb-2">
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-900 p-2 text-white">
                            <Activity className="h-5 w-5" />
                        </div>
                        <h4 className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-900">TECHNICAL LOGISTICS</h4>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="space-y-2.5">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1">WHO WAS INVOLVED? <span className="text-rose-600">*</span></Label>
                        <div className="relative">
                            <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                                disabled={isLocked}
                                placeholder="IDENTIFY PERSONNEL OR DEPARTMENTS..." 
                                {...register('who')}
                                className="h-12 pl-12 rounded-none border-2 border-slate-900 bg-white font-black text-xs uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus-visible:ring-0 focus-visible:border-blue-600"
                            />
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1">SITE POSITION / COORDINATES <span className="text-rose-600">*</span></Label>
                        <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                                disabled={isLocked}
                                placeholder="SPECIFIC UNIT, DECK OR WORKSHOP..." 
                                {...register('where')}
                                className="h-12 pl-12 rounded-none border-2 border-slate-900 bg-white font-black text-xs uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus-visible:ring-0 focus-visible:border-blue-600"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2.5">
                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1">DISCOVERY DATE <span className="text-rose-600">*</span></Label>
                            <div className="relative">
                                <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input disabled={isLocked} type="date" {...register('whenDate')} className="h-12 pl-12 rounded-none border-2 border-slate-900 bg-white font-black text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus-visible:ring-0" />
                            </div>
                        </div>
                        <div className="space-y-2.5">
                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1">DISCOVERY TIME <span className="text-rose-600">*</span></Label>
                            <div className="relative">
                                <Clock3 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input disabled={isLocked} type="time" {...register('whenTime')} className="h-12 pl-12 rounded-none border-2 border-slate-900 bg-white font-black text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus-visible:ring-0" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: NARRATIVE CONTEXT */}
            <div className="space-y-8">
                <div className="flex justify-between items-center border-b-4 border-slate-900 pb-2">
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-900 p-2 text-white">
                            <MessageSquare className="h-5 w-5" />
                        </div>
                        <h4 className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-900">NARRATIVE CONTEXT</h4>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="space-y-2.5">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1">SEQUENCE OF EVENTS <span className="text-rose-600">*</span></Label>
                        <Textarea 
                            disabled={isLocked}
                            placeholder="DOCUMENT THE CHRONOLOGICAL ORDER..." 
                            {...register('sequence')}
                            className="min-h-[140px] rounded-none border-2 border-slate-900 bg-white px-5 py-4 text-xs font-black uppercase leading-relaxed text-slate-900 shadow-[inset_4px_4px_0px_0px_rgba(0,0,0,0.05)] focus-visible:ring-0"
                        />
                    </div>

                    <div className="space-y-2.5">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1">IMMEDIATE TECHNICAL CAUSE <span className="text-rose-600">*</span></Label>
                        <Textarea 
                            disabled={isLocked}
                            placeholder="DIRECT REASON FOR SAFETY FINDING..." 
                            {...register('immediateCause')}
                            className="min-h-[120px] rounded-none border-2 border-slate-900 bg-white px-5 py-4 text-xs font-black uppercase leading-relaxed text-slate-900 shadow-[inset_4px_4px_0px_0px_rgba(0,0,0,0.05)] focus-visible:ring-0 border-l-rose-600 border-l-8"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
