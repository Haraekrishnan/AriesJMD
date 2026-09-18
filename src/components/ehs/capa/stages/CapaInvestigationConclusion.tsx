'use client';

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, MessageSquare, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    isLocked: boolean;
}

export default function CapaInvestigationConclusion({ isLocked }: Props) {
    const { register } = useFormContext();

    return (
        <div className="space-y-12 text-left animate-in fade-in duration-700">
            <div className="max-w-4xl mx-auto space-y-10">
                
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <MessageSquare className="h-5 w-5 text-blue-600" />
                        <h4 className="text-[12px] font-black uppercase tracking-[0.25em] text-slate-900">FORENSIC SUMMARY CONCLUSION</h4>
                    </div>
                    <div className="relative">
                        <Textarea 
                            disabled={isLocked}
                            {...register('investigationConclusion')}
                            placeholder="Summarize the entire investigation cycle and findings..."
                            className="min-h-[180px] rounded-none border-2 border-slate-900 bg-white p-6 font-bold text-sm leading-relaxed text-slate-800 shadow-sm focus-visible:ring-0"
                        />
                        <div className="absolute top-4 right-4 opacity-10">
                            <FileText className="h-10 w-10" />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <ShieldCheck className="h-5 w-5 text-emerald-600" />
                        <h4 className="text-[12px] font-black uppercase tracking-[0.25em] text-slate-900">SAFETY RECOMMENDATIONS</h4>
                    </div>
                    <div className="relative">
                        <Textarea 
                            disabled={isLocked}
                            {...register('safetyRecommendations')}
                            placeholder="List mandatory actions or changes to prevent recurrence..."
                            className="min-h-[180px] rounded-none border-2 border-emerald-600 bg-emerald-50/20 p-6 font-bold text-sm leading-relaxed text-slate-800 shadow-sm focus-visible:ring-0"
                        />
                        <div className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg">
                            <CheckCircle2 className="h-4 w-4" /> READY FOR RESOLUTION PHASE
                        </div>
                    </div>
                    <p className="text-[9px] font-medium text-slate-400 uppercase tracking-tight ml-1 text-center">Finalized recommendations will trigger the Resolution Milestone upon official verification.</p>
                </div>

            </div>
        </div>
    );
}

import { FileText } from 'lucide-react';
