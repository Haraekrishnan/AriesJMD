'use client';
import React, { useMemo, useState } from 'react';
import { useEhs } from '@/contexts/ehs-provider';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { Button } from '@/components/ui/button';
import { Plus, Download, History, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import CapaKpiCards from '@/components/ehs/capa/CapaKpiCards';
import CapaFilters from '@/components/ehs/capa/CapaFilters';
import CapaTable from '@/components/ehs/capa/CapaTable';
import CapaInitiateDialog from '@/components/ehs/capa/CapaInitiateDialog';
import CapaCockpit from '@/components/ehs/capa/CapaCockpit';
import { cn } from '@/lib/utils';
import { EMPTY_OBSERVATION_FILTERS, filterObservations, observationCsv, type ObservationFilters } from '@/lib/ehs-observations';
import { format, isValid } from 'date-fns';

export default function SafetyObservationsPage() {
  const { observations } = useEhs();
  const { user } = useAuth();
  const { projects } = useGeneral();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cockpitId, setCockpitId] = useState<string | null>(null);
  const [isInitiateOpen, setIsInitiateOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ObservationFilters>({...EMPTY_OBSERVATION_FILTERS});
  const masterObservations = useMemo(() => observations.filter(o => !o.parentId), [observations]);
  const filtered = useMemo(() => filterObservations(masterObservations, filters, tab, user?.id), [masterObservations, filters, tab, user?.id]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * 10, currentPage * 10);
  const cockpitObservation = observations.find(o => o.id === cockpitId);
  const updateFilters = (next: ObservationFilters) => { setFilters(next); setPage(1); setSelectedId(null); };
  const tabs = [
    { id: 'all', label: 'All observations', count: masterObservations.length },
    { id: 'mine', label: 'Assigned to me', count: masterObservations.filter(o => user?.id && o.stages?.[o.currentStage]?.assigneeId === user.id).length },
    { id: 'closed', label: 'Closed', count: masterObservations.filter(o => o.status === 'Closed').length },
  ];
  const activity = useMemo(() => filtered.flatMap(o => Object.values(o.activities || {}).map(a => ({...a, observationId:o.id}))).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [filtered]);
  const exportRegistry = () => {
    const url = URL.createObjectURL(new Blob(['\uFEFF', observationCsv(filtered, id => projects.find(p => p.id === id)?.name || id)], {type:'text/csv;charset=utf-8;'}));
    const link = document.createElement('a'); link.href = url; link.download = 'safety-observations.csv'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  if (cockpitObservation) return <CapaCockpit observation={cockpitObservation} onClose={() => setCockpitId(null)} />;
  return <div className="mx-auto max-w-[1800px] space-y-7 p-5 md:p-8">
    <header className="flex flex-wrap items-center justify-between gap-5">
      <div><p className="mb-3 text-sm text-slate-500">Workspace <span className="mx-2 text-slate-300">/</span> Safety management</p>
        <div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-semibold tracking-tight text-slate-950">Safety observations</h1><span className="rounded-lg bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">CAPA</span></div>
        <p className="mt-2 text-sm text-slate-500">Track observations. Resolve risks. Build a safer workplace.</p>
      </div>
      <Button onClick={() => setIsInitiateOpen(true)} className="h-11 gap-2 rounded-lg bg-blue-600 px-5 text-white hover:bg-blue-700"><Plus className="h-4 w-4" />New observation</Button>
    </header>
    <CapaKpiCards observations={masterObservations} onFilterByStatus={status => { setTab('all'); updateFilters({...EMPTY_OBSERVATION_FILTERS,status}); }} onFilterByRisk={risk => { setTab('all'); updateFilters({...EMPTY_OBSERVATION_FILTERS,risk}); }} />
    <section aria-label="Observation register" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 pt-6"><h2 className="text-xl font-semibold text-slate-900">Observation register</h2><div className="flex gap-2"><Button variant="outline" onClick={() => setAuditOpen(true)} className="gap-2"><History className="h-4 w-4" />Audit trail</Button><Button variant="outline" onClick={exportRegistry} disabled={!filtered.length} className="gap-2"><Download className="h-4 w-4" />Export</Button></div></div>
      <div className="mt-4 flex overflow-x-auto border-b px-6" aria-label="Observation views">
        {tabs.map(item => <button key={item.id} aria-pressed={tab === item.id} onClick={() => {setTab(item.id);setPage(1);setSelectedId(null);}} className={cn('flex shrink-0 items-center gap-2 border-b-2 px-4 py-4 text-sm font-medium focus-visible:outline-blue-600',tab === item.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900')}>{item.label}<span className={cn('rounded-full px-2 py-0.5 text-xs',tab === item.id ? 'bg-blue-50' : 'bg-slate-100')}>{item.count}</span></button>)}
      </div>
      <div className="p-5"><CapaFilters filters={filters} onFilterChange={updateFilters} /></div>
      {filtered.length ? <CapaTable observations={pageRows} selectedId={selectedId} onSelect={setSelectedId} onOpenCockpit={setCockpitId} /> : <div className="flex flex-col items-center px-6 py-16 text-center"><ShieldCheck className="mb-4 h-10 w-10 text-slate-300" /><h3 className="font-semibold">No observations found</h3><p className="mt-2 text-sm text-slate-500">Try another view or adjust your search and filters.</p><Button variant="outline" className="mt-5" onClick={() => {setTab('all');updateFilters({...EMPTY_OBSERVATION_FILTERS});}}>Clear filters</Button></div>}
      <div className="flex items-center justify-between gap-3 border-t px-6 py-4 text-sm text-slate-500"><p aria-live="polite">Showing {filtered.length ? (currentPage-1)*10+1 : 0}–{Math.min(currentPage*10,filtered.length)} of {filtered.length} observations</p><div className="flex items-center gap-3"><Button aria-label="Previous page" variant="outline" size="icon" disabled={currentPage === 1} onClick={() => setPage(currentPage-1)}><ChevronLeft className="h-4 w-4" /></Button><span>{currentPage} / {pageCount}</span><Button aria-label="Next page" variant="outline" size="icon" disabled={currentPage === pageCount} onClick={() => setPage(currentPage+1)}><ChevronRight className="h-4 w-4" /></Button></div></div>
    </section>
    <CapaInitiateDialog isOpen={isInitiateOpen} onOpenChange={setIsInitiateOpen} />
    <Dialog open={auditOpen} onOpenChange={setAuditOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Observation audit trail</DialogTitle><DialogDescription>Recorded activity for the observations in this view.</DialogDescription></DialogHeader><div className="max-h-[60vh] space-y-4 overflow-y-auto py-3">{activity.length ? activity.map(a => <div key={a.observationId+a.id} className="border-l-2 border-blue-200 pl-4"><button className="text-sm font-medium text-blue-600 hover:underline" onClick={() => {setAuditOpen(false);setCockpitId(a.observationId);}}>CAPA-{a.observationId.slice(-6).toUpperCase()}</button><p className="mt-1 text-sm">{a.action}</p><p className="mt-1 text-xs text-slate-500">{isValid(new Date(a.date)) ? format(new Date(a.date),'dd MMM yyyy, HH:mm') : 'Date unavailable'}</p></div>) : <p className="py-6 text-sm text-slate-500">No activity recorded for these observations.</p>}</div></DialogContent></Dialog>
  </div>;
}
