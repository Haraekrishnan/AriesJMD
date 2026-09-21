'use client';

import { useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { AlertTriangle, HardHat, ClipboardCheck, GraduationCap, Globe2, Download, CalendarDays, ArrowRight, ShieldCheck, Info, BarChart3 } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { useEhs } from '@/contexts/ehs-provider';
import { useGeneral } from '@/contexts/general-provider';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import CapaInitiateDialog from '@/components/ehs/capa/CapaInitiateDialog';
import { dashboardSummary, dashboardCsv, type DashboardPeriod } from '@/lib/ehs-dashboard';
import { cn } from '@/lib/utils';

const tooltipStyle = { border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, boxShadow: '0 4px 16px #0f172a0a' };
const tickStyle = { fill: '#64748b', fontSize: 12 };

export default function EhsDashboard() {
  const { incidents, audits, trainings } = useEhs();
  const { projects } = useGeneral();
  const [site, setSite] = useState('all');
  const [period, setPeriod] = useState<DashboardPeriod>('six-months');
  const [observationOpen, setObservationOpen] = useState(false);
  const gradientId = useId().replace(/:/g, '');
  const summary = useMemo(() => dashboardSummary(incidents, audits, trainings, site, period), [incidents,audits,trainings,site,period]);
  const cards = [
    { label: 'Total incidents', value: summary.incidents, detail: 'Across the reporting period', icon: AlertTriangle, color: 'bg-rose-50 text-rose-600' },
    { label: 'Lost-time injuries', value: summary.ltis, detail: 'Recorded LTI cases', icon: HardHat, color: 'bg-amber-50 text-amber-600' },
    { label: 'Average audit score', value: summary.auditScore === null ? '—' : summary.auditScore.toFixed(1)+'%', detail: summary.auditCount ? 'Across '+summary.auditCount+' approved audits' : 'No approved audits in this period', icon: ClipboardCheck, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Training completed', value: summary.trainingSessions === null ? '—' : summary.trainingSessions, detail: summary.trainingSessions === null ? 'Training records have no site field' : 'Sessions · duration not recorded', icon: GraduationCap, color: 'bg-blue-50 text-blue-600' },
  ];
  const exportReport = () => {
    const url = URL.createObjectURL(new Blob(['\uFEFF',dashboardCsv(summary)],{type:'text/csv;charset=utf-8;'}));
    const link=document.createElement('a'); link.href=url;link.download='ehs-report-'+(site==='all'?'all-sites':'selected-site')+'-'+format(summary.start,'yyyy-MM')+'.csv';link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  };

  return <div className="ehs-page text-slate-900">
    <header className="flex flex-wrap items-center justify-between gap-5">
      <div><p className="mb-3 text-sm text-slate-500">Workspace <span className="mx-1 text-slate-300">/</span> Safety management</p><h1 className="text-3xl font-semibold tracking-tight text-slate-950 lg:text-4xl">Safety command center</h1><p className="mt-2 text-sm text-slate-500 md:text-base">A clear view of safety performance across your sites.</p></div>
      <div className="flex flex-wrap items-center gap-3">
        <Select value={site} onValueChange={setSite}><SelectTrigger aria-label="Filter dashboard by site" className="h-10 w-[180px] gap-2 bg-white"><Globe2 className="h-4 w-4 shrink-0 text-slate-500" /><SelectValue placeholder="All sites" /></SelectTrigger><SelectContent><SelectItem value="all">All sites</SelectItem>{projects.map(project=><SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}</SelectContent></Select>
        <Button variant="outline" onClick={exportReport} className="h-10 gap-2 border-blue-200 bg-white text-blue-600 hover:bg-blue-50"><Download className="h-4 w-4" />Export report</Button>
      </div>
    </header>

    <section aria-label="Reporting period" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-3"><CalendarDays className="h-5 w-5 text-slate-500" /><span className="text-sm font-medium text-slate-600">Reporting period</span><Select value={period} onValueChange={value=>setPeriod(value as DashboardPeriod)}><SelectTrigger aria-label="Reporting period" className="h-10 w-[220px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="six-months">Last 6 months</SelectItem><SelectItem value="twelve-months">Last 12 months</SelectItem><SelectItem value="this-year">This year</SelectItem></SelectContent></Select><span className="text-sm text-slate-500">{summary.periodLabel}</span></div>
      <span className="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700"><Info className="h-3.5 w-3.5" />Recorded EHS data</span>
    </section>

    <section aria-label="Safety metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(card=><article key={card.label} className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6"><span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',card.color)}><card.icon className="h-6 w-6" /></span><div className="min-w-0"><h2 className="text-sm font-medium text-slate-600">{card.label}</h2><p aria-live="polite" className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{card.value}</p><p className="mt-1.5 text-xs leading-5 text-slate-500">{card.detail}</p></div></article>)}
    </section>

    <section aria-label="Performance charts" className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_1fr]">
      <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold tracking-tight">Incident trend</h2><p className="mt-1 text-sm text-slate-500">Monthly incidents · {summary.periodLabel}</p></div><span className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-500">Monthly</span></div>
        <div role="img" aria-label={'Monthly incident trend: '+summary.months.map(m=>m.label+' '+m.incidents).join(', ')} className="mt-4 h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%"><AreaChart data={summary.months} margin={{top:22,right:15,left:-15,bottom:5}} accessibilityLayer>
            <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity={0.2} /><stop offset="100%" stopColor="#2563eb" stopOpacity={0.015} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 4" stroke="#e2e8f0" /><XAxis dataKey="month" tick={tickStyle} axisLine={false} tickLine={false} dy={9} minTickGap={15} /><YAxis tick={tickStyle} allowDecimals={false} axisLine={false} tickLine={false} domain={[0,'auto']} /><Tooltip contentStyle={tooltipStyle} formatter={value=>[value,'Incidents']} />
            <Area type="monotone" dataKey="incidents" stroke="#2563eb" strokeWidth={2.5} fill={'url(#'+gradientId+')'} dot={{r:4,fill:'#2563eb',stroke:'#fff',strokeWidth:2}} activeDot={{r:6}} isAnimationActive={false}><LabelList dataKey="incidents" position="top" fill="#1e3a5f" fontSize={12} /></Area>
          </AreaChart></ResponsiveContainer>
        </div>
        {summary.incidents===0&&<p className="mt-2 text-xs text-slate-500">No incidents recorded for this site and period.</p>}
      </article>

      <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-xl font-semibold tracking-tight">Audit performance</h2><p className="mt-1 text-sm text-slate-500">Average approved inspection score by month</p>
        {summary.auditCount ? <div role="img" aria-label={'Monthly audit scores: '+summary.months.map(m=>m.label+' '+(m.auditScore===null?'no audits':m.auditScore+'%')).join(', ')} className="mt-4 h-[220px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={summary.months} margin={{top:25,right:15,left:-15,bottom:5}} accessibilityLayer><CartesianGrid strokeDasharray="3 4" stroke="#e2e8f0" vertical={false} /><XAxis dataKey="month" tick={tickStyle} axisLine={false} tickLine={false} dy={9} minTickGap={15} /><YAxis domain={[0,100]} ticks={[0,25,50,75,100]} tick={tickStyle} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} cursor={{fill:'#f8fafc'}} formatter={value=>[value+'%','Audit score']} /><Bar dataKey="auditScore" fill="#059669" radius={[5,5,0,0]} maxBarSize={36} isAnimationActive={false}><LabelList dataKey="auditScore" position="top" formatter={(value: unknown)=>typeof value==='number'?value+'%':''} fill="#1e3a5f" fontSize={12} /></Bar></BarChart></ResponsiveContainer></div> : <div className="mt-4 flex min-h-[160px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-5 text-center py-6"><BarChart3 className="mb-3 h-9 w-9 text-slate-300" /><p className="text-sm font-medium text-slate-700">No approved audits yet</p><p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">Completed and approved inspections will appear here for the selected site and period.</p></div>}
      </article>
    </section>

    <section aria-label="Quick actions" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <h2 className="text-xl font-semibold tracking-tight">Quick actions</h2><p className="mt-1 text-sm text-slate-500">Common tasks to keep your sites safe and compliant.</p>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <button onClick={()=>setObservationOpen(true)} className="group flex items-center gap-4 rounded-lg border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/30"><span className="rounded-xl bg-blue-50 p-3 text-blue-600"><ShieldCheck className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Report an observation</span><span className="mt-1 block text-xs leading-5 text-slate-500">Record a hazard or unsafe condition</span></span><ArrowRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-blue-600" /></button>
        <Link href="/ehs/audits?new=1" className="group flex items-center gap-4 rounded-lg border border-slate-200 p-4 transition hover:border-emerald-300 hover:bg-emerald-50/30"><span className="rounded-xl bg-emerald-50 p-3 text-emerald-600"><ClipboardCheck className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Start an audit</span><span className="mt-1 block text-xs leading-5 text-slate-500">Review site safety and compliance</span></span><ArrowRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-600" /></Link>
        <Link href="/ehs/trainings?new=1" className="group flex items-center gap-4 rounded-lg border border-slate-200 p-4 transition hover:border-violet-300 hover:bg-violet-50/30"><span className="rounded-xl bg-violet-50 p-3 text-violet-600"><GraduationCap className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Log a training session</span><span className="mt-1 block text-xs leading-5 text-slate-500">Keep competency records up to date</span></span><ArrowRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-violet-600" /></Link>
      </div>
    </section>
    <CapaInitiateDialog isOpen={observationOpen} onOpenChange={setObservationOpen} />
  </div>;
}
