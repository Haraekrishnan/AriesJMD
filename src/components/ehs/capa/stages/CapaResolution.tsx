'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { EhsObservation } from '@/lib/types';
import { useEhs } from '@/contexts/ehs-provider';
import { Button } from '@/components/ui/button';
import { Info, ShieldCheck, Zap } from 'lucide-react';

export default function CapaResolution({ observation, isLocked }: { observation: EhsObservation, isLocked: boolean }) {
    const sData = observation.stages['Resolution'];
    const rcaData = observation.stages['Investigation']?.data;
    const { actionStage } = useEhs();

    return (
        <div className="space-y-12">
            {/* Investigation Recap */}
            <div className="p-8 rounded-[2rem] bg-[#F1F5F9] border-2 border-slate-200 border-dashed">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-4 flex items-center gap-2">
                    <ShieldCheck className="h-3 w-3" /> Root Cause Evidence
                </p>
                <div className="space-y-4">
                    <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase">Systemic Failure (W5):</span>
                        <p className="text-sm font-bold text-slate-700 uppercase">{rcaData?.why5 || 'Technical investigation pending completion.'}</p>
                    </div>
                </div>
            </div>

            <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white p-10 border-t-8 border-t-blue-600">
                <CardContent className="p-0 space-y-10">
                    <div className="space-y-6">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                            <Zap className="h-4 w-4 text-blue-600" /> Immediate Containment Strategy
                        </Label>
                        <Textarea 
                            disabled={isLocked}
                            placeholder="What actions were authorized immediately to control the discovery? (e.g. Area isolation, Stop work order issued, Equipment tagged out)"
                            className="min-h-[220px] rounded-[2rem] p-8 font-bold border-2 focus-visible:ring-blue-100 bg-slate-50 border-slate-100 shadow-inner text-lg leading-relaxed"
                            defaultValue={sData?.data?.action}
                        />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                        <div className="p-6 rounded-2xl bg-blue-50/50 border border-blue-100">
                            <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2">Responsibility</p>
                            <p className="text-xs font-bold text-slate-700 uppercase">Site Management / Area Owner</p>
                        </div>
                        <div className="p-6 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-2">Validation Required</p>
                            <p className="text-xs font-bold text-slate-700 uppercase">Senior Safety Official Review</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {!isLocked && (
                <div className="flex justify-end pt-6">
                    <Button 
                        className="h-16 px-16 bg-[#2563EB] hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-2xl shadow-blue-500/20 active:scale-95 transition-all" 
                        onClick={() => actionStage(observation.id, 'Resolution', { submitted: true })}
                    >
                        Submit Containment Logs
                    </Button>
                </div>
            )}
        </div>
    );
}

