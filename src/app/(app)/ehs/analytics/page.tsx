'use client';
import React, { useState } from 'react';
import { useEhs } from '@/contexts/ehs-provider';
import { useGeneral } from '@/contexts/general-provider';
import { RecordSelect, RecordMetrics } from '@/components/ehs/RecordToolbar';
import { dashboardSummary, type DashboardPeriod } from '@/lib/ehs-dashboard';
import { downloadRecords } from '@/lib/ehs-records';
import { Button } from '@/components/ui/button';
import { Download, BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function EhsAnalyticsPage() {
  const { incidents, audits, trainings, observations } = useEhs();
  const { projects } = useGeneral();
  const [site, setSite] = useState('all');
  const [period, setPeriod] = useState<DashboardPeriod>('twelve-months');
  const summary = dashboardSummary(incidents, audits, trainings, site, period);
  const now = new Date();
  const selected = observations.filter((o) => {
    const date = new Date(o.createdAt);
    return (
      date >= summary.start &&
      date <= now &&
      (site === 'all' || o.projectId === site)
    );
  });
  const closed = selected.filter((o) => o.status === 'Closed').length;
  const categories = [...new Set(selected.map((o) => o.category))].map(
    (name) => ({
      name,
      count: selected.filter((o) => o.category === name).length,
    }),
  );
  const highRisk = selected.filter(
    (o) =>
      o.status !== 'Closed' &&
      (o.severity === 'High' || o.severity === 'Critical'),
  ).length;
  return (
    <div className="ehs-page text-slate-900">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs text-slate-500">
            Workspace / Safety management
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            EHS analytics
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Recorded trends, observation categories and case outcomes.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2 bg-white"
          onClick={() =>
            downloadRecords('ehs-analytics', [
              ['Reporting period', summary.periodLabel],
              [
                'Site',
                site === 'all'
                  ? 'All sites'
                  : projects.find((p) => p.id === site)?.name || site,
              ],
              [
                'Month',
                'Incidents',
                'Approved audit score',
                'Approved audit count',
              ],
              ...summary.months.map((m) => [
                m.label,
                m.incidents,
                m.auditScore ?? '',
                m.auditCount,
              ]),
              [],
              ['Observation category', 'Count'],
              ...categories.map((c) => [c.name, c.count]),
              [],
              ['Cases reported', selected.length],
              ['Closed', closed],
              ['Open high / critical risk', highRisk],
            ])
          }
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </header>
      <section className="flex flex-wrap items-end gap-4 rounded-xl border bg-white p-4 shadow-sm">
        <RecordSelect
          label="Reporting period"
          value={period}
          onChange={(value) => setPeriod(value as DashboardPeriod)}
          options={[
            { value: 'six-months', label: 'Last 6 months' },
            { value: 'twelve-months', label: 'Last 12 months' },
            { value: 'this-year', label: 'This year' },
          ]}
        />
        <RecordSelect
          label="Site"
          value={site}
          onChange={setSite}
          options={[
            { value: 'all', label: 'All sites' },
            ...projects.map((p) => ({ value: p.id, label: p.name })),
          ]}
        />
        <p className="pb-3 text-sm text-slate-500">{summary.periodLabel}</p>
        <span className="ml-auto rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
          Recorded EHS data
        </span>
      </section>
      <RecordMetrics
        items={[
          { label: 'Observations reported', value: selected.length },
          {
            label: 'Cases closed',
            value: closed,
            note: 'Among observations reported in this period',
          },
          { label: 'Open high / critical risk', value: highRisk },
          {
            label: 'Average approved audit score',
            value:
              summary.auditScore === null
                ? '—'
                : summary.auditScore.toFixed(1) + '%',
            note: summary.auditCount + ' approved audits',
          },
        ]}
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-xl border bg-white p-6 shadow-sm xl:col-span-2">
          <h2 className="font-semibold">Incident trend</h2>
          <p className="mt-1 text-xs text-slate-500">
            Monthly reports across the selected period
          </p>
          <div className="mt-4 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.months}>
                <CartesianGrid
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <Tooltip
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.label || ''
                  }
                />
                <Bar
                  dataKey="incidents"
                  name="Incidents"
                  fill="#2563eb"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {summary.incidents} incidents recorded in this period.
          </p>
        </section>
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="font-semibold">Observation categories</h2>
          <p className="mt-1 text-xs text-slate-500">
            Share of cases reported in the selected period
          </p>
          <div className="mt-8 space-y-6">
            {categories.length ? (
              categories.map((c) => (
                <div key={c.name}>
                  <div className="mb-2 flex justify-between gap-3 text-sm">
                    <span>{c.name}</span>
                    <span className="font-medium">
                      {c.count} ·{' '}
                      {Math.round((c.count / selected.length) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-blue-600"
                      style={{ width: (c.count / selected.length) * 100 + '%' }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-sm text-slate-500">
                <BarChart3 className="mx-auto mb-4 h-10 w-10 text-slate-300" />
                No observations in this period.
              </div>
            )}
          </div>
        </section>
      </div>
      <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="p-5">
          <h2 className="font-semibold">Monthly performance</h2>
          <p className="mt-1 text-xs text-slate-500">
            An empty audit score means no valid approved audit was recorded.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-y bg-slate-50 text-slate-500">
              <tr>
                {['Month', 'Incidents', 'Approved audits', 'Average score'].map(
                  (t) => (
                    <th key={t} className="px-5 py-3 font-medium">
                      {t}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {summary.months.map((m) => (
                <tr key={m.key}>
                  <td className="px-5 py-3">{m.label}</td>
                  <td className="px-5 py-3">{m.incidents}</td>
                  <td className="px-5 py-3">{m.auditCount}</td>
                  <td className="px-5 py-3">
                    {m.auditScore === null ? '—' : m.auditScore + '%'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
