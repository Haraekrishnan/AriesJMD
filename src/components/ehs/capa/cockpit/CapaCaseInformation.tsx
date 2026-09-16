'use client';

import React, { useMemo } from 'react';
import { 
    ShieldCheck, 
    Clock, 
    MapPin, 
    User, 
    Target,
    Zap,
    Info,
    CheckCircle2,
    HelpCircle,
    Activity,
    Users,
    PlusCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { EhsObservation } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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
        if (daysOpen > 15 || observation.severity === 'Critical') return { label: 'CRITICAL', color: 'text-rose-600', bg: 'bg-rose-50' };
        if (daysOpen > 7 || observation.severity === 'High') return { label: 'AT RISK', color: 'text-amber-600', bg: 'bg-amber-50' };
        return { label: 'ON TRACK', color: 'text-blue-600', bg: 'bg-blue-50' };
    }, [observation.status, observation.severity, daysOpen]);

    return (
        <ScrollArea className="h-full">
            <div className="flex flex-col gap-8 py-6 px-5">
                {/* --- CASE INFORMATION --- */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2 px-1">
                        <Info className="h-3.5 w-3.5" /> Case Information
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
                <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2 px-1">
                        <ShieldCheck className="h-3.5 w-3.5" /> Governance Health
                    </h4>
                    <div className={cn("p-5 border rounded-2xl space-y-5 shadow-sm", healthStatus.bg)}>
                        <div className="flex items-center gap-2">
                            <div className={cn("h-2 w-2 rounded-full", healthStatus.color.replace('text', 'bg'))} />
                            <span className={cn("text-[11px] font-black uppercase tracking-widest", healthStatus.color)}>{healthStatus.label}</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                            <HealthMetric label="Stage Age" value="0D" />
                            <HealthMetric label="Reworks" value="0" />
                            <HealthMetric label="Overdue" value="0" />
                        </div>
                    </div>
                </div>

                {/* --- STAKEHOLDER LOOP --- */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                            <Users className="h-3.5 w-3.5" /> Stakeholder Loop
                        </h4>
                        <Button variant="ghost" className="h-6 px-2 text-[9px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 rounded-lg">Notify +</Button>
                    </div>
                    <div className="flex flex-wrap gap-2 p-1">
                        <Avatar className="h-10 w-10 border-2 border-white shadow-md ring-1 ring-slate-100">
                            <AvatarImage src={reporter?.avatar}/>
                            <AvatarFallback className="bg-slate-100 text-[10px] font-black">{reporter?.name?.[0]}</AvatarFallback>
                        </Avatar>
                        {currentOwner && currentOwner.id !== reporter?.id && (
                            <Avatar className="h-10 w-10 border-2 border-white shadow-md ring-1 ring-slate-100">
                                <AvatarImage src={currentOwner.avatar}/>
                                <AvatarFallback className="bg-blue-50 text-blue-600 text-[10px] font-black">{currentOwner.name?.[0]}</AvatarFallback>
                            </Avatar>
                        )}
                        <div className="h-10 w-10 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50/50">
                            <PlusCircle className="h-4 w-4 text-slate-300" />
                        </div>
                    </div>
                </div>

                {/* --- STAGE GUIDANCE --- */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2 px-1">
                        <Target className="h-3.5 w-3.5" /> Stage Guidance
                    </h4>
                    <div className="p-5 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-600/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 -mr-6 -mt-6 h-20 w-20 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-1000" />
                        <div className="relative z-10 space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="h-7 w-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0"><Zap className="h-4 w-4" /></div>
                                <div className="space-y-1">
                                    <p className="text-[11px] font-black uppercase tracking-tight">Active Lifecycle Instruction</p>
                                    <p className="text-[9px] font-medium opacity-80 leading-relaxed uppercase tracking-tight">Complete the technical methodology required for this specific milestone.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- RECENT ACTIVITY --- */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2 px-1">
                        <Activity className="h-3.5 w-3.5" /> Timeline
                    </h4>
                    <div className="space-y-4 p-1">
                        <div className="flex gap-3">
                            <div className="w-1 bg-emerald-500 rounded-full shrink-0" />
                            <div>
                                <p className="text-[10px] font-black text-slate-900 uppercase">Case Initiated</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">{format(parseISO(observation.createdAt), 'dd MMM, p')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ScrollArea>
    );
}

function InfoRow({ label, value, isRisk = false, risk = '', isBlue = false, isLast = false }: { label: string, value?: string | null, isRisk?: boolean, risk?: string, isBlue?: boolean, isLast?: boolean }) {
    return (
        <div className={cn("flex justify-between items-center p-3 text-[10px]", !isLast && "border-b border-slate-50")}>
            <span className="font-black text-slate-400 uppercase tracking-widest">{label}</span>
            {isRisk ? (
                <Badge variant="outline" className={cn(
                    "font-black uppercase text-[8px] tracking-widest h-5 px-3 border-2",
                    risk === 'Low' && "bg-emerald-50 text-emerald-600 border-emerald-100",
                    risk === 'Medium' && "bg-amber-50 text-amber-600 border-amber-100",
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
        <div className="bg-white/80 backdrop-blur-sm p-2 rounded-lg text-center border border-slate-100 shadow-sm">
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
            <p className="text-[11px] font-black text-slate-900">{value}</p>
        </div>
    );
}

function parseISO(s: string) {
    return new Date(s);
}

function isValid(d: Date) {
    return d instanceof Date && !isNaN(d.getTime());
}

function differenceInDays(a: Date, b: Date) {
    return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}
