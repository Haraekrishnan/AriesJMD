'use client';

import React from 'react';
import { useEhs } from '@/contexts/ehs-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search, AlertCircle, MapPin, Calendar, Eye, Users, FileWarning } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const incidentTypeColors: Record<string, string> = {
  'Near Miss': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'LTI': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  'Minor Injury': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'Environmental': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Property Damage': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export default function EhsIncidentsPage() {
  const { incidents } = useEhs();

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Incident Management</h1>
          <p className="text-slate-400">Track, investigate and resolve workplace safety incidents.</p>
        </div>
        <Button className="bg-rose-500 hover:bg-rose-600 text-white font-semibold">
          <Plus className="mr-2 h-4 w-4" /> Report New Incident
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Search incidents by location, type or reporter..." 
            className="pl-10 bg-slate-900 border-slate-800 text-slate-200"
          />
        </div>
      </div>

      <div className="space-y-4">
        {incidents.map((incident) => (
          <Card key={incident.id} className="bg-slate-900 border-slate-800 hover:bg-slate-900/80 transition-all border-l-4 border-l-rose-500/50">
            <CardContent className="p-0">
               <div className="flex flex-col md:flex-row md:items-center">
                 <div className="p-6 flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                       <Badge variant="outline" className={cn("uppercase text-[10px] tracking-widest font-black", incidentTypeColors[incident.type])}>
                         {incident.type}
                       </Badge>
                       <span className="text-slate-600">/</span>
                       <span className="text-xs text-slate-500 font-bold">{format(parseISO(incident.date), 'PPP')}</span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white">{incident.description}</h3>
                    
                    <div className="flex flex-wrap items-center gap-6 text-sm text-slate-400">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-500" />
                        {incident.location}
                      </div>
                      <div className="flex items-center gap-2 text-xs bg-slate-800 px-2 py-1 rounded">
                        <Badge variant="outline" className={cn(
                          incident.status === 'Open' ? "text-rose-400" : 
                          incident.status === 'Under Investigation' ? "text-amber-400" : "text-emerald-400"
                        )}>
                          {incident.status}
                        </Badge>
                      </div>
                    </div>
                 </div>
                 
                 <div className="p-6 md:border-l border-slate-800 flex items-center gap-4 bg-slate-900/40">
                   <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800">
                     <Eye className="h-5 w-5 mr-2" />
                     Details
                   </Button>
                   <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800">
                     <Users className="h-5 w-5 mr-2" />
                     Involve
                   </Button>
                 </div>
               </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {incidents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
          <FileWarning className="h-12 w-12 mb-4 opacity-20" />
          <p className="text-lg font-semibold">Zero incidents reported.</p>
          <p className="text-sm">Safety performance is currently at 100%.</p>
        </div>
      )}
    </div>
  );
}
