
'use client';

import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { EhsObservation, CapaStage } from '@/lib/types';

const STAGES: CapaStage[] = ['Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference'];

export default function CapaPipelineSummary({ observations }: { observations: EhsObservation[] }) {
    const stageData = useMemo(() => {
        return STAGES.map(stage => {
            const count = observations.filter(o => o.currentStage === stage && o.status !== 'Closed').length;
            const totalActive = observations.filter(o => o.status !== 'Closed').length || 1;
            const percentage = (count / totalActive) * 100;
            return { stage, count, percentage };
        });
    }, [observations]);

    return (
        <Card className="bg-slate-900 text-white rounded-[2rem] border-none shadow-2xl overflow-hidden">
            <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Live Case Pipeline Analysis</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
                    {stageData.map((data, i) => (
                        <div key={i} className="space-y-4">
                            <div className="flex justify-between items-end">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 line-clamp-1">{data.stage}</p>
                                <span className="text-sm font-black text-emerald-400">{data.count}</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-emerald-500 transition-all duration-1000" 
                                    style={{ width: `${Math.max(5, data.percentage)}%` }} 
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
