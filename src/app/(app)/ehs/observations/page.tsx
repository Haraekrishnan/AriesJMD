'use client';

import React, { useMemo, useState } from 'react';
import { useEhs } from '@/contexts/ehs-provider';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
    Plus, 
    Download, 
    RotateCcw, 
    Filter, 
    LayoutGrid, 
    List, 
    Search,
    ChevronDown,
    Bell,
    FileText,
    History,
    FileDown
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import CapaKpiCards from '@/components/ehs/capa/CapaKpiCards';
import CapaFilters from '@/components/ehs/capa/CapaFilters';
import CapaTable from '@/components/ehs/capa/CapaTable';
import CapaCaseDrawer from '@/components/ehs/capa/CapaCaseDrawer';
import CapaInitiateDialog from '@/components/ehs/capa/CapaInitiateDialog';
import CapaCockpit from '@/components/ehs/capa/CapaCockpit';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function SafetyObservationsPage() {
    const { observations } = useEhs();
    const { user, can } = useAuth();
    const { projects } = useGeneral();

    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
    const [cockpitCaseId, setCockpitCaseId] = useState<string | null>(null);
    const [isInitiateOpen, setIsInitiateOpen] = useState(false);

    const [filters, setFilters] = useState({
        search: '',
        category: 'all',
        risk: 'all',
        status: 'all',
        site: 'all',
        dateRange: undefined,
    });

    const masterObservations = useMemo(() => observations.filter(obs => !obs.parentId), [observations]);

    const filteredObservations = useMemo(() => {
        const search = filters.search.trim().toLowerCase();
        return masterObservations.filter(obs => {
            const matchesSearch = !search || 
                obs.description.toLowerCase().includes(search) || 
                obs.id.toLowerCase().includes(search);
            const matchesCategory = filters.category === 'all' || obs.category === filters.category;
            const matchesRisk = filters.risk === 'all' || obs.severity === filters.risk;
            const matchesStatus = filters.status === 'all' || obs.status === filters.status;
            const matchesSite = filters.site === 'all' || obs.projectId === filters.site;
            
            return matchesSearch && matchesCategory && matchesRisk && matchesStatus && matchesSite;
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [masterObservations, filters]);

    const selectedObservation = useMemo(() => observations.find(o => o.id === selectedCaseId), [observations, selectedCaseId]);
    const cockpitObservation = useMemo(() => observations.find(o => o.id === cockpitCaseId), [observations, cockpitCaseId]);

    // If Cockpit is open, render the full-screen experience
    if (cockpitObservation) {
        return <CapaCockpit observation={cockpitObservation} onClose={() => setCockpitCaseId(null)} />;
    }

    return (
        <div className="min-h-screen bg-[#F6F9FC] flex flex-col">
            {/* --- PAGE HEADER --- */}
            <header className="p-8 pb-4 shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Safety Observations (CAPA)</h1>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-[0.2em]">Capa Control Center · Safety Lifecycle Governance</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="text-right hidden sm:block">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">A Safer Workplace</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">A Stronger Tomorrow</p>
                        </div>
                        <Button 
                            className="bg-[#2563EB] hover:bg-blue-700 text-white font-black uppercase text-[11px] tracking-widest h-12 px-8 rounded-xl shadow-lg shadow-blue-500/20"
                            onClick={() => setIsInitiateOpen(true)}
                        >
                            <Plus className="mr-2 h-4 w-4" /> Initiate Observation
                        </Button>
                    </div>
                </div>
            </header>

            {/* --- KPI SECTION --- */}
            <div className="px-8 pb-8 shrink-0">
                <CapaKpiCards 
                    observations={filteredObservations} 
                    onFilterByStatus={(s) => setFilters(prev => ({ ...prev, status: s }))}
                    onFilterByRisk={(r) => setFilters(prev => ({ ...prev, risk: r }))}
                />
            </div>

            {/* --- FILTER & MAIN AREA --- */}
            <main className="flex-1 flex flex-col overflow-hidden px-8 pb-8 gap-6">
                {/* Filter Toolbar */}
                <Card className="rounded-xl border-slate-200 shadow-sm shrink-0">
                    <CardContent className="p-2">
                        <CapaFilters 
                            filters={filters} 
                            onFilterChange={setFilters} 
                        />
                    </CardContent>
                </Card>

                {/* Registry Content */}
                <div className="flex-1 flex gap-6 overflow-hidden">
                    {/* Left: Table Area */}
                    <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                        <div className="p-4 border-b bg-slate-50/30 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="h-5 px-2 text-[9px] font-black uppercase tracking-wider bg-white">
                                    {filteredObservations.length} Discoveries
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <History className="mr-1.5 h-3.5 w-3.5" /> Audit Trail
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <FileDown className="mr-1.5 h-3.5 w-3.5" /> Export Excel
                                </Button>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-hidden">
                             <CapaTable 
                                observations={filteredObservations} 
                                selectedId={selectedCaseId}
                                onSelect={setSelectedCaseId}
                                onOpenCockpit={setCockpitCaseId}
                            />
                        </div>

                        {/* Pagination Footer */}
                        <footer className="p-3 border-t bg-slate-50/50 flex justify-between items-center shrink-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Showing 1 to {Math.min(10, filteredObservations.length)} of {filteredObservations.length} entries</p>
                            <div className="flex gap-1">
                                <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] font-bold uppercase">Prev</Button>
                                <Button variant="secondary" size="sm" className="h-7 w-7 text-[10px] font-bold">1</Button>
                                <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] font-bold uppercase">Next</Button>
                            </div>
                        </footer>
                    </div>

                    {/* Right: Quick Preview Panel */}
                    {selectedObservation && (
                        <div className="w-[420px] shrink-0 animate-in slide-in-from-right duration-300">
                            <CapaCaseDrawer 
                                observation={selectedObservation}
                                onClose={() => setSelectedCaseId(null)}
                                onOpenCockpit={() => setCockpitCaseId(selectedObservation.id)}
                            />
                        </div>
                    )}
                </div>
            </main>

            <CapaInitiateDialog isOpen={isInitiateOpen} onOpenChange={setIsInitiateOpen} />
        </div>
    );
}
