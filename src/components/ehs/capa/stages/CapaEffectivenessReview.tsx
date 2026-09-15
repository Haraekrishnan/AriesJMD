'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { EhsObservation } from '@/lib/types';
import { useEhs } from '@/contexts/ehs-provider';
import { Button } from '@/components/ui/button';
import { ThumbsUp, AlertCircle, ShieldCheck, Target, MessageSquare } from 'lucide-react';

export default function CapaEffectivenessReview({ observation, isLocked }: { observation: EhsObservation, isLocked: boolean }) {
    const sData = observation.stages['Effectiveness Review'];
    const { reviewStage } = useEhs();

    return (
        <div className="space-y-12">
            <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white p-12 border-t-8 border-t-blue-600">
                <CardContent className="p-0 space-y-10">
                    <div className="space-y-8">
                        <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-200 shadow-inner">
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-3 flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4" /> Technical Context Recap
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase">Corrective Action Implemented:</span>
                                    <p className="text-sm font-bold text-slate-800 uppercase mt-1 leading-relaxed line-clamp-2">
                                        {observation.stages['Implementation']?.data?.corrective || 'Technical data pending.'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase">Original Root Cause (W5):</span>
                                    <p className="text-sm font-bold text-slate-800 uppercase mt-1 leading-relaxed line-clamp-2">
                                        {observation.stages['Investigation']?.data?.why5 || 'RCA pending.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2 ml-1">
                                <Target className="h-4 w-4 text-blue-600" /> Organizational Effectiveness Triage
                            </Label>
                            <Select disabled={isLocked}>
                                <SelectTrigger className="h-14 rounded-2xl font-black uppercase text-xs border-2 border-slate-100 shadow-sm bg-slate-50">
                                    <SelectValue placeholder="Perform official determination..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Effective">Highly Effective (Risk Controlled)</SelectItem>
                                    <SelectItem value="Partially">Partially Effective (Minor Rework Needed)</SelectItem>
                                    <SelectItem value="Ineffective">Ineffective (Risk Remains Active)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2 ml-1">
                                <MessageSquare className="h-4 w-4 text-blue-600" /> Validation Narrative & Field Findings
                            </Label>
                            <Textarea 
                                disabled={isLocked}
                                placeholder="Provide detailed field evidence or validation notes regarding the success of the corrective actions..."
                                className="min-h-[160px] rounded-[2rem] p-8 font-bold border-2 border-slate-100 bg-white focus-visible:ring-blue-100 shadow-sm leading-relaxed"
                                defaultValue={sData?.data?.findings}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {!isLocked && (
                <div className="flex justify-end gap-4 pt-4">
                    <Button 
                        variant="outline" 
                        className="h-16 px-10 border-rose-200 text-rose-600 font-black uppercase text-[11px] tracking-[0.2em] rounded-2xl hover:bg-rose-50"
                        onClick={() => reviewStage(observation.id, 'Effectiveness Review', 'Returned', 'Action found ineffective.')}
                    >
                        Invalidate & Return
                    </Button>
                    <Button 
                        className="h-16 px-16 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl shadow-2xl shadow-emerald-500/20 active:scale-95 transition-all"
                        onClick={() => reviewStage(observation.id, 'Effectiveness Review', 'Completed', 'Corrective action verified as effective.')}
                    >
                        Verify Effectiveness & Proceed
                    </Button>
                </div>
            )}
        </div>
    );
}

