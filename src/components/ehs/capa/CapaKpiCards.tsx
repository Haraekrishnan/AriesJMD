
'use client';

import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, ShieldAlert, Clock, CheckCircle, Target, ArrowUpRight, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EhsObservation } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';

interface CapaKpiCardsProps {
    observations: EhsObservation[];
    onFilterChange: (key: string, value: string) => void;
}

export default function CapaKpiCards({ observations, onFilterChange }: CapaKpiCardsProps) {
    const { user } = useAuth();

    const counts = useMemo(() => {
        const total = observations.filter(o => !o.parentId).length;
        const open = observations.filter(o => !o.parentId && o.status !== 'Closed').length;
        const highRisk = observations.filter(o => !o.parentId && (o.severity === 'High' || o.severity === 'Critical')).length;
        const myActions = observations.filter(o => o.stages?.[o.currentStage]?.assigneeId === user?.id && o.status !== 'Closed').length;
        const closed = observations.filter(o => !o.parentId && o.status === 'Closed').length;
        const overdue = observations.filter(o => o.status !== 'Closed' && o.targetDate && new Date(o.targetDate) < new Date()).length;

        return { total, open, highRisk, myActions, closed, overdue };
    }, [observations, user]);

    const cards = [
        { 
            label: 'Total Cases', 
            value: counts.total, 
            trend: '+12% vs last month',
            icon: FileText, 
            color: 'text-blue-600', 
            bg: 'bg-blue-50', 
            filter: { key: 'status', val: 'all' } 
        },
        { 
            label: 'High Risk', 
            value: counts.highRisk, 
            trend: '↑ 5 new',
            icon: ShieldAlert, 
            color: 'text-rose-600', 
            bg: 'bg-rose-50', 
            filter: { key: 'risk', val: 'High' } 
        },
        { 
            label: 'In Progress', 
            value: counts.open, 
            trend: '50% of total',
            icon: Clock, 
            color: 'text-amber-600', 
            bg: 'bg-amber-50', 
            filter: { key: 'status', val: 'Open' } 
        },
        { 
            label: 'Closed', 
            value: counts.closed, 
            trend: '↑ 8 this month',
            icon: CheckCircle, 
            color: 'text-emerald-600', 
            bg: 'bg-emerald-50', 
            filter: { key: 'status', val: 'Closed' } 
        },
        { 
            label: 'Overdue', 
            value: counts.overdue, 
            trend: 'Needs attention',
            icon: Target, 
            color: 'text-indigo-600', 
            bg: 'bg-indigo-50', 
            filter: { key: 'status', val: 'Overdue' } 
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {cards.map((card, i) => (
                <Card 
                    key={i} 
                    className="group hover:border-emerald-600/30 cursor-pointer transition-all duration-300 shadow-sm rounded-[1.5rem] overflow-hidden border-slate-100 bg-white"
                    onClick={() => onFilterChange(card.filter.key, card.filter.val)}
                >
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className={cn("p-3 rounded-2xl group-hover:scale-110 transition-transform duration-300", card.bg, card.color)}>
                                <card.icon className="h-5 w-5" />
                            </div>
                            <div className="text-right">
                                <span className="text-2xl font-black text-slate-900 tracking-tight">{card.value}</span>
                            </div>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{card.label}</p>
                        <div className="mt-2 flex items-center gap-1">
                            <span className={cn("text-[9px] font-bold uppercase", card.color)}>{card.trend}</span>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
