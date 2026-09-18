
'use client';

import React from 'react';
import { 
    Info,
    Activity,
    ShieldCheck,
    CheckCircle2,
    History,
    ChevronDown
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import type { EhsObservation } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export default function CapaCaseInformation({ observation }: { observation: EhsObservation }) {
    const { users } = useAuth();
    const { projects } = useGeneral();

    const project = projects.find(p => p.id === observation.projectId);
    const reporter = users.find(u => u.id === observation.reporterId);
    const owner = users.find(u => u.id === observation.stages[observation.currentStage]?.assigneeId);

    return (
        <div className="flex flex-col h-full bg-white divide-y divide-slate-100 overflow-hidden">
            {/* 1. CASE INFORMATION */}
            <div className="p-6 space-y-6">
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-700 flex items-center gap-3">
                    <Info className="h-4 w-4" /> CASE INFORMATION
                </h4>
                <div className="space-y-4">
                    <MetaRow label="Category" value={observation.category} />
                    <MetaRow label="Risk Index" value={observation.severity} isRisk />
                    <MetaRow label="Site" value={project?.name} />
                    <MetaRow label="Area" value={observation.location || '—'} />
                    <MetaRow label="Reporter" value={reporter?.name} />
                    <MetaRow label="Owner" value={owner?.name} isBlue />
                    <MetaRow label="Started" value={format(parseISO(observation.createdAt), 'dd MMMM yyyy')} />
                    <MetaRow label="Age" value="0 Days" />
                    <MetaRow label="Target Closure" value="—" />
                </div>
            </div>

            {/* 2. GOVERNANCE HEALTH */}
            <div className="p-6 space-y-6 bg-slate-50/50">
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-700 flex items-center gap-3">
                    <Activity className="h-4 w-4" /> GOVERNANCE HEALTH
                </h4>
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <div className="flex flex-col">
                            <span className="text-[11px] font-black text-slate-900 uppercase">System Health Optimal</span>
                            <span className="text-[9px] font-medium text-slate-500 uppercase tracking-tight">Activities are within expected timeframe.</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 border border-slate-200 bg-white divide-x divide-slate-100 rounded-lg overflow-hidden shadow-sm">
                        <MetricBox label="Days" value="0D" />
                        <MetricBox label="Target" value="TBD" />
                        <MetricBox label="Rework" value="0" />
                    </div>
                </div>
            </div>

            {/* 3. STAGE GUIDANCE */}
            <div className="flex-1 p-6 space-y-6">
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-700 flex items-center gap-3">
                    <History className="h-4 w-4" /> STAGE GUIDANCE
                </h4>
                <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                            <Info className="h-3 w-3 text-white" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[11px] font-black text-blue-700 uppercase leading-none">Perform a technical investigation</p>
                            <p className="text-[9px] font-medium text-blue-600/70 leading-tight">Determine what happened, why it happened, and identify the underlying root cause.</p>
                        </div>
                    </div>
                    
                    <div className="space-y-2 pt-2">
                        <GuidanceCheck label="Gather factual information" checked />
                        <GuidanceCheck label="Identify all possible causes" checked />
                        <GuidanceCheck label="Perform 5-Why analysis" checked />
                        <GuidanceCheck label="Collect evidence and interviews" checked />
                        <GuidanceCheck label="Determine systemic root cause" checked />
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetaRow({ label, value, isRisk, isBlue }: any) {
    return (
        <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-tight">
            <span className="text-slate-400">{label}</span>
            {isRisk ? (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 h-5 px-2 text-[9px] rounded-md font-black shadow-none">{value?.toUpperCase() || 'MEDIUM'}</Badge>
            ) : (
                <span className={cn(isBlue ? "text-blue-600" : "text-slate-900")}>{value || '—'}</span>
            )}
        </div>
    );
}

function MetricBox({ label, value }: { label: string, value: string }) {
    return (
        <div className="p-3 text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-sm font-black text-slate-900 tracking-tighter">{value}</p>
        </div>
    );
}

function GuidanceCheck({ label, checked }: { label: string, checked?: boolean }) {
    return (
        <div className="flex items-center gap-3">
            <div className={cn(
                "h-4 w-4 rounded-full flex items-center justify-center border",
                checked ? "bg-blue-600 border-blue-600" : "bg-white border-slate-200"
            )}>
                {checked && <CheckCircle2 className="h-3 w-3 text-white" />}
            </div>
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight leading-none">{label}</span>
        </div>
    );
}
