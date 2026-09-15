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
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import CapaKpiCards from '@/components/ehs/capa/CapaKpiCards';
import CapaFilters from '@/components/ehs/capa/CapaFilters';
import CapaTable from '@/components/ehs/capa/CapaTable';
import CapaCaseDrawer from '@/components/ehs/capa/CapaCaseDrawer';
import CapaInitiateDialog from '@/components/ehs/capa/CapaInitiateDialog';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { cn } from '@/lib/utils';

export default function SafetyObservationsPage() {
    const { observations } = useEhs();
    const { user } = useAuth();
    const { projects } = useGeneral();

    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
    const [isInitiateOpen, setIsInitiateOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

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

    return (
        <div className="min-h-screen bg-slate-50/50 flex flex-col">
            {/* Top Global Header */}
            <header className="h-16 shrink-0 bg-white border-b flex items-center justify-between px-8 z-30">
                <div className="flex items-center gap-6 flex-1 max-w-2xl">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Search cases, keywords, sites, people..." 
                            className="pl-10 h-10 bg-slate-50 border-none text-sm font-medium focus-visible:ring-emerald-500/20"
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <span className="text-[10px] font-bold text-slate-300 border rounded px-1 px-0.5">Ctrl</span>
                            <span className="text-[10px] font-bold text-slate-300 border rounded px-1 px-0.5">K</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <Select defaultValue="all">
                        <SelectTrigger className="w-[180px] h-10 border-none bg-slate-50 font-bold text-slate-600">
                            <SelectValue placeholder="All Sites" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Sites</SelectItem>
                            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    
                    <Button variant="ghost" size="icon" className="relative h-10 w-10 text-slate-400">
                        <Bell className="h-5 w-5" />
                        <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 border-2 border-white"></div>
                    </Button>

                    <div className="h-10 w-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-black text-xs shadow-lg">
                        {user?.name?.substring(0, 2).toUpperCase()}
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-hidden flex flex-col p-8 gap-8">
                {/* Page Title & Stats */}
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Safety Observations (CAPA)</h1>
                        <p className="text-sm font-medium text-slate-500">Track, manage and close safety observations for a safer workplace.</p>
                    </div>
                    <div className="flex items-center gap-8 text-right pr-4">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">A Safer Workplace</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">A Stronger Tomorrow</p>
                        </div>
                        <div className="flex gap-0">
                            <Button 
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[11px] tracking-widest h-11 px-6 rounded-l-xl shadow-lg shadow-emerald-600/10"
                                onClick={() => setIsInitiateOpen(true)}
                            >
                                <Plus className="mr-2 h-4 w-4" /> Initiate Observation
                            </Button>
                            <Button 
                                className="bg-emerald-700 hover:bg-emerald-800 text-white h-11 px-3 rounded-r-xl border-l border-emerald-500/30"
                            >
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* KPI Cards Row */}
                <CapaKpiCards observations={observations} />

                {/* Filters & Content Area */}
                <div className="flex-1 overflow-hidden flex flex-col gap-6">
                    {/* Professional Filter Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-4 p-2 bg-white rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex flex-wrap items-center gap-2">
                            <Select value={filters.category} onValueChange={(v) => setFilters(prev => ({ ...prev, category: v }))}>
                                <SelectTrigger className="w-[150px] h-9 text-xs font-bold border-none bg-slate-50">
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    <SelectItem value="Unsafe Act">Unsafe Act</SelectItem>
                                    <SelectItem value="Unsafe Condition">Unsafe Condition</SelectItem>
                                    <SelectItem value="Safe Act">Safe Act</SelectItem>
                                    <SelectItem value="Near Miss">Near Miss</SelectItem>
                                    <SelectItem value="Environmental">Environmental</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={filters.risk} onValueChange={(v) => setFilters(prev => ({ ...prev, risk: v }))}>
                                <SelectTrigger className="w-[140px] h-9 text-xs font-bold border-none bg-slate-50">
                                    <SelectValue placeholder="All Risk Levels" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Risk Levels</SelectItem>
                                    <SelectItem value="Low">Low</SelectItem>
                                    <SelectItem value="Medium">Medium</SelectItem>
                                    <SelectItem value="High">High</SelectItem>
                                    <SelectItem value="Critical">Critical</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={filters.status} onValueChange={(v) => setFilters(prev => ({ ...prev, status: v }))}>
                                <SelectTrigger className="w-[130px] h-9 text-xs font-bold border-none bg-slate-50">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="Open">Open</SelectItem>
                                    <SelectItem value="In Progress">In Progress</SelectItem>
                                    <SelectItem value="Closed">Closed</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={filters.site} onValueChange={(v) => setFilters(prev => ({ ...prev, site: v }))}>
                                <SelectTrigger className="w-[130px] h-9 text-xs font-bold border-none bg-slate-50">
                                    <SelectValue placeholder="All Sites" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Sites</SelectItem>
                                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>

                            <DateRangePicker 
                                date={filters.dateRange} 
                                onDateChange={(range) => setFilters(prev => ({ ...prev, dateRange: range as any }))}
                                className="h-9 w-[220px]"
                            />

                            <Button variant="ghost" className="h-9 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <Filter className="mr-2 h-3.5 w-3.5" /> More Filters
                            </Button>
                        </div>

                        <div className="flex items-center gap-2 pr-2">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-9 px-3 text-[10px] font-black uppercase tracking-widest text-slate-500"
                                onClick={() => setFilters({ search: '', category: 'all', risk: 'all', status: 'all', site: 'all', dateRange: undefined })}
                            >
                                <RotateCcw className="mr-2 h-3.5 w-3.5" /> Reset
                            </Button>
                            <Button variant="outline" size="sm" className="h-9 px-4 text-[10px] font-black uppercase tracking-widest border-2">
                                <Download className="mr-2 h-3.5 w-3.5" /> Export
                            </Button>
                            <div className="flex bg-slate-100 p-1 rounded-lg border ml-2">
                                <Button 
                                    variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                                    size="icon" 
                                    className="h-7 w-7 rounded-md"
                                    onClick={() => setViewMode('list')}
                                >
                                    <List className="h-4 w-4" />
                                </Button>
                                <Button 
                                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                                    size="icon" 
                                    className="h-7 w-7 rounded-md"
                                    onClick={() => setViewMode('grid')}
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Grid */}
                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr,420px] gap-8 min-h-0">
                        <section className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
                            <div className="p-6 border-b flex justify-between items-center bg-slate-50/30">
                                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Observations ({filteredObservations.length})</h2>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <CapaTable 
                                    observations={filteredObservations} 
                                    selectedId={selectedCaseId}
                                    onSelect={setSelectedCaseId}
                                />
                            </div>
                            
                            {/* Pagination Footer */}
                            <footer className="p-4 border-t bg-white flex justify-between items-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Showing 1 to 10 of {filteredObservations.length} cases</p>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400"><RotateCcw className="h-4 w-4 rotate-180" /></Button>
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <Button key={i} variant={i === 1 ? 'default' : 'ghost'} size="icon" className="h-8 w-8 font-black text-[11px]">{i}</Button>
                                    ))}
                                    <span className="px-2 self-center text-slate-300">...</span>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 font-black text-[11px]">13</Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400"><RotateCcw className="h-4 w-4" /></Button>
                                </div>
                            </footer>
                        </section>

                        {/* Preview Drawer */}
                        <CapaCaseDrawer 
                            observation={selectedObservation}
                            onClose={() => setSelectedCaseId(null)}
                        />
                    </div>
                </div>
            </main>

            <CapaInitiateDialog isOpen={isInitiateOpen} onOpenChange={setIsInitiateOpen} />
        </div>
    );
}
