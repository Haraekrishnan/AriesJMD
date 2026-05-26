'use client';

import React from 'react';
import { useEhs } from '@/contexts/ehs-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, ShieldCheck, MapPin, Calendar, FileText, ChevronRight, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const riskColors: Record<string, string> = {
  'Low': 'bg-emerald-500/10 text-emerald-400',
  'Medium': 'bg-amber-500/10 text-amber-400',
  'High': 'bg-orange-500/10 text-orange-400',
  'Critical': 'bg-rose-500/10 text-rose-400',
};

export default function EhsRiskAssessmentsPage() {
  const { riskAssessments } = useEhs();

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Risk Assessments (JSA/HIRA)</h1>
          <p className="text-slate-400">Identify hazards and establish control measures for all site activities.</p>
        </div>
        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold">
          <PlusCircle className="mr-2 h-4 w-4" /> New Risk Assessment
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {riskAssessments.map((ra) => (
          <Card key={ra.id} className="bg-slate-900 border-slate-800 overflow-hidden group">
            <div className="flex items-stretch h-full">
              <div className={cn("w-2", riskColors[ra.riskLevel]?.split(' ')[0] || 'bg-slate-800')} />
              <div className="flex-1 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">{ra.activityName}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                       <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {ra.location}</span>
                       <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Reviewed: {format(parseISO(ra.reviewDate), 'dd MMM yyyy')}</span>
                    </div>
                  </div>
                  <Badge className={cn("px-4 py-1", riskColors[ra.riskLevel])}>
                    {ra.riskLevel} RISK
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">Identified Hazards</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {ra.hazards.map((h, i) => (
                        <span key={i} className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2 py-1 rounded">
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">Control Measures</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {ra.controls.map((c, i) => (
                        <span key={i} className="text-xs bg-emerald-500/5 border border-emerald-500/10 text-emerald-400/80 px-2 py-1 rounded">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-slate-800 flex justify-end">
                   <Button variant="ghost" className="text-slate-500 hover:text-white">
                     View Document <ChevronRight className="ml-2 h-4 w-4" />
                   </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      
      {riskAssessments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
           <ShieldCheck className="h-16 w-16 mb-4 opacity-10" />
           <p className="text-lg">No risk assessments logged.</p>
        </div>
      )}
    </div>
  );
}
