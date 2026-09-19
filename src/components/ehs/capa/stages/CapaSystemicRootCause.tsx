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
import { GitBranch, Layers, Target, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = [
    'Human Factor / Competency Deficiency',
    'Procedural / Process Lack',
    'Equipment / Hardware Failure',
    'Material / Quality Non-Conformance',
    'Environmental / Work-site Hazard',
    'Management System / Governance Breakdown'
];

interface Props {
    isLocked: boolean;
}

export default function CapaSystemicRootCause({ isLocked }: Props) {
    const { register, control } = useFormContext();

    const wellClasses = "rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm shadow-inner transition-all focus-visible:bg-white focus-visible:border-blue-600 focus-visible:ring-0 leading-relaxed";

    return (
        <div className="space-y-16 text-left animate-in fade-in duration-700">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                
                <div className="space-y-12">
                    <div className="flex items-center gap-4 border-b pb-4">
                        <Layers className="h-6 w-6 text-blue-600" />
                        <h4 className="text-[14px] font-black uppercase tracking-[0.2em] text-slate-900 leading-none">FAILURE CLASSIFICATION</h4>
                    </div>

                    <div className="space-y-10">
                        <div className="space-y-3">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-blue-600 ml-1">PRIMARY DOMAIN <span className="text-rose-600">*</span></Label>
                            <Controller
                                name="rootCauseCategory"
                                control={control}
                                render={({ field }) => (
                                    <Select disabled={isLocked} onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger className={cn("h-12 px-6 uppercase tracking-widest font-black text-xs", wellClasses)}>
                                            <SelectValue placeholder="SELECT CATEGORY" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CATEGORIES.map(c => <SelectItem key={c} value={c} className="font-bold text-xs uppercase">{c}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-blue-600 ml-1">CONTRIBUTING SYSTEMIC FACTORS</Label>
                            <Textarea 
                                disabled={isLocked}
                                {...register('contributingFactors')}
                                placeholder="List organizational factors that influenced the primary finding..."
                                className={cn("min-h-[200px] px-6 py-4", wellClasses)}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-12">
                    <div className="flex items-center gap-4 border-b pb-4">
                        <Target className="h-6 w-6 text-blue-600" />
                        <h4 className="text-[14px] font-black uppercase tracking-[0.2em] text-slate-900 leading-none">ROOT CAUSE DEFINITION</h4>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-blue-600 ml-1">OFFICIAL ROOT CAUSE STATEMENT <span className="text-rose-600">*</span></Label>
                        <div className="relative group">
                            <Textarea 
                                disabled={isLocked}
                                {...register('finalRootCauseStatement')}
                                placeholder="Define the final, validated root cause for institutional archival..."
                                className={cn("min-h-[400px] px-8 py-8 font-bold text-lg text-slate-800", wellClasses)}
                            />
                            <div className="absolute top-6 right-6 opacity-10">
                                <GitBranch className="h-20 w-20 text-slate-900" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
