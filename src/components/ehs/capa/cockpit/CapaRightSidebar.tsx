'use client';

import React from 'react';
import { 
    Info, 
    Activity, 
    Zap,
    CheckCircle2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { EhsObservation } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-provider';

export default function CapaRightSidebar({ observation }: { observation: EhsObservation }) {
    const { users } = useAuth();
    
    return (
        <div className="flex flex-col h-full bg-white divide-y-2 divide-slate-50 text-left overflow-hidden">
            {/* 1. CASE INFORMATION */}
            <div className="p-8 space-y-8">
                <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-blue-600 flex items-center gap-4">
                    <Info className="h-5 w-5" /> CASE INFORMATION
                </h4>
                <div className="space-y-5">
                    <MetaRow label="Category" value={observation.category} />
                    <MetaRow label="Risk Index" value={observation.severity} isRisk />
                    <MetaRow label="Site" value={observation.projectId} />
                    <MetaRow label="Area" value={observation.location || 'SITE POSITION TBD'} />
                    <MetaRow label="Reporter" value={users.find(u => u.id === observation.reporterId)?.name} />
                    <MetaRow label="Initiated On" value={format(parseISO(observation.createdAt), 'dd MMM yyyy')} />
                    <MetaRow label="Days Open" value="0 Days" />
                </div>
            </div>

            {/* 2. GOVERNANCE HEALTH */}
            <div className="p-8 space-y-8 bg-slate-50/40">
                <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-blue-600 flex items-center gap-4">
                    <Activity className="h-5 w-5" /> GOVERNANCE HEALTH
                </h4>
                
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border-2 shadow-sm border-emerald-100">
                    <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                    <div className="flex flex-col">
                        <span className="text-[12px] font-black text-slate-900 uppercase tracking-tight">SYSTEM ON TRACK</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Activities within timeframe</span>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <HealthMetric label="Stage Age" value="0D" />
                    <HealthMetric label="Reworks" value="0" />
                    <HealthMetric label="Overdue" value="0" textColor="text-rose-600" />
                </div>
            </div>

            {/* 3. STAGE GUIDANCE */}
            <div className="p-8 space-y-8">
                <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-blue-600 flex items-center gap-4">
                    <Zap className="h-5 w-5" /> STAGE GUIDANCE
                </h4>
                <div className="space-y-4">
                    <GuidanceItem label="Gather factual information" checked />
                    <GuidanceItem label="Identify all possible causes" checked />
                    <GuidanceItem label="Perform 5-Why analysis" checked />
                    <GuidanceItem label="Collect technical evidence" checked />
                    <GuidanceItem label="Determine root cause" checked />
                </div>
            </div>
        </div>
    );
}

function MetaRow({ label, value, isRisk }: { label: string, value?: string, isRisk?: boolean }) {
    return (
        <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest">
            <span className="text-slate-400">{label}</span>
            {isRisk ? (
                <Badge className="bg-orange-500 text-white border-none font-black px-2 h-5 text-[9px] rounded shadow-sm">{value?.toUpperCase() || 'MEDIUM'}</Badge>
            ) : (
                <span className="text-slate-900 truncate max-w-[180px] text-right">{value || 'N/A'}</span>
            )}
        </div>
    );
}

function HealthMetric({ label, value, textColor = "text-slate-900" }: any) {
    return (
        <div className="p-3 bg-white border-2 border-slate-100 rounded-xl text-center flex flex-col gap-1 shadow-sm">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
            <p className={cn("text-base font-black uppercase tracking-tighter", textColor)}>{value}</p>
        </div>
    );
}

function GuidanceItem({ label, checked }: any) {
    return (
        <div className="flex items-center gap-4">
            <div className={cn(
                "h-6 w-6 rounded-full flex items-center justify-center border-2 transition-all",
                checked ? "bg-blue-600 border-blue-600 shadow-md" : "bg-white border-slate-200"
            )}>
                {checked && <CheckCircle2 className="h-4 w-4 text-white" />}
            </div>
            <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight leading-none">{label}</span>
        </div>
    );
}