'use client';
import { FileText, ShieldAlert, CheckCircle2, AlertTriangle, Zap } from 'lucide-react';
import type { EhsObservation } from '@/lib/types';
import { isObservationOverdue } from '@/lib/ehs-observations';
import { cn } from '@/lib/utils';
export default function CapaKpiCards({ observations, onFilterByStatus, onFilterByRisk }: {
  observations: EhsObservation[]; onFilterByStatus: (status: string) => void; onFilterByRisk: (risk: string) => void;
}) {
  const cards = [
    { label: 'Total cases', value: observations.length, icon: FileText, detail: 'All observations', tone: 'bg-blue-50 text-blue-600', action: () => onFilterByStatus('all') },
    { label: 'High risk', value: observations.filter(o => ['High', 'Critical'].includes(o.severity)).length, icon: ShieldAlert, detail: 'High & critical severity', tone: 'bg-rose-50 text-rose-600', action: () => onFilterByRisk('high-priority') },
    { label: 'In progress', value: observations.filter(o => ['Open', 'In Progress'].includes(o.status)).length, icon: Zap, detail: 'Open & in progress', tone: 'bg-blue-50 text-blue-600', action: () => onFilterByStatus('active') },
    { label: 'Closed', value: observations.filter(o => o.status === 'Closed').length, icon: CheckCircle2, detail: 'Completed cases', tone: 'bg-emerald-50 text-emerald-600', action: () => onFilterByStatus('Closed') },
    { label: 'Overdue', value: observations.filter(o => isObservationOverdue(o)).length, icon: AlertTriangle, detail: 'Past the target date', tone: 'bg-rose-50 text-rose-600', action: () => onFilterByStatus('Overdue') },
  ];
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5 xl:gap-4">
    {cards.map(card => <button key={card.label} onClick={card.action} className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', card.tone)}><card.icon className="h-5 w-5" /></span>
      <span className="min-w-0"><span className="block text-sm font-medium text-slate-600">{card.label}</span><span className="mt-1 block text-3xl font-semibold tracking-tight text-slate-950">{card.value}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{card.detail}</span></span>
    </button>)}
  </div>;
}
