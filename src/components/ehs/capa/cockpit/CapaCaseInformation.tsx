'use client';

import React, { useMemo } from 'react';
import { 
    ShieldCheck, 
    MapPin, 
    User, 
    Activity,
    Info,
    History,
    CheckCircle2,
    Clock,
    Search,
    BookOpen
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, parseISO, isValid, differenceInDays, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';
import type { EhsObservation } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function CapaCaseInformation({ observation }: { observation: EhsObservation }) {
    const { users } = useAuth();
    const { projects } = useGeneral();

    const project = projects.find(p => p.id === observation.projectId);
    const reporter = users.find(u => u.id === observation.reporterId);
    const sData = observation.stages[observation.currentStage];
    const currentOwner = users.find(u => u.id === sData?.assigneeId);

    const daysOpen = useMemo(() => {
        if (!observation.createdAt) return 0;
        const created = parseISO(observation.createdAt);
        return isValid(created) ? Math.max(0, differenceInDays(new Date(), created)) : 0;
    }, [observation.createdAt]);

    return (
        <ScrollArea className="h-full">
            <div className="flex flex-col gap-8 py-8 px-8 text-left">
                
                {/* 1. CASE INFORMATION LEDGER */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3 ml-1">
                        <Info className="h-4 w-4 text-blue-600" />
                        <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-900">CASE INFORMATION</h4>
                    </div>
                    <div className="bg-white border rounded-xl divide-y divide-slate-100 shadow-sm overflow-hidden border-[#DCE5EF]">
                        <InfoRow label="Category" value={observation.category} isBadge />
                        <InfoRow label="Risk Index" value={observation.severity} isRisk risk={observation.severity} />
                        <InfoRow label="Site" value={project?.name} isBold />
                        <InfoRow label="Area" value={observation.location || '—'} />
                        <InfoRow label="Reporter" value={reporter?.name} />
                        <InfoRow label="Owner" value={currentOwner?.name} isBlue />
                        <InfoRow label="Started" value={format(parseISO(observation.createdAt), 'dd MMMM yyyy')} />
                        <InfoRow label="Age" value={`${daysOpen} Days`} />
                        <InfoRow label="Target Closure" value="—" isLast />
                    </div>
                </div>

                {/* 2. GOVERNANCE HEALTH */}
                <div className="space-y-4">
                    <h5 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-900 flex items-center gap-3 ml-1">
                        <Activity className="h-4 w-4 text-blue-600" /> GOVERNANCE HEALTH
                    </h5>
                    <div className="p-6 rounded-2xl bg-white border border-[#DCE5EF] shadow-sm space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">System Health Optimal</span>
                        </div>
                        <p className="text-[10px] font-medium text-slate-400 leading-tight">Activities are within expected timeframe.</p>
                        
                        <div className="grid grid-cols-3 gap-3">
                            <HealthMetric label="DAYS" value={`${daysOpen}D`} />
                            <HealthMetric label="TARGET" value="TBD" />
                            <HealthMetric label="REWORK" value="0" />
                        </div>
                    </div>
                </div>

                {/* 3. STAGE GUIDANCE */}
                <div className="space-y-4">
                    <h5 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-900 flex items-center gap-3 ml-1">
                        <BookOpen className="h-4 w-4 text-blue-600" /> STAGE GUIDANCE
                    </h5>
                    <div className="p-6 rounded-2xl bg-[#EFF6FF] border border-[#DBEAFE] shadow-sm space-y-5">
                        <div className="flex items-start gap-3">
                            <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
                                <Info className="h-3.5 w-3.5 text-white" />
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-[11px] font-black uppercase text-blue-800 tracking-tight">Perform a technical investigation</p>
                                <p className="text-[10px] font-medium text-blue-600 leading-relaxed">Determine what happened, why it happened, and identify the underlying root cause.</p>
                            </div>
                        </div>

                        <div className="space-y-2.5">
                            <GuidelineItem text="Gather factual information" completed />
                            <GuidelineItem text="Identify all possible causes" completed />
                            <GuidelineItem text="Perform 5-Why analysis" active />
                            <GuidelineItem text="Collect evidence and interviews" />
                            <GuidelineItem text="Determine systemic root cause" />
                        </div>
                    </div>
                </div>
            </div>
        </ScrollArea>
    );
}

function InfoRow({ label, value, isRisk = false, risk = '', isBlue = false, isLast = false, isBadge = false, isBold = false }: { label: string, value?: string | null, isRisk?: boolean, risk?: string, isBlue?: boolean, isLast?: boolean, isBadge?: boolean, isBold?: boolean }) {
    return (
        <div className={cn("flex justify-between items-center px-5 py-3 text-[11px]", !isLast && "border-b border-slate-50")}>
            <span className="font-bold text-slate-400 uppercase tracking-widest">{label}</span>
            {isRisk ? (
                <Badge variant="outline" className={cn(
                    "font-black uppercase text-[9px] tracking-widest h-6 px-3 border rounded-sm",
                    risk === 'Low' && "text-emerald-700 bg-emerald-50 border-emerald-100",
                    risk === 'Medium' && "text-amber-700 bg-amber-50 border-amber-100",
                    risk === 'High' && "text-red-700 bg-red-50 border-red-100",
                    risk === 'Critical' && "text-white bg-red-700"
                )}>{value}</Badge>
            ) : isBadge ? (
                <Badge variant="outline" className="bg-slate-50 text-blue-700 border-blue-100 font-black text-[9px] px-3 h-6 tracking-widest uppercase rounded-sm">{value}</Badge>
            ) : (
                <span className={cn("font-black text-slate-900 uppercase truncate max-w-[200px]", isBlue && "text-blue-700", isBold && "text-xs")}>{value || '—'}</span>
            )}
        </div>
    );
}

function HealthMetric({ label, value }: { label: string, value: string }) {
    return (
        <div className="p-3 rounded-xl bg-white border border-[#DCE5EF] text-center shadow-sm">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
            <p className="text-[13px] font-black text-slate-900 uppercase">{value}</p>
        </div>
    );
}

function GuidelineItem({ text, completed = false, active = false }: { text: string, completed?: boolean, active?: boolean }) {
    return (
        <div className="flex items-center gap-3">
            <div className={cn(
                "h-5 w-5 rounded-full flex items-center justify-center border-2",
                completed ? "bg-blue-600 border-blue-600 text-white" : active ? "bg-white border-blue-600 text-blue-600" : "bg-white border-slate-300"
            )}>
                {completed && <CheckCircle2 className="h-3 w-3" />}
                {active && <div className="h-1.5 w-1.5 rounded-full bg-blue-600" />}
            </div>
            <span className={cn(
                "text-[10px] font-bold uppercase tracking-tight",
                completed ? "text-slate-400 line-through" : active ? "text-blue-700" : "text-slate-500"
            )}>{text}</span>
        </div>
    );
}
