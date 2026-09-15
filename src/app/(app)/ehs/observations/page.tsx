
'use client';

import React, { useState, useMemo } from 'react';
import { useEhs } from '@/contexts/ehs-provider';
import { useAuth } from '@/contexts/auth-provider';
import { Button } from '@/components/ui/button';
import { Plus, FileSpreadsheet, History, Search, FilterX, ListFilter, LayoutGrid } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// --- SUB-COMPONENTS ---
import CapaKpiCards from '@/components/ehs/capa/CapaKpiCards';
import CapaPipelineSummary from '@/components/ehs/capa/CapaPipelineSummary';
import CapaFilters from '@/components/ehs/capa/CapaFilters';
import CapaTable from '@/components/ehs/capa/CapaTable';
import CapaCaseDrawer from '@/components/ehs/capa/CapaCaseDrawer';
import CapaInitiateDialog from '@/components/ehs/capa/CapaInitiateDialog';
import CapaCockpit from '@/components/ehs/capa/CapaCockpit';

export default function SafetyObservationsPage() {
  const { observations } = useEhs();
  const { user } = useAuth();
  
  // Selection & State
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [isCockpitOpen, setIsCockpitOpen] = useState(false);
  const [isInitiateOpen, setIsInitiateOpen] = useState(false);
  
  // Filters State
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    risk: 'all',
    status: 'all',
    stage: 'all',
    site: 'all',
    dateRange: undefined,
  });

  const filteredObservations = useMemo(() => {
    return observations.filter(obs => {
        // Master logic: Only show masters in main list unless searching
        if (obs.parentId && !filters.search) return false;

        const matchesSearch = filters.search === '' || 
            obs.description.toLowerCase().includes(filters.search.toLowerCase()) ||
            obs.id.toLowerCase().includes(filters.search.toLowerCase());

        const matchesCategory = filters.category === 'all' || obs.category === filters.category;
        const matchesRisk = filters.risk === 'all' || obs.severity === filters.risk;
        const matchesStatus = filters.status === 'all' || obs.status === filters.status;
        const matchesStage = filters.stage === 'all' || obs.currentStage === filters.stage;
        const matchesSite = filters.site === 'all' || obs.projectId === filters.site;

        return matchesSearch && matchesCategory && matchesRisk && matchesStatus && matchesStage && matchesSite;
    }).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [observations, filters]);

  const selectedObservation = useMemo(() => 
    observations.find(o => o.id === selectedCaseId),
  [observations, selectedCaseId]);

  if (isCockpitOpen && selectedObservation) {
    return (
        <CapaCockpit 
            observation={selectedObservation} 
            onClose={() => setIsCockpitOpen(false)} 
        />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 animate-in fade-in duration-700">
      <div className="max-w-[1800px] mx-auto space-y-8 p-8">
        
        {/* --- PAGE HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Safety Observations (CAPA)</h1>
            <p className="text-slate-500 font-medium text-lg mt-1">Track, manage and close safety observations for a safer workplace.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden xl:block">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Safety Slogan</p>
                <p className="text-sm font-bold text-emerald-600 italic">A Safer Workplace, A Stronger Tomorrow</p>
            </div>
            <Button 
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest h-12 px-8 rounded-xl shadow-lg shadow-emerald-600/20"
                onClick={() => setIsInitiateOpen(true)}
            >
                <Plus className="mr-2 h-5 w-5" /> Initiate Observation
            </Button>
          </div>
        </div>

        {/* --- KPI EXECUTIVE ROW --- */}
        <CapaKpiCards 
            observations={observations} 
            onFilterChange={(key, val) => setFilters(prev => ({ ...prev, [key]: val }))} 
        />

        {/* --- PIPELINE BOTTLENECK SUMMARY --- */}
        <CapaPipelineSummary observations={observations} />

        {/* --- FILTER ENGINE --- */}
        <CapaFilters filters={filters} onFilterChange={setFilters} />

        {/* --- MAIN REGISTRY LAYOUT --- */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-8 items-start">
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-black uppercase text-xs tracking-widest text-slate-500">
                        Observations Registry ({filteredObservations.length})
                    </h3>
                    <div className="flex gap-2">
                         <Button variant="ghost" size="icon" className="h-8 w-8"><LayoutGrid className="h-4 w-4"/></Button>
                         <Button variant="secondary" size="icon" className="h-8 w-8"><ListFilter className="h-4 w-4"/></Button>
                    </div>
                </div>
                <CapaTable 
                    observations={filteredObservations} 
                    onSelect={setSelectedCaseId}
                    onOpenCockpit={(id) => { setSelectedCaseId(id); setIsCockpitOpen(true); }}
                    selectedId={selectedCaseId}
                />
                
                {/* Pagination Footer */}
                <div className="p-6 border-t bg-slate-50/50 flex justify-between items-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Showing 1 to {Math.min(10, filteredObservations.length)} of {filteredObservations.length} cases
                    </p>
                    <div className="flex gap-1">
                         <Button variant="outline" size="sm" className="h-8 w-8 p-0 font-bold">1</Button>
                         <Button variant="ghost" size="sm" className="h-8 w-8 p-0 font-bold text-slate-400">2</Button>
                         <Button variant="ghost" size="sm" className="h-8 w-8 p-0 font-bold text-slate-400">3</Button>
                    </div>
                </div>
            </div>

            {/* --- CASE PREVIEW DRAWER --- */}
            <CapaCaseDrawer 
                observation={selectedObservation} 
                onOpenCockpit={() => setIsCockpitOpen(true)}
                onClose={() => setSelectedCaseId(null)}
            />
        </div>
      </div>

      <CapaInitiateDialog isOpen={isInitiateOpen} onOpenChange={setIsInitiateOpen} />
    </div>
  );
}
