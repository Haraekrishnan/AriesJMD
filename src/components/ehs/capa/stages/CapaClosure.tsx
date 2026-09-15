'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { EhsObservation } from '@/lib/types';
import { useEhs } from '@/contexts/ehs-provider';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';

export default function CapaClosure({ observation, isLocked }: { observation: EhsObservation, isLocked: boolean }) {
    const { actionStage } = useEhs();

    const ageDays = differenceInDays(new Date(), parseISO(observation.createdAt)) || 0;

    return (
        <div className="space-y-12">
            <Card className="rounded-[3rem] border-none shadow-2xl bg-slate-900 text-white p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 bg-emerald-500/10 rounded-full blur-[80px]" />
                
                <CardContent className="p-0 space-y-12 relative z-10">
                    <div className="flex items-center gap-6">
                        <div className="p-5 bg-emerald-500 rounded-[1.75rem] shadow-2xl shadow-emerald-500/40 animate-in zoom-in duration-700">
                            <ShieldCheck className="h-10 w-10 text-white" />
                        </div>
                        <div>
                            <h4 className="text-3xl font-black uppercase tracking-tight">Final Authorization Sign-off</h4>
                            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-1">Lifecycle Completion Milestone achieved</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-10 py-10 border-y border-white/5">
                        <StatItem label="Case Total Age" value={`${ageDays} Days`} icon={Clock} />
                        <div className="space-y-1.5">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2"><Calendar className="h-2.5 w-2.5" /> Site Discovery</p>
                            <p className="text-base font-black text-white uppercase">{format(parseISO(observation.createdAt), 'dd MMM yy')}</p>
                        </div>
                        <StatItem label="Milestones Verified" value="6 of 7" icon={CheckCircle2} />
                        <div className="space-y-1.5">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Lifecycle State</p>
                            <Badge className="bg-blue-500 font-black uppercase text-[10px] h-6 px-4">VALIDATED</Badge>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 flex items-center gap-2">
                             Final Organizational Narrative
                        </Label>
                        <Textarea 
                            disabled={isLocked}
                            placeholder="Provide final closing summary for the organizational master registry..."
                            className="min-h-[140px] rounded-[2rem] p-8 font-bold bg-white/5 border-white/10 text-white focus-visible:ring-emerald-500/20 text-lg leading-relaxed shadow-inner"
                        />
                    </div>
                </CardContent>
            </Card>

            {!isLocked && (
                <div className="flex justify-end pt-4">
                    <Button 
                        className="h-20 px-20 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-[0.3em] text-xs rounded-[2.5rem] shadow-2xl shadow-emerald-500/30 active:scale-95 transition-all ring-offset-4 ring-offset-[#F6F9FC] focus:ring-4 focus:ring-emerald-500/20" 
                        onClick={() => actionStage(observation.id, 'Closure', { final: true })}
                    >
                        AUTHORIZE CASE ARCHIVAL & CLOSURE
                    </Button>
                </div>
            )}
        </div>
    );
}

function StatItem({ label, value, icon: Icon }: { label: string, value: string, icon: any }) {
    return (
        <div className="space-y-1.5">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                <Icon className="h-2.5 w-2.5 text-slate-500" /> {label}
            </p>
            <p className="text-lg font-black text-white tracking-tight">{value}</p>
        </div>
    );
}

