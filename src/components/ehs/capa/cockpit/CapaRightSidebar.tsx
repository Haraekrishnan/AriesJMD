'use client';

import React from 'react';
import { 
    Info, 
    Activity, 
    ShieldCheck, 
    History,
    CheckCircle2,
    Target,
    Clock,
    ClipboardList,
    Users
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { EhsObservation } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';

export default function CapaRightSidebar({ observation }: { observation: EhsObservation }) {
    const { users } = useAuth();
    const { projects } = useGeneral();

    const project = projects.find(p => p.id === observation.projectId);
    const reporter = users.find(u => u.id === observation.reporterId);
    
    return (
        <div className="flex flex-col h-full bg-white divide-y divide-slate-100 text-left">
            {/* 1. CASE INFORMATION */}
            <div className="p-8 space-y-6">
                <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-blue-600 flex items-center gap-3">
                    <Info className="h-4 w-4" /> CASE INFORMATION
                </h4>
                <div className="space-y-4">
                    <MetaRow label="Category" value={observation.category} />
                    <MetaRow label="Risk Index" value={observation.severity} isRisk />
                    <MetaRow label="Site" value={project?.name || observation.projectId} />
                    <MetaRow label="Area" value={observation.location || 'SITE POSITION TBD'} />
                    <MetaRow label="Reporter" value={reporter?.name || 'OFFICIAL RECORD'} />
                    <MetaRow label="Initiated On" value={format(parseISO(observation.createdAt), 'dd MMM yyyy')} />
                    <MetaRow label="Days Open" value="0 Days" />
                </div>
            </div>

            {/* 2. GOVERNANCE HEALTH */}
            <div className="p-8 space-y-6 bg-slate-50/50">
                <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-blue-600 flex items-center gap-3">
                    <Activity className="h-4 w-4" /> GOVERNANCE HEALTH
                </h4>
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border shadow-sm border-emerald-100">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                    <div className="flex flex-col">
                        <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">SYSTEM ON TRACK</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">ALL ACTIVITIES WITHIN TIMEFRAME</span>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <HealthMetric label="Stage Age" value="0D" />
                    <HealthMetric label="Reworks" value="0" />
                    <HealthMetric label="Overdue" value="0" textColor="text-rose-600" />
                </div>
            </div>

            {/* 3. STAGE GUIDANCE */}
            <div className="p-8 space-y-6">
                <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-blue-600 flex items-center gap-3">
                    <ClipboardList className="h-4 w-4" /> STAGE GUIDANCE
                </h4>
                <div className="space-y-4">
                    <GuidanceItem label="Gather factual information" checked />
                    <GuidanceItem label="Identify all possible causes" checked />
                    <GuidanceItem label="Perform 5-Why analysis" checked />
                    <GuidanceItem label="Collect technical evidence" checked />
                    <GuidanceItem label="Determine root cause" checked />
                </div>
            </div>

            {/* 4. ACTIVITY LOOP */}
            <div className="flex-1 p-8 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-6">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-blue-600 flex items-center gap-3">
                        <History className="h-4 w-4" /> ACTIVITY LOOP
                    </h4>
                </div>
                <ScrollArea className="flex-1">
                    <div className="space-y-6 pb-6">
                        <div className="p-4 bg-slate-50 border rounded-2xl shadow-inner border-slate-100">
                            <p className="text-[9px] font-black uppercase text-slate-400 mb-2 tracking-widest">SYSTEM INITIALIZATION</p>
                            <p className="text-[11px] font-bold text-slate-600 leading-relaxed uppercase tracking-tight">Lifecycle tracking activated for safety observation discovery.</p>
                        </div>
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}

function MetaRow({ label, value, isRisk }: { label: string, value: string, isRisk?: boolean }) {
    return (
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
            <span className="text-slate-400">{label}</span>
            {isRisk ? (
                <Badge className="bg-amber-500 text-white border-none font-black px-2 h-5 text-[8px] rounded shadow-sm">{value?.toUpperCase() || 'MEDIUM'}</Badge>
            ) : (
                <span className="text-slate-900">{value || 'N/A'}</span>
            )}
        </div>
    );
}

function HealthMetric({ label, value, textColor = "text-slate-900" }: any) {
    return (
        <div className="p-3 bg-white border border-slate-100 rounded-xl text-center flex flex-col gap-1 shadow-sm">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
            <p className={cn("text-[13px] font-black uppercase", textColor)}>{value}</p>
        </div>
    );
}

function GuidanceItem({ label, checked }: any) {
    return (
        <div className="flex items-center gap-4">
            <div className={cn(
                "h-5 w-5 rounded-full flex items-center justify-center border-2 transition-all",
                checked ? "bg-blue-600 border-blue-600 shadow-md" : "bg-white border-slate-200"
            )}>
                {checked && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
            </div>
            <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight leading-none">{label}</span>
        </div>
    );
}