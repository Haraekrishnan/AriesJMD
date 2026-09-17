'use client';

import React, { useMemo } from 'react';
import { 
    ShieldCheck, 
    MapPin, 
    User, 
    Zap,
    CheckCircle2,
    Activity,
    Info,
    History,
    Users,
    PlusCircle,
    FileText,
    Clock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, parseISO, isValid, differenceInDays } from 'date-fns';
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
    const currentOwner = users.find(u => u.id === observation.stages[observation.currentStage]?.assigneeId);

    const daysOpen = useMemo(() => {
        if (!observation.createdAt) return 0;
        const created = parseISO(observation.createdAt);
        return isValid(created) ? Math.max(0, differenceInDays(new Date(), created)) : 0;
    }, [observation.createdAt]);

    return (
        <ScrollArea className="h-full border-l border-slate-200">
            <div className="flex flex-col gap-10 py-8 px-6 text-left">
                
                {/* CASE INFO */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2 ml-1">
                        <Info className="h-4 w-4 text-slate-400" />
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">CASE INFORMATION</h4>
                    </div>
                    <div className="bg-white border-2 border-slate-100 rounded-xl divide-y divide-slate-50 shadow-sm overflow-hidden">
                        <InfoRow label="Category" value={observation.category} isBadge />
                        <InfoRow label="Risk Index" value={observation.severity} isRisk risk={observation.severity} />
                        <InfoRow label="Site Discovery" value={project?.name} isBold />
                        <InfoRow label="Area / Unit" value={observation.location} />
                        <InfoRow label="Reporter" value={reporter?.name} />
                        <InfoRow label="Current Owner" value={currentOwner?.name} isBlue />
                        <InfoRow label="Initiated On" value={format(parseISO(observation.createdAt), 'dd MMM yyyy')} />
                        <InfoRow label="Days Open" value={`${daysOpen} Days`} isLast />
                    </div>
                </div>

                {/* GOVERNANCE HEALTH */}
                <div className="space-y-4">
                    <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2 ml-1">
                        <Activity className="h-4 w-4 text-slate-400" /> GOVERNANCE HEALTH
                    </h5>
                    <div className="p-6 bg-slate-900 rounded-[2rem] space-y-6 shadow-2xl">
                        <div className="flex items-center gap-3">
                            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">ON TRACK</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3">
                            <HealthMetric label="DAYS" value={`${daysOpen}D`} />
                            <HealthMetric label="REWORK" value="0" />
                            <HealthMetric label="ISSUES" value="0" />
                        </div>
                    </div>
                </div>

                {/* STAKEHOLDERS */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
                            <Users className="h-3.5 w-3.5" /> Stakeholder Loop
                        </h4>
                        <Button variant="ghost" className="h-6 px-2 text-[9px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 rounded-lg">Notify +</Button>
                    </div>
                    <div className="flex flex-wrap gap-2 p-1">
                        {(observation.ccUserIds || []).length > 0 ? (
                            observation.ccUserIds!.map(id => {
                                const u = users.find(x => x.id === id);
                                return (
                                    <TooltipProvider key={id}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Avatar className="h-10 w-10 border-2 border-white shadow-md ring-1 ring-slate-100 hover:scale-110 transition-transform cursor-pointer">
                                                    <AvatarImage src={u?.avatar} />
                                                    <AvatarFallback className="text-[10px] font-black bg-blue-50 text-blue-600">{u?.name?.[0]}</AvatarFallback>
                                                </Avatar>
                                            </TooltipTrigger>
                                            <TooltipContent><p className="font-bold text-xs">{u?.name}</p></TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                );
                            })
                        ) : (
                            <div className="w-full py-8 px-4 bg-slate-50 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-3 opacity-60">
                                 <Users className="h-6 w-6 text-slate-300" />
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">No additional<br/>personnel looped</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* PROTOCOL */}
                <div className="space-y-4">
                    <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2 ml-1">
                        <ShieldCheck className="h-4 w-4 text-slate-400" /> STAGE PROTOCOL
                    </h5>
                    <div className="p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] space-y-5 shadow-inner">
                        <div className="space-y-3">
                            {[
                                "Identify all involved personnel",
                                "Document site conditions",
                                "Perform technical forensics",
                                "Analyze root cause chain",
                                "Formulate remediation strategy"
                            ].map((step, i) => (
                                <div key={i} className="flex items-start gap-3 text-[10px] font-bold text-slate-500">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-slate-300 mt-0.5 shrink-0" />
                                    <span className="uppercase tracking-tight leading-tight">{step}</span>
                                </div>
                            ))}
                        </div>
                        <Button variant="outline" className="w-full h-10 text-[9px] font-black uppercase tracking-[0.2em] bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-100 transition-all">
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
        <div className={cn("flex justify-between items-center px-4 py-3 text-[11px]", !isLast && "border-b border-slate-50")}>
            <span className="font-black text-slate-400 uppercase tracking-widest">{label}</span>
            {isRisk ? (
                <Badge variant="outline" className={cn(
                    "font-black uppercase text-[9px] tracking-widest h-6 px-3 border-2 rounded-md",
                    risk === 'Low' && "text-emerald-700 border-emerald-100 bg-emerald-50",
                    risk === 'Medium' && "text-amber-700 border-amber-100 bg-amber-50",
                    risk === 'High' && "text-red-700 border-red-100 bg-red-50",
                    risk === 'Critical' && "text-white border-red-800 bg-red-700"
                )}>{value}</Badge>
            ) : isBadge ? (
                <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 font-black text-[9px] px-3 h-6 tracking-widest uppercase rounded-sm">{value}</Badge>
            ) : (
                <span className={cn("font-bold text-slate-900 uppercase truncate max-w-[160px]", isBlue && "text-blue-700", isBold && "font-black")}>{value || '—'}</span>
            )}
        </div>
    );
}

function HealthMetric({ label, value }: { label: string, value: string }) {
    return (
        <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-center">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-sm font-black text-white">{value}</p>
        </div>
    );
}
