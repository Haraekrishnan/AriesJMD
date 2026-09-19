
'use client';

import React from 'react';
import { 
    FileSearch, 
    MapPin,
    Calendar,
    Activity,
    User,
    FileText,
    Clock,
    ShieldAlert
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFormContext } from 'react-hook-form';
import type { EhsObservation } from '@/lib/types';
import { format, parseISO, isValid } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function CapaInvestigationWorkspace({ observation }: { observation: EhsObservation }) {
    const { register } = useFormContext();

    const stageStatus = observation.stages?.Investigation?.status || 'Pending';
    const isLocked = stageStatus === 'Completed' || stageStatus === 'In Progress';

    const inputWell = "h-11 rounded-lg border border-slate-200 bg-slate-50 font-bold text-sm px-10 focus-visible:bg-white focus-visible:ring-blue-100 transition-all shadow-inner placeholder:text-slate-300";
    const areaWell = "min-h-[120px] rounded-lg border border-slate-200 bg-slate-50 font-bold text-sm p-4 focus-visible:bg-white focus-visible:ring-blue-100 transition-all shadow-inner resize-none leading-relaxed";

    return (
        <div className="space-y-8 text-left animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* 1. DETAILS */}
                <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-8">
                    <div className="flex items-center justify-between border-b pb-4">
                        <div className="flex items-center gap-3">
                            <FileSearch className="h-5 w-5 text-blue-600" />
                            <h4 className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-800">DETAILS</h4>
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Factual incident parameters</p>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-blue-600 ml-1">Who was involved? <span className="text-rose-600">*</span></Label>
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input disabled={isLocked} {...register('who')} placeholder="Enter personnel or teams..." className={inputWell} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-blue-600 ml-1">Exact site position <span className="text-rose-600">*</span></Label>
                            <div className="relative">
                                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input disabled={isLocked} {...register('where')} placeholder="Specific location..." className={inputWell} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-blue-600 ml-1">Discovery date <span className="text-rose-600">*</span></Label>
                                <div className="relative">
                                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input disabled={isLocked} type="date" {...register('whenDate')} className={inputWell} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-blue-600 ml-1">Discovery time <span className="text-rose-600">*</span></Label>
                                <div className="relative">
                                    <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input disabled={isLocked} type="time" {...register('whenTime')} className={inputWell} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. NARRATIVE CONTEXT */}
                <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-8">
                    <div className="flex items-center justify-between border-b pb-4">
                        <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-blue-600" />
                            <h4 className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-800">SUMMARY</h4>
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Incident sequence & discovery</p>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-blue-600 ml-1">Sequence of events (How)? <span className="text-rose-600">*</span></Label>
                            <Textarea disabled={isLocked} {...register('sequence')} placeholder="Document the chronological flow..." className={areaWell} />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-blue-600 ml-1">Activity during discovery</Label>
                            <Textarea disabled={isLocked} {...register('activityAtDiscovery')} placeholder="What was being performed..." className={areaWell} />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-rose-600 ml-1 flex items-center gap-1.5">
                                <ShieldAlert className="h-3 w-3" /> IMMEDIATE CAUSE / DIRECT REASON <span className="text-rose-600">*</span>
                            </Label>
                            <Textarea disabled={isLocked} {...register('immediateCause')} placeholder="State the direct reason for unsafe condition..." className={cn(areaWell, "border-l-4 border-l-rose-500 bg-rose-50/20")} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
