'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { EhsObservation } from '@/lib/types';
import { useEhs } from '@/contexts/ehs-provider';
import { Button } from '@/components/ui/button';
import { BookMarked, FilePlus, Link as LinkIcon } from 'lucide-react';

export default function CapaReference({ observation, isLocked }: { observation: EhsObservation, isLocked: boolean }) {
    const sData = observation.stages['Reference'];
    const { reviewStage } = useEhs();

    return (
        <div className="space-y-12">
            <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white p-12 border-t-8 border-t-blue-600">
                <CardContent className="p-0 space-y-12">
                    <div className="flex items-center gap-4 border-b border-slate-50 pb-8">
                        <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                            <BookMarked className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <h4 className="text-xl font-black uppercase tracking-tight">Technical Archival & Dossier Link</h4>
                            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">Safety Lifecycle Milestone 06</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1 flex items-center gap-2">
                                <LinkIcon className="h-3 w-3" /> Work Order / PO Reference
                            </Label>
                            <Input disabled={isLocked} placeholder="e.g. WO-2026-442-A" className="h-14 rounded-2xl font-bold border-2 border-slate-100 bg-slate-50 px-6" defaultValue={sData?.data?.workOrder} />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1 flex items-center gap-2">
                                <FilePlus className="h-3 w-3" /> Related Incident Dossier
                            </Label>
                            <Input disabled={isLocked} placeholder="e.g. INC-SEZ-012" className="h-14 rounded-2xl font-bold border-2 border-slate-100 bg-slate-50 px-6" defaultValue={sData?.data?.incidentRef} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Knowledge Archiving & Lessons Learned</Label>
                        <Textarea 
                            disabled={isLocked}
                            placeholder="Add final metadata or links to master logs for future organizational audit..."
                            className="min-h-[160px] rounded-[2rem] p-8 font-bold border-2 border-slate-100 bg-white focus-visible:ring-blue-100 shadow-inner leading-relaxed"
                            defaultValue={sData?.data?.notes}
                        />
                    </div>
                </CardContent>
            </Card>

            {!isLocked && (
                <div className="flex justify-end pt-6">
                    <Button 
                        className="h-16 px-16 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-2xl active:scale-95 transition-all" 
                        onClick={() => reviewStage(observation.id, 'Reference', 'Completed', 'Technical reference finalized.')}
                    >
                        Archive Technical Metadata
                    </Button>
                </div>
            )}
        </div>
    );
}

