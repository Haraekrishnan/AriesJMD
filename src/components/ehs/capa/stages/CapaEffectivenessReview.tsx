
'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { EhsObservation } from '@/lib/types';
import { useEhs } from '@/contexts/ehs-provider';
import { Button } from '@/components/ui/button';
import { ThumbsUp, AlertCircle, ShieldCheck } from 'lucide-react';

export default function CapaEffectivenessReview({ observation, isLocked }: { observation: EhsObservation, isLocked: boolean }) {
    const sData = observation.stages['Effectiveness Review'];
    const { actionStage, reviewStage } = useEhs();

    const isSupervisor = ['Admin', 'Senior Safety Supervisor'].includes(observation.stages[observation.currentStage]?.assigneeId || '');

    return (
        <div className="space-y-8">
            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-10">
                <CardContent className="p-0 space-y-10">
                    <div className="space-y-6">
                        <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 shadow-inner">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Original Root Cause Context</p>
                            <p className="text-sm font-bold text-slate-700 leading-relaxed uppercase">
                                {observation.stages['Investigation']?.data?.immediateCause || 'Root cause context pending investigation completion.'}
                            </p>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Official Effectiveness Determination</Label>
                            <Select disabled={isLocked}>
                                <SelectTrigger className="h-14 rounded-2xl font-black uppercase text-xs border-2">
                                    <SelectValue placeholder="Was the action effective?" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Effective">Highly Effective (Verified Milestone)</SelectItem>
                                    <SelectItem value="Partially">Partially Effective (Rework Recommended)</SelectItem>
                                    <SelectItem value="Ineffective">Not Effective (Critical Failure)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Technical Findings & Validation Notes</Label>
                            <Textarea 
                                disabled={isLocked}
                                placeholder="Describe the current site condition after implementation..."
                                className="min-h-[120px] rounded-3xl p-6 font-bold border-2 focus-visible:ring-blue-100"
                                defaultValue={sData?.data?.findings}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {!isLocked && (
                <div className="flex justify-end gap-4">
                    <Button variant="outline" className="h-14 px-8 border-rose-200 text-rose-600 font-black uppercase text-[10px] tracking-widest rounded-2xl" onClick={() => reviewStage(observation.id, 'Effectiveness Review', 'Returned', 'Action found ineffective.')}>
                        Reject & Return
                    </Button>
                    <Button className="h-14 px-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all" onClick={() => reviewStage(observation.id, 'Effectiveness Review', 'Completed', 'Action verified as effective.')}>
                        Approve & Proceed
                    </Button>
                </div>
            )}
        </div>
    );
}
