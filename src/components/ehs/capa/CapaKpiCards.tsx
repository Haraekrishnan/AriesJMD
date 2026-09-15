
'use client';

import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, Clock, CheckCircle, Target, Activity, AlertCircle } from 'lucide-react';
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
        const critical = observations.filter(o => !o.parentId && o.severity === 'Critical').length;
        const high = observations.filter(o => !o.parentId && o.severity === 'High').length;
        const myActions = observations.filter(o => o.stages?.[o.currentStage]?.assigneeId === user?.id && o.status !== 'Closed').length;
        const review = observations.filter(o => o.stages?.[o.currentStage]?.status === 'In Progress' && user?.role === 'Admin').length;
        const closed = observations.filter(o => !o.parentId && o.status === 'Closed').length;

        return { total, open, highRisk: critical + high, critical, myActions, review, closed };
    }, [observations, user]);

    const cards = [
        { label: 'Total Cases', value: counts.total, icon: Activity, color: 'text-slate-600', bg: 'bg-slate-50', filter: { key: 'status', val: 'all' } },
        { label: 'High & Critical', value: counts.highRisk, icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50', filter: { key: 'risk', val: 'High' } },
        { label: 'My Action Req.', value: counts.myActions, icon: Target, color: 'text-blue-600', bg: 'bg-blue-50', filter: { key: 'status', val: 'Open' } },
        { label: 'Waiting Review', value: counts.review, icon: ShieldAlert, color: 'text-amber-600', bg: 'bg-amber-50', filter: { key: 'status', val: 'In Progress' } },
        { label: 'Case Closures', value: counts.closed, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', filter: { key: 'status', val: 'Closed' } },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {cards.map((card, i) => (
                <Card 
                    key={i} 
                    className="group hover:border-primary/30 cursor-pointer transition-all duration-300 shadow-sm rounded-3xl overflow-hidden border-slate-100"
                    onClick={() => onFilterChange(card.filter.key, card.filter.val)}
                >
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className={cn("p-3 rounded-2xl group-hover:scale-110 transition-transform duration-300", card.bg, card.color)}>
                                <card.icon className="h-5 w-5" />
                            </div>
                            <span className="text-2xl font-black text-slate-900 tracking-tight">{card.value}</span>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{card.label}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
