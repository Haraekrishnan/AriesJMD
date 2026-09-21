'use client';

import React from 'react';
import {
    Clock3,
    ShieldCheck,
    Zap,
    Calendar,
} from 'lucide-react';
import { useFormContext } from 'react-hook-form';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

import type { EhsObservation } from '@/lib/types';

interface Props {
    observation: EhsObservation;
    isLocked: boolean;
}

export default function CapaImplementation({ observation, isLocked }: Props) {
    const { register } = useFormContext();

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT COLUMN */}
                <div className="space-y-6">
                    <SectionHeading icon={ShieldCheck} title="Corrective Actions (CA)" />
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5 text-sm font-semibold normal-case tracking-normal text-slate-500 ml-1">
                                Action Execution Details <span className="text-red-500">*</span>
                            </Label>
                            <Textarea 
                                disabled={isLocked}
                                placeholder="Technical steps taken to eliminate root cause locally..."
                                aria-label="Corrective action details" {...register('corrective')}
                                className="min-h-[140px] rounded-xl border-slate-200 bg-white px-4 py-3 text-xs font-normal leading-relaxed text-slate-900 shadow-sm focus-visible:ring-blue-100"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label className="flex items-center gap-1.5 text-sm font-semibold normal-case tracking-normal text-slate-500 ml-1">
                                    <Calendar className="h-3.5 w-3.5 text-slate-300" />
                                    Target Date
                                </Label>
                                <Input 
                                    type="date"
                                    disabled={isLocked}
                                    aria-label="Target date" {...register('targetDate')}
                                    className="h-10 rounded-lg border-slate-200 bg-white px-3 text-xs font-bold text-slate-900 focus-visible:ring-blue-100 shadow-sm"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="space-y-6">
                    <SectionHeading icon={Zap} title="Preventive Actions (PA)" />
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5 text-sm font-semibold normal-case tracking-normal text-slate-500 ml-1">
                                Systemic Recurrence Controls <span className="text-red-500">*</span>
                            </Label>
                            <Textarea 
                                disabled={isLocked}
                                placeholder="Organizational changes to prevent global recurrence..."
                                aria-label="Preventive controls" {...register('preventive')}
                                className="min-h-[140px] rounded-xl border-slate-200 bg-white px-4 py-3 text-xs font-bold leading-relaxed text-slate-900 shadow-sm focus-visible:ring-blue-100"
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
