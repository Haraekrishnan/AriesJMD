'use client';

import React from 'react';
import { useEhs } from '@/contexts/ehs-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  TrendingUp, 
  AlertTriangle, 
  ClipboardCheck, 
  Users, 
  Target,
  Zap,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { cn } from '@/lib/utils';

export default function EhsDashboard() {
  const { stats } = useEhs();

  return (
    <div className="p-5 md:p-8 max-w-[1600px] mx-auto space-y-8 text-slate-900">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Safety Command Center</h1>
          <p className="text-slate-600 text-lg mt-1 font-medium">Holistic view of organizational safety performance.</p>
        </div>
        <div className="bg-white border border-slate-200 px-4 py-2 rounded-full text-xs font-semibold text-emerald-600 tracking-normal normal-case shadow-sm">
          Safety overview
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Incidents', value: stats.totalIncidents, icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50', trend: -12 },
          { label: 'Total LTIs', value: stats.totalLTIs, icon: Target, color: 'text-amber-600', bg: 'bg-amber-50', trend: 0 },
          { label: 'Avg Audit Score', value: `${stats.avgAuditScore.toFixed(1)}%`, icon: ClipboardCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: 5.2 },
          { label: 'Training Hours', value: stats.trainingHours, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50', trend: 8 },
        ].map((kpi, i) => (
          <Card key={i} className="bg-white border-slate-200 overflow-hidden relative shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold normal-case tracking-normal text-slate-500">{kpi.label}</CardTitle>
              <div className={cn("p-2 rounded-lg", kpi.bg)}>
                <kpi.icon className={cn("h-4 w-4", kpi.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-slate-900">{kpi.value}</div>
              <div className="mt-2 flex items-center gap-1">
                {kpi.trend !== 0 && (
                  <>
                    {kpi.trend > 0 ? <ArrowUpRight className="h-3 w-3 text-emerald-600" /> : <ArrowDownRight className="h-3 w-3 text-rose-600" />}
                    <span className={cn("text-sm font-semibold normal-case", kpi.trend > 0 ? "text-emerald-600" : "text-rose-600")}>
                      {Math.abs(kpi.trend)}% VS LAST MONTH
                    </span>
                  </>
                )}
              </div>
            </CardContent>
            <div className={cn("absolute bottom-0 left-0 w-full h-1", kpi.bg)} />
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900 text-xl font-semibold normal-case tracking-tight">Incident Trend (6 Months)</CardTitle>
            <CardDescription className="text-slate-500 font-medium">Correlation between reports and time.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dummyData}>
                  <defs>
                    <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e11d48" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#e11d48" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a' }}
                    itemStyle={{ color: '#e11d48', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="incidents" stroke="#e11d48" fillOpacity={1} fill="url(#colorInc)" strokeWidth={4} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900 text-xl font-semibold normal-case tracking-tight">Audit Performance</CardTitle>
            <CardDescription className="text-slate-500 font-medium">Compliance scores across inspection cycles.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dummyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a' }}
                    cursor={{ fill: '#f1f5f9' }}
                  />
                  <Bar dataKey="audits" fill="#059669" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const dummyData = [
  { name: 'Jan', incidents: 4, audits: 85 },
  { name: 'Feb', incidents: 3, audits: 88 },
  { name: 'Mar', incidents: 5, audits: 82 },
  { name: 'Apr', incidents: 2, audits: 91 },
  { name: 'May', incidents: 1, audits: 94 },
  { name: 'Jun', incidents: 0, audits: 96 },
];
