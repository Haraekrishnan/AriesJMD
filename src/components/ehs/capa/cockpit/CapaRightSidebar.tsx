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

export default function CapaRightSidebar({ observation }: { observation: EhsObservation }) {
    return (
        <div className="flex flex-col h-full bg-white divide-y divide-slate-100 text-left">
            {/* 1. CASE INFORMATION */}
            <div className="p-6 space-y-5">
                <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900 flex items-center gap-3">
                    <Info className="h-4 w-4 text-blue-600" /> CASE INFORMATION
                </h4>
                <div className="space-y-4 text-[11px] font-black uppercase tracking-widest">
                    <MetaRow label="Category" value="Unsafe Act" />
                    <MetaRow label="Risk Index" value="Medium" isRisk />
                    <MetaRow label="Site" value="Store" />
                    <MetaRow label="Area" value="Platform Area" />
                    <MetaRow label="Reporter" value="Harikrishnan P S" />
                    <MetaRow label="Current Owner" value="Mujeeb" />
                    <MetaRow label="Initiated On" value="15 Sep 2026" />
                    <MetaRow label="Target Closure" value="30 Sep 2026" />
                    <MetaRow label="Days Open" value="0 Days" />
                </div>
            </div>

            {/* 2. GOVERNANCE HEALTH */}
            <div className="p-6 space-y-6">
                <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900 flex items-center gap-3">
                    <Activity className="h-4 w-4 text-blue-600" /> GOVERNANCE HEALTH
                </h4>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <div className="flex flex-col">
                        <span className="text-[11px] font-black text-emerald-800 uppercase tracking-tight">ON TRACK</span>
                        <span className="text-[9px] font-bold text-emerald-600/80 uppercase tracking-widest mt-0.5">All activities within timeframe</span>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <HealthMetric label="Stage Age" value="0 Days" />
                    <HealthMetric label="Reworks" value="0" />
                    <HealthMetric label="Overdue" value="0" textColor="text-rose-600" />
                </div>
            </div>

            {/* 3. STAGE GUIDANCE */}
            <div className="p-6 space-y-5">
                <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900 flex items-center gap-3">
                    <ClipboardCheck className="h-4 w-4 text-blue-600" /> STAGE GUIDANCE
                </h4>
                <div className="space-y-2">
                    <GuidanceItem label="Gather factual information" checked />
                    <GuidanceItem label="Identify all possible causes" checked />
                    <GuidanceItem label="Perform 5-Why analysis" checked />
                    <GuidanceItem label="Collect evidence and interviews" checked />
                    <GuidanceItem label="Determine root cause" checked />
                </div>
            </div>

            {/* 4. ACTIVITY LOOP */}
            <div className="flex-1 p-6 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-5">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900 flex items-center gap-3">
                        <History className="h-4 w-4 text-blue-600" /> ACTIVITY LOOP
                    </h4>
                    <button className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline">View All</button>
                </div>
                <ScrollArea className="flex-1">
                    <div className="space-y-6 pb-4">
                        <ActivityItem 
                            user="Vijay Sai" 
                            role="Senior Safety Supervisor"
                            time="2 hours ago"
                            type="REVIEW COMMENT"
                            content="Need detailed root cause analysis. Please include evidence and interview records."
                        />
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}

function MetaRow({ label, value, isRisk }: { label: string, value: string, isRisk?: boolean }) {
    return (
        <div className="flex justify-between items-center py-0.5">
            <span className="text-slate-400 font-bold">{label}</span>
            {isRisk ? (
                <Badge className="bg-[#FF9800] text-white border-none font-black px-2 h-5 text-[9px] rounded-sm">MEDIUM</Badge>
            ) : (
                <span className="text-slate-900">{value}</span>
            )}
        </div>
    );
}

function HealthMetric({ label, value, textColor = "text-slate-900" }: any) {
    return (
        <div className="p-3 bg-slate-50 border rounded-lg text-center flex flex-col gap-1 shadow-sm">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
            <p className={cn("text-[12px] font-black uppercase", textColor)}>{value}</p>
        </div>
    );
}

function GuidanceItem({ label, checked }: any) {
    return (
        <div className="flex items-center gap-3">
            <div className={cn(
                "h-4 w-4 rounded flex items-center justify-center border transition-all",
                checked ? "bg-emerald-500 border-emerald-500" : "bg-white border-slate-200"
            )}>
                <CheckCircle2 className="h-3 w-3 text-white" />
            </div>
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tight leading-none">{label}</span>
        </div>
    );
}

function ActivityItem({ user, role, time, content, type }: any) {
    return (
        <div className="space-y-2 animate-in fade-in slide-in-from-right-2 duration-500">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 border-2 border-slate-50">
                        <AvatarFallback className="bg-slate-100 text-slate-500 font-black text-[10px]">{user[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight leading-none">{user}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 leading-none">{role}</p>
                    </div>
                </div>
                <span className="text-[9px] font-bold text-slate-300 uppercase shrink-0">{time}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                <Badge variant="outline" className="bg-[#FFF8E1] text-[#B7791F] border-[#FEF3C7] text-[8px] font-black uppercase px-2 h-5 rounded-sm">{type}</Badge>
                <p className="text-[11px] font-bold text-slate-600 leading-relaxed italic italic whitespace-pre-wrap">"{content}"</p>
            </div>
        </div>
    );
}
