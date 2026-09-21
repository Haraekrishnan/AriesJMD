'use client';

import React from 'react';
import {
    BookMarked,
    Link as LinkIcon,
    FilePlus,
    FileText,
} from 'lucide-react';
import { useFormContext } from 'react-hook-form';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import type { EhsObservation } from '@/lib/types';

interface Props {
    observation: EhsObservation;
    isLocked: boolean;
}

export default function CapaReference({ observation, isLocked }: Props) {
    const { register } = useFormContext();

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT COLUMN */}
                <div className="space-y-6">
                    <SectionHeading icon={BookMarked} title="Institutional Archival" />
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5 text-sm font-semibold normal-case tracking-normal text-slate-500 ml-1">
                                <LinkIcon className="h-3.5 w-3.5 text-slate-300" />
                                Work Order / ARC Reference
                            </Label>
                            <Input 
                                disabled={isLocked}
                                placeholder="e.g. WO-2026-442-A"
                                {...register('workOrder')}
                                className="h-10 rounded-lg border-slate-200 bg-white px-3 text-xs font-bold text-slate-900 focus-visible:ring-blue-100 shadow-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5 text-sm font-semibold normal-case tracking-normal text-slate-500 ml-1">
                                <FilePlus className="h-3.5 w-3.5 text-slate-300" />
                                Related Dossier ID
                            </Label>
                            <Input 
                                disabled={isLocked}
                                placeholder="e.g. INC-SEZ-012"
                                {...register('incidentRef')}
                                className="h-10 rounded-lg border-slate-200 bg-white px-3 text-xs font-bold text-slate-900 focus-visible:ring-blue-100 shadow-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="space-y-6">
                    <SectionHeading icon={FileText} title="Knowledge Dossier" />
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5 text-sm font-semibold normal-case tracking-normal text-slate-500 ml-1">
                                Lessons Learned & Metadata
                            </Label>
                            <Textarea 
                                disabled={isLocked}
                                placeholder="Final technical metadata or lessons learned for forensic audit..."
                                {...register('notes')}
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
