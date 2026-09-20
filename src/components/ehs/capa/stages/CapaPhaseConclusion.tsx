'use client';

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, ShieldCheck, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface Props {
    isLocked: boolean;
}

export default function CapaPhaseConclusion({ isLocked }: Props) {
    const { register } = useFormContext();

    const wellClasses = "rounded-2xl border border-slate-200 bg-slate-50 font-bold text-sm px-8 py-6 focus-visible:ring-blue-100 focus-visible:bg-white shadow-none transition-all leading-relaxed";

    return (
        <div className="space-y-6 text-left animate-in fade-in duration-700">
            <div className="max-w-4xl mx-auto space-y-6">
                
                <div className="space-y-6">
                    <div className="flex items-center justify-between border-b pb-4">
                        <div className="flex items-center gap-4">
                            <FileText className="h-6 w-6 text-blue-600" />
                            <h4 className="text-[16px] font-semibold normal-case tracking-tight text-slate-900">Technical phase summary</h4>
                        </div>
                    </div>
                    
                    <div className="relative group">
                        <Textarea 
                            disabled={isLocked}
                            aria-label="Technical phase summary" {...register('investigationConclusion')}
                            placeholder="Provide a terminal summary of the investigation lifecycle..."
                            className={cn("min-h-[130px]", wellClasses)}
                        />
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center justify-between border-b pb-4">
                        <div className="flex items-center gap-4">
                            <ShieldCheck className="h-6 w-6 text-emerald-600" />
                            <h4 className="text-[16px] font-semibold normal-case tracking-tight text-slate-900">Mitigation & recurrence prevention</h4>
                        </div>
                    </div>

                    <div className="relative">
                        <Textarea 
                            disabled={isLocked}
                            aria-label="Mitigation and recurrence prevention" {...register('safetyRecommendations')}
                            placeholder="List mandatory technical corrections or organizational enhancements required to mitigate future recurrence..."
                            className={cn("min-h-[130px] border-emerald-100 bg-emerald-50/20", wellClasses)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
