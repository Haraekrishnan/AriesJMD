'use client';

import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
    FileText, 
    ShieldAlert, 
    Clock, 
    CheckCircle2, 
    AlertTriangle,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import type { EhsObservation } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CapaKpiCardsProps {
    observations: EhsObservation[];
}

export default function CapaKpiCards({ observations }: CapaKpiCardsProps) {
    const stats = useMemo(() => {
        const total = observations.length;
        const open = observations.filter(o => o.status !== 'Closed').length;
        const highRisk = observations.filter(o => o.severity === 'High' || o.severity === 'Critical').length;
        const inProgress = observations.filter(o => o.status === 'In Progress').length;
        const closed = observations.filter(o => o.status === 'Closed').length;
        const overdue = observations.filter(o => {
            if (o.status === 'Closed') return false;
            // Simple overdue logic based on age for this mockup
            const ageDays = Math.floor((Date.now() - new Date(o.createdAt).getTime()) / (1000 * 60 * 60 * 24));
            return ageDays > 10;
        }).length;

        return { total, open, highRisk, inProgress, closed, overdue };
    }, [observations]);

    const cards = [
        { 
            label: 'Total Cases', 
            value: stats.total, 
            icon: FileText, 
            trend: '+ 12% vs last month', 
            trendUp: true, 
            color: 'text-blue-600', 
            bg: 'bg-blue-50' 
        },
        { 
            label: 'High Risk', 
            value: stats.highRisk, 
            icon: ShieldAlert, 
            trend: '↑ 5 new', 
            trendUp: true, 
            color: 'text-rose-600', 
            bg: 'bg-rose-50' 
        },
        { 
            label: 'In Progress', 
            value: stats.inProgress, 
            icon: Clock, 
            trend: '50% of total', 
            trendUp: false, 
            color: 'text-amber-600', 
            bg: 'bg-amber-50' 
        },
        { 
            label: 'Closed', 
            value: stats.closed, 
            icon: CheckCircle2, 
            trend: '↑ 8 this month', 
            trendUp: true, 
            color: 'text-emerald-600', 
            bg: 'bg-emerald-50' 
        },
        { 
            label: 'Overdue', 
            value: stats.overdue, 
            icon: AlertTriangle, 
            trend: 'Needs attention', 
            trendUp: true, 
            color: 'text-indigo-600', 
            bg: 'bg-indigo-50' 
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {cards.map((card, index) => (
                <Card key={index} className="border-none shadow-sm rounded-[2rem] overflow-hidden group hover:shadow-md transition-all">
                    <CardContent className="p-6 flex items-center gap-5">
                        <div className={cn("h-14 w-14 rounded-[1.25rem] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform", card.bg)}>
                            <card.icon className={cn("h-7 w-7", card.color)} />
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{card.label}</p>
                            <p className="text-3xl font-black text-slate-900 tracking-tighter">{card.value}</p>
                            <div className="flex items-center gap-1">
                                <span className={cn("text-[9px] font-bold flex items-center", card.trendUp ? "text-emerald-600" : "text-slate-400")}>
                                    {card.trend}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
