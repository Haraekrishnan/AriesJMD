
'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { EhsObservation } from '@/lib/types';
import { useEhs } from '@/contexts/ehs-provider';
import { Button } from '@/components/ui/button';

export default function CapaImplementation({ observation, isLocked }: { observation: EhsObservation, isLocked: boolean }) {
    const sData = observation.stages['Implementation'];
    const { actionStage } = useEhs();

    return (
        <div className="space-y-8">
            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-10">
                <CardContent className="p-0 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Corrective Action Plan</Label>
                            <Textarea 
                                disabled={isLocked}
                                placeholder="Formal steps to eliminate the root cause..."
                                className="min-h-[120px] rounded-3xl p-6 font-bold border-2 focus-visible:ring-blue-100"
                                defaultValue={sData?.data?.corrective}
                            />
                        </div>
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Preventive Action Plan</Label>
                            <Textarea 
                                disabled={isLocked}
                                placeholder="Steps to prevent recurrence across other sites/units..."
                                className="min-h-[120px] rounded-3xl p-6 font-bold border-2 focus-visible:ring-blue-100"
                                defaultValue={sData?.data?.preventive}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
                        <div className="space-y-2">
                             <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Implementation Target</Label>
                             <Input type="date" disabled={isLocked} className="h-12 rounded-2xl font-bold border-2" defaultValue={sData?.data?.targetDate} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {!isLocked && (
                <div className="flex justify-end">
                    <Button className="h-14 px-12 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all" onClick={() => actionStage(observation.id, 'Implementation', { submitted: true })}>
                        Submit Implementation Plan
                    </Button>
                </div>
            )}
        </div>
    );
}
