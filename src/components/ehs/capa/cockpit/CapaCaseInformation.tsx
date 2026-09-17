
'use client';

import React, { useMemo } from 'react';
import { 
    ShieldCheck, 
    MapPin, 
    User, 
    Activity,
    Info,
    Users,
    CheckCircle2,
    Clock,
    PlusCircle,
    Paperclip
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, parseISO, isValid, differenceInDays, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';
import type { EhsObservation, CapaStage } from '@/lib/types';
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
            <div className="flex flex-col gap-8 py-6 px-6 text-left">
                
                {/* CASE INFO */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2 ml-1">
                        <Info className="h-3.5 w-3.5 text-slate-400" />
                        <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">CASE INFORMATION</h4>
                    </div>
                    <div className="bg-white border rounded-lg divide-y divide-slate-100 shadow-sm overflow-hidden">
                        <InfoRow label="Category" value={observation.category} isBadge />
                        <InfoRow label="Risk Index" value={observation.severity} isRisk risk={observation.severity} />
                        <InfoRow label="Site" value={project?.name} isBold />
                        <InfoRow label="Area" value={observation.location} />
                        <InfoRow label="Reporter" value={reporter?.name} />
                        <InfoRow label="Owner" value={currentOwner?.name} isBlue />
                        <InfoRow label="Started" value={format(parseISO(observation.createdAt), 'dd-MM-yyyy')} />
                        <InfoRow label="Age" value={`${daysOpen} Days`} isLast />
                    </div>
                </div>

                {/* GOVERNANCE HEALTH */}
                <div className="space-y-3">
                    <h5 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2 ml-1">
                        <Activity className="h-3.5 w-3.5 text-slate-400" /> GOVERNANCE HEALTH
                    </h5>
                    <div className={cn(
                        "p-4 rounded-xl border shadow-sm space-y-4 transition-colors",
                        isOverdue ? "bg-rose-50 border-rose-200" : "bg-white"
                    )}>
                        <div className="flex items-center gap-2">
                            <div className={cn("h-2 w-2 rounded-full", isOverdue ? "bg-rose-500 animate-pulse" : "bg-emerald-500")} />
                            <span className={cn("text-[10px] font-black uppercase tracking-[0.15em]", isOverdue ? "text-rose-600" : "text-slate-700")}>
                                {isOverdue ? 'LIFECYCLE DELAYED' : 'ON TRACK'}
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                            <HealthMetric label="DAYS" value={`${daysOpen}D`} />
                            <HealthMetric label="TARGET" value={sData?.targetDate ? format(parseISO(sData.targetDate), 'dd MMM') : 'TBD'} isDanger={isOverdue} />
                            <HealthMetric label="REWORK" value={String(observation.reworkCount || 0)} />
                        </div>
                    </div>
                </div>

                {/* ATTACHED EVIDENCE */}
                {attachments.length > 0 && (
                    <div className="space-y-3">
                        <h5 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2 ml-1">
                            <Paperclip className="h-3.5 w-3.5 text-slate-400" /> EVIDENCE LEDGER
                        </h5>
                        <div className="space-y-2">
                            {attachments.map(a => (
                                <div key={a.id} className="p-3 bg-slate-50 border rounded-lg flex items-center justify-between group hover:border-blue-300 transition-all">
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-slate-900 truncate uppercase tracking-tight">{a.name}</p>
                                        <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest">{a.stage}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-white border shadow-sm" asChild>
                                        <a href={a.url} target="_blank" rel="noopener noreferrer">
                                            <Download className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600" />
                                        </a>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* PROTOCOL */}
                <div className="space-y-3">
                    <h5 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2 ml-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> STAGE PROTOCOL
                    </h5>
                    <div className="p-4 bg-slate-50/50 border rounded-xl space-y-4 shadow-inner">
                        <div className="space-y-2">
                            {[
                                "Identify all involved personnel",
                                "Document site conditions",
                                "Perform technical forensics",
                                "Analyze root cause chain",
                                "Formulate remediation strategy"
                            ].map((step, i) => (
                                <div key={i} className="flex items-start gap-2.5 text-[9px] font-bold text-slate-500">
                                    <CheckCircle2 className="h-3 w-3 text-slate-300 mt-0.5 shrink-0" />
                                    <span className="uppercase tracking-tight leading-tight">{step}</span>
                                </div>
                            ))}
                        </div>
                        <Button variant="outline" className="w-full h-8 text-[9px] font-black uppercase tracking-[0.2em] bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-all">
                            VIEW SOP DOCUMENT
                        </Button>
                    </div>
                </div>
            </div>
        </ScrollArea>
    );
}

function InfoRow({ label, value, isRisk = false, risk = '', isBlue = false, isLast = false, isBadge = false, isBold = false }: { label: string, value?: string | null, isRisk?: boolean, risk?: string, isBlue?: boolean, isLast?: boolean, isBadge?: boolean, isBold?: boolean }) {
    return (
        <div className={cn("flex justify-between items-center px-4 py-2.5 text-[10px]", !isLast && "border-b border-slate-50")}>
            <span className="font-bold text-slate-400 uppercase tracking-widest">{label}</span>
            {isRisk ? (
                <Badge variant="outline" className={cn(
                    "font-black uppercase text-[8px] tracking-widest h-5 px-2 border rounded-sm",
                    risk === 'Low' && "text-emerald-700 border-emerald-100 bg-emerald-50",
                    risk === 'Medium' && "text-amber-700 border-amber-100 bg-amber-50",
                    risk === 'High' && "text-red-700 border-red-100 bg-red-50",
                    risk === 'Critical' && "text-white border-red-800 bg-red-700"
                )}>{value}</Badge>
            ) : isBadge ? (
                <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 font-black text-[8px] px-2 h-5 tracking-widest uppercase rounded-sm">{value}</Badge>
            ) : (
                <span className={cn("font-bold text-slate-900 uppercase truncate max-w-[140px]", isBlue && "text-blue-700", isBold && "font-black")}>{value || '—'}</span>
            )}
        </div>
    );
}

function HealthMetric({ label, value, isDanger = false }: { label: string, value: string, isDanger?: boolean }) {
    return (
        <div className={cn(
            "p-2 rounded-lg border text-center transition-colors",
            isDanger ? "bg-rose-500 border-rose-600 shadow-lg shadow-rose-500/20" : "bg-slate-50 border-slate-100"
        )}>
            <p className={cn("text-[7px] font-black uppercase tracking-widest mb-0.5", isDanger ? "text-white/80" : "text-slate-400")}>{label}</p>
            <p className={cn("text-[10px] font-black", isDanger ? "text-white" : "text-slate-900")}>{value}</p>
        </div>
    );
}
