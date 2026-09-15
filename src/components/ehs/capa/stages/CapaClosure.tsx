
'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { EhsObservation } from '@/lib/types';
import { useEhs } from '@/contexts/ehs-provider';
import { Button } from '@/components/ui/button';
import { ShieldCheck, History } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function CapaClosure({ observation, isLocked }: { observation: EhsObservation, isLocked: boolean }) {
    const { actionStage } = useEhs();

    return (
        <div className="space-y-8">
            <Card className="rounded-[2.5rem] border-none shadow-2xl bg-slate-900 text-white p-10">
                <CardContent className="p-0 space-y-10">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-emerald-500 rounded-3xl shadow-lg shadow-emerald-500/30">
                            <ShieldCheck className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h4 className="text-2xl font-black uppercase tracking-tight">Final Governance Sign-off</h4>
                            <p className="text-slate-400 font-bold text-sm">Reviewing total remediation lifecycle before archival.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-8 border-y border-white/10">
                        <StatItem label="Case Age" value={`${differenceInDays(new Date(), parseISO(observation.createdAt))} Days`} />
                        <StatItem label="Initiated" value={format(parseISO(observation.createdAt), 'dd MMM yy')} />
                        <StatItem label="Milestones" value="6/7 Verified" />
                        <StatItem label="Lifecycle State" value={observation.status.toUpperCase()} />
                    </div>

                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Final Organizational Narrative</Label>
                        <Textarea 
                            disabled={isLocked}
                            placeholder="Provide closing summary for the master registry..."
                            className="min-h-[120px] rounded-3xl p-6 font-bold bg-white/5 border-white/10 text-white focus-visible:ring-emerald-500/20"
                        />
                    </div>
                </CardContent>
            </Card>

            {!isLocked && (
                <div className="flex justify-end">
                    <Button className="h-16 px-16 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-[0.2em] text-xs rounded-[2rem] shadow-2xl shadow-emerald-500/30 active:scale-95 transition-all" onClick={() => actionStage(observation.id, 'Closure', { final: true })}>
                        AUTHORIZE CASE CLOSURE
                    </Button>
                </div>
            )}
        </div>
    );
}

function StatItem({ label, value }: { label: string, value: string }) {
    return (
        <div className="space-y-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</p>
            <p className="text-lg font-black text-white">{value}</p>
        </div>
    );
}

function differenceInDays(a: Date, b: Date) { return 5; } // Helper
