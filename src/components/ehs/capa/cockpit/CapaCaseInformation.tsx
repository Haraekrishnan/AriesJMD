'use client';

import React from 'react';
import { 
    Info,
    Activity,
    ShieldCheck,
    CheckCircle2,
    History
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import type { EhsObservation } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

export default function CapaCaseInformation({ observation }: { observation: EhsObservation }) {
    const { users } = useAuth();
    const { projects } = useGeneral();

    const project = projects.find(p => p.id === observation.projectId);
    const reporter = users.find(u => u.id === observation.reporterId);
    const sData = observation.stages[observation.currentStage];

    return (
        <div className="flex flex-col h-full bg-white text-left divide-y-2 divide-slate-900 border-l-2 border-slate-900">
            {/* 1. CASE LEDGER */}
            <div className="p-6 space-y-6">
                <h4 className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-900 flex items-center gap-3">
                    <Info className="h-5 w-5 text-[#2563EB]" /> CASE LEDGER
                </h4>
                <div className="space-y-4">
                    <MetaRow label="Category" value={observation.category} isBlack />
                    <MetaRow label="Risk Index" value={observation.severity} isRisk />
                    <MetaRow label="Operational Site" value={project?.name} isBlack />
                    <MetaRow label="Discovery Area" value={observation.location || '—'} />
                    <MetaRow label="Reporting Official" value={reporter?.name} isBlack />
                    <MetaRow label="Started On" value={format(parseISO(observation.createdAt), 'dd MMM yyyy')} />
                </div>
            </div>

            {/* 2. GOVERNANCE HEALTH GRID */}
            <div className="p-6 space-y-6 bg-slate-50">
                <h4 className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-900 flex items-center gap-3">
                    <Activity className="h-5 w-5 text-[#2563EB]" /> GOVERNANCE HEALTH
                </h4>
                <div className="grid grid-cols-3 border-2 border-slate-900 bg-white divide-x-2 divide-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <MetricBox label="DAYS" value="1D" />
                    <MetricBox label="REWORK" value="0" />
                    <MetricBox label="STAGES" value="1/7" />
                </div>
                <div className="flex items-center gap-3 p-3 bg-emerald-50 border-2 border-emerald-900">
                    <div className="h-2 w-2 rounded-none bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">SYSTEM STATUS: OPTIMAL</span>
                </div>
            </div>

            {/* 3. TECHNICAL AUDIT TRAIL */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <Accordion type="single" collapsible defaultValue="audit" className="w-full">
                    <AccordionItem value="audit" className="border-none">
                        <AccordionTrigger className="p-6 hover:no-underline bg-white border-b-2 border-slate-900">
                             <h4 className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-900 flex items-center gap-3">
                                <History className="h-5 w-5 text-[#2563EB]" /> AUDIT TRAIL
                            </h4>
                        </AccordionTrigger>
                        <AccordionContent className="p-0">
                            <ScrollArea className="h-[250px]">
                                <div className="p-6 space-y-6">
                                    <AuditStep 
                                        official={reporter?.name || 'Unknown'} 
                                        action="CASE INITIATED" 
                                        date={observation.createdAt} 
                                        isStart 
                                    />
                                    {observation.lastUpdated && (
                                        <AuditStep 
                                            official="SYSTEM" 
                                            action="STATUS SYNCHRONIZED" 
                                            date={observation.lastUpdated} 
                                        />
                                    )}
                                </div>
                            </ScrollArea>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>

            {/* 4. STAGE GUIDANCE */}
            <div className="p-6 space-y-4 bg-slate-900 text-white">
                <h4 className="text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-[#2563EB]" /> STAGE GUIDANCE
                </h4>
                <div className="space-y-2 pt-2">
                    {['Identify involved personnel', 'Document site coordinates', 'Trace chronological sequence', 'Identify direct cause', 'Record documents'].map((task, i) => (
                        <div key={i} className="flex items-center gap-3 opacity-80">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest">{task}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function MetaRow({ label, value, isRisk, isBlack }: any) {
    return (
        <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest border-b border-slate-100 pb-2">
            <span className="text-slate-400">{label}</span>
            {isRisk ? (
                <Badge className="bg-amber-500 text-white border-none font-black px-2 h-4 text-[8px] rounded-none">MEDIUM</Badge>
            ) : (
                <span className={cn(isBlack ? "text-slate-900" : "text-slate-600")}>{value || '—'}</span>
            )}
        </div>
    );
}

function MetricBox({ label, value }: { label: string, value: string }) {
    return (
        <div className="p-3 text-center">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-sm font-black text-slate-900 tracking-tighter">{value}</p>
        </div>
    );
}

function AuditStep({ official, action, date, isStart }: { official: string, action: string, date: string, isStart?: boolean }) {
    return (
        <div className="relative pl-6 border-l-2 border-slate-200">
            <div className={cn(
                "absolute -left-[7px] top-0 h-3 w-3 border-2 border-white rounded-none shadow-sm",
                isStart ? "bg-emerald-500" : "bg-[#2563EB]"
            )} />
            <p className="text-[10px] font-black text-slate-900 uppercase leading-none">{action}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">BY: {official}</p>
            <p className="text-[8px] font-bold text-slate-400 mt-0.5">{format(parseISO(date), 'dd MMM, HH:mm')}</p>
        </div>
    );
}
