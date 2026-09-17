'use client';

import React, { useMemo } from 'react';
import { 
    ShieldCheck, 
    Clock, 
    MapPin, 
    User, 
    Zap,
    Info,
    CheckCircle2,
    Activity,
    Users,
    PlusCircle
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

    const healthStatus = useMemo(() => {
        if (observation.status === 'Closed') return { label: 'ON TRACK', color: 'text-emerald-600', bg: 'bg-emerald-50' };
        if (daysOpen > 14 || observation.severity === 'Critical') return { label: 'CRITICAL', color: 'text-rose-600', bg: 'bg-rose-50' };
        if (daysOpen > 7 || observation.severity === 'High') return { label: 'AT RISK', color: 'text-amber-600', bg: 'bg-amber-50' };
        return { label: 'ON TRACK', color: 'text-blue-600', bg: 'bg-blue-50' };
    }, [observation.status, observation.severity, daysOpen]);

    const stageAge = useMemo(() => {
        const lastUpdated = observation.lastUpdated || observation.createdAt;
        return differenceInDays(new Date(), parseISO(lastUpdated));
    }, [observation]);

    return (
        <ScrollArea className="h-full">
            <div className="flex flex-col gap-8 py-8 px-6">
                {/* --- CASE INFORMATION --- */}
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 flex items-center gap-2 px-1">
                        <Info className="h-4 w-4" /> CASE INFORMATION
                    </h4>
                    <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                        <InfoRow label="Category" value={observation.category} />
                        <InfoRow label="Risk Index" value={observation.severity} isRisk risk={observation.severity} />
                        <InfoRow label="Site" value={project?.name} />
                        <InfoRow label="Area" value={observation.location} />
                        <InfoRow label="Reporter" value={reporter?.name} />
                        <InfoRow label="Current Owner" value={currentOwner?.name} isBlue />
                        <InfoRow label="Initiated On" value={format(parseISO(observation.createdAt), 'dd MMM yyyy')} />
                        <InfoRow label="Days Open" value={`${daysOpen} Days`} isLast />
                    </div>
                </div>

                {/* --- GOVERNANCE HEALTH --- */}
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 flex items-center gap-2 px-1">
                        <ShieldCheck className="h-4 w-4" /> GOVERNANCE HEALTH
                    </h4>
                    <div className={cn("p-6 border rounded-2xl space-y-6 shadow-sm", healthStatus.bg)}>
                        <div className="flex items-center gap-2">
                            <div className={cn("h-2.5 w-2.5 rounded-full", healthStatus.color.replace('text', 'bg'))} />
                            <span className={cn("text-[11px] font-black uppercase tracking-[0.2em]", healthStatus.color)}>{healthStatus.label}</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3">
                            <HealthMetric label="STAGE AGE" value={`${stageAge}D`} />
                            <HealthMetric label="REWORKS" value={`${observation.reworkCount || 0}`} />
                            <HealthMetric label="OVERDUE" value="0" />
                        </div>
                    </div>
                </div>

                {/* --- STAGE GUIDANCE --- */}
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 flex items-center gap-2 px-1">
                        <Zap className="h-4 w-4" /> STAGE GUIDANCE
                    </h4>
                    <div className="p-6 bg-[#0F172A] rounded-2xl text-white shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 -mr-8 -mt-8 h-24 w-24 bg-white/10 rounded-full blur-2xl transition-transform duration-700 group-hover:scale-150" />
                        <div className="relative z-10 space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20"><Activity className="h-4 w-4" /></div>
                                <div className="space-y-1.5 text-left">
                                    <p className="text-xs font-black uppercase tracking-tight">ACTIVE LIFECYCLE PROTOCOL</p>
                                    <p className="text-[10px] font-medium opacity-80 leading-relaxed uppercase tracking-tight">
                                        {getGuidance(observation.currentStage)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- STAKEHOLDER LOOP --- */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 flex items-center gap-2">
                            <Users className="h-4 w-4" /> STAKEHOLDER LOOP
                        </h4>
                        <Button variant="ghost" className="h-6 px-3 text-[9px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 rounded-lg">Notify +</Button>
                    </div>
                    <div className="flex flex-wrap gap-2.5 p-1">
                        <Avatar className="h-11 w-11 border-2 border-white shadow-md ring-1 ring-slate-100 hover:scale-110 transition-transform">
                            <AvatarImage src={reporter?.avatar}/>
                            <AvatarFallback className="bg-slate-100 text-xs font-black">{reporter?.name?.[0]}</AvatarFallback>
                        </Avatar>
                        {currentOwner && currentOwner.id !== reporter?.id && (
                            <Avatar className="h-11 w-11 border-2 border-white shadow-md ring-1 ring-slate-100 hover:scale-110 transition-transform">
                                <AvatarImage src={currentOwner.avatar}/>
                                <AvatarFallback className="bg-blue-50 text-blue-600 text-xs font-black">{currentOwner.name?.[0]}</AvatarFallback>
                            </Avatar>
                        )}
                        <div className="h-11 w-11 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50/50 cursor-pointer hover:bg-slate-100 transition-colors text-slate-400">
                            <PlusCircle className="h-5 w-5" />
                        </div>
                    </div>
                </div>
            </div>
        </ScrollArea>
    );
}

function getGuidance(stage: string) {
    switch(stage) {
        case 'Investigation': return 'SYSTEMATICALLY IDENTIFY ROOT CAUSES USING 5-WHY ANALYSIS AND DOCUMENT ALL FIELD EVIDENCE.';
        case 'Resolution': return 'FORMULATE DURABLE CORRECTIVE ACTIONS AND OBTAIN OPERATIONAL OWNER BUY-IN.';
        case 'Implementation': return 'EXECUTE APPROVED REMEDIATIONS AND RECORD OBJECTIVE EVIDENCE (BEFORE/AFTER PHOTOS).';
        default: return 'FULFILL THE STANDARD OPERATIONAL METHODOLOGY FOR THIS SAFETY MILESTONE.';
    }
}

function InfoRow({ label, value, isRisk = false, risk = '', isBlue = false, isLast = false }: { label: string, value?: string | null, isRisk?: boolean, risk?: string, isBlue?: boolean, isLast?: boolean }) {
    return (
        <div className={cn("flex justify-between items-center p-4 text-[10px]", !isLast && "border-b border-slate-50")}>
            <span className="font-black text-slate-400 uppercase tracking-widest">{label}</span>
            {isRisk ? (
                <Badge variant="outline" className={cn(
                    "font-black uppercase text-[8px] tracking-widest h-5 px-3 border-2",
                    risk === 'Low' && "bg-emerald-50 text-emerald-600 border-emerald-100",
                    risk === 'Medium' && "bg-amber-50 text-amber-700 border-amber-100",
                    risk === 'High' && "bg-rose-50 text-rose-600 border-rose-100",
                    risk === 'Critical' && "bg-rose-100 text-rose-900 border-rose-200"
                )}>{value}</Badge>
            ) : (
                <span className={cn("font-bold text-slate-900 uppercase truncate max-w-[150px]", isBlue && "text-blue-600")}>{value || '—'}</span>
            )}
        </div>
    );
}

function HealthMetric({ label, value }: { label: string, value: string }) {
    return (
        <div className="bg-white/80 backdrop-blur-sm p-2.5 rounded-xl text-center border border-slate-100 shadow-sm">
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-[11px] font-black text-slate-900">{value}</p>
        </div>
    );
}
