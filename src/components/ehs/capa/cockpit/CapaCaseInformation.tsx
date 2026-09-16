'use client';

import React, { useMemo } from 'react';
import { 
    Activity, 
    ShieldCheck, 
    Clock, 
    MapPin, 
    User, 
    Target,
    Zap,
    Info,
    CheckCircle2,
    HelpCircle
} from 'lucide-react';
import { format, parseISO, differenceInDays, isValid } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import type { EhsObservation } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { cn } from '@/lib/utils';

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
        <div className="flex flex-col gap-6 py-6 px-5">
            {/* --- CASE INFORMATION --- */}
            <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                    <Info className="h-3.5 w-3.5" /> Case Information
                </h4>
                <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
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
            <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5" /> Governance Health
                </h4>
                <div className={cn("p-5 border rounded-2xl space-y-4 shadow-sm", healthStatus.bg)}>
                    <div className="flex items-center gap-2">
                        <div className={cn("h-2 w-2 rounded-full", healthStatus.color.replace('text', 'bg'))} />
                        <span className={cn("text-[11px] font-black uppercase tracking-widest", healthStatus.color)}>{healthStatus.label}</span>
                    </div>
                    <p className="text-[9px] font-bold text-slate-500 leading-tight uppercase tracking-tight">Activities are within expected timeframe and compliance profile.</p>
                    <div className="grid grid-cols-3 gap-2">
                        <HealthMetric label="Stage Age" value="0D" />
                        <HealthMetric label="Reworks" value="0" />
                        <HealthMetric label="Overdue" value="0" />
                    </div>
                </div>
            </div>

            {/* --- STAGE GUIDANCE --- */}
            <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                    <Target className="h-3.5 w-3.5" /> Stage Guidance
                </h4>
                <div className="p-5 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-600/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 -mr-6 -mt-6 h-20 w-20 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-1000" />
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="h-7 w-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0"><Zap className="h-4 w-4" /></div>
                            <div className="space-y-1">
                                <p className="text-[11px] font-black uppercase tracking-tight">Perform a technical investigation</p>
                                <p className="text-[9px] font-medium opacity-80 leading-relaxed uppercase tracking-tight">Determine what happened, why it happened, and identify the underlying root cause.</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {['Gather factual information', 'Identify all possible causes', 'Perform 5-Why analysis', 'Collect evidence and interviews'].map((task, i) => (
                                <div key={i} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest">
                                    <CheckCircle2 className="h-3 w-3 opacity-60" /> {task}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- HELP --- */}
            <div className="mt-auto p-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center gap-4 group cursor-pointer hover:border-blue-300 transition-all">
                <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform"><HelpCircle className="h-5 w-5 text-slate-400" /></div>
                <div>
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">Need Support?</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">View documentation for this stage</p>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ label, value, isRisk = false, risk = '', isBlue = false, isLast = false }: { label: string, value?: string | null, isRisk?: boolean, risk?: string, isBlue?: boolean, isLast?: boolean }) {
    return (
        <div className={cn("flex justify-between items-center p-3 text-[10px]", !isLast && "border-b border-slate-50")}>
            <span className="font-black text-slate-400 uppercase tracking-widest">{label}</span>
            {isRisk ? (
                <Badge variant="outline" className={cn(
                    "font-black uppercase text-[8px] tracking-widest h-5",
                    risk === 'Low' && "bg-emerald-50 text-emerald-600 border-emerald-100",
                    risk === 'Medium' && "bg-amber-50 text-amber-600 border-amber-100",
                    risk === 'High' && "bg-rose-50 text-rose-600 border-rose-100",
                    risk === 'Critical' && "bg-rose-100 text-rose-900 border-rose-200"
                )}>{value}</span>
            ) : (
                <span className={cn("font-bold text-slate-900 uppercase truncate max-w-[150px]", isBlue && "text-blue-600")}>{value || '—'}</span>
            )}
        </div>
    );
}

function HealthMetric({ label, value }: { label: string, value: string }) {
    return (
        <div className="bg-white/50 backdrop-blur-sm p-2 rounded-lg text-center border border-white/40">
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
            <p className="text-[11px] font-black text-slate-900">{value}</p>
        </div>
    );
}
