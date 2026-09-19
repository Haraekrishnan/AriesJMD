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

    const wellClasses = "min-h-[80px] rounded-2xl border-2 border-slate-200 bg-slate-50 font-bold text-sm px-6 py-5 focus-visible:ring-blue-100 focus-visible:bg-white shadow-inner placeholder:text-slate-300 transition-all leading-relaxed";

    return (
        <div className="space-y-12 text-left animate-in fade-in duration-700 p-10">
            <div className="p-8 rounded-[2rem] bg-[#EFF6FF] border border-[#DBEAFE] flex items-start gap-6 shadow-sm">
                <div className="bg-blue-600 h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
                    <Search className="h-5 w-5 text-white" />
                </div>
                <div>
                    <p className="text-[11px] font-black text-blue-700 uppercase tracking-[0.4em] mb-2">CAUSAL CHAIN PROTOCOL</p>
                    <p className="text-sm font-medium text-[#1E40AF] leading-relaxed max-w-4xl">
                        Keep asking "WHY?" until a systemic or organizational failure is identified. 
                        Each level must logically derive from the technical finding of the previous entry.
                    </p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto space-y-4 pb-10">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex gap-10 group animate-in slide-in-from-left duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                        <div className="flex flex-col items-center shrink-0 pt-3">
                            <div className={cn(
                                "h-14 w-14 rounded-2xl border-2 flex items-center justify-center font-black text-xl shadow-lg transition-all group-hover:scale-105",
                                i === 5 ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-800"
                            )}>
                                W{i}
                            </div>
                            {i < 5 && (
                                <div className="flex-1 w-1 bg-slate-100 my-4 rounded-full" />
                            )}
                        </div>
                        <div className="flex-1 space-y-3 pb-12">
                            <div className="flex justify-between items-center px-1">
                                <Label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
                                    {i === 1 ? 'Primary Discovery Reasoning' : `Systemic link to finding W${i-1}`}
                                </Label>
                                {i === 5 && (
                                    <Badge className="bg-amber-500 text-white border-none font-black text-[9px] tracking-widest px-3 h-5 rounded-full shadow-sm">SYSTEMIC LAYER</Badge>
                                )}
                            </div>
                            <Textarea 
                                disabled={isLocked}
                                {...register(`why${i}`)}
                                placeholder="State technical reasoning..."
                                className={wellClasses}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}