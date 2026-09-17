'use client';

import React, { useMemo } from 'react';
import { 
    ShieldCheck, 
    MapPin, 
    User, 
    Zap,
    CheckCircle2,
    Activity,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, parseISO, isValid, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import type { EhsObservation } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { Button } from '@/components/ui/button';

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
            <div className="flex flex-col gap-6 py-6 px-5 text-left">
                <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-blue-600" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">CASE INFORMATION</h4>
                </div>

                <div className="space-y-4">
                    <div className="bg-white border border-slate-200 rounded divide-y divide-slate-100 shadow-sm">
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

                <div className="space-y-3">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <Activity className="h-3.5 w-3.5" /> Governance Health
                    </h5>
                    <div className="p-4 bg-white border border-slate-200 rounded space-y-4 shadow-sm">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">ON TRACK</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                            <HealthMetric label="Days" value={`${daysOpen}D`} />
                            <HealthMetric label="Rework" value="0" />
                            <HealthMetric label="Issues" value="0" />
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <ShieldCheck className="h-3.5 w-3.5" /> Stage Protocol
                    </h5>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded space-y-4">
                        <div className="space-y-2">
                            {[
                                "Identify all involved personnel",
                                "Document site conditions",
                                "Perform technical forensics",
                                "Analyze root cause chain",
                                "Formulate remediation strategy"
                            ].map((step, i) => (
                                <div key={i} className="flex items-start gap-2.5 text-[10px] font-semibold text-slate-600">
                                    <CheckCircle2 className="h-3 w-3 text-slate-400 mt-0.5 shrink-0" />
                                    <span className="uppercase tracking-tight">{step}</span>
                                </div>
                            ))}
                        </div>
                        <Button variant="outline" className="w-full h-8 text-[9px] font-black uppercase tracking-widest bg-white border-slate-300">
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
        <div className={cn("flex justify-between items-center px-3 py-2.5 text-[10px]", !isLast && "border-b border-slate-100")}>
            <span className="font-bold text-slate-400 uppercase tracking-widest">{label}</span>
            {isRisk ? (
                <Badge variant="outline" className={cn(
                    "font-black uppercase text-[8px] tracking-widest h-5 px-2 border",
                    risk === 'Low' && "text-emerald-700 border-emerald-200 bg-emerald-50",
                    risk === 'Medium' && "text-amber-700 border-amber-200 bg-amber-50",
                    risk === 'High' && "text-red-700 border-red-200 bg-red-50",
                    risk === 'Critical' && "text-white border-red-700 bg-red-700"
                )}>{value}</Badge>
            ) : isBadge ? (
                <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-300 font-bold text-[8px] px-2 h-5 tracking-widest uppercase rounded-sm">{value}</Badge>
            ) : (
                <span className={cn("font-bold text-slate-900 uppercase truncate max-w-[140px]", isBlue && "text-blue-700", isBold && "font-black")}>{value || '—'}</span>
            )}
        </div>
    );
}

function HealthMetric({ label, value }: { label: string, value: string }) {
    return (
        <div className="bg-white p-2 rounded border border-slate-200 text-center">
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
            <p className="text-[11px] font-black text-slate-900">{value}</p>
        </div>
    );
}