
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
    Paperclip,
    Download
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

    const isOverdue = useMemo(() => {
        if (!sData?.targetDate) return false;
        return isAfter(new Date(), parseISO(sData.targetDate)) && sData.status !== 'Completed';
    }, [sData]);

    const auditTrail = useMemo(() => {
        const events: any[] = [];
        
        // Collect all comments from all stages
        Object.entries(observation.stages).forEach(([stageName, stageData]) => {
            if (stageData.comments) {
                Object.values(stageData.comments).forEach(comment => {
                    events.push({
                        ...comment,
                        stageName,
                        isSystem: comment.text.startsWith('[SYSTEM]')
                    });
                });
            }
        });

        // Add initiation as start point
        events.push({
            userId: observation.reporterId,
            text: '[SYSTEM] Case initiated by reporter.',
            date: observation.createdAt,
            stageName: 'Initiation',
            isSystem: true
        });

        return events.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    }, [observation]);

    const attachments = useMemo(() => {
        const all: any[] = [];
        Object.entries(observation.stages).forEach(([stage, data]) => {
            if (data.attachments) {
                Object.values(data.attachments).forEach(a => all.push({ ...a, stage }));
            }
        });
        return all;
    }, [observation]);

    return (
        <ScrollArea className="h-full border-l border-slate-200">
            <div className="flex flex-col gap-8 py-8 px-8 text-left">
                
                {/* CASE INFO */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-1 ml-1">
                        <Info className="h-4 w-4 text-slate-400" />
                        <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-500">CASE INFORMATION</h4>
                    </div>
                    <div className="bg-white border rounded-xl divide-y divide-slate-100 shadow-sm overflow-hidden">
                        <InfoRow label="Category" value={observation.category} isBadge />
                        <InfoRow label="Risk Index" value={observation.severity} isRisk risk={observation.severity} />
                        <InfoRow label="Site" value={project?.name} isBold />
                        <InfoRow label="Area" value={observation.location} />
                        <InfoRow label="Reporter" value={reporter?.name} />
                        <InfoRow label="Owner" value={currentOwner?.name} isBlue />
                        <InfoRow label="Started" value={format(parseISO(observation.createdAt), 'dd MMMM yyyy')} />
                        <InfoRow label="Age" value={`${daysOpen} Days`} isLast />
                    </div>
                </div>

                {/* GOVERNANCE HEALTH */}
                <div className="space-y-4">
                    <h5 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-500 flex items-center gap-3 ml-1">
                        <Activity className="h-4 w-4 text-slate-400" /> GOVERNANCE HEALTH
                    </h5>
                    <div className={cn(
                        "p-6 rounded-2xl border-2 shadow-sm space-y-6 transition-colors",
                        isOverdue ? "bg-rose-50 border-rose-200" : "bg-white border-slate-50"
                    )}>
                        <div className="flex items-center gap-3">
                            <div className={cn("h-3 w-3 rounded-full", isOverdue ? "bg-rose-500 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.6)]" : "bg-emerald-500")} />
                            <span className={cn("text-[10px] font-black uppercase tracking-[0.2em]", isOverdue ? "text-rose-600" : "text-slate-700")}>
                                {isOverdue ? 'LIFECYCLE DELAY DETECTED' : 'SYSTEM HEALTH OPTIMAL'}
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3">
                            <HealthMetric label="DAYS" value={`${daysOpen}D`} />
                            <HealthMetric label="TARGET" value={sData?.targetDate ? format(parseISO(sData.targetDate), 'dd MMM') : 'TBD'} isDanger={isOverdue} />
                            <HealthMetric label="REWORK" value={String(observation.reworkCount || 0)} />
                        </div>
                    </div>
                </div>

                {/* TECHNICAL AUDIT TRAIL */}
                <div className="space-y-4">
                    <h5 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-500 flex items-center gap-3 ml-1">
                        <History className="h-4 w-4 text-slate-400" /> TECHNICAL AUDIT TRAIL
                    </h5>
                    <div className="space-y-4 pl-4 border-l-2 border-slate-100">
                        {auditTrail.map((event, i) => {
                            const actor = users.find(u => u.id === event.userId);
                            return (
                                <div key={i} className="relative space-y-1 pb-4 last:pb-0">
                                    <div className="absolute -left-[22px] top-0 h-3 w-3 rounded-full bg-white border-2 border-slate-200" />
                                    <div className="flex justify-between items-baseline gap-2">
                                        <span className={cn(
                                            "text-[9px] font-black uppercase tracking-wider",
                                            event.isSystem ? "text-blue-600" : "text-slate-900"
                                        )}>
                                            {event.isSystem ? 'SYSTEM' : actor?.name}
                                        </span>
                                        <span className="text-[8px] font-bold text-slate-400 uppercase">
                                            {format(parseISO(event.date), 'dd MMM, HH:mm')}
                                        </span>
                                    </div>
                                    <p className={cn(
                                        "text-[10px] leading-relaxed",
                                        event.isSystem ? "font-bold text-slate-500 italic" : "font-medium text-slate-700"
                                    )}>
                                        {event.text}
                                    </p>
                                    <Badge variant="outline" className="h-4 px-1 rounded-sm text-[7px] font-black uppercase bg-slate-50 border-slate-200 text-slate-400">
                                        PHASE: {event.stageName.toUpperCase()}
                                    </Badge>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ATTACHED EVIDENCE */}
                {attachments.length > 0 && (
                    <div className="space-y-4">
                        <h5 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-500 flex items-center gap-3 ml-1">
                            <Paperclip className="h-4 w-4 text-slate-400" /> EVIDENCE LEDGER
                        </h5>
                        <div className="space-y-3">
                            {attachments.map(a => (
                                <div key={a.id} className="p-4 bg-slate-50 border rounded-xl flex items-center justify-between group hover:border-blue-400 hover:bg-white transition-all shadow-sm">
                                    <div className="min-w-0 pr-4">
                                        <p className="text-[12px] font-bold text-slate-900 truncate uppercase tracking-tight">{a.name}</p>
                                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">{a.stage}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-white border shadow-sm group-hover:text-blue-600 group-hover:border-blue-200" asChild>
                                        <a href={a.url} target="_blank" rel="noopener noreferrer">
                                            <Download className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
                                        </a>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
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
                    risk === 'Low' && "text-emerald-700 border-emerald-100 bg-emerald-50",
                    risk === 'Medium' && "text-amber-700 border-amber-100 bg-amber-50",
                    risk === 'High' && "text-red-700 border-red-100 bg-red-50",
                    risk === 'Critical' && "text-white border-red-800 bg-red-700"
                )}>{value}</Badge>
            ) : isBadge ? (
                <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 font-black text-[9px] px-3 h-6 tracking-widest uppercase rounded-sm">{value}</Badge>
            ) : (
                <span className={cn("font-bold text-slate-900 uppercase truncate max-w-[200px]", isBlue && "text-blue-700", isBold && "font-black text-xs")}>{value || '—'}</span>
            )}
        </div>
    );
}

function HealthMetric({ label, value, isDanger = false }: { label: string, value: string, isDanger?: boolean }) {
    return (
        <div className={cn(
            "p-3 rounded-xl border-2 text-center transition-colors shadow-md",
            isDanger ? "bg-rose-600 border-rose-700 shadow-rose-200" : "bg-white border-slate-100"
        )}>
            <p className={cn("text-[8px] font-black uppercase tracking-[0.1em] mb-1", isDanger ? "text-white/70" : "text-slate-400")}>{label}</p>
            <p className={cn("text-[12px] font-black uppercase tracking-tight", isDanger ? "text-white" : "text-slate-900")}>{value}</p>
        </div>
    );
}
