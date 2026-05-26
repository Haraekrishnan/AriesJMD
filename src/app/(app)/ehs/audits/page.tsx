'use client';

import React from 'react';
import { useEhs } from '@/contexts/ehs-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search, Calendar, MapPin, ClipboardList, CheckCircle2, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export default function EhsAuditsPage() {
  const { audits } = useEhs();

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Audits & Inspections</h1>
          <p className="text-slate-400">Manage site walkthroughs and compliance verification.</p>
        </div>
        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold">
          <Plus className="mr-2 h-4 w-4" /> Schedule New Audit
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Search audits by title, site or inspector..." 
            className="pl-10 bg-slate-900 border-slate-800 text-slate-200 placeholder:text-slate-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {audits.map((audit) => (
          <Card key={audit.id} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                   <Badge variant="outline" className="bg-slate-800 border-slate-700 text-emerald-400 mb-2">
                     {audit.type} Inspection
                   </Badge>
                  <CardTitle className="text-white text-xl">{audit.title}</CardTitle>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-emerald-400">{audit.score}%</div>
                  <p className="text-[10px] uppercase font-bold text-slate-500">Compliance</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  {format(parseISO(audit.date), 'dd MMM yyyy')}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-500" />
                  {audit.location}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500 uppercase tracking-wider">Score Visualization</span>
                  <span className="text-white">{audit.score}%</span>
                </div>
                <Progress value={audit.score} className="h-2 bg-slate-800" />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  {audit.status}
                </div>
                <Button variant="ghost" size="sm" className="text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300">
                  View Full Report
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {audits.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
          <ClipboardList className="h-12 w-12 mb-4 opacity-20" />
          <p className="text-lg">No audit records found.</p>
          <p className="text-sm">Scheduled audits will appear here.</p>
        </div>
      )}
    </div>
  );
}
