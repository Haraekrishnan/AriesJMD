'use client';

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, ShieldCheck, FileText, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface Props {
    isLocked: boolean;
}

export default function CapaPhaseConclusion({ isLocked }: Props) {
    const { register } = useFormContext();

    const wellClasses = "rounded-3xl border-2 border-slate-200 bg-slate-50 font-bold text-sm px-8 py-7 focus-visible:ring-blue-100 focus-visible:bg-white shadow-inner transition-all leading-relaxed";

    return (
        <div className="space-y-20 text-left animate-in fade-in duration-700 p-10">
            <div className="max-w-5xl mx-auto space-y-20 py-10">
                
                {/* --- TECHNICAL PHASE SUMMARY --- */}
                <div className="space-y-8">
                    <div className="flex items-center justify-between border-b-4 border-slate-900 pb-5">
                        <div className="flex items-center gap-5">
                            <FileText className="h-8 w-8 text-blue-600" />
                            <h4 className="text-[20px] font-black uppercase tracking-tight text-slate-900">TECHNICAL PHASE SUMMARY</h4>
                        </div>
                        <Badge variant="outline" className="h-7 px-5 border-none font-black text-[10px] uppercase tracking-widest rounded-full bg-slate-900 text-white">ARCHIVAL READY</Badge>
                    </div>
                    
                    <div className="relative group">
                        <Textarea 
                            disabled={isLocked}
                            {...register('investigationConclusion')}
                            placeholder="Summarize the complete investigation lifecycle, identified breakdowns, and resulting technical determinations for institutional archival..."
                            className={cn("min-h-[300px] shadow-sm", wellClasses)}
                        />
                        <div className="absolute top-8 right-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Target className="h-24 w-24 text-slate-900" />
                        </div>
                    </div>
                </div>

                {/* --- SAFETY RECOMMENDATIONS LEDGER --- */}
                <div className="space-y-8">
                    <div className="flex items-center justify-between border-b-4 border-slate-900 pb-5">
                        <div className="flex items-center gap-5">
                            <ShieldCheck className="h-8 w-8 text-emerald-600" />
                            <h4 className="text-[20px] font-black uppercase tracking-tight text-slate-900">SAFETY RECOMMENDATIONS LEDGER</h4>
                        </div>
                        <div className="flex items-center gap-3">
                             <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
                             <span className="text-[11px] font-black uppercase text-emerald-600 tracking-[0.3em]">Ready for Verification</span>
                        </div>
                    </div>

                    <div className="relative">
                        <Textarea 
                            disabled={isLocked}
                            {...register('safetyRecommendations')}
                            placeholder="List mandatory actions, technical corrections, or systemic enhancements required to mitigate future recurrence and achieve institutional safety goals..."
                            className={cn("min-h-[300px] border-emerald-600/10 bg-emerald-50/50 shadow-sm", wellClasses)}
                        />
                        <div className="absolute bottom-8 right-8 flex items-center gap-4 px-8 py-4 bg-emerald-600 text-white text-[14px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-emerald-500/30 active:scale-95 transition-all">
                            <CheckCircle2 className="h-6 w-6 text-white" /> PHASE COMPLETE
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}