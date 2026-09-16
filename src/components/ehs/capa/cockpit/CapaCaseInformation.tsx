'use client';

import React, { useMemo } from 'react';
import { format, parseISO, differenceInDays, isValid } from 'date-fns';
import { 
    Info, 
    ShieldCheck, 
    AlertTriangle, 
    Zap, 
    Users, 
    HelpCircle,
    ClipboardCheck,
    CheckCircle2,
    ExternalLink
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { cn } from '@/lib/utils';

export default function CapaCaseInformation({ observation }: { observation: EhsObservation }) {
    const { users } = useAuth();
    const { projects } = useGeneral();

    const project = projects.find(p => p.id === observation.projectId);
    const reporter = users.find(u => u.id === observation.reporterId);
    
    const stageData = observation.stages[observation.currentStage];
    const currentOwner = users.find(u => u.id === stageData?.assigneeId);

    const daysOpen = useMemo(() => {
        const created = parseISO(observation.createdAt);
        if (!isValid(created)) return 0;
        return differenceInDays(new Date(), created);
    }, [observation.createdAt]);

    const health = useMemo(() => {
        if (observation.status === 'Closed') return { label: 'CLOSED', color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' };
        if (daysOpen > 15 || observation.severity === 'Critical') return { label: 'CRITICAL', color: 'text-rose-700', bg: 'bg-rose-50', dot: 'bg-rose-500' };
        if (daysOpen > 7) return { label: 'AT RISK', color: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-500' };
        return { label: 'ON TRACK', color: 'text-blue-700', bg: 'bg-blue-50', dot: 'bg-blue-500' };
    }, [daysOpen, observation.status, observation.severity]);

    return (
        <div className="space-y-10">
            {/* Case Information */}
            <section className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 flex items-center gap-2">
                    <Info className="h-3 w-3" /> Case Information
                </h4>
                <div className="space-y-3">
                    <InfoRow label="Category" value={observation.category} isBadge />
                    <InfoRow label="Risk Level" value={observation.severity} isBadge risk />
                    <InfoRow label="Status" value={observation.status} isBadge status />
                    <InfoRow label="Site" value={project?.name || 'N/A'} />
                    <InfoRow label="Area" value={observation.location} />
                    <InfoRow label="Reported By" value={reporter?.name || 'Unknown'} />
                    <InfoRow label="Current Owner" value={currentOwner?.name || 'Unassigned'} />
                    <InfoRow label="Initiated On" value={format(parseISO(observation.createdAt), 'dd MMM yyyy')} />
                    <InfoRow label="Target Closure" value={observation.targetDate ? format(parseISO(observation.targetDate), 'dd MMM yyyy') : 'TBD'} />
                    <InfoRow label="Days Open" value={`${daysOpen} Days`} isRed={daysOpen > 7} />
                </div>
            </section>

            {/* Case Health */}
            <section className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 flex items-center gap-2">
                    <ShieldCheck className="h-3 w-3" /> Governance Health
                </h4>
                <div className={cn("p-4 rounded-xl border flex flex-col items-center text-center gap-3", health.bg)}>
                    <div className="flex items-center gap-2">
                        <div className={cn("h-2 w-2 rounded-full animate-pulse", health.dot)} />
                        <span className={cn("font-black text-xs uppercase tracking-widest", health.color)}>{health.label}</span>
                    </div>
                    <div className="grid grid-cols-2 w-full gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                        <div className="bg-white p-2 rounded-lg border border-slate-100">Stage Age: 2D</div>
                        <div className="bg-white p-2 rounded-lg border border-slate-100">Reworks: 0</div>
                    </div>
                </div>
            </section>

            {/* Stage Guidance */}
            <section className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 flex items-center gap-2">
                    <ClipboardCheck className="h-3 w-3" /> Stage Guidance
                </h4>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Tasks for this stage:</p>
                    <ul className="space-y-2">
                        <GuidanceItem text="Gather factual information" />
                        <GuidanceItem text="Identify all possible causes" />
                        <GuidanceItem text="Use 5-Why analysis" />
                        <GuidanceItem text="Collect evidence and interviews" />
                        <GuidanceItem text="Determine root cause" />
                    </ul>
                </div>
            </section>

            {/* Stakeholder Loop */}
            <section className="space-y-4">
                <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 flex items-center gap-2">
                        <Users className="h-3 w-3" /> Stakeholder Loop
                    </h4>
                    <Button variant="ghost" className="h-6 text-[9px] font-black uppercase text-blue-600 hover:bg-blue-50 px-2">Notify +</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {(observation.ccUserIds || []).map(id => {
                        const u = users.find(x => x.id === id);
                        return (
                            <div key={id} className="flex items-center gap-2 bg-slate-50 border rounded-full pl-1 pr-3 py-1">
                                <Avatar className="h-5 w-5 border">
                                    <AvatarImage src={u?.avatar}/>
                                    <AvatarFallback className="text-[8px]">{u?.name?.[0]}</AvatarFallback>
                                </Avatar>
                                <span className="text-[10px] font-bold text-slate-700">{u?.name.split(' ')[0]}</span>
                            </div>
                        )
                    })}
                </div>
            </section>

            {/* Help Card */}
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 space-y-3">
                <div className="flex items-center gap-2 text-amber-800">
                    <HelpCircle className="h-4 w-4" />
                    <span className="text-xs font-black uppercase tracking-tight">Need Help?</span>
                </div>
                <p className="text-[11px] text-amber-700 font-medium leading-relaxed">Refer to the Investigation Guidelines in the Safety Library for this stage.</p>
                <Button variant="outline" className="w-full h-8 text-[10px] font-black uppercase bg-white border-amber-200 text-amber-700 hover:bg-amber-100">
                    View Guidelines <ExternalLink className="ml-2 h-3 w-3" />
                </Button>
            </div>
        </div>
    );
}

function InfoRow({ label, value, isBadge, isRed, risk, status }: { label: string, value: string, isBadge?: boolean, isRed?: boolean, risk?: boolean, status?: boolean }) {
    return (
        <div className="flex justify-between items-center gap-4 group">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-600 transition-colors">{label}</span>
            {isBadge ? (
                <Badge variant="outline" className={cn(
                    "text-[9px] font-black uppercase tracking-widest h-5 px-2 bg-slate-50 border-slate-200 text-slate-600",
                    risk && value === 'High' && "bg-rose-50 text-rose-600 border-rose-100",
                    risk && value === 'Critical' && "bg-rose-600 text-white border-none",
                    status && value === 'In Progress' && "bg-blue-50 text-blue-600 border-blue-100"
                )}>
                    {value}
                </Badge>
            ) : (
                <span className={cn("text-[11px] font-bold text-slate-800 text-right truncate", isRed && "text-rose-600")}>{value}</span>
            )}
        </div>
    );
}

function GuidanceItem({ text }: { text: string }) {
    return (
        <li className="flex items-start gap-2.5">
            <CheckCircle2 className="h-3 w-3 text-emerald-500 mt-0.5" />
            <span className="text-[11px] font-medium text-slate-600 leading-tight">{text}</span>
        </li>
    );
}
