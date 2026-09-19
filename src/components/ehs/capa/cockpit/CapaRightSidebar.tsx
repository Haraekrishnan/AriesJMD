
'use client';

import React, { useMemo } from 'react';
import { 
    Info, 
    Activity, 
    Clock,
    FileText,
    History,
    Users
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function CapaRightSidebar({ observation, activeStage }: { observation: EhsObservation, activeStage: CapaStage }) {
    const { users } = useAuth();
    const { projects } = useGeneral();
    
    const project = projects.find(p => p.id === observation.projectId);
    const reporter = users.find(u => u.id === observation.reporterId);
    const sData = observation.stages[observation.currentStage];
    const assignee = users.find(u => u.id === sData?.assigneeId);

    const activities = useMemo(() => {
        if (!observation.activities) return [];
        return Object.values(observation.activities).sort((a, b) => 
            parseISO(b.date).getTime() - parseISO(a.date).getTime()
        );
    }, [observation]);

    return (
        <div className="flex flex-col h-full bg-white divide-y divide-slate-100 text-left">
            {/* 1. CASE INFORMATION */}
            <div className="p-8 space-y-6">
                <h4 className="text-[12px] font-black uppercase tracking-[0.3em] text-blue-600 flex items-center gap-3">
                    <Info className="h-4 w-4" /> CASE INFORMATION
                </h4>
                <div className="space-y-4">
                    <MetaRow label="Category" value={observation.category} isBold />
                    <MetaRow label="Risk Level" value={observation.severity} isRisk />
                    <MetaRow label="Operational Site" value={project?.name} isBold />
                    <MetaRow label="Area" value={observation.location || '—'} />
                    <MetaRow label="Reported By" value={reporter?.name} />
                    <MetaRow label="Phase Assignee" value={assignee?.name} isBlue />
                    <MetaRow label="Started On" value={format(parseISO(observation.createdAt), 'dd MMMM yyyy')} />
                    <MetaRow label="Age" value="1 Days" />
                    <MetaRow label="Target Closure" value="—" />
                </div>
            </div>

            {/* 2. GOVERNANCE HEALTH */}
            <div className="p-8 space-y-6 bg-slate-50/30">
                <h4 className="text-[12px] font-black uppercase tracking-[0.3em] text-blue-600 flex items-center gap-3">
                    <Activity className="h-4 w-4" /> GOVERNANCE HEALTH
                </h4>
                
                <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    <div className="flex flex-col leading-tight">
                        <span className="text-[12px] font-black text-slate-800 uppercase tracking-tight">System Health Optimal</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Compliance thresholds validated.</span>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <HealthMetric label="Days" value="1D" />
                    <HealthMetric label="Target" value="TBD" />
                    <HealthMetric label="Rework" value="0" />
                </div>
            </div>

            {/* 3. ACTIVITY LOG */}
            <div className="p-8 space-y-6 flex-1 flex flex-col min-h-0">
                <h4 className="text-[12px] font-black uppercase tracking-[0.3em] text-blue-600 flex items-center gap-3">
                    <History className="h-4 w-4" /> ACTIVITY LOG
                </h4>
                
                <ScrollArea className="flex-1 -mx-2 px-2">
                    <div className="space-y-6 pb-4">
                        {activities.length > 0 ? activities.map((act) => {
                            const actor = users.find(u => u.id === act.userId);
                            return (
                                <div key={act.id} className="relative pl-6 before:absolute before:left-0 before:top-1.5 before:w-2 before:h-2 before:bg-blue-600 before:rounded-full after:absolute after:left-[3px] after:top-4 after:bottom-[-24px] after:w-0.5 after:bg-slate-100 last:after:hidden">
                                    <p className="text-[11px] font-black text-slate-900 uppercase leading-snug tracking-tight">
                                        {act.action}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">{actor?.name}</span>
                                        <span className="text-[9px] text-slate-300 font-bold">•</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">
                                            {formatDistanceToNow(parseISO(act.date), { addSuffix: true })}
                                        </span>
                                    </div>
                                </div>
                            )
                        }) : (
                            <div className="py-20 text-center opacity-30">
                                <History className="h-8 w-8 mx-auto mb-2" />
                                <p className="text-[10px] font-black uppercase tracking-widest">No activities recorded</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}

function MetaRow({ label, value, isRisk, isBlue, isBold }: any) {
    return (
        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
            <span className="text-slate-400 font-medium">{label}</span>
            {isRisk ? (
                <Badge className="bg-orange-400 text-white border-none font-black px-2 h-5 text-[9px] rounded-sm shadow-sm">{value || 'Medium'}</Badge>
            ) : (
                <span className={cn(
                    "text-right truncate max-w-[180px]",
                    isBlue ? "text-blue-600 font-black" : isBold ? "text-slate-900 font-black" : "text-slate-700"
                )}>{value || '—'}</span>
            )}
        </div>
    );
}

function HealthMetric({ label, value }: any) {
    return (
        <div className="p-4 bg-white border border-slate-100 rounded-xl text-center flex flex-col gap-1 shadow-sm hover:shadow-md transition-all">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
            <p className="text-lg font-black text-slate-900 tracking-tighter">{value}</p>
        </div>
    );
}
