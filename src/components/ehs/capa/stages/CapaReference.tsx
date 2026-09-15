
'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { EhsObservation } from '@/lib/types';
import { useEhs } from '@/contexts/ehs-provider';
import { Button } from '@/components/ui/button';
import { FilePlus } from 'lucide-react';

export default function CapaReference({ observation, isLocked }: { observation: EhsObservation, isLocked: boolean }) {
    const sData = observation.stages['Reference'];
    const { actionStage, reviewStage } = useEhs();

    return (
        <div className="space-y-8">
            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-10">
                <CardContent className="p-0 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Work Order / PO Ref.</Label>
                            <Input disabled={isLocked} className="h-12 rounded-2xl font-bold border-2" defaultValue={sData?.data?.workOrder} />
                        </div>
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Related Incident Report</Label>
                            <Input disabled={isLocked} className="h-12 rounded-2xl font-bold border-2" defaultValue={sData?.data?.incidentRef} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Technical Archiving Notes</Label>
                        <Textarea 
                            disabled={isLocked}
                            placeholder="Add links to master logs or related dossiers..."
                            className="min-h-[100px] rounded-3xl p-6 font-bold border-2 focus-visible:ring-blue-100"
                            defaultValue={sData?.data?.notes}
                        />
                    </div>
                </CardContent>
            </Card>

            {!isLocked && (
                <div className="flex justify-end">
                    <Button className="h-14 px-12 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl shadow-xl shadow-slate-900/20 active:scale-95 transition-all" onClick={() => reviewStage(observation.id, 'Reference', 'Completed', 'Archival completed.')}>
                        Finalize Technical Reference
                    </Button>
                </div>
            )}
        </div>
    );
}
