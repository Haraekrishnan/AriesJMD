
'use client';

import React, { useMemo } from 'react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { cn } from '@/lib/utils';

const STAGES: CapaStage[] = ['Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'];

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
        <div className="bg-white/50 backdrop-blur-sm rounded-[2rem] border border-slate-100 p-8 shadow-inner">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
                {stageData.map((data, i) => (
                    <div key={i} className="space-y-4">
                        <div className="flex justify-between items-end">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 line-clamp-1">{data.stage}</p>
                            <span className="text-xs font-black text-slate-900">{data.count} cases</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner">
                            <div 
                                className={cn(
                                    "h-full transition-all duration-1000",
                                    i < 3 ? "bg-emerald-500" : "bg-blue-500"
                                )}
                                style={{ width: `${Math.max(5, data.percentage)}%` }} 
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
