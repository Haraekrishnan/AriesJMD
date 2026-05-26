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

const dummyData = [
  { name: 'Jan', incidents: 4, audits: 85 },
  { name: 'Feb', incidents: 3, audits: 88 },
  { name: 'Mar', incidents: 5, audits: 82 },
  { name: 'Apr', incidents: 2, audits: 91 },
  { name: 'May', incidents: 1, audits: 94 },
  { name: 'Jun', incidents: 0, audits: 96 },
];

export default function EhsDashboard() {
  const { stats } = useEhs();

  return (
    <div className="space-y-8 text-slate-200">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white">Safety Command Center</h1>
          <p className="text-slate-400 mt-1">Holistic view of organizational safety performance.</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-full text-xs font-semibold text-emerald-400">
          SYSTEM STATUS: OPTIMAL
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Incidents', value: stats.totalIncidents, icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/10', trend: -12 },
          { label: 'Total LTIs', value: stats.totalLTIs, icon: Target, color: 'text-amber-400', bg: 'bg-amber-500/10', trend: 0 },
          { label: 'Avg Audit Score', value: `${stats.avgAuditScore.toFixed(1)}%`, icon: ClipboardCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10', trend: 5.2 },
          { label: 'Training Hours', value: stats.trainingHours, icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-500/10', trend: 8 },
        ].map((kpi, i) => (
          <Card key={i} className="bg-slate-900 border-slate-800 text-slate-200 overflow-hidden relative">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">{kpi.label}</CardTitle>
              <div className={cn("p-2 rounded-lg", kpi.bg)}>
                <kpi.icon className={cn("h-4 w-4", kpi.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{kpi.value}</div>
              <div className="mt-2 flex items-center gap-1">
                {kpi.trend !== 0 && (
                  <>
                    {kpi.trend > 0 ? <ArrowUpRight className="h-3 w-3 text-emerald-400" /> : <ArrowDownRight className="h-3 w-3 text-rose-400" />}
                    <span className={cn("text-[10px] font-bold", kpi.trend > 0 ? "text-emerald-400" : "text-rose-400")}>
                      {Math.abs(kpi.trend)}% vs last month
                    </span>
                  </>
                )}
              </div>
            </CardContent>
            <div className={cn("absolute bottom-0 left-0 w-full h-1", kpi.bg.replace('/10', '/30'))} />
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">Incident Trend (6 Months)</CardTitle>
            <CardDescription className="text-slate-500">Correlation between reports and time.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dummyData}>
                  <defs>
                    <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc' }}
                    itemStyle={{ color: '#f43f5e' }}
                  />
                  <Area type="monotone" dataKey="incidents" stroke="#f43f5e" fillOpacity={1} fill="url(#colorInc)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">Audit Performance</CardTitle>
            <CardDescription className="text-slate-500">Compliance scores across inspection cycles.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dummyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc' }}
                    cursor={{ fill: '#1e293b' }}
                  />
                  <Bar dataKey="audits" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
