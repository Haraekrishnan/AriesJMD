'use client';

import React from 'react';
import { 
    Info, 
    ShieldCheck, 
    ClipboardCheck, 
    Activity, 
    CheckCircle2, 
    ShieldAlert,
    Target,
    Clock,
    History
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { EhsObservation } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/contexts/auth-provider';

export default function CapaRightSidebar({ observation }: { observation: EhsObservation }) {
    const { users } = useAuth();
    const reporter = users.find(u => u.id === observation.reporterId);
    
    return (
        <div className="flex flex-col h-full bg-white divide-y-4 divide-slate-900 text-left">
            {/* 1. CASE INFORMATION */}
            <div className="p-6 space-y-5">
                <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900 flex items-center gap-3">
                    <Info className="h-4 w-4 text-blue-600" /> CASE INFORMATION
                </h4>
                <div className="space-y-4 text-[11px] font-black uppercase tracking-widest">
                    <MetaRow label="Category" value={observation.category} />
                    <MetaRow label="Risk Index" value={observation.severity} isRisk />
                    <MetaRow label="Site" value={observation.projectId} />
                    <MetaRow label="Area" value={observation.location || 'SITE POSITION TBD'} />
                    <MetaRow label="Reporter" value={reporter?.name || 'OFFICIAL RECORD'} />
                    <MetaRow label="Initiated On" value={format(parseISO(observation.createdAt), 'dd MMM yyyy')} />
                    <MetaRow label="Days Open" value="0 Days" />
                </div>
            </div>

            {/* 2. GOVERNANCE HEALTH */}
            <div className="p-6 space-y-6 bg-slate-50/50">
                <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900 flex items-center gap-3">
                    <Activity className="h-4 w-4 text-blue-600" /> GOVERNANCE HEALTH
                </h4>
                <div className="flex items-center gap-3 p-4 rounded-none bg-emerald-600 text-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <div className="h-2.5 w-2.5 rounded-none bg-white shadow-[0_0_10px_white]" />
                    <div className="flex flex-col">
                        <span className="text-[11px] font-black uppercase tracking-tight">SYSTEM ON TRACK</span>
                        <span className="text-[8px] font-bold uppercase tracking-widest mt-0.5 opacity-80">ALL ACTIVITIES WITHIN TIMEFRAME</span>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <HealthMetric label="Stage Age" value="0D" />
                    <HealthMetric label="Reworks" value="0" />
                    <HealthMetric label="Overdue" value="0" textColor="text-rose-600" />
                </div>
            </div>

            {/* 3. STAGE GUIDANCE */}
            <div className="p-6 space-y-5">
                <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900 flex items-center gap-3">
                    <ClipboardCheck className="h-4 w-4 text-blue-600" /> STAGE GUIDANCE
                </h4>
                <div className="space-y-3">
                    <GuidanceItem label="Gather factual information" checked />
                    <GuidanceItem label="Identify all possible causes" checked />
                    <GuidanceItem label="Perform 5-Why analysis" checked />
                    <GuidanceItem label="Collect technical evidence" checked />
                    <GuidanceItem label="Determine root cause" checked />
                </div>
            </div>

            {/* 4. ACTIVITY LOOP */}
            <div className="flex-1 p-6 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-5">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900 flex items-center gap-3">
                        <History className="h-4 w-4 text-blue-600" /> ACTIVITY LOOP
                    </h4>
                </div>
                <ScrollArea className="flex-1">
                    <div className="space-y-6 pb-4">
                        <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-none shadow-inner">
                            <p className="text-[9px] font-black uppercase text-slate-400 mb-2">SYSTEM INITIALIZATION</p>
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
        <div className="flex justify-between items-center py-1">
            <span className="text-slate-400 font-black">{label}</span>
            {isRisk ? (
                <Badge className="bg-amber-500 text-white border-none font-black px-2 h-5 text-[9px] rounded-none shadow-sm">{value?.toUpperCase() || 'MEDIUM'}</Badge>
            ) : (
                <span className="text-slate-900">{value || 'N/A'}</span>
            )}
        </div>
    );
}

function HealthMetric({ label, value, textColor = "text-slate-900" }: any) {
    return (
        <div className="p-3 bg-white border-2 border-slate-900 rounded-none text-center flex flex-col gap-1 shadow-sm">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
            <p className={cn("text-[12px] font-black uppercase", textColor)}>{value}</p>
        </div>
    );
}

function GuidanceItem({ label, checked }: any) {
    return (
        <div className="flex items-center gap-3">
            <div className={cn(
                "h-4 w-4 rounded-none flex items-center justify-center border-2 transition-all",
                checked ? "bg-emerald-600 border-slate-900 shadow-sm" : "bg-white border-slate-200"
            )}>
                {checked && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
            </div>
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight leading-none">{label}</span>
        </div>
    );
}
