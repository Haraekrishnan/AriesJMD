'use client';

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, ShieldCheck, FileText, Target, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface Props {
    isLocked: boolean;
}

export default function CapaPhaseConclusion({ isLocked }: Props) {
    const { register } = useFormContext();

    // High visibility style for entry fields - industrial "well" look
    const wellClasses = "rounded-none border-2 border-slate-200 bg-slate-50 font-bold text-sm px-8 py-6 focus-visible:ring-0 focus-visible:border-blue-600 shadow-inner placeholder:text-slate-300 transition-all";

    return (
        <div className="space-y-16 text-left animate-in fade-in duration-700 p-2">
            <div className="max-w-5xl mx-auto space-y-16">
                
                {/* --- SUMMARY CONCLUSION --- */}
                <div className="space-y-8">
                    <div className="flex items-center justify-between border-b-4 border-slate-900 pb-4">
                        <div className="flex items-center gap-4">
                            <FileText className="h-7 w-7 text-blue-600" />
                            <h4 className="text-[16px] font-black uppercase tracking-[0.3em] text-slate-900">TECHNICAL PHASE SUMMARY</h4>
                        </div>
                        <Badge variant="outline" className="h-6 px-3 border-2 border-slate-900 font-black text-[9px] uppercase tracking-widest rounded-none">ARCHIVAL READY</Badge>
                    </div>
                    
                    <div className="relative group">
                        <Textarea 
                            disabled={isLocked}
                            {...register('investigationConclusion')}
                            placeholder="Summarize the entire investigation cycle, identified breakdowns, and resulting technical determinations..."
                            className={cn("min-h-[240px] leading-relaxed shadow-lg", wellClasses)}
                        />
                        <div className="absolute top-6 right-6 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Target className="h-20 w-20 text-slate-900" />
                        </div>
                    </div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Comprehensive declaration for executive safety auditing.</p>
                </div>

                {/* --- RECOMMENDATIONS LEDGER --- */}
                <div className="space-y-8">
                    <div className="flex items-center justify-between border-b-4 border-slate-900 pb-4">
                        <div className="flex items-center gap-4">
                            <ShieldCheck className="h-7 w-7 text-emerald-600" />
                            <h4 className="text-[16px] font-black uppercase tracking-[0.3em] text-slate-900">SAFETY RECOMMENDATIONS LEDGER</h4>
                        </div>
                        <div className="flex items-center gap-2">
                             <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                             <span className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.2em]">Ready for Verification</span>
                        </div>
                    </div>

                    <div className="relative">
                        <Textarea 
                            disabled={isLocked}
                            {...register('safetyRecommendations')}
                            placeholder="List mandatory actions, technical corrections, or systemic enhancements required to mitigate future recurrence..."
                            className={cn("min-h-[240px] border-emerald-600/30 bg-emerald-50/10 leading-relaxed shadow-2xl ring-4 ring-emerald-500/5", wellClasses)}
                        />
                        <div className="absolute bottom-6 right-6 flex items-center gap-3 px-6 py-3 bg-emerald-600 text-white text-[12px] font-black uppercase tracking-[0.25em] shadow-2xl ring-4 ring-emerald-600/20 active:scale-95 transition-all cursor-pointer">
                            <CheckCircle2 className="h-5 w-5" /> PHASE COMPLETE
                        </div>
                    </div>

                    <div className="p-6 bg-amber-50 border-2 border-amber-200 rounded-none flex items-start gap-4">
                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-[11px] font-black text-amber-700 uppercase tracking-widest mb-1">Lifecycle Governance Protocol</p>
                            <p className="text-xs font-bold text-amber-900/80 leading-relaxed">
                                Submission of this ledger will finalize the Investigation Milestone. Subsequent Resolution and Implementation phases will be derived directly from these recommendations.
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}