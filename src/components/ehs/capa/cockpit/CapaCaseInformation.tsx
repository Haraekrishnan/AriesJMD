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

    const stageAge = useMemo(() => {
        const lastUpdated = observation.lastUpdated || observation.createdAt;
        return differenceInDays(new Date(), parseISO(lastUpdated));
    }, [observation]);

    return (
        <ScrollArea className="h-full">
            <div className="flex flex-col gap-6 py-6 px-5 text-left">
                {/* --- CASE INFORMATION --- */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 px-1">
                        <Info className="h-3.5 w-3.5" /> Case Information
                    </h4>
                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                        <InfoRow label="Category" value={observation.category} />
                        <InfoRow label="Risk Index" value={observation.severity} isRisk risk={observation.severity} />
                        <InfoRow label="Site" value={project?.name} />
                        <InfoRow label="Area" value={observation.location} />
                        <InfoRow label="Reporter" value={reporter?.name} />
                        <InfoRow label="Current Owner" value={currentOwner?.name} isBlue />
                        <InfoRow label="Initiated" value={format(parseISO(observation.createdAt), 'dd MMM yyyy')} />
                        <InfoRow label="Days Open" value={`${daysOpen} Days`} isLast />
                    </div>
                </div>

                {/* --- GOVERNANCE HEALTH --- */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 px-1">
                        <ShieldCheck className="h-3.5 w-3.5" /> Governance Health
                    </h4>
                    <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-4 shadow-sm">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">On Track</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                            <HealthMetric label="AGE" value={`${stageAge}D`} />
                            <HealthMetric label="REWORKS" value={`${observation.reworkCount || 0}`} />
                            <HealthMetric label="OVERDUE" value="0" />
                        </div>
                    </div>
                </div>

                {/* --- STAGE GUIDANCE --- */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 px-1">
                        <Zap className="h-3.5 w-3.5" /> Stage Guidance
                    </h4>
                    <div className="p-4 bg-[#0F172A] rounded-lg text-white shadow-sm space-y-3">
                        <div className="flex items-start gap-3">
                            <Activity className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                            <p className="text-[10px] font-medium opacity-80 leading-relaxed uppercase tracking-tight">
                                {getGuidance(observation.currentStage)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* --- STAKEHOLDER LOOP --- */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                            <Users className="h-3.5 w-3.5" /> Stakeholder Loop
                        </h4>
                        <Button variant="ghost" className="h-5 px-2 text-[8px] font-bold uppercase tracking-widest text-blue-600 hover:bg-blue-50">Notify +</Button>
                    </div>
                    <div className="flex flex-wrap gap-2 p-1">
                        <Avatar className="h-8 w-8 border-2 border-white shadow-sm ring-1 ring-slate-100">
                            <AvatarImage src={reporter?.avatar}/>
                            <AvatarFallback className="bg-slate-100 text-[8px] font-bold">{reporter?.name?.[0]}</AvatarFallback>
                        </Avatar>
                        {currentOwner && currentOwner.id !== reporter?.id && (
                            <Avatar className="h-8 w-8 border-2 border-white shadow-sm ring-1 ring-slate-100">
                                <AvatarImage src={currentOwner.avatar}/>
                                <AvatarFallback className="bg-blue-50 text-blue-600 text-[8px] font-bold">{currentOwner.name?.[0]}</AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                </div>
            </div>
        </ScrollArea>
    );
}

function getGuidance(stage: string) {
    switch(stage) {
        case 'Investigation': return 'Systematically identify root causes using 5-Why analysis and document all field evidence.';
        case 'Resolution': return 'Formulate durable corrective actions and obtain operational owner buy-in.';
        case 'Implementation': return 'Execute approved remediations and record objective evidence (photos/docs).';
        default: return 'Fulfill the standard operational methodology for this safety milestone.';
    }
}

function InfoRow({ label, value, isRisk = false, risk = '', isBlue = false, isLast = false }: { label: string, value?: string | null, isRisk?: boolean, risk?: string, isBlue?: boolean, isLast?: boolean }) {
    return (
        <div className={cn("flex justify-between items-center p-3 text-[10px]", !isLast && "border-b border-slate-50")}>
            <span className="font-bold text-slate-400 uppercase tracking-widest">{label}</span>
            {isRisk ? (
                <Badge variant="outline" className={cn(
                    "font-bold uppercase text-[8px] tracking-widest h-4 px-2 border",
                    risk === 'Low' && "text-emerald-600 border-emerald-100 bg-emerald-50/30",
                    risk === 'Medium' && "text-amber-600 border-amber-100 bg-amber-50/30",
                    risk === 'High' && "text-rose-600 border-rose-100 bg-rose-50/30",
                    risk === 'Critical' && "text-rose-900 border-rose-200 bg-rose-100"
                )}>{value}</Badge>
            ) : (
                <span className={cn("font-semibold text-slate-900 uppercase truncate max-w-[150px]", isBlue && "text-blue-600")}>{value || '—'}</span>
            )}
        </div>
    );
}

function HealthMetric({ label, value }: { label: string, value: string }) {
    return (
        <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100 shadow-sm">
            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
            <p className="text-[10px] font-bold text-slate-900">{value}</p>
        </div>
    );
}