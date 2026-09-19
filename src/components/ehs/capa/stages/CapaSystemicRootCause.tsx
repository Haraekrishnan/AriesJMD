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
    'Human Factor / Error',
    'Procedural / Documentation Deficiency',
    'Equipment / Technical Failure',
    'Material / Resource Quality',
    'Environmental / Site Conditions',
    'Management System Failure'
];

interface Props {
    isLocked: boolean;
}

export default function CapaSystemicRootCause({ isLocked }: Props) {
    const { register, control } = useFormContext();

    // Shared visual well style
    const wellClasses = "rounded-none border-2 border-slate-200 bg-slate-50 font-bold text-sm shadow-inner transition-all focus-visible:bg-white focus-visible:border-blue-600 focus-visible:ring-0";

    return (
        <div className="space-y-12 text-left animate-in fade-in duration-700">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                
                {/* --- LEFT: CATEGORIZATION --- */}
                <div className="space-y-10">
                    <div className="flex items-center gap-3 border-b-4 border-slate-900 pb-3">
                        <Layers className="h-6 w-6 text-blue-600" />
                        <h4 className="text-[14px] font-black uppercase tracking-[0.25em] text-slate-900">DOMAIN CATEGORIZATION</h4>
                    </div>

                    <div className="space-y-10">
                        <div className="space-y-3">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">Systemic Failure Domain <span className="text-rose-600">*</span></Label>
                            <Controller
                                name="rootCauseCategory"
                                control={control}
                                render={({ field }) => (
                                    <Select disabled={isLocked} onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger className={cn("h-14 px-6 uppercase tracking-wider", wellClasses)}>
                                            <SelectValue placeholder="SELECT CAUSAL DOMAIN" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CATEGORIES.map(c => <SelectItem key={c} value={c} className="font-bold">{c.toUpperCase()}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-tight ml-1">Select the organizational domain where the breakdown occurred.</p>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">Situational Contributing Factors</Label>
                            <Textarea 
                                disabled={isLocked}
                                {...register('contributingFactors')}
                                placeholder="List external or secondary factors that influenced the finding..."
                                className={cn("min-h-[160px] px-6 py-5", wellClasses)}
                            />
                        </div>
                    </div>
                </div>

                {/* --- RIGHT: FINAL STATEMENT --- */}
                <div className="space-y-10">
                    <div className="flex items-center gap-3 border-b-4 border-slate-900 pb-3">
                        <GitBranch className="h-6 w-6 text-blue-600" />
                        <h4 className="text-[14px] font-black uppercase tracking-[0.25em] text-slate-900">ROOT CAUSE DEFINITION</h4>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-3">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">Technical Root Cause Statement <span className="text-rose-600">*</span></Label>
                            <div className="relative">
                                <Textarea 
                                    disabled={isLocked}
                                    {...register('finalRootCauseStatement')}
                                    placeholder="Provide the definitive, validated root cause statement..."
                                    className="min-h-[340px] rounded-none border-4 border-slate-900 bg-white p-8 font-bold text-base leading-relaxed text-slate-800 focus-visible:ring-0 shadow-lg"
                                />
                                <div className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg">
                                    <ShieldAlert className="h-4 w-4" /> OFFICIAL FINDING
                                </div>
                            </div>
                            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-tight ml-1">This statement will serve as the basis for all remediation and preventive strategies.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

import { ShieldAlert } from 'lucide-react';
