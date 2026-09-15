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
import { Info, User, Clock, MapPin, ShieldAlert, ArrowDown } from 'lucide-react';

export default function CapaInvestigation({ observation, isLocked }: { observation: EhsObservation, isLocked: boolean }) {
    const sData = observation.stages['Investigation'];
    const { actionStage } = useEhs();

    return (
        <div className="space-y-12">
            {/* structured RCA Workbench */}
            <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white p-10 overflow-hidden relative border-t-8 border-t-slate-900">
                <CardContent className="p-0 space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                        <FieldItem label="Who was involved?" value={sData?.data?.who} placeholder="Personnel, contractors, or departments..." isLocked={isLocked} icon={User} />
                        <FieldItem label="Where exactly did it happen?" value={sData?.data?.where} placeholder="Deck, unit, workshop or specific coordinate..." isLocked={isLocked} icon={MapPin} />
                        <FieldItem label="When did the discovery occur?" value={sData?.data?.when} placeholder="Date, shift, time of day..." isLocked={isLocked} icon={Clock} />
                        <FieldItem label="Sequence of events (How)?" value={sData?.data?.how} placeholder="Describe the chronological sequence..." isLocked={isLocked} icon={Info} />
                    </div>

                    <div className="relative py-8">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t-2 border-dashed border-slate-100"></div>
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-white px-8 text-[10px] font-black uppercase tracking-[0.5em] text-slate-300">Root Cause Analysis Workbench</span>
                        </div>
                    </div>

                    <div className="space-y-10">
                         <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                                <ShieldAlert className="h-3.5 w-3.5 text-rose-500" /> Immediate Cause (Direct Finding)
                            </Label>
                            <Textarea 
                                disabled={isLocked}
                                placeholder="State the direct reason for the unsafe act/condition (e.g. Failure to wear harness, Defective grinding tool)"
                                className="min-h-[100px] rounded-3xl p-6 font-bold border-2 focus-visible:ring-blue-100 bg-slate-50 border-slate-100 shadow-inner"
                                defaultValue={sData?.data?.immediateCause}
                            />
                        </div>

                        <div className="space-y-8 pt-4">
                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center justify-between">
                                5-WHYS SYSTEMIC METHODOLOGY
                                <span className="text-[9px] font-bold text-slate-300 normal-case italic">Keep asking 'Why' until a systemic failure is identified</span>
                            </Label>
                            
                            <div className="space-y-4">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="flex gap-6 animate-in slide-in-from-left duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                                        <div className="flex flex-col items-center shrink-0">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white font-black flex items-center justify-center text-sm shadow-xl">W{i}</div>
                                            {i < 5 && <ArrowDown className="h-4 w-4 text-slate-200 my-1" />}
                                        </div>
                                        <div className="flex-1">
                                            <Input 
                                                disabled={isLocked}
                                                placeholder={i === 1 ? "Why did the immediate cause occur?" : `Why did the cause in W${i-1} happen?`}
                                                className="h-12 rounded-2xl font-bold border-2 border-slate-100 focus:border-blue-500 focus-visible:ring-blue-50 transition-all px-6"
                                                defaultValue={sData?.data?.[`why${i}`]}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {!isLocked && (
                <div className="flex justify-end pt-6">
                    <Button 
                        className="h-16 px-16 bg-[#2563EB] hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-2xl shadow-blue-500/20 active:scale-95 transition-all" 
                        onClick={() => actionStage(observation.id, 'Investigation', { submitted: true })}
                    >
                        Authorize & Submit Investigation
                    </Button>
                </div>
            )}
        </div>
    );
}

function FieldItem({ label, value, placeholder, isLocked, icon: Icon }: { label: string, value: any, placeholder: string, isLocked: boolean, icon: any }) {
    return (
        <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                <Icon className="h-3 w-3" /> {label}
            </Label>
            <Input 
                disabled={isLocked}
                placeholder={placeholder}
                defaultValue={value}
                className="h-14 rounded-2xl font-bold border-2 border-slate-100 focus:border-blue-500 focus-visible:ring-blue-50 transition-all px-6"
            />
        </div>
    );
}
