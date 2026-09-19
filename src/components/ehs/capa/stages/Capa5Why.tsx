'use client';

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, ArrowDown, Target, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    isLocked: boolean;
}

export default function Capa5Why({ isLocked }: Props) {
    const { register } = useFormContext();

    // High visibility style for entry fields
    const inputClasses = "min-h-[80px] rounded-none border-2 border-slate-200 bg-slate-50 font-bold text-sm px-5 py-4 focus-visible:ring-0 focus-visible:border-blue-600 shadow-inner placeholder:text-slate-300 transition-all";

    return (
        <div className="space-y-12 text-left animate-in fade-in duration-700">
            {/* --- INSTRUCTIONAL BOX --- */}
            <div className="p-6 border-2 border-blue-600 bg-blue-50/50 flex items-start gap-4">
                <div className="bg-blue-600 h-8 w-8 flex items-center justify-center shrink-0">
                    <Search className="h-4 w-4 text-white" />
                </div>
                <div>
                    <p className="text-[10px] font-black text-blue-700 uppercase tracking-[0.2em] mb-1">Causal Chain Protocol</p>
                    <p className="text-xs font-bold text-blue-900 leading-relaxed">
                        Identify the direct cause and keep asking "WHY?" until a systemic or organizational failure is identified. Ensure each step logically flows from the previous finding.
                    </p>
                </div>
            </div>

            {/* --- TECHNICAL LEDGER TABLE --- */}
            <div className="border-4 border-slate-900 bg-white">
                <div className="grid grid-cols-[80px,1fr] border-b-4 border-slate-900 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest">
                    <div className="p-3 border-r-2 border-white/20 text-center">ID</div>
                    <div className="p-3 pl-6">Causal Analysis / Technical Discovery</div>
                </div>

                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="grid grid-cols-[80px,1fr] border-b-2 border-slate-900 last:border-b-0 group">
                        <div className={cn(
                            "flex items-center justify-center bg-slate-100 font-black text-lg border-r-4 border-slate-900",
                            i === 5 && "bg-amber-100"
                        )}>
                            W{i}
                        </div>
                        <div className="p-6 space-y-3">
                            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                {i === 1 ? 'Primary Discovery Reasoning' : `Logical connection to W${i-1}`}
                            </Label>
                            <Textarea 
                                disabled={isLocked}
                                {...register(`why${i}`)}
                                placeholder="Enter technical reasoning..."
                                className={inputClasses}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* --- FINAL ROOT CAUSE CANDIDATE --- */}
            <div className="space-y-4 pt-4">
                <div className="flex items-center gap-3">
                    <Target className="h-5 w-5 text-rose-600" />
                    <h4 className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-900">ROOT CAUSE CANDIDATE</h4>
                </div>
                <div className="relative">
                    <Textarea 
                        disabled={isLocked}
                        {...register('rootCauseCandidate')}
                        placeholder="State the final systemic root cause identified in W5..."
                        className="min-h-[120px] rounded-none border-4 border-slate-900 bg-white p-6 font-black text-lg uppercase tracking-tight text-rose-700 placeholder:text-slate-100 focus-visible:ring-0 shadow-lg"
                    />
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 border border-emerald-200">
                        <ShieldCheck className="h-3 w-3" /> Logical Destination
                    </div>
                </div>
            </div>
        </div>
    );
}
