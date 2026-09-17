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
    ChevronRight,
    HelpCircle
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

    return (
        <ScrollArea className="h-full">
            <div className="flex flex-col gap-8 py-8 px-6 text-left">
                <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-blue-600" />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-900">CASE INTELLIGENCE</h4>
                </div>

                {/* --- CASE INFORMATION --- */}
                <div className="space-y-4">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Case Information</h5>
                    <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                        <InfoRow label="Category" value={observation.category} isBadge />
                        <InfoRow label="Risk Index" value={observation.severity} isRisk risk={observation.severity} />
                        <InfoRow label="Site" value={project?.name} isBold />
                        <InfoRow label="Area" value={observation.location} />
                        <InfoRow label="Reporter" value={reporter?.name} />
                        <InfoRow label="Current Owner" value={currentOwner?.name} isBlue />
                        <InfoRow label="Initiated" value={format(parseISO(observation.createdAt), 'dd Sept 2026')} />
                        <InfoRow label="Days Open" value={`${daysOpen} Days`} isLast />
                    </div>
                </div>

                {/* --- GOVERNANCE HEALTH --- */}
                <div className="space-y-4">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Governance Health</h5>
                    <div className="p-5 bg-white border rounded-2xl space-y-5 shadow-sm">
                        <div className="flex items-center gap-2.5">
                            <div className="h-2.5 w-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(37,99,235,0.4)]" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">ON TRACK</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium leading-tight">Activities are within expected timeframe</p>
                        
                        <div className="grid grid-cols-3 gap-3">
                            <HealthMetric label="Stage Age" value={`${daysOpen}D`} />
                            <HealthMetric label="Reworks" value="0" />
                            <HealthMetric label="Overdue" value="0" />
                        </div>
                    </div>
                </div>

                {/* --- STAGE GUIDANCE --- */}
                <div className="space-y-4">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Stage Guidance</h5>
                    <div className="p-5 bg-white border rounded-2xl space-y-6 shadow-sm">
                        <div className="flex items-start gap-4">
                            <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
                                <Activity className="h-4 w-4 text-white" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[11px] font-black text-slate-900 leading-tight uppercase">Perform a technical investigation</p>
                                <p className="text-[9px] text-slate-400 font-medium leading-relaxed">Determine what happened, why it happened, and identify the underlying root cause.</p>
                            </div>
                        </div>
                        
                        <div className="space-y-2.5">
                            {[
                                "Gather factual information",
                                "Identify all possible causes",
                                "Perform 5-Why analysis",
                                "Collect evidence and interviews",
                                "Determine systemic root cause"
                            ].map((step, i) => (
                                <div key={i} className="flex items-center gap-3 text-[10px] font-bold text-slate-600 group">
                                    <div className="h-4 w-4 rounded-full border-2 border-blue-600 flex items-center justify-center shrink-0 bg-blue-50">
                                        <CheckCircle2 className="h-2.5 w-2.5 text-blue-600" />
                                    </div>
                                    <span className="group-hover:text-blue-600 transition-colors uppercase tracking-tight">{step}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* --- SUPPORT --- */}
                <div className="p-5 bg-blue-50/30 border border-dashed border-blue-200 rounded-2xl flex items-center gap-4 group cursor-pointer hover:bg-blue-50 transition-all">
                    <div className="h-10 w-10 rounded-full bg-white border-2 border-blue-100 flex items-center justify-center shrink-0">
                        <HelpCircle className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">Need Support?</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase">View documentation for this stage</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-blue-300 group-hover:translate-x-1 transition-transform" />
                </div>
            </div>
        </ScrollArea>
    );
}

function InfoRow({ label, value, isRisk = false, risk = '', isBlue = false, isLast = false, isBadge = false, isBold = false }: { label: string, value?: string | null, isRisk?: boolean, risk?: string, isBlue?: boolean, isLast?: boolean, isBadge?: boolean, isBold?: boolean }) {
    return (
        <div className={cn("flex justify-between items-center p-3.5 text-[10px]", !isLast && "border-b border-slate-50")}>
            <span className="font-bold text-slate-400 uppercase tracking-widest">{label}</span>
            {isRisk ? (
                <Badge variant="outline" className={cn(
                    "font-black uppercase text-[8px] tracking-widest h-5 px-2 border-2",
                    risk === 'Low' && "text-emerald-600 border-emerald-100 bg-emerald-50/30",
                    risk === 'Medium' && "text-amber-600 border-amber-100 bg-amber-50/30",
                    risk === 'High' && "text-rose-600 border-rose-100 bg-rose-50/30",
                    risk === 'Critical' && "text-rose-900 border-rose-200 bg-rose-100"
                )}>{value}</Badge>
            ) : isBadge ? (
                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-none font-black text-[8px] px-2 h-5 tracking-widest uppercase">{value}</Badge>
            ) : (
                <span className={cn("font-bold text-slate-900 uppercase truncate max-w-[150px]", isBlue && "text-blue-600", isBold && "font-black")}>{value || '—'}</span>
            )}
        </div>
    );
}

function HealthMetric({ label, value }: { label: string, value: string }) {
    return (
        <div className="bg-slate-50/50 p-2.5 rounded-xl text-center border shadow-inner">
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-sm font-black text-slate-900">{value}</p>
        </div>
    );
}
