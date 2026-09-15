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
            label: 'Total Cases', 
            value: stats.total, 
            icon: FileText, 
            trend: '+ 12% vs last month', 
            color: 'text-slate-900', 
            bg: 'bg-white',
            border: 'border-slate-200',
            onClick: () => onFilterByStatus('all')
        },
        { 
            label: 'High Risk', 
            value: stats.highRisk, 
            icon: ShieldAlert, 
            trend: 'Priority Actions', 
            color: 'text-rose-600', 
            bg: 'bg-white',
            border: 'border-rose-200',
            onClick: () => onFilterByRisk('High')
        },
        { 
            label: 'In Progress', 
            value: stats.inProgress, 
            icon: Zap, 
            trend: 'Active Workflow', 
            color: 'text-blue-600', 
            bg: 'bg-white',
            border: 'border-blue-200',
            onClick: () => onFilterByStatus('In Progress')
        },
        { 
            label: 'Closed', 
            value: stats.closed, 
            icon: CheckCircle2, 
            trend: 'Validated Completion', 
            color: 'text-emerald-600', 
            bg: 'bg-white',
            border: 'border-emerald-200',
            onClick: () => onFilterByStatus('Closed')
        },
        { 
            label: 'Overdue', 
            value: stats.overdue, 
            icon: AlertTriangle, 
            trend: 'Immediate Action', 
            color: 'text-rose-700', 
            bg: 'bg-rose-50/30',
            border: 'border-rose-300',
            onClick: () => onFilterByStatus('Overdue')
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {cards.map((card, index) => (
                <Card 
                    key={index} 
                    className={cn(
                        "cursor-pointer transition-all duration-300 hover:shadow-md border-2",
                        card.bg,
                        card.border
                    )}
                    onClick={card.onClick}
                >
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className={cn(
                            "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                            card.bg === 'bg-white' ? 'bg-slate-50' : 'bg-white'
                        )}>
                            <card.icon className={cn("h-6 w-6", card.color)} />
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{card.label}</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-2xl font-black text-slate-900 tracking-tighter">{card.value}</p>
                                <span className="text-[8px] font-bold text-slate-400 uppercase truncate max-w-[80px]">{card.trend}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
