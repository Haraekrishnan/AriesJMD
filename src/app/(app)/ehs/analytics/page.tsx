'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart3, 
  Activity, 
  Target, 
  TrendingUp, 
  Download,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

const dummyStats = [
  { name: 'Mechanical', value: 45, color: '#3b82f6' },
  { name: 'Electrical', value: 25, color: '#10b981' },
  { name: 'Operational', value: 20, color: '#f59e0b' },
  { name: 'Structural', value: 10, color: '#f43f5e' },
];

const complianceHistory = [
  { month: 'Oct', score: 82 },
  { month: 'Nov', score: 85 },
  { month: 'Dec', score: 84 },
  { month: 'Jan', score: 89 },
  { month: 'Feb', score: 91 },
  { month: 'Mar', score: 94 },
];

export default function EhsAnalyticsPage() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">EHS Analytics</h1>
          <p className="text-slate-400">Advanced statistical insights into organizational safety health.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="bg-slate-900 border-slate-800 text-slate-300">
            <Calendar className="mr-2 h-4 w-4" /> Last 12 Months
          </Button>
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold">
            <Download className="mr-2 h-4 w-4" /> Export PowerBI
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Trend Chart */}
        <Card className="lg:col-span-2 bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" /> Safety Compliance Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={complianceHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
                  />
                  <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={4} dot={{ fill: '#10b981', r: 6 }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Hazard Categories Pie */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-indigo-400" /> Hazard Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dummyStats}
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {dummyStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {dummyStats.map((stat, i) => (
                <div key={i} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stat.color }} />
                    <span className="text-slate-400">{stat.name}</span>
                  </div>
                  <span className="text-white font-bold">{stat.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-900 border-slate-800 p-6 flex items-center gap-4">
          <div className="bg-emerald-500/20 p-4 rounded-2xl">
            <Activity className="h-8 w-8 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Safe Work Days</p>
            <p className="text-3xl font-black text-white">452</p>
          </div>
        </Card>
        
        <Card className="bg-slate-900 border-slate-800 p-6 flex items-center gap-4">
          <div className="bg-rose-500/20 p-4 rounded-2xl">
            <BarChart3 className="h-8 w-8 text-rose-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Unsafe Condition Ratio</p>
            <p className="text-3xl font-black text-white">0.42</p>
          </div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-6 flex items-center gap-4">
          <div className="bg-indigo-500/20 p-4 rounded-2xl">
            <Users className="h-8 w-8 text-indigo-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Safety Officers</p>
            <p className="text-3xl font-black text-white">24</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
