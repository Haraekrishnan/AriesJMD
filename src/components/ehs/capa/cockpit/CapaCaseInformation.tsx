'use client';

import React from 'react';
import { 
    Info,
    Activity,
    ShieldCheck,
    CheckCircle2,
    History,
    ChevronDown,
    Target
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
        <div className="flex flex-col h-full bg-white divide-y-2 divide-slate-100 overflow-hidden text-left">
            {/* 1. CASE INFORMATION */}
            <div className="p-8 space-y-8">
                <h4 className="text-[12px] font-black uppercase tracking-[0.3em] text-[#2563EB] flex items-center gap-4">
                    <Info className="h-5 w-5" /> CASE INFORMATION
                </h4>
                <div className="space-y-5">
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
            <div className="p-8 space-y-8 bg-slate-50/50">
                <h4 className="text-[12px] font-black uppercase tracking-[0.3em] text-[#2563EB] flex items-center gap-4">
                    <Activity className="h-5 w-5" /> GOVERNANCE HEALTH
                </h4>
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="h-3 w-3 rounded-none bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]" />
                        <div className="flex flex-col">
                            <span className="text-[12px] font-black text-slate-900 uppercase tracking-tight">System Health Optimal</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Lifecycle operations prioritized.</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 border-2 border-slate-900 bg-white divide-x-2 divide-slate-900 rounded-none overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <MetricBox label="Days" value="0D" />
                        <MetricBox label="Target" value="TBD" />
                        <MetricBox label="Rework" value="0" />
                    </div>
                </div>
            </div>

            {/* 3. STAGE GUIDANCE */}
            <div className="flex-1 p-8 space-y-8">
                <h4 className="text-[12px] font-black uppercase tracking-[0.3em] text-[#2563EB] flex items-center gap-4">
                    <History className="h-5 w-5" /> STAGE GUIDANCE
                </h4>
                <div className="p-6 rounded-none bg-blue-50/50 border-2 border-blue-100 space-y-6">
                    <div className="flex items-start gap-4">
                        <div className="h-8 w-8 rounded-none bg-blue-600 flex items-center justify-center shrink-0 shadow-md">
                            <Info className="h-4 w-4 text-white" />
                        </div>
                        <div className="space-y-2">
                            <p className="text-[12px] font-black text-blue-700 uppercase leading-none tracking-tight">Perform a technical investigation</p>
                            <p className="text-[10px] font-bold text-blue-600/80 leading-relaxed uppercase">Determine the sequence of events and identify the underlying systemic root cause.</p>
                        </div>
                    </div>
                    
                    <div className="space-y-3 pt-2">
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
        <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest">
            <span className="text-slate-400">{label}</span>
            {isRisk ? (
                <Badge className="bg-amber-500 text-white border-none font-black px-2 h-5 text-[9px] rounded-none shadow-sm">{value?.toUpperCase() || 'MEDIUM'}</Badge>
            ) : (
                <span className={cn(isBlue ? "text-[#2563EB]" : "text-slate-900")}>{value || '—'}</span>
            )}
        </div>
    );
}

function MetricBox({ label, value }: { label: string, value: string }) {
    return (
        <div className="p-4 text-center bg-white hover:bg-slate-50 transition-colors">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">{label}</p>
            <p className="text-base font-black text-slate-900 tracking-tighter">{value}</p>
        </div>
    );
}

function GuidanceCheck({ label, checked }: { label: string, checked?: boolean }) {
    return (
        <div className="flex items-center gap-4">
            <div className={cn(
                "h-5 w-5 rounded-none flex items-center justify-center border-2 transition-all",
                checked ? "bg-blue-600 border-blue-600 shadow-sm" : "bg-white border-slate-200"
            )}>
                {checked && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
            </div>
            <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight leading-none">{label}</span>
        </div>
    );
}

