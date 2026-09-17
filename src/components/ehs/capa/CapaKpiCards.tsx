'use client';

import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
    FileText, 
    ShieldAlert, 
    Clock, 
    CheckCircle2, 
    AlertTriangle,
    Zap,
    ArrowUpRight
} from 'lucide-react';
import type { EhsObservation } from '@/lib/types';
import { cn } from '@/lib/utils';
import { parseISO, isAfter, endOfDay, isValid } from 'date-fns';

interface CapaKpiCardsProps {
    observations: EhsObservation[];
    onFilterByStatus: (status: string) => void;
    onFilterByRisk: (risk: string) => void;
}

export default function CapaKpiCards({ observations, onFilterByStatus, onFilterByRisk }: CapaKpiCardsProps) {
    const stats = useMemo(() => {
        const total = observations.length;
        const open = observations.filter(o => o.status !== 'Closed').length;
        const highRisk = observations.filter(o => o.severity === 'High' || o.severity === 'Critical').length;
        const inProgress = observations.filter(o => o.status === 'In Progress' || o.status === 'Open').length;
        const closed = observations.filter(o => o.status === 'Closed').length;
        
        const overdue = observations.filter(o => {
            if (o.status === 'Closed' || !o.targetDate) return false;
            const tDate = parseISO(o.targetDate);
            return isValid(tDate) && isAfter(new Date(), endOfDay(tDate));
        }).length;

        return { total, open, highRisk, inProgress, closed, overdue };
    }, [observations]);

    const cards = [
        { 
            label: 'TOTAL CASES', 
            value: stats.total, 
            icon: FileText, 
            trend: '+ 12% VS LAST M...', 
            color: 'text-slate-900', 
            accent: 'border-t-slate-400',
            onClick: () => onFilterByStatus('all')
        },
        { 
            label: 'HIGH RISK', 
            value: stats.highRisk, 
            icon: ShieldAlert, 
            trend: 'PRIORITY ACTIONS', 
            color: 'text-rose-600', 
            accent: 'border-t-rose-500',
            onClick: () => onFilterByRisk('High')
        },
        { 
            label: 'IN PROGRESS', 
            value: stats.inProgress, 
            icon: Zap, 
            trend: 'ACTIVE WORKFLOW', 
            color: 'text-blue-600', 
            accent: 'border-t-blue-500',
            onClick: () => onFilterByStatus('In Progress')
        },
        { 
            label: 'CLOSED', 
            value: stats.closed, 
            icon: CheckCircle2, 
            trend: 'VALIDATED COMPL...', 
            color: 'text-emerald-600', 
            accent: 'border-t-emerald-500',
            onClick: () => onFilterByStatus('Closed')
        },
        { 
            label: 'OVERDUE', 
            value: stats.overdue, 
            icon: AlertTriangle, 
            trend: 'IMMEDIATE ACTION', 
            color: 'text-rose-700', 
            accent: 'border-t-rose-600',
            onClick: () => onFilterByStatus('Overdue')
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {cards.map((card, index) => (
                <Card 
                    key={index} 
                    className={cn(
                        "cursor-pointer transition-all duration-300 hover:shadow-md border border-slate-200 border-t-4 bg-white",
                        card.accent
                    )}
                    onClick={card.onClick}
                >
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{card.label}</p>
                            <div className="flex items-center gap-3">
                                <p className="text-3xl font-black text-slate-900 tracking-tighter">{card.value}</p>
                                <span className="text-[8px] font-bold text-slate-400 uppercase leading-tight max-w-[80px]">{card.trend}</span>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl">
                            <card.icon className={cn("h-6 w-6", card.color)} />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
