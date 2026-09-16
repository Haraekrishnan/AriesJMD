'use client';

import React, { useMemo } from 'react';
import { format, parseISO, differenceInDays, isValid } from 'date-fns';
import { 
    Info, 
    ShieldCheck, 
    Zap, 
    Users, 
    ClipboardCheck,
    History,
    Activity,
    MessageSquare,
    Send
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { cn } from '@/lib/utils';

export default function CapaCaseInformation({ observation }: { observation: EhsObservation }) {
    const { user, users } = useAuth();
    const { projects } = useGeneral();

    const project = projects.find(p => p.id === observation.projectId);
    const reporter = users.find(u => u.id === observation.reporterId);
    
    const stageData = observation.stages[observation.currentStage];
    const currentOwner = users.find(u => u.id === stageData?.assigneeId);

    const daysOpen = useMemo(() => {
        const created = parseISO(observation.createdAt);
        if (!isValid(created)) return 0;
        return differenceInDays(new Date(), created);
    }, [observation.createdAt]);

    const health = useMemo(() => {
        if (observation.status === 'Closed') return { label: 'OPTIMAL', color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' };
        if (daysOpen > 15 || observation.severity === 'Critical') return { label: 'CRITICAL', color: 'text-rose-700', bg: 'bg-rose-50', dot: 'bg-rose-500' };
        if (daysOpen > 7) return { label: 'AT RISK', color: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-500' };
        return { label: 'ON TRACK', color: 'text-blue-700', bg: 'bg-blue-50', dot: 'bg-blue-500' };
    }, [daysOpen, observation.status, observation.severity]);

    const comments = useMemo(() => {
        const stageData = observation.stages[observation.currentStage];
        if (!stageData?.comments) return [];
        return Object.values(stageData.comments).sort((a, b) => 
            parseISO(b.date).getTime() - parseISO(a.date).getTime()
        );
    }, [observation]);

    return (
        <ScrollArea className="flex-1 bg-white">
            <div className="p-6 space-y-10">
                {/* Case Details */}
                <section className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                        <Info className="h-3 w-3" /> Case Information
                    </h4>
                    <div className="space-y-3">
                        <InfoRow label="Category" value={observation.category} isBadge />
                        <InfoRow label="Risk" value={observation.severity} isBadge risk />
                        <InfoRow label="Site" value={project?.name || 'N/A'} />
                        <InfoRow label="Reporter" value={reporter?.name || 'Unknown'} />
                        <InfoRow label="Initiated" value={format(parseISO(observation.createdAt), 'dd MMM yy')} />
                        <InfoRow label="Days Open" value={`${daysOpen} Days`} isRed={daysOpen > 7} />
                    </div>
                </section>

                {/* Health Metrics */}
                <section className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                        <ShieldCheck className="h-3 w-3" /> Governance Health
                    </h4>
                    <div className={cn("p-4 rounded-xl border flex flex-col items-center text-center gap-3", health.bg)}>
                        <div className="flex items-center gap-2">
                            <div className={cn("h-2 w-2 rounded-full animate-pulse", health.dot)} />
                            <span className={cn("font-black text-[11px] uppercase tracking-widest", health.color)}>{health.label}</span>
                        </div>
                        <div className="grid grid-cols-2 w-full gap-2 text-[9px] font-black uppercase text-slate-400">
                            <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm">Age: {daysOpen}D</div>
                            <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm">Reworks: {observation.reworkCount || 0}</div>
                        </div>
                    </div>
                </section>

                {/* Activity Feed */}
                <section className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                            <Activity className="h-3 w-3" /> Activity Loop
                        </h4>
                    </div>
                    
                    <div className="space-y-6">
                        {comments.length > 0 ? (
                            comments.slice(0, 5).map((comment, i) => {
                                const author = users.find(u => u.id === comment.userId);
                                return (
                                    <div key={comment.id || i} className="flex gap-3 text-left animate-in fade-in duration-500">
                                        <Avatar className="h-7 w-7 border-2 border-white shadow-sm shrink-0">
                                            <AvatarImage src={author?.avatar} />
                                            <AvatarFallback className="text-[9px] font-black">{author?.name?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <div className="flex justify-between gap-2">
                                                <span className="text-[9px] font-black text-blue-600 uppercase tracking-tighter truncate">{author?.name}</span>
                                                <span className="text-[8px] font-bold text-slate-300 uppercase shrink-0">{format(parseISO(comment.date), 'dd MMM')}</span>
                                            </div>
                                            <p className="text-[11px] text-slate-600 leading-snug mt-0.5 line-clamp-2">{comment.text}</p>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-[10px] text-center text-slate-300 font-bold uppercase py-4">No dialogue history</p>
                        )}
                    </div>
                </section>
                
                <div className="pt-4">
                     <Button variant="outline" className="w-full h-10 font-black uppercase text-[10px] tracking-[0.2em] rounded-xl border-2">
                        <MessageSquare className="mr-2 h-3.5 w-3.5" /> Full Feed
                    </Button>
                </div>
            </div>
        </ScrollArea>
    );
}

function InfoRow({ label, value, isBadge, isRed, risk }: { label: string, value: string, isBadge?: boolean, isRed?: boolean, risk?: boolean }) {
    return (
        <div className="flex justify-between items-baseline gap-4 group">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-600 transition-colors shrink-0">{label}</span>
            {isBadge ? (
                <Badge variant="outline" className={cn(
                    "text-[9px] font-black uppercase tracking-widest h-5 px-2 bg-slate-50 border-slate-200 text-slate-600",
                    risk && value === 'High' && "bg-rose-50 text-rose-600 border-rose-100",
                    risk && value === 'Critical' && "bg-rose-600 text-white border-none"
                )}>
                    {value}
                </Badge>
            ) : (
                <span className={cn("text-[11px] font-bold text-slate-800 text-right truncate", isRed && "text-rose-600")}>{value}</span>
            )}
        </div>
    );
}
