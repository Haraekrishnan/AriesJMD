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
  Users,
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
  { name: 'Mechanical', value: 45, color: '#2563eb' },
  { name: 'Electrical', value: 25, color: '#059669' },
  { name: 'Operational', value: 20, color: '#d97706' },
  { name: 'Structural', value: 10, color: '#e11d48' },
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
    <div className="space-y-8 text-slate-900">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">EHS Analytics</h1>
          <p className="text-slate-600 font-medium">Advanced statistical insights into organizational safety health.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="bg-white border-slate-200 text-slate-700 font-bold rounded-xl h-11 px-6 shadow-sm hover:bg-slate-50">
            <Calendar className="mr-2 h-4 w-4" /> Last 12 Months
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-widest h-11 px-8 rounded-xl shadow-lg shadow-emerald-600/10">
            <Download className="mr-2 h-4 w-4" /> Export PowerBI
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Trend Chart */}
        <Card className="lg:col-span-2 bg-white border-slate-200 shadow-sm rounded-3xl">
          <CardHeader>
            <CardTitle className="text-slate-900 text-lg flex items-center gap-2 font-black uppercase tracking-tight">
              <TrendingUp className="h-5 w-5 text-emerald-600" /> Safety Compliance Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={complianceHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Line type="monotone" dataKey="score" stroke="#059669" strokeWidth={5} dot={{ fill: '#059669', r: 6, strokeWidth: 3, stroke: '#fff' }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Hazard Categories Pie */}
        <Card className="bg-white border-slate-200 shadow-sm rounded-3xl">
          <CardHeader>
            <CardTitle className="text-slate-900 text-lg flex items-center gap-2 font-black uppercase tracking-tight">
              <Target className="h-5 w-5 text-indigo-600" /> Hazard Distribution
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
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {dummyStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 mt-6">
              {dummyStats.map((stat, i) => (
                <div key={i} className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-md" style={{ backgroundColor: stat.color }} />
                    <span className="text-slate-500">{stat.name}</span>
                  </div>
                  <span className="text-slate-900">{stat.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-slate-200 p-8 flex items-center gap-6 shadow-sm rounded-3xl">
          <div className="bg-emerald-50 p-5 rounded-2xl">
            <Activity className="h-8 w-8 text-emerald-600" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Safe Work Days</p>
            <p className="text-4xl font-black text-slate-900 tracking-tighter">452</p>
          </div>
        </Card>
        
        <Card className="bg-white border-slate-200 p-8 flex items-center gap-6 shadow-sm rounded-3xl">
          <div className="bg-rose-50 p-5 rounded-2xl">
            <BarChart3 className="h-8 w-8 text-rose-600" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Hazard Ratio</p>
            <p className="text-4xl font-black text-slate-900 tracking-tighter">0.42</p>
          </div>
        </Card>

        <Card className="bg-white border-slate-200 p-8 flex items-center gap-6 shadow-sm rounded-3xl">
          <div className="bg-indigo-50 p-5 rounded-2xl">
            <Users className="h-8 w-8 text-indigo-600" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Officers</p>
            <p className="text-4xl font-black text-slate-900 tracking-tighter">24</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
