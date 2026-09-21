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
    const { register } = useFormContext();

    const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
        if (isLocked) return;
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    toast({ title: 'Transmitting forensic capture...', description: 'Uploading clipboard evidence to Dropbox.' });
                    
                    const formData = new FormData();
                    formData.append("file", blob, `Forensic_Paste_Resolution_${Date.now()}.png`);
                    
                    try {
                        const res = await fetch("/api/upload/dropbox", {
                            method: "POST",
                            body: formData,
                        });
                        const uploadData = await res.json();
                        
                        if (uploadData.success) {
                            addStageAttachment(observation.id, 'Resolution', `Forensic_Capture_${Date.now()}`, uploadData.downloadLink);
                            toast({ title: 'Evidence Captured', description: 'Photo attached to Resolution milestone.' });
                        }
                    } catch (err) {
                        console.error("Paste upload failed", err);
                        toast({ variant: 'destructive', title: 'Transmission Error', description: 'Could not sync clipboard evidence.' });
                    }
                }
            }
        }
    }, [isLocked, observation.id, addStageAttachment, toast]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6 text-left">
                    <SectionHeading icon={Activity} title="Root cause summary" />
                    <div className="space-y-6">
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-none space-y-2">
                            <p className="text-sm font-semibold text-slate-400 normal-case tracking-normal">Root Cause Summary (W5)</p>
                            <p className="text-sm font-bold text-slate-800 leading-relaxed normal-case italic">
                                {observation.stages['Investigation']?.data?.why5 || 'Technical investigation findings pending verification.'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 text-left">
                    <SectionHeading icon={Zap} title="Remediation plan" />
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5 text-sm font-semibold normal-case tracking-normal text-slate-500 ml-1">
                                <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                                Remediation Plan <span className="text-rose-500">*</span>
                            </Label>
                            <Textarea 
                                disabled={isLocked}
                                placeholder="Describe technical strategy for containment and long-term resolution..."
                                aria-label="Remediation plan" {...register('action')}
                                onPaste={handlePaste}
                                className="min-h-[140px] rounded-xl border-slate-200 bg-white px-4 py-3 text-xs font-normal leading-relaxed text-slate-900 shadow-sm focus-visible:ring-blue-100"
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
        <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-[#1769FF]" />
            <h4 className="text-sm font-semibold normal-case tracking-normal text-[#304B68]">{title}</h4>
        </div>
    );
}
