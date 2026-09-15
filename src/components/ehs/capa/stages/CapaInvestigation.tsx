'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { EhsObservation } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useEhs } from '@/contexts/ehs-provider';
import { Button } from '@/components/ui/button';

export default function CapaInvestigation({ observation, isLocked }: { observation: EhsObservation, isLocked: boolean }) {
    const sData = observation.stages['Investigation'];
    const { actionStage } = useEhs();

    return (
        <div className="space-y-10">
            {/* structured RCA Card */}
            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-10">
                <CardContent className="p-0 space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                        <FieldItem label="Who was involved?" value={sData?.data?.who} placeholder="List personnel, contractors, or departments..." isLocked={isLocked} />
                        <FieldItem label="Where did it happen?" value={sData?.data?.where} placeholder="Specific deck, unit, workshop or vessel area..." isLocked={isLocked} />
                        <FieldItem label="When did it happen?" value={sData?.data?.when} placeholder="Date, shift, time of day..." isLocked={isLocked} />
                        <FieldItem label="How did it happen?" value={sData?.data?.how} placeholder="Describe the sequence of actions..." isLocked={isLocked} />
                    </div>

                    <Separator label="Root Cause Analysis" />

                    <div className="space-y-8">
                         <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Immediate Cause</Label>
                            <Textarea 
                                disabled={isLocked}
                                placeholder="What was the direct cause? (e.g. Failure to wear PPE, Defective tool)"
                                className="min-h-[80px] rounded-3xl p-6 font-bold border-2 focus-visible:ring-blue-100"
                                defaultValue={sData?.data?.immediateCause}
                            />
                        </div>

                        <div className="space-y-6">
                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">5-Whys Methodology</Label>
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="flex gap-4">
                                    <div className="w-10 h-10 shrink-0 rounded-2xl bg-slate-900 text-white font-black flex items-center justify-center text-xs shadow-lg">{i}</div>
                                    <Input 
                                        disabled={isLocked}
                                        placeholder={`Why ${i}? (Identify the cause of step ${i-1 || 'the finding'})`}
                                        className="h-10 rounded-2xl font-bold border-2"
                                        defaultValue={sData?.data?.[`why${i}`]}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {!isLocked && (
                <div className="flex justify-end pt-6">
                    <Button className="h-14 px-12 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all" onClick={() => actionStage(observation.id, 'Investigation', { submitted: true })}>
                        Submit Investigation Data
                    </Button>
                </div>
            )}
        </div>
    );
}

function FieldItem({ label, value, placeholder, isLocked }: { label: string, value: any, placeholder: string, isLocked: boolean }) {
    return (
        <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{label}</Label>
            <Input 
                disabled={isLocked}
                placeholder={placeholder}
                defaultValue={value}
                className="h-12 rounded-2xl font-bold border-2 focus-visible:ring-blue-100"
            />
        </div>
    );
}

function Separator({ label }: { label: string }) {
    return (
        <div className="relative flex items-center py-4">
            <div className="flex-grow border-t border-slate-100"></div>
            <span className="flex-shrink mx-4 text-[9px] font-black uppercase tracking-[0.4em] text-slate-300">{label}</span>
            <div className="flex-grow border-t border-slate-100"></div>
        </div>
    );
}