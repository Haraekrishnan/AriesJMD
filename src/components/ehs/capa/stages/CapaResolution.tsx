
'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { EhsObservation } from '@/lib/types';
import { useEhs } from '@/contexts/ehs-provider';
import { Button } from '@/components/ui/button';

export default function CapaResolution({ observation, isLocked }: { observation: EhsObservation, isLocked: boolean }) {
    const sData = observation.stages['Resolution'];
    const { actionStage } = useEhs();

    return (
        <div className="space-y-8">
            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-10">
                <CardContent className="p-0 space-y-8">
                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Immediate Correction</Label>
                        <Textarea 
                            disabled={isLocked}
                            placeholder="What actions were taken immediately to contain or correct the discovery?"
                            className="min-h-[150px] rounded-3xl p-6 font-bold border-2 focus-visible:ring-blue-100"
                            defaultValue={sData?.data?.action}
                        />
                    </div>
                </CardContent>
            </Card>

            {!isLocked && (
                <div className="flex justify-end">
                    <Button className="h-14 px-12 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all" onClick={() => actionStage(observation.id, 'Resolution', { submitted: true })}>
                        Submit Resolution
                    </Button>
                </div>
            )}
        </div>
    );
}
