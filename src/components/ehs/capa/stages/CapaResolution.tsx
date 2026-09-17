
'use client';

import React, { useCallback } from 'react';
import {
    Zap,
    Clock3,
    Activity,
    ShieldAlert,
} from 'lucide-react';
import { useFormContext } from 'react-hook-form';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import type { EhsObservation } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { useEhs } from '@/contexts/ehs-provider';
import { parseISO, format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Props {
    observation: EhsObservation;
    isLocked: boolean;
}

export default function CapaResolution({ observation, isLocked }: Props) {
    const { users } = useAuth();
    const { addStageAttachment } = useEhs();
    const { toast } = useToast();
    const sData = observation.stages?.Resolution;
    const currentOwner = users.find(u => u.id === sData?.assigneeId);
    const { register } = useFormContext();

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        if (isLocked) return;
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    toast({ title: 'Capturing evidence...', description: 'Clipboard data intercepted.' });
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const base64 = event.target?.result as string;
                        addStageAttachment(observation.id, 'Resolution', `Resolution_Evidence_${Date.now()}`, base64);
                    };
                    reader.readAsDataURL(blob);
                }
            }
        }
    }, [isLocked, observation.id, addStageAttachment, toast]);

    return (
        <div className="p-10 space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                <div className="space-y-10">
                    <SectionHeading icon={Activity} title="TECHNICAL STRATEGY" />
                    <div className="space-y-8">
                        <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 shadow-inner space-y-3">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Root Cause Summary (W5)</p>
                            <p className="text-xs font-bold text-slate-800 leading-relaxed uppercase italic">
                                {observation.stages['Investigation']?.data?.why5 || 'Technical investigation findings pending verification.'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-10">
                    <SectionHeading icon={Zap} title="REMEDIATION CONTEXT" />
                    <div className="space-y-8">
                        <div className="space-y-3">
                            <Label className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500 ml-1">
                                <ShieldAlert className="h-4 w-4 text-rose-500" />
                                Remediation Plan <span className="text-rose-500">*</span>
                            </Label>
                            <Textarea 
                                disabled={isLocked}
                                placeholder="Describe technical strategy for containment and long-term resolution..."
                                {...register('action')}
                                onPaste={handlePaste}
                                className="min-h-[220px] rounded-xl border-slate-200 bg-white px-4 py-4 text-xs font-bold leading-relaxed text-slate-900 shadow-sm focus-visible:ring-blue-100"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SectionHeading({ icon: Icon, title }: { icon: any; title: string }) {
    return (
        <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 text-blue-600" />
            <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-500">{title}</h4>
        </div>
    );
}
