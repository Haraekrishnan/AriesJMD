'use client';

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface Props {
    isLocked: boolean;
}

export default function Capa5Why({ isLocked }: Props) {
    const { register } = useFormContext();

    const wellClasses = "min-h-[100px] rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm px-6 py-4 focus-visible:ring-blue-100 focus-visible:bg-white shadow-inner placeholder:text-slate-300 transition-all leading-relaxed";

    return (
        <div className="space-y-12 text-left">
            <div className="p-8 rounded-2xl bg-blue-50/30 border border-blue-100 flex items-start gap-6">
                <div className="bg-blue-600 h-10 w-10 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
                    <Search className="h-5 w-5 text-white" />
                </div>
                <div>
                    <p className="text-[11px] font-black text-blue-700 uppercase tracking-[0.4em] mb-2">CAUSAL ANALYSIS PROTOCOL</p>
                    <p className="text-sm font-medium text-slate-600 leading-relaxed max-w-4xl">
                        Identify the chain of events by repeatedly asking "Why?". Each response must be technically specific and logically derived from the preceding level.
                    </p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto space-y-6">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex gap-8 group animate-in slide-in-from-left duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                        <div className="flex flex-col items-center shrink-0 pt-2">
                            <div className={cn(
                                "h-12 w-12 rounded-xl border-2 flex items-center justify-center font-black text-lg transition-all",
                                i === 5 ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-800 shadow-sm"
                            )}>
                                W{i}
                            </div>
                            {i < 5 && (
                                <div className="flex-1 w-px bg-slate-200 my-4" />
                            )}
                        </div>
                        <div className="flex-1 space-y-3 pb-8">
                            <div className="flex justify-between items-center px-1">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    {i === 1 ? 'Primary Discovery Reasoning' : `Logical Link to W${i-1}`}
                                </Label>
                                {i === 5 && (
                                    <Badge className="bg-amber-500 text-white border-none font-black text-[9px] tracking-widest px-3 h-5 rounded-md shadow-sm">SYSTEMIC FAILURE POINT</Badge>
                                )}
                            </div>
                            <Textarea 
                                disabled={isLocked}
                                {...register(`why${i}`)}
                                placeholder="Enter technical reasoning..."
                                className={wellClasses}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
