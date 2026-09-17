
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
    Search,
    BookOpen,
    MessageSquare,
    Send
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, parseISO, isValid, differenceInDays, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';
import type { EhsObservation, CapaStage, Comment } from '@/lib/types';
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
        
        // 1. Initial Reporting
        logs.push({
            id: 'init-log',
            text: 'Initial safety finding reported.',
            date: observation.createdAt,
            userId: observation.reporterId,
            stage: 'Initiation'
        });

        // 2. Extract comments from all stages
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
        <ScrollArea className="h-full">
            <div className="flex flex-col gap-10 py-8 px-8 text-left">
                
                {/* 1. CASE INFORMATION LEDGER */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3 ml-1">
                        <Info className="h-4 w-4 text-blue-600" />
                        <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-900">CASE INFORMATION</h4>
                    </div>
                    <div className="bg-white border rounded-xl divide-y divide-slate-100 shadow-sm overflow-hidden border-[#DCE5EF]">
                        <InfoRow label="Category" value={observation.category} isBadge />
                        <InfoRow label="Risk Index" value={observation.severity} isRisk risk={observation.severity} />
                        <InfoRow label="Site" value={project?.name} isBold />
                        <InfoRow label="Area" value={observation.location || '—'} />
                        <InfoRow label="Reporter" value={reporter?.name} />
                        <InfoRow label="Owner" value={currentOwner?.name} isBlue />
                        <InfoRow label="Started" value={format(parseISO(observation.createdAt), 'dd MMMM yyyy')} />
                        <InfoRow label="Age" value={`${daysOpen} Days`} />
                        <InfoRow label="Target Closure" value="—" isLast />
                    </div>
                </div>

                {/* 2. GOVERNANCE HEALTH */}
                <div className="space-y-4">
                    <h5 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-900 flex items-center gap-3 ml-1">
                        <Activity className="h-4 w-4 text-blue-600" /> GOVERNANCE HEALTH
                    </h5>
                    <div className="p-8 rounded-2xl bg-white border border-[#DCE5EF] shadow-sm space-y-8 text-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                            <span className="text-[12px] font-black uppercase tracking-widest text-slate-700 leading-none">System Health Optimal</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                            <HealthMetric label="DAYS" value={`${daysOpen}D`} />
                            <HealthMetric label="TARGET" value="TBD" />
                            <HealthMetric label="REWORK" value="0" />
                        </div>
                    </div>
                </div>

                {/* 3. TECHNICAL AUDIT TRAIL */}
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="audit-trail" className="border-none">
                        <AccordionTrigger className="hover:no-underline p-0 mb-4">
                            <div className="flex items-center gap-3 ml-1">
                                <History className="h-4 w-4 text-blue-600" />
                                <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-900">TECHNICAL AUDIT TRAIL</h4>
                                <Badge variant="secondary" className="h-5 px-2 text-[9px] font-black ml-auto">{auditTrail.length}</Badge>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <ScrollArea className="h-[300px] pr-4">
                                <div className="space-y-6 pb-4">
                                    {auditTrail.map((log) => {
                                        const actor = users.find(u => u.id === log.userId);
                                        return (
                                            <div key={log.id} className="relative pl-6 border-l-2 border-slate-100 flex flex-col gap-1 text-left">
                                                <div className="absolute -left-1.5 top-0 w-2.5 h-2.5 rounded-full bg-white border-2 border-blue-500" />
                                                <div className="flex justify-between items-start gap-4">
                                                    <span className="text-[10px] font-black text-blue-700 uppercase tracking-tight">{actor?.name}</span>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase shrink-0">{format(parseISO(log.date), 'dd MMM, HH:mm')}</span>
                                                </div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Badge variant="outline" className="h-4 px-1.5 text-[7px] font-black uppercase tracking-tighter border-slate-200 text-slate-500 bg-slate-50">{log.stage}</Badge>
                                                </div>
                                                <p className="text-[11px] font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">{log.text}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>

                {/* 4. STAGE GUIDANCE */}
                <div className="space-y-4">
                    <h5 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-900 flex items-center gap-3 ml-1">
                        <BookOpen className="h-4 w-4 text-blue-600" /> STAGE GUIDANCE
                    </h5>
                    <div className="p-8 rounded-2xl bg-[#EFF6FF] border border-[#DBEAFE] shadow-sm space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
                                <Info className="h-4 w-4 text-white" />
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-[12px] font-black uppercase text-blue-800 tracking-tight leading-tight">Milestone Technical Protocol</p>
                                <p className="text-[10px] font-medium text-blue-600 leading-relaxed">Systematic data collection and root cause validation requirements.</p>
                            </div>
                        </div>

                        <div className="space-y-3.5">
                            <GuidelineItem text="Gather factual site information" completed />
                            <GuidelineItem text="Identify systemic vulnerabilities" completed />
                            <GuidelineItem text="Perform 5-Why root cause logic" active />
                            <GuidelineItem text="Secure forensic evidence docs" />
                            <GuidelineItem text="Validate technical findings" />
                        </div>
                    </div>
                </div>
            </div>
        </ScrollArea>
    );
}

function InfoRow({ label, value, isRisk = false, risk = '', isBlue = false, isLast = false, isBadge = false, isBold = false }: { label: string, value?: string | null, isRisk?: boolean, risk?: string, isBlue?: boolean, isLast?: boolean, isBadge?: boolean, isBold?: boolean }) {
    return (
        <div className={cn("flex justify-between items-center px-6 py-4 text-[12px]", !isLast && "border-b border-slate-50")}>
            <span className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">{label}</span>
            {isRisk ? (
                <Badge variant="outline" className={cn(
                    "font-black uppercase text-[10px] tracking-widest h-7 px-4 border rounded-sm",
                    risk === 'Low' && "text-emerald-700 bg-emerald-50 border-emerald-100",
                    risk === 'Medium' && "text-amber-700 bg-amber-50 border-amber-100",
                    risk === 'High' && "text-red-700 bg-red-50 border-red-100",
                    risk === 'Critical' && "text-white bg-red-700"
                )}>{value}</Badge>
            ) : isBadge ? (
                <Badge variant="outline" className="bg-slate-50 text-blue-700 border-blue-100 font-black text-[10px] px-4 h-7 tracking-widest uppercase rounded-sm">{value}</Badge>
            ) : (
                <span className={cn("font-black text-slate-900 uppercase truncate max-w-[200px]", isBlue && "text-blue-700", isBold && "text-sm")}>{value || '—'}</span>
            )}
        </div>
    );
}

function HealthMetric({ label, value }: { label: string, value: string }) {
    return (
        <div className="p-4 rounded-xl bg-slate-50 border border-[#DCE5EF] text-center shadow-inner">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">{label}</p>
            <p className="text-[16px] font-black text-slate-900 uppercase leading-none">{value}</p>
        </div>
    );
}

function GuidelineItem({ text, completed = false, active = false }: { text: string, completed?: boolean, active?: boolean }) {
    return (
        <div className="flex items-center gap-4">
            <div className={cn(
                "h-6 w-6 rounded-full flex items-center justify-center border-2 shrink-0 transition-all",
                completed ? "bg-blue-600 border-blue-600 text-white" : active ? "bg-white border-blue-600 text-blue-600" : "bg-white border-slate-300"
            )}>
                {completed && <CheckCircle2 className="h-4 w-4" />}
                {active && <div className="h-2 w-2 rounded-full bg-blue-600" />}
            </div>
            <span className={cn(
                "text-[11px] font-bold uppercase tracking-tight",
                completed ? "text-slate-400 line-through" : active ? "text-blue-700" : "text-slate-500"
            )}>{text}</span>
        </div>
    );
}
