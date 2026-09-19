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

    const wellClasses = "rounded-2xl border border-slate-200 bg-slate-50 font-bold text-sm px-8 py-6 focus-visible:ring-blue-100 focus-visible:bg-white shadow-sm transition-all leading-relaxed";

    return (
        <div className="space-y-16 text-left animate-in fade-in duration-700">
            <div className="max-w-4xl mx-auto space-y-16">
                
                <div className="space-y-6">
                    <div className="flex items-center justify-between border-b pb-4">
                        <div className="flex items-center gap-4">
                            <FileText className="h-6 w-6 text-blue-600" />
                            <h4 className="text-[16px] font-black uppercase tracking-tight text-slate-900">TECHNICAL PHASE SUMMARY</h4>
                        </div>
                        <Badge variant="outline" className="h-6 px-4 border-none font-black text-[9px] uppercase tracking-widest rounded-md bg-slate-900 text-white">AUDIT READY</Badge>
                    </div>
                    
                    <div className="relative group">
                        <Textarea 
                            disabled={isLocked}
                            {...register('investigationConclusion')}
                            placeholder="Provide a terminal summary of the investigation lifecycle..."
                            className={cn("min-h-[200px]", wellClasses)}
                        />
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center justify-between border-b pb-4">
                        <div className="flex items-center gap-4">
                            <ShieldCheck className="h-6 w-6 text-emerald-600" />
                            <h4 className="text-[16px] font-black uppercase tracking-tight text-slate-900">MITIGATION & RECURRENCE LEDGER</h4>
                        </div>
                    </div>

                    <div className="relative">
                        <Textarea 
                            disabled={isLocked}
                            {...register('safetyRecommendations')}
                            placeholder="List mandatory technical corrections or organizational enhancements required to mitigate future recurrence..."
                            className={cn("min-h-[200px] border-emerald-100 bg-emerald-50/20", wellClasses)}
                        />
                        <div className="absolute bottom-6 right-6 flex items-center gap-3 px-5 py-2.5 bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest rounded-lg shadow-xl shadow-emerald-500/20 active:scale-95 transition-all">
                            <CheckCircle2 className="h-4 w-4 text-white" /> PHASE COMPLETE
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

