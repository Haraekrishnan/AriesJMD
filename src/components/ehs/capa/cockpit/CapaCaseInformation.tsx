'use client';

import React, { useMemo } from 'react';
import { format, parseISO, differenceInDays, isValid } from 'date-fns';
import { 
    Info, 
    ShieldCheck, 
    Zap, 
    Users, 
    ClipboardCheck,
    History,
    Activity,
    MessageSquare,
    Send,
    Target,
    HelpCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
        if (observation.status === 'Closed') return { label: 'OPTIMAL', color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' };
        if (daysOpen > 15 || observation.severity === 'Critical') return { label: 'CRITICAL', color: 'text-rose-700', bg: 'bg-rose-50', dot: 'bg-rose-500' };
        if (daysOpen > 7) return { label: 'AT RISK', color: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-500' };
        return { label: 'ON TRACK', color: 'text-blue-700', bg: 'bg-blue-50', dot: 'bg-blue-500' };
    }, [daysOpen, observation.status, observation.severity]);

    return (
        <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
                {/* --- CASE INTELLIGENCE CARD --- */}
                <div className="bg-slate-50 border rounded-2xl p-5 space-y-4 shadow-inner">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                        <Info className="h-3.5 w-3.5" /> Case Information
                    </h4>
                    <div className="space-y-3">
                        <InfoRow label="Category" value={observation.category} isBadge />
                        <InfoRow label="Risk Index" value={observation.severity} isBadge risk />
                        <InfoRow label="Site" value={project?.name || 'N/A'} />
                        <InfoRow label="Reporter" value={reporter?.name || 'Unknown'} />
                        <InfoRow label="Current Owner" value={currentOwner?.name || 'Unassigned'} />
                        <InfoRow label="Initiated" value={format(parseISO(observation.createdAt), 'dd MMM yyyy')} />
                        <InfoRow label="Days Open" value={`${daysOpen} Days`} isRed={daysOpen > 7} />
                    </div>
                </div>

                {/* --- GOVERNANCE HEALTH --- */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2 ml-1">
                        <ShieldCheck className="h-3.5 w-3.5" /> Governance Health
                    </h4>
                    <div className={cn("p-4 rounded-xl border-2 flex flex-col items-center text-center gap-3 bg-white", health.dot.replace('bg-', 'border-'))}>
                        <div className="flex items-center gap-2">
                            <div className={cn("h-2 w-2 rounded-full animate-pulse", health.dot)} />
                            <span className={cn("font-black text-[11px] uppercase tracking-[0.1em]", health.color)}>{health.label}</span>
                        </div>
                        <div className="grid grid-cols-2 w-full gap-2">
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 shadow-sm text-[9px] font-black uppercase text-slate-400">
                                Stage Age: {daysOpen}D
                            </div>
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 shadow-sm text-[9px] font-black uppercase text-slate-400">
                                Reworks: {observation.reworkCount || 0}
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- STAGE GUIDANCE --- */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2 ml-1">
                        <Target className="h-3.5 w-3.5" /> Stage Guidance
                    </h4>
                    <div className="p-4 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mr-4 -mt-4 h-16 w-16 bg-white/10 rounded-full blur-xl" />
                        <p className="text-[11px] font-bold leading-relaxed relative z-10">
                            Perform a technical deep-dive. Ensure all 5-Whys are logically linked to a systemic failure.
                        </p>
                    </div>
                </div>

                {/* --- HELP ACCESS --- */}
                <div className="p-4 bg-white border-2 border-dashed rounded-2xl group hover:border-blue-200 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                            <HelpCircle className="h-4 w-4 text-slate-400 group-hover:text-blue-500" />
                        </div>
                        <div>
                            <p className="text-[11px] font-black text-slate-900 uppercase">Need Support?</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">View Documentation</p>
                        </div>
                    </div>
                </div>
            </div>
        </ScrollArea>
    );
}

function InfoRow({ label, value, isBadge, isRed, risk }: { label: string, value: string, isBadge?: boolean, isRed?: boolean, risk?: boolean }) {
    return (
        <div className="flex justify-between items-baseline gap-4 group">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-slate-600 transition-colors shrink-0">{label}</span>
            {isBadge ? (
                <Badge variant="outline" className={cn(
                    "text-[9px] font-black uppercase tracking-widest h-5 px-2 bg-white border-2",
                    risk && value === 'High' && "bg-rose-50 text-rose-600 border-rose-200",
                    risk && value === 'Critical' && "bg-rose-600 text-white border-none shadow-sm"
                )}>
                    {value}
                </Badge>
            ) : (
                <span className={cn("text-[11px] font-bold text-slate-700 text-right truncate max-w-[160px]", isRed && "text-rose-600 font-black")}>{value}</span>
            )}
        </div>
    );
}
