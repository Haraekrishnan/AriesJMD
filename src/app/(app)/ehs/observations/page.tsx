'use client';

import React, { useMemo, useState } from 'react';
import { useEhs } from '@/contexts/ehs-provider';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
    Plus, 
    RotateCcw, 
    Download,
    History,
    FileDown,
    Activity
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import CapaKpiCards from '@/components/ehs/capa/CapaKpiCards';
import CapaFilters from '@/components/ehs/capa/CapaFilters';
import CapaTable from '@/components/ehs/capa/CapaTable';
import CapaInitiateDialog from '@/components/ehs/capa/CapaInitiateDialog';
import CapaCockpit from '@/components/ehs/capa/CapaCockpit';
import { cn } from '@/lib/utils';

export default function SafetyObservationsPage() {
    const { observations } = useEhs();
    const { user } = useAuth();

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [cockpitId, setCockpitId] = useState<string | null>(null);
    const [isInitiateOpen, setIsInitiateOpen] = useState(false);

    const [filters, setFilters] = useState({
        search: '',
        category: 'all',
        risk: 'all',
        status: 'all',
        site: 'all',
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

    const cockpitObservation = useMemo(() => observations.find(o => o.id === cockpitId), [observations, cockpitId]);

    if (cockpitObservation) {
        return <CapaCockpit observation={cockpitObservation} onClose={() => setCockpitId(null)} />;
    }

    return (
        <div className="min-h-screen bg-[#F3F7FB] flex flex-col text-left">
            <header className="p-10 pb-6 shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">SAFETY OBSERVATIONS (CAPA)</h1>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">TECHNICAL GOVERNANCE · SAFETY LIFECYCLE MANAGEMENT</p>
                </div>
                <div className="flex flex-col items-end gap-3">
                    <div className="hidden lg:flex flex-col text-right mr-4 leading-none">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em]">A SAFER WORKPLACE</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">A STRONGER TOMORROW</p>
                    </div>
                    <Button 
                        className="bg-[#2563EB] hover:bg-blue-700 text-white font-black uppercase text-[11px] tracking-widest h-12 px-10 rounded-xl shadow-lg shadow-blue-500/20"
                        onClick={() => setIsInitiateOpen(true)}
                    >
                        <Plus className="mr-2 h-4 w-4" /> Initiate Observation
                    </Button>
                </div>
            </header>

            <div className="px-10 pb-10 shrink-0">
                <CapaKpiCards 
                    observations={filteredObservations} 
                    onFilterByStatus={(s) => setFilters(prev => ({ ...prev, status: s }))}
                    onFilterByRisk={(r) => setFilters(prev => ({ ...prev, risk: r }))}
                />
            </div>

            <main className="flex-1 flex flex-col overflow-hidden px-10 pb-10 gap-6">
                <Card className="rounded-2xl border-slate-200 shadow-sm bg-white overflow-hidden">
                    <CardContent className="p-3">
                        <CapaFilters 
                            filters={filters} 
                            onFilterChange={setFilters} 
                        />
                    </CardContent>
                </Card>

                <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-5 border-b bg-white flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="h-6 px-3 text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white border-none rounded">
                                {filteredObservations.length} ACTIVE CASES
                            </Badge>
                        </div>
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest text-slate-500 gap-2">
                                <History className="h-4 w-4" /> AUDIT TRAIL
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest text-slate-500 gap-2">
                                <FileDown className="h-4 w-4" /> EXPORT REGISTRY
                            </Button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-hidden">
                         <CapaTable 
                            observations={filteredObservations} 
                            selectedId={selectedId}
                            onSelect={setSelectedId}
                            onOpenCockpit={setCockpitId}
                        />
                    </div>
                </div>
            </main>

            <CapaInitiateDialog isOpen={isInitiateOpen} onOpenChange={setIsInitiateOpen} />
        </div>
    );
}
