'use client';

import React from 'react';
import { 
    Info, 
    Activity, 
    Zap,
    CheckCircle2,
    Clock,
    FileText,
    History
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';

export default function CapaRightSidebar({ observation, activeStage }: { observation: EhsObservation, activeStage: CapaStage }) {
    const { users } = useAuth();
    const { projects } = useGeneral();
    
    const project = projects.find(p => p.id === observation.projectId);
    const reporter = users.find(u => u.id === observation.reporterId);
    const sData = observation.stages[observation.currentStage];
    const assignee = users.find(u => u.id === sData?.assigneeId);

    return (
        <div className="flex flex-col h-full bg-white divide-y divide-slate-100 text-left">
            {/* 1. CASE INFORMATION */}
            <div className="p-6 space-y-6">
                <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-600 flex items-center gap-3">
                    <Info className="h-4 w-4" /> CASE INFORMATION
                </h4>
                <div className="space-y-4">
                    <MetaRow label="Category" value={observation.category} isBold />
                    <MetaRow label="Risk Level" value={observation.severity} isRisk />
                    <MetaRow label="Operational Site" value={project?.name} isBold />
                    <MetaRow label="Area" value={observation.location || '—'} />
                    <MetaRow label="Reported By" value={reporter?.name} />
                    <MetaRow label="Phase Owner" value={assignee?.name} isBlue />
                    <MetaRow label="Started On" value={format(parseISO(observation.createdAt), 'dd MMMM yyyy')} />
                    <MetaRow label="Age" value="1 Days" />
                    <MetaRow label="Target Closure" value="—" />
                </div>
            </div>

            {/* 2. GOVERNANCE HEALTH */}
            <div className="p-6 space-y-6 bg-slate-50/30">
                <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-600 flex items-center gap-3">
                    <Activity className="h-4 w-4" /> GOVERNANCE HEALTH
                </h4>
                
                <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    <div className="flex flex-col leading-tight">
                        <span className="text-[12px] font-black text-slate-800 uppercase tracking-tight">System Health Optimal</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Activities are within expected timeframe.</span>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <HealthMetric label="Days" value="1D" />
                    <HealthMetric label="Target" value="TBD" />
                    <HealthMetric label="Rework" value="0" />
                </div>
            </div>

            {/* 3. STAGE GUIDANCE */}
            <div className="p-6 space-y-6">
                <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-600 flex items-center gap-3">
                    <FileText className="h-4 w-4" /> STAGE GUIDANCE
                </h4>
                
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-4 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-md">
                        <Info className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-blue-700 uppercase tracking-tight mb-1">Perform a technical investigation</p>
                        <p className="text-[10px] font-bold text-blue-600/70 leading-relaxed uppercase">Determine what happened, why it happened, and identify the underlying root cause.</p>
                    </div>
                </div>

                <div className="space-y-3 pt-2">
                    <GuidanceItem label="Gather factual information" checked />
                    <GuidanceItem label="Identify all possible causes" checked />
                    <GuidanceItem label="Perform 5-Why analysis" checked />
                    <GuidanceItem label="Collect evidence and interviews" checked />
                    <GuidanceItem label="Determine systemic root cause" checked />
                </div>
            </div>
        </div>
    );
}

function MetaRow({ label, value, isRisk, isBlue, isBold }: any) {
    return (
        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
            <span className="text-slate-400 font-medium">{label}</span>
            {isRisk ? (
                <Badge className="bg-orange-400 text-white border-none font-black px-2 h-5 text-[9px] rounded-sm">{value || 'Medium'}</Badge>
            ) : (
                <span className={cn(
                    "text-right truncate max-w-[180px]",
                    isBlue ? "text-blue-600" : isBold ? "text-slate-900 font-black" : "text-slate-700"
                )}>{value || '—'}</span>
            )}
        </div>
    );
}

function HealthMetric({ label, value }: any) {
    return (
        <div className="p-3 bg-white border border-slate-100 rounded-xl text-center flex flex-col gap-1 shadow-sm">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
            <p className="text-base font-black text-slate-900 tracking-tighter">{value}</p>
        </div>
    );
}

function GuidanceItem({ label, checked }: any) {
    return (
        <div className="flex items-center gap-3">
            <div className={cn(
                "h-5 w-5 rounded-full flex items-center justify-center border-2 transition-all",
                checked ? "bg-blue-600 border-blue-600 shadow-sm" : "bg-white border-slate-200"
            )}>
                {checked && <CheckCircle2 className="h-3.5 w-3.5 text-white stroke-[3]" />}
            </div>
            <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight leading-none">{label}</span>
        </div>
    );
}
