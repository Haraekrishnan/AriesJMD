'use client';

import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { GitBranch, Layers, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = [
    'Human Factor / Individual Error',
    'Procedural / Documentation Deficiency',
    'Equipment / Technical Failure',
    'Material / Resource Quality Issues',
    'Environmental / Work-site Conditions',
    'Management System / Organizational Breakdown'
];

interface Props {
    isLocked: boolean;
}

export default function CapaSystemicRootCause({ isLocked }: Props) {
    const { register, control } = useFormContext();

    const wellClasses = "rounded-2xl border-2 border-slate-200 bg-slate-50 font-bold text-sm shadow-inner transition-all focus-visible:bg-white focus-visible:border-blue-600 focus-visible:ring-0";

    return (
        <div className="space-y-16 text-left animate-in fade-in duration-700 p-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
                
                {/* --- LEFT: DOMAIN CATEGORIZATION --- */}
                <div className="space-y-12">
                    <div className="flex items-center gap-4 border-b-4 border-slate-900 pb-5">
                        <Layers className="h-7 w-7 text-blue-600" />
                        <h4 className="text-[16px] font-black uppercase tracking-[0.3em] text-slate-900 leading-none">DOMAIN CATEGORIZATION</h4>
                    </div>

                    <div className="space-y-12">
                        <div className="space-y-4">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">PRIMARY FAILURE DOMAIN <span className="text-rose-600">*</span></Label>
                            <Controller
                                name="rootCauseCategory"
                                control={control}
                                render={({ field }) => (
                                    <Select disabled={isLocked} onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger className={cn("h-14 px-6 uppercase tracking-widest font-black text-xs shadow-sm", wellClasses)}>
                                            <SelectValue placeholder="SELECT CAUSAL DOMAIN" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CATEGORIES.map(c => <SelectItem key={c} value={c} className="font-bold text-xs uppercase">{c}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>

                        <div className="space-y-4">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">SITUATIONAL CONTRIBUTING FACTORS</Label>
                            <Textarea 
                                disabled={isLocked}
                                {...register('contributingFactors')}
                                placeholder="List external or secondary factors that influenced the primary finding..."
                                className={cn("min-h-[240px] px-8 py-7 leading-relaxed", wellClasses)}
                            />
                        </div>
                    </div>
                </div>

                {/* --- RIGHT: ROOT CAUSE DEFINITION --- */}
                <div className="space-y-12">
                    <div className="flex items-center gap-4 border-b-4 border-slate-900 pb-5">
                        <GitBranch className="h-7 w-7 text-blue-600" />
                        <h4 className="text-[16px] font-black uppercase tracking-[0.3em] text-slate-900 leading-none">ROOT CAUSE DEFINITION</h4>
                    </div>

                    <div className="space-y-8">
                        <div className="space-y-4">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">OFFICIAL ROOT CAUSE STATEMENT <span className="text-rose-600">*</span></Label>
                            <div className="relative group">
                                <Textarea 
                                    disabled={isLocked}
                                    {...register('finalRootCauseStatement')}
                                    placeholder="Provide the definitive, validated root cause statement for institutional archival..."
                                    className="min-h-[440px] rounded-[2.5rem] border-2 border-slate-200 bg-slate-50 p-12 font-black text-xl uppercase tracking-tight text-rose-700 focus-visible:bg-white transition-all shadow-inner"
                                />
                                <div className="absolute bottom-10 right-10 flex items-center gap-3 px-6 py-3 bg-rose-600 text-white text-[12px] font-black uppercase tracking-widest rounded-2xl shadow-xl ring-4 ring-rose-600/10">
                                    <ShieldAlert className="h-6 w-6 text-white" /> SYSTEMIC BREAKDOWN
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}