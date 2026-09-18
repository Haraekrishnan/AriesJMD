'use client';

import React from 'react';
import { 
    Info,
    Activity,
    ShieldCheck,
    CheckCircle2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import type { EhsObservation } from '@/lib/types';
import { format, parseISO } from 'date-fns';

export default function CapaCaseInformation({ observation }: { observation: EhsObservation }) {
    const { users } = useAuth();
    const { projects } = useGeneral();

    const project = projects.find(p => p.id === observation.projectId);
    const reporter = users.find(u => u.id === observation.reporterId);
    const sData = observation.stages[observation.currentStage];
    const currentOwner = users.find(u => u.id === sData?.assigneeId);

    return (
        <div className="flex flex-col h-full bg-white text-left divide-y">
            {/* 1. CASE INFORMATION */}
            <div className="p-6 space-y-4">
                <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900 flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-600" /> CASE INFORMATION
                </h4>
                <div className="space-y-4">
                    <MetaRow label="Category" value={observation.category} isBlue />
                    <MetaRow label="Risk Level" value={observation.severity} isRisk />
                    <MetaRow label="Operational Site" value={project?.name} isBlack />
                    <MetaRow label="Area" value={observation.location || '—'} />
                    <MetaRow label="Reported By" value={reporter?.name} isBlack />
                    <MetaRow label="Phase Owner" value={currentOwner?.name} isBlue />
                    <MetaRow label="Started On" value={format(parseISO(observation.createdAt), 'dd MMMM yyyy')} />
                    <MetaRow label="Age" value="1 Days" isBlack />
                    <MetaRow label="Target Closure" value="—" />
                </div>
            </div>

            {/* 2. GOVERNANCE HEALTH */}
            <div className="p-6 space-y-4">
                <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-600" /> GOVERNANCE HEALTH
                </h4>
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <div className="leading-tight">
                        <p className="text-xs font-black text-slate-900 uppercase">System Health Optimal</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Activities are within expected timeframe.</p>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <MetricBox label="Days" value="1D" />
                    <MetricBox label="Target" value="TBD" />
                    <MetricBox label="Rework" value="0" />
                </div>
            </div>

            {/* 3. STAGE GUIDANCE */}
            <div className="p-6 space-y-4">
                <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-600" /> STAGE GUIDANCE
                </h4>
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3">
                    <div className="h-5 w-5 bg-blue-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-white font-black text-[9px]">i</span>
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-blue-900 uppercase leading-snug">Perform a technical investigation</p>
                        <p className="text-[9px] font-bold text-blue-700/70 leading-relaxed mt-1 uppercase tracking-tight">Determine what happened, why it happened, and identify the underlying root cause.</p>
                    </div>
                </div>
                <div className="space-y-2 pt-2">
                    {['Gather factual information', 'Identify all possible causes', 'Perform 5-Why analysis', 'Collect evidence and interviews', 'Determine systemic root cause'].map((task, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="h-4 w-4 rounded-full border-2 border-blue-600 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="h-3 w-3 text-blue-600" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">{task}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function MetaRow({ label, value, isBlue, isRisk, isBlack }: any) {
    return (
        <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-tight">
            <span className="text-slate-400">{label}</span>
            {isRisk ? (
                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-none font-black px-2 h-4 text-[8px]">Medium</Badge>
            ) : (
                <span className={cn(
                    isBlue ? "text-blue-600 font-black" : isBlack ? "text-slate-900 font-black" : "text-slate-600 font-bold"
                )}>{value || '—'}</span>
            )}
        </div>
    );
}

function MetricBox({ label, value }: { label: string, value: string }) {
    return (
        <div className="bg-slate-50 border rounded-lg p-3 text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-base font-black text-slate-900">{value}</p>
        </div>
    );
}
