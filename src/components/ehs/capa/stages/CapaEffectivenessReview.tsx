'use client';

import React from 'react';
import {
    Target,
    ShieldCheck,
    MessageSquare,
} from 'lucide-react';
import { useFormContext } from 'react-hook-form';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import type { EhsObservation } from '@/lib/types';

interface Props {
    observation: EhsObservation;
    isLocked: boolean;
}

export default function CapaEffectivenessReview({ observation, isLocked }: Props) {
    const { register, setValue, watch } = useFormContext();

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT COLUMN */}
                <div className="space-y-6">
                    <SectionHeading icon={ShieldCheck} title="Technical Recap" />
                    <div className="space-y-6">
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4 shadow-none">
                            <div>
                                <p className="text-sm font-semibold text-slate-400 normal-case tracking-normal">Implemented Action</p>
                                <p className="text-sm font-bold text-slate-800 normal-case leading-relaxed mt-1">
                                    {observation.stages['Implementation']?.data?.corrective || '—'}
                                </p>
                            </div>
                            <div className="h-px bg-slate-200 w-full" />
                            <div>
                                <p className="text-sm font-semibold text-slate-400 normal-case tracking-normal">Root Cause Identification</p>
                                <p className="text-sm font-bold text-slate-500 normal-case leading-relaxed mt-1">
                                    {observation.stages['Investigation']?.data?.finalRootCauseStatement || observation.stages['Investigation']?.data?.rootCause || 'Not provided'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="space-y-6">
                    <SectionHeading icon={Target} title="Validation Workspace" />
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold normal-case tracking-normal text-slate-500 ml-1">Effectiveness Verdict <span className="text-red-500">*</span></Label>
                            <Select 
                                disabled={isLocked}
                                value={watch('verdict')}
                                onValueChange={v => setValue('verdict', v)}
                            >
                                <SelectTrigger className="h-10 rounded-lg border-slate-200 bg-white px-3 text-sm font-bold normal-case text-slate-900 focus:ring-blue-100">
                                    <SelectValue placeholder="Select verdict..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Effective">Highly Effective</SelectItem>
                                    <SelectItem value="Partially">Partially Effective</SelectItem>
                                    <SelectItem value="Ineffective">Ineffective</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5 text-sm font-semibold normal-case tracking-normal text-slate-500 ml-1">
                                <MessageSquare className="h-3.5 w-3.5 text-slate-300" />
                                Validation Narrative <span className="text-red-500">*</span>
                            </Label>
                            <Textarea 
                                disabled={isLocked}
                                placeholder="Technical justification for the effectiveness verdict..."
                                aria-label="Validation narrative" {...register('findings')}
                                className="min-h-[140px] rounded-xl border-slate-200 bg-white px-4 py-3 text-xs font-normal leading-relaxed text-slate-900 shadow-sm focus-visible:ring-blue-100"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SectionHeading({ icon: Icon, title }: { icon: any, title: string }) {
    return (
        <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-blue-600" />
            <h4 className="text-sm font-semibold normal-case tracking-normal text-slate-500">{title}</h4>
        </div>
    );
}
