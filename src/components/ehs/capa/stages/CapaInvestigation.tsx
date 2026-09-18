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
    ArrowDown
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
        <div className="space-y-12 text-left">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                {/* LEFT COLUMN: TECHNICAL LOGISTICS */}
                <div className="space-y-10">
                    <div className="flex justify-between items-center border-b-4 border-slate-900 pb-2.5">
                        <div className="flex items-center gap-4">
                            <div className="bg-slate-900 p-2.5 text-white">
                                <Activity className="h-6 w-6" />
                            </div>
                            <h4 className="text-[13px] font-black uppercase tracking-[0.4em] text-slate-900">TECHNICAL LOGISTICS</h4>
                        </div>
                    </div>

                    <div className="space-y-10">
                        <div className="space-y-3">
                            <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1">WHO WAS INVOLVED? <span className="text-rose-600">*</span></Label>
                            <div className="relative">
                                <UserRound className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <Input 
                                    disabled={isLocked}
                                    placeholder="IDENTIFY PERSONNEL OR DEPARTMENTS..." 
                                    {...register('who')}
                                    className="h-14 pl-14 rounded-none border-4 border-slate-900 bg-white font-black text-xs uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus-visible:ring-0 focus-visible:border-[#2563EB]"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1">SITE POSITION / COORDINATES <span className="text-rose-600">*</span></Label>
                            <div className="relative">
                                <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <Input 
                                    disabled={isLocked}
                                    placeholder="SPECIFIC UNIT, DECK OR WORKSHOP..." 
                                    {...register('where')}
                                    className="h-14 pl-14 rounded-none border-4 border-slate-900 bg-white font-black text-xs uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus-visible:ring-0 focus-visible:border-[#2563EB]"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1">DISCOVERY DATE <span className="text-rose-600">*</span></Label>
                                <div className="relative">
                                    <CalendarDays className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                    <Input disabled={isLocked} type="date" {...register('whenDate')} className="h-14 pl-14 rounded-none border-4 border-slate-900 bg-white font-black text-xs shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus-visible:ring-0" />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1">DISCOVERY TIME <span className="text-rose-600">*</span></Label>
                                <div className="relative">
                                    <Clock3 className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                    <Input disabled={isLocked} type="time" {...register('whenTime')} className="h-14 pl-14 rounded-none border-4 border-slate-900 bg-white font-black text-xs shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus-visible:ring-0" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: NARRATIVE CONTEXT */}
                <div className="space-y-10">
                    <div className="flex justify-between items-center border-b-4 border-slate-900 pb-2.5">
                        <div className="flex items-center gap-4">
                            <div className="bg-slate-900 p-2.5 text-white">
                                <MessageSquare className="h-6 w-6" />
                            </div>
                            <h4 className="text-[13px] font-black uppercase tracking-[0.4em] text-slate-900">NARRATIVE CONTEXT</h4>
                        </div>
                    </div>

                    <div className="space-y-10">
                        <div className="space-y-3">
                            <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1">SEQUENCE OF EVENTS <span className="text-rose-600">*</span></Label>
                            <Textarea 
                                disabled={isLocked}
                                placeholder="DOCUMENT THE CHRONOLOGICAL ORDER..." 
                                {...register('sequence')}
                                className="min-h-[160px] rounded-none border-4 border-slate-900 bg-white px-6 py-5 text-xs font-black uppercase leading-relaxed text-slate-900 shadow-[inset_6px_6px_0px_0px_rgba(0,0,0,0.05)] focus-visible:ring-0"
                            />
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1">IMMEDIATE TECHNICAL CAUSE <span className="text-rose-600">*</span></Label>
                            <Textarea 
                                disabled={isLocked}
                                placeholder="DIRECT REASON FOR SAFETY FINDING..." 
                                {...register('immediateCause')}
                                className="min-h-[140px] rounded-none border-4 border-slate-900 bg-white px-6 py-5 text-xs font-black uppercase leading-relaxed text-slate-900 shadow-[inset_6px_6px_0px_0px_rgba(0,0,0,0.05)] focus-visible:ring-0 border-l-rose-600 border-l-[12px]"
                            />
                        </div>

                        <div className="p-8 rounded-none bg-blue-50 border-4 border-blue-900 flex items-start gap-6 shadow-[8px_8px_0px_0px_rgba(37,99,235,0.1)]">
                            <Info className="h-6 w-6 text-[#2563EB] shrink-0 mt-0.5" />
                            <p className="text-xs font-black text-blue-900 leading-relaxed uppercase tracking-tight">
                                TECHNICAL NOTE: FINALIZING THIS PHASE WILL SYNCHRONIZE DATA WITH THE SENIOR SAFETY SUPERVISOR FOR INSTITUTIONAL VERIFICATION AND MILESTONE APPROVAL.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- OLD SCHOOL 5-WHY TABLE --- */}
            <div className="space-y-8 pt-10">
                <div className="flex items-center justify-between border-b-4 border-slate-900 pb-2.5">
                    <div className="flex items-center gap-4">
                        <div className="bg-slate-900 p-2.5 text-white">
                            <AlertTriangle className="h-6 w-6" />
                        </div>
                        <h4 className="text-[13px] font-black uppercase tracking-[0.4em] text-slate-900">5-WHY CAUSALITY LEDGER</h4>
                    </div>
                    <Badge className="bg-[#2563EB] text-white font-black uppercase text-[11px] h-7 px-6 rounded-none border-2 border-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">STRICT LOGIC CHAIN</Badge>
                </div>

                <div className="border-4 border-slate-900 bg-white shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                    <div className="grid grid-cols-[120px_1fr] bg-slate-900 text-white border-b-4 border-slate-900">
                        <div className="p-5 border-r-2 border-white font-black text-[12px] uppercase tracking-[0.2em] text-center">LEVEL</div>
                        <div className="p-5 font-black text-[12px] uppercase tracking-[0.2em] px-10">TECHNICAL REASONING / CAUSALITY NARRATIVE</div>
                    </div>
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="grid grid-cols-[120px_1fr] border-b-4 border-slate-900 last:border-b-0 group">
                            <div className="p-12 border-r-4 border-slate-900 bg-slate-100 flex flex-col items-center justify-center gap-3 group-hover:bg-blue-50 transition-colors">
                                <span className="text-4xl font-black text-slate-900 tracking-tighter">W{i}</span>
                                {i < 5 && <ArrowDown className="h-5 w-5 text-slate-400" />}
                            </div>
                            <div className="p-10 bg-white relative">
                                <Label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 absolute top-4 left-8">
                                    {i === 1 ? 'Primary Discovery Reasoning' : `Link to W${i-1} Technical Condition`}
                                </Label>
                                <Textarea 
                                    disabled={isLocked}
                                    placeholder="ENTER TECHNICAL REASONING..."
                                    {...register(`why${i}`)}
                                    className="border-none bg-transparent rounded-none focus-visible:ring-0 min-h-[120px] text-sm font-black uppercase p-6 shadow-[inset_6px_6px_0px_0px_rgba(0,0,0,0.03)] leading-relaxed tracking-tight"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
