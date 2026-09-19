'use client';

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Target, ShieldCheck, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface Props {
    isLocked: boolean;
}

export default function Capa5Why({ isLocked }: Props) {
    const { register } = useFormContext();

    // High visibility style for entry fields - industrial "well" look
    const inputClasses = "min-h-[100px] rounded-none border-2 border-slate-200 bg-slate-50 font-bold text-sm px-6 py-5 focus-visible:ring-0 focus-visible:border-blue-600 shadow-inner placeholder:text-slate-300 transition-all";

    return (
        <div className="space-y-12 text-left animate-in fade-in duration-700">
            {/* --- INSTRUCTIONAL BOX --- */}
            <div className="p-8 border-4 border-blue-600 bg-blue-50/50 flex items-start gap-6">
                <div className="bg-blue-600 h-10 w-10 flex items-center justify-center shrink-0 shadow-lg">
                    <Search className="h-5 w-5 text-white" />
                </div>
                <div>
                    <p className="text-[11px] font-black text-blue-700 uppercase tracking-[0.3em] mb-2">CAUSAL CHAIN PROTOCOL</p>
                    <p className="text-sm font-bold text-blue-900 leading-relaxed max-w-4xl">
                        Identify the immediate cause and keep asking "WHY?" until a systemic or organizational failure is identified. 
                        Each level must logically derive from the findings of the previous entry.
                    </p>
                </div>
            </div>

            {/* --- TECHNICAL CAUSAL CHAIN --- */}
            <div className="max-w-4xl mx-auto space-y-8 pb-10">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex gap-8 group animate-in slide-in-from-left duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                        <div className="flex flex-col items-center shrink-0">
                            <div className={cn(
                                "h-14 w-14 rounded-none border-4 border-slate-900 flex items-center justify-center font-black text-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] transition-transform group-hover:scale-110",
                                i === 5 ? "bg-amber-100 text-amber-900" : "bg-white text-slate-900"
                            )}>
                                W{i}
                            </div>
                            {i < 5 && (
                                <div className="flex-1 w-1 bg-slate-200 my-4 rounded-full" />
                            )}
                        </div>
                        <div className="flex-1 space-y-3 pb-8">
                            <Label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 ml-1">
                                {i === 1 ? 'Primary Discovery Reasoning' : `Systemic link to finding W${i-1}`}
                            </Label>
                            <div className="relative">
                                <Textarea 
                                    disabled={isLocked}
                                    {...register(`why${i}`)}
                                    placeholder="Provide detailed technical reasoning..."
                                    className={inputClasses}
                                />
                                {i === 5 && (
                                    <div className="absolute top-2 right-2">
                                        <Badge className="bg-amber-500 text-white font-black text-[8px] tracking-widest px-2 py-0.5 rounded-none border-none">SYSTEMIC LAYER</Badge>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* --- ROOT CAUSE CONSOLIDATION --- */}
            <div className="pt-10 border-t-4 border-slate-100">
                <div className="flex items-center gap-4 mb-6">
                    <Target className="h-6 w-6 text-rose-600" />
                    <h4 className="text-[16px] font-black uppercase tracking-[0.3em] text-slate-900">IDENTIFIED ROOT CAUSE CANDIDATE</h4>
                </div>
                <div className="relative">
                    <Textarea 
                        disabled={isLocked}
                        {...register('rootCauseCandidate')}
                        placeholder="State the final systemic root cause identified at Level W5..."
                        className="min-h-[160px] rounded-none border-4 border-slate-900 bg-white p-8 font-black text-xl uppercase tracking-tight text-rose-700 placeholder:text-slate-100 focus-visible:ring-0 shadow-xl"
                    />
                    <div className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest shadow-xl">
                        <ShieldCheck className="h-4 w-4" /> ANALYSIS COMPLETE
                    </div>
                </div>
            </div>
        </div>
    );
}
