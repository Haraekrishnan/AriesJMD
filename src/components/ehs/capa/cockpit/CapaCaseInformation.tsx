'use client';

import React, { useMemo } from 'react';
import { 
    Info,
    Activity,
    History,
    ShieldCheck,
    MessageSquare,
    ChevronDown,
    Clock,
    User
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, parseISO, isValid, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import type { EhsObservation, Comment } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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

    const auditTrail = useMemo(() => {
        const logs: { text: string; date: string; userId: string; stage: string; id: string }[] = [];
        
        logs.push({
            id: 'init-log',
            text: 'Initial safety finding reported and authorized.',
            date: observation.createdAt,
            userId: observation.reporterId,
            stage: 'Initiation'
        });

        Object.entries(observation.stages).forEach(([stageName, stage]) => {
            if (stage.comments) {
                Object.values(stage.comments).forEach((c: Comment) => {
                    logs.push({
                        id: c.id,
                        text: c.text,
                        date: c.date,
                        userId: c.userId,
                        stage: stageName
                    });
                });
            }
        });

        return logs.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    }, [observation]);

    return (
        <div className="flex flex-col h-full bg-white text-left divide-y-2 divide-slate-900">
            {/* 1. CASE LEDGER */}
            <div className="p-8 space-y-6">
                <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900 flex items-center gap-3">
                    <Info className="h-4 w-4 text-blue-600" /> CASE INFORMATION LEDGER
                </h4>
                <div className="border-2 border-slate-900 bg-white divide-y-2 divide-slate-900 overflow-hidden">
                    <InfoRow label="Category" value={observation.category} />
                    <InfoRow label="Risk Level" value={observation.severity} isRisk risk={observation.severity} />
                    <InfoRow label="Operational Site" value={project?.name} />
                    <InfoRow label="Reported By" value={reporter?.name} />
                    <InfoRow label="Phase Owner" value={currentOwner?.name} isBlue />
                </div>
            </div>

            {/* 2. GOVERNANCE METRICS */}
            <div className="p-8 space-y-6 bg-slate-50">
                <h5 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900 flex items-center gap-3">
                    <Activity className="h-4 w-4 text-blue-600" /> GOVERNANCE HEALTH
                </h5>
                <div className="grid grid-cols-3 border-2 border-slate-900 bg-white divide-x-2 divide-slate-900">
                    <MetricBlock label="DAYS" value={`${daysOpen}D`} />
                    <MetricBlock label="TARGET" value="TBD" />
                    <MetricBlock label="REWORK" value="0" />
                </div>
            </div>

            {/* 3. AUDIT TRAIL ACCORDION */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <Accordion type="single" collapsible className="w-full h-full">
                    <AccordionItem value="audit-trail" className="border-none h-full flex flex-col">
                        <AccordionTrigger className="hover:no-underline px-8 py-6 h-[70px] bg-slate-900 text-white hover:bg-black transition-all rounded-none data-[state=open]:border-b-2 data-[state=open]:border-white/20">
                            <div className="flex items-center gap-3 w-full">
                                <History className="h-4 w-4" />
                                <h4 className="text-[11px] font-black uppercase tracking-[0.3em]">TECHNICAL AUDIT TRAIL</h4>
                                <Badge className="bg-blue-500 font-black h-5 text-[9px] ml-auto rounded-none">{auditTrail.length}</Badge>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="flex-1 overflow-hidden p-0">
                            <ScrollArea className="h-[400px]">
                                <div className="p-8 space-y-8">
                                    {auditTrail.map((log) => {
                                        const actor = users.find(u => u.id === log.userId);
                                        return (
                                            <div key={log.id} className="relative pl-8 border-l-2 border-slate-200">
                                                <div className="absolute -left-[7px] top-0 w-3 h-3 bg-white border-2 border-slate-900" />
                                                <div className="flex justify-between items-baseline mb-1">
                                                    <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">{actor?.name}</span>
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{format(parseISO(log.date), 'dd MMM, HH:mm')}</span>
                                                </div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge variant="outline" className="h-4 px-1.5 text-[7px] font-black uppercase tracking-tighter border-slate-900 text-slate-900 bg-white rounded-none">{log.stage}</Badge>
                                                </div>
                                                <p className="text-[11px] font-bold text-slate-600 leading-relaxed uppercase tracking-tight">{log.text}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        </div>
    );
}

function InfoRow({ label, value, isRisk = false, risk = '', isBlue = false }: { label: string, value?: string | null, isRisk?: boolean, risk?: string, isBlue?: boolean }) {
    return (
        <div className="flex justify-between items-center px-5 py-4 text-xs font-black uppercase tracking-widest">
            <span className="text-slate-400 text-[10px]">{label}</span>
            {isRisk ? (
                <span className={cn(
                    "px-3 py-1 border-2 font-black text-[10px]",
                    risk === 'Low' && "text-emerald-700 bg-emerald-50 border-emerald-700",
                    risk === 'Medium' && "text-amber-700 bg-amber-50 border-amber-700",
                    risk === 'High' && "text-rose-700 bg-rose-50 border-rose-700",
                    risk === 'Critical' && "text-white bg-rose-700 border-rose-700"
                )}>{value}</span>
            ) : (
                <span className={cn("text-slate-900 truncate max-w-[220px]", isBlue && "text-blue-700")}>{value || '—'}</span>
            )}
        </div>
    );
}

function MetricBlock({ label, value }: { label: string, value: string }) {
    return (
        <div className="p-5 text-center flex flex-col items-center justify-center gap-1.5">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
            <p className="text-xl font-black text-slate-900 leading-none">{value}</p>
        </div>
    );
}
