'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { EhsObservation } from '@/lib/types';
import { useEhs } from '@/contexts/ehs-provider';
import { Button } from '@/components/ui/button';
import { ListChecks, Calendar, ShieldCheck, Zap } from 'lucide-react';

export default function CapaImplementation({ observation, isLocked }: { observation: EhsObservation, isLocked: boolean }) {
    const sData = observation.stages['Implementation'];
    const { actionStage } = useEhs();

    return (
        <div className="space-y-12">
            <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white p-10 border-t-8 border-t-blue-600">
                <CardContent className="p-0 space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-emerald-600" /> Corrective Action Plan (CA)
                            </Label>
                            <Textarea 
                                disabled={isLocked}
                                placeholder="Technical steps taken to eliminate the root cause locally..."
                                className="min-h-[160px] rounded-[2rem] p-6 font-bold border-2 border-slate-100 bg-slate-50 focus-visible:ring-blue-100 shadow-inner"
                                defaultValue={sData?.data?.corrective}
                            />
                        </div>
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                                <Zap className="h-4 w-4 text-blue-600" /> Preventive Action Plan (PA)
                            </Label>
                            <Textarea 
                                disabled={isLocked}
                                placeholder="Organizational changes to prevent recurrence globally..."
                                className="min-h-[160px] rounded-[2rem] p-6 font-bold border-2 border-slate-100 bg-slate-50 focus-visible:ring-blue-100 shadow-inner"
                                defaultValue={sData?.data?.preventive}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t border-slate-50">
                        <div className="space-y-3">
                             <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 flex items-center gap-2">
                                <Calendar className="h-3 w-3" /> Execution Deadline
                             </Label>
                             <Input type="date" disabled={isLocked} className="h-12 rounded-xl font-bold border-2 border-slate-100 px-6" defaultValue={sData?.data?.targetDate} />
                        </div>
                        <div className="space-y-3">
                             <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 flex items-center gap-2">
                                <ListChecks className="h-3 w-3" /> Implementation Status
                             </Label>
                             <div className="h-12 rounded-xl border-2 border-slate-100 flex items-center px-6 text-xs font-black uppercase tracking-tight text-slate-800">
                                {isLocked ? 'MILESTONE ACHIEVED' : 'ACTIVE IN FIELD'}
                             </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {!isLocked && (
                <div className="flex justify-end pt-6">
                    <Button 
                        className="h-16 px-16 bg-[#2563EB] hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-2xl shadow-blue-500/20 active:scale-95 transition-all" 
                        onClick={() => actionStage(observation.id, 'Implementation', { submitted: true })}
                    >
                        Submit Technical Implementation
                    </Button>
                </div>
            )}
        </div>
    );
}

