'use client';

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, MessageSquare, ShieldCheck, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    isLocked: boolean;
}

export default function CapaPhaseConclusion({ isLocked }: Props) {
    const { register } = useFormContext();

    // High visibility style for entry fields
    const wellClasses = "rounded-none border-2 border-slate-200 bg-slate-50 font-bold text-sm px-6 py-5 focus-visible:ring-0 focus-visible:border-blue-600 shadow-inner placeholder:text-slate-300 transition-all";

    return (
        <div className="space-y-12 text-left animate-in fade-in duration-700">
            <div className="max-w-5xl mx-auto space-y-12">
                
                {/* --- SUMMARY CONCLUSION --- */}
                <div className="space-y-6">
                    <div className="flex items-center gap-4 border-b-4 border-slate-900 pb-4">
                        <FileText className="h-6 w-6 text-blue-600" />
                        <h4 className="text-[14px] font-black uppercase tracking-[0.3em] text-slate-900">TECHNICAL PHASE CONCLUSION</h4>
                    </div>
                    <div className="relative">
                        <Textarea 
                            disabled={isLocked}
                            {...register('investigationConclusion')}
                            placeholder="Summarize the entire investigation cycle and findings for final archival..."
                            className={cn("min-h-[200px] leading-relaxed", wellClasses)}
                        />
                        <div className="absolute top-4 right-4 opacity-10">
                            <FileText className="h-10 w-10" />
                        </div>
                    </div>
                </div>

                {/* --- RECOMMENDATIONS --- */}
                <div className="space-y-6">
                    <div className="flex items-center gap-4 border-b-4 border-slate-900 pb-4">
                        <ShieldCheck className="h-6 w-6 text-emerald-600" />
                        <h4 className="text-[14px] font-black uppercase tracking-[0.3em] text-slate-900">SAFETY RECOMMENDATIONS</h4>
                    </div>
                    <div className="relative">
                        <Textarea 
                            disabled={isLocked}
                            {...register('safetyRecommendations')}
                            placeholder="List mandatory actions or systemic changes required to prevent recurrence..."
                            className={cn("min-h-[200px] border-emerald-600/30 bg-emerald-50/20 leading-relaxed shadow-lg", wellClasses)}
                        />
                        <div className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest shadow-xl">
                            <CheckCircle2 className="h-5 w-5" /> READY FOR REVIEW
                        </div>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 text-center">
                        Finalized recommendations will trigger the Resolution phase upon official higher official verification.
                    </p>
                </div>

            </div>
        </div>
    );
}
