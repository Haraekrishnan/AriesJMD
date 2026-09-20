'use client';

import React from 'react';
import {
    ShieldCheck,
    FileText,
} from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { format, parseISO } from 'date-fns';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

import type { EhsObservation } from '@/lib/types';

interface Props {
    observation: EhsObservation;
    isLocked: boolean;
}

export default function CapaClosure({ observation, isLocked }: Props) {
    const { register } = useFormContext();

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT COLUMN */}
                <div className="space-y-6">
                    <SectionHeading icon={ShieldCheck} title="Certification Ledger" />
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                             <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1 shadow-none">
                                <p className="text-sm font-semibold text-slate-400 normal-case tracking-normal">Discovery Date</p>
                                <p className="text-xs font-semibold text-slate-900 normal-case">{format(parseISO(observation.createdAt), 'dd MMM yyyy')}</p>
                             </div>
                             <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 shadow-none">
                                <p className="text-sm font-semibold text-slate-400 normal-case tracking-normal">Compliance Health</p>
                                <Badge className="bg-emerald-500 h-5 text-sm normal-case border-none px-2 font-semibold">OPTIMAL</Badge>
                             </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="space-y-6">
                    <SectionHeading icon={FileText} title="Final Declaration" />
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold normal-case tracking-normal text-slate-500 ml-1">
                                Organizational Summary <span className="text-red-500">*</span>
                            </Label>
                            <Textarea 
                                disabled={isLocked}
                                placeholder="Final declaration regarding achieved safety goals..."
                                {...register('finalSummary')}
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
