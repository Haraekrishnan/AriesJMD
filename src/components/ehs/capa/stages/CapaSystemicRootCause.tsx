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
import { Badge } from '@/components/ui/badge';

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

    const wellClasses = "rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm shadow-none transition-all focus-within:bg-white focus-within:border-blue-600 focus-within:ring-0 leading-relaxed";

    return (
        <div className="space-y-6 text-left animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                <div className="space-y-5">
                    <div className="flex items-center gap-4 border-b pb-4">
                        <Layers className="h-6 w-6 text-blue-600" />
                        <h4 className="text-[14px] font-semibold normal-case tracking-normal text-slate-900 leading-none">Failure classification</h4>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-3">
                            <Label className="text-sm font-semibold normal-case tracking-normal text-blue-600 ml-1">Primary domain <span className="text-rose-600">*</span></Label>
                            <Controller
                                name="rootCauseCategory"
                                control={control}
                                render={({ field }) => (
                                    <Select disabled={isLocked} onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger className={cn("h-12 px-6 normal-case tracking-normal font-semibold text-xs", wellClasses)}>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CATEGORIES.map(c => <SelectItem key={c} value={c} className="font-bold text-xs normal-case">{c}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>

                        <div className="space-y-3">
                            <Label className="text-sm font-semibold normal-case tracking-normal text-blue-600 ml-1">Contributing systemic factors</Label>
                            <Textarea 
                                disabled={isLocked}
                                aria-label="Contributing systemic factors" {...register('contributingFactors')}
                                placeholder="List organizational factors that influenced the primary finding..."
                                className={cn("min-h-[200px] px-6 py-4", wellClasses)}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-5">
                    <div className="flex items-center gap-4 border-b pb-4">
                        <Target className="h-6 w-6 text-blue-600" />
                        <h4 className="text-[14px] font-semibold normal-case tracking-normal text-slate-900 leading-none">Root cause definition</h4>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-sm font-semibold normal-case tracking-normal text-blue-600 ml-1">Official root cause statement <span className="text-rose-600">*</span></Label>
                        <div className="relative group">
                            <Textarea 
                                disabled={isLocked}
                                aria-label="Official root cause statement" {...register('finalRootCauseStatement')}
                                placeholder="Define the final, validated root cause for institutional archival..."
                                className={cn("min-h-[260px] px-4 py-3 font-bold text-lg text-slate-800", wellClasses)}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
