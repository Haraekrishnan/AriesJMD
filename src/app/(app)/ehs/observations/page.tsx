
'use client';

import React, { useState, useMemo } from 'react';
import { useEhs } from '@/contexts/ehs-provider';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { Button } from '@/components/ui/button';
import { Plus, Search, FilterX, FileSpreadsheet, History as HistoryIcon, Clock, AlertTriangle, CheckCircle, Target, FileText, ChevronDown, ChevronRight, MoreVertical, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

// --- SUB-COMPONENTS ---
import CapaKpiCards from '@/components/ehs/capa/CapaKpiCards';
import CapaPipelineSummary from '@/components/ehs/capa/CapaPipelineSummary';
import CapaFilters from '@/components/ehs/capa/CapaFilters';
import CapaCaseDrawer from '@/components/ehs/capa/CapaCaseDrawer';
import CapaCockpit from '@/components/ehs/capa/CapaCockpit';
import CapaInitiateDialog from '@/components/ehs/capa/CapaInitiateDialog';

const severityConfig: Record<string, string> = {
    'Low': 'bg-emerald-50 text-emerald-700 border-emerald-100',
    'Medium': 'bg-blue-50 text-blue-700 border-blue-100',
    'High': 'bg-orange-50 text-orange-700 border-orange-100',
    'Critical': 'bg-rose-50 text-rose-700 border-rose-100',
};

export default function SafetyObservationsPage() {
  const { observations, deleteObservation } = useEhs();
  const { user } = useAuth();
  const { projects } = useGeneral();
  
  // State for Navigation and Selection
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [isCockpitOpen, setIsCockpitOpen] = useState(false);
  const [isInitiateOpen, setIsInitiateOpen] = useState(false);
  const [expandedMasterIds, setExpandedMasterIds] = useState<Set<string>>(new Set());
  
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

  const toggleMaster = (id: string) => {
    setExpandedMasterIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });
  };

  const filteredObservations = useMemo(() => {
    return observations.filter(obs => {
        // Show all if searching, otherwise only masters in main list
        if (obs.parentId && !filters.search) return false;

        const projectName = projects.find(p => p.id === obs.projectId)?.name || '';
        
        const matchesSearch = filters.search === '' || 
            obs.description.toLowerCase().includes(filters.search.toLowerCase()) ||
            obs.id.toLowerCase().includes(filters.search.toLowerCase()) ||
            projectName.toLowerCase().includes(filters.search.toLowerCase());

        const matchesCategory = filters.category === 'all' || obs.category === filters.category;
        const matchesRisk = filters.risk === 'all' || obs.severity === filters.risk;
        const matchesStatus = filters.status === 'all' || obs.status === filters.status;
        const matchesStage = filters.stage === 'all' || obs.currentStage === filters.stage;
        const matchesSite = filters.site === 'all' || obs.projectId === filters.site;

        return matchesSearch && matchesCategory && matchesRisk && matchesStatus && matchesStage && matchesSite;
    }).sort((a,b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime());
  }, [observations, filters, projects]);

  const selectedObservation = useMemo(() => 
    observations.find(o => o.id === selectedCaseId),
  [observations, selectedCaseId]);

  const handleOpenCockpit = (id: string) => {
    setSelectedCaseId(id);
    setIsCockpitOpen(true);
  };

  if (isCockpitOpen && selectedObservation) {
    return (
        <CapaCockpit 
            observation={selectedObservation} 
            onClose={() => setIsCockpitOpen(false)} 
        />
    );
  }

  return (
    <div className="h-full flex flex-col space-y-8 animate-in fade-in duration-700">
      {/* --- PAGE HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="text-left">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Safety Observations</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">CAPA Master Tracker · Operational Governance</p>
        </div>
        <div className="flex items-center gap-3">
            <Button variant="outline" className="h-11 px-6 font-bold text-xs uppercase tracking-widest border-2">
                <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" /> Export Excel
            </Button>
            <Button className="h-11 px-8 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-[0.2em] text-[10px] shadow-xl" onClick={() => setIsInitiateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Initiate Discovery
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
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-8 overflow-hidden min-h-0">
          <Card className="rounded-[2rem] border-slate-200 shadow-sm overflow-hidden flex flex-col bg-white">
            <ScrollArea className="flex-1">
                <div className="min-w-max">
                    <Table className="border-separate border-spacing-0">
                        <TableHeader className="bg-slate-50/50 sticky top-0 z-40">
                            <TableRow className="border-b-2">
                                <TableHead className="w-[60px] sticky left-0 z-50 bg-slate-50 border-r border-b font-black uppercase text-[9px] text-center">ID</TableHead>
                                <TableHead className="w-[400px] sticky left-[60px] z-50 bg-slate-50 border-r border-b font-black uppercase text-[9px]">Narrative Findings</TableHead>
                                <TableHead className="w-[100px] border-r border-b font-black uppercase text-[9px] text-center">Category</TableHead>
                                <TableHead className="w-[80px] border-r border-b font-black uppercase text-[9px] text-center">Risk</TableHead>
                                {['Investigation', 'Resolution', 'Implementation', 'Effectiveness', 'Reference', 'Closure'].map(s => (
                                    <TableHead key={s} className="w-[100px] border-r border-b font-black uppercase text-[9px] text-center px-2">{s}</TableHead>
                                ))}
                                <TableHead className="w-[100px] sticky right-0 z-50 bg-slate-50 border-l border-b font-black uppercase text-[9px] text-right pr-6">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredObservations.map(obs => {
                                const isExpanded = expandedMasterIds.has(obs.id);
                                const children = observations.filter(c => c.parentId === obs.id);
                                const hasChildren = children.length > 0;
                                const daysOpen = differenceInDays(new Date(), parseISO(obs.createdAt));
                                
                                return (
                                    <React.Fragment key={obs.id}>
                                        <TableRow 
                                            className={cn(
                                                "group transition-colors cursor-pointer border-b",
                                                selectedCaseId === obs.id ? "bg-blue-50/50" : "hover:bg-slate-50/80"
                                            )}
                                            onClick={() => setSelectedCaseId(obs.id)}
                                        >
                                            <TableCell className="sticky left-0 z-20 bg-white group-hover:bg-slate-50 border-r text-center p-0">
                                                <button 
                                                    className="w-full h-full font-mono font-black text-[10px] text-blue-600 hover:underline uppercase py-4"
                                                    onClick={(e) => { e.stopPropagation(); handleOpenCockpit(obs.id); }}
                                                >
                                                    {obs.id.slice(-4).toUpperCase()}
                                                </button>
                                            </TableCell>
                                            <TableCell className="sticky left-[60px] z-20 bg-white group-hover:bg-slate-50 border-r p-4">
                                                <div className="flex flex-col gap-1">
                                                    <p className="text-[11px] font-bold text-slate-800 line-clamp-1 uppercase leading-tight">{obs.description}</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded uppercase border", obs.status === 'Closed' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100")}>
                                                            {obs.status === 'Closed' ? 'CLOSED' : `OPEN (${daysOpen}D)`}
                                                        </span>
                                                        {hasChildren && <Badge variant="secondary" className="h-4 text-[8px] font-black uppercase" onClick={(e) => { e.stopPropagation(); toggleMaster(obs.id); }}>{children.length} SUB-CASES {isExpanded ? <ChevronDown className="h-2 w-2 ml-1"/> : <ChevronRight className="h-2 w-2 ml-1"/>}</Badge>}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="border-r text-center p-2">
                                                <span className="text-[8px] font-black uppercase text-slate-500 tracking-tighter">{obs.category}</span>
                                            </TableCell>
                                            <TableCell className="border-r text-center p-2">
                                                <Badge variant="outline" className={cn("font-black text-[8px] uppercase tracking-tighter border-2 px-1.5 h-5", severityConfig[obs.severity])}>
                                                    {obs.severity}
                                                </Badge>
                                            </TableCell>
                                            
                                            {/* Lifecycle Status Matrix */}
                                            {['Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'].map(stage => {
                                                const s = obs.stages[stage as any];
                                                const isComp = s?.status === 'Completed';
                                                const isIP = s?.status === 'In Progress' || obs.currentStage === stage;
                                                return (
                                                    <TableCell key={stage} className="border-r text-center p-0">
                                                        <div className="flex items-center justify-center h-full">
                                                            {isComp ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : 
                                                             isIP ? <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" /> : 
                                                             <span className="text-slate-200">─</span>}
                                                        </div>
                                                    </TableCell>
                                                )
                                            })}

                                            <TableCell className="text-right p-4 sticky right-0 z-20 bg-white group-hover:bg-slate-50 border-l border-slate-100">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        <DropdownMenuItem onClick={() => handleOpenCockpit(obs.id)}>
                                                            <Target className="mr-2 h-4 w-4" /> Open Cockpit
                                                        </DropdownMenuItem>
                                                        {user?.role === 'Admin' && (
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-rose-600 focus:text-rose-600">
                                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete Case
                                                                    </DropdownMenuItem>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Permanent Deletion</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            This will permanently purge this safety case and all associated technical logs from the EHS registry.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Abort</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={() => deleteObservation(obs.id)} className="bg-rose-600 hover:bg-rose-700">Purge Record</AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>

                                        {/* Sub-cases Expansion */}
                                        {isExpanded && children.map(child => (
                                            <TableRow key={child.id} className="bg-slate-50/30 hover:bg-slate-50 transition-colors cursor-pointer border-b" onClick={() => setSelectedCaseId(child.id)}>
                                                <TableCell className="sticky left-0 z-20 bg-slate-50 border-r text-center p-0">
                                                    <span className="font-mono font-black text-[9px] text-slate-400 uppercase">↳ {child.id.slice(-4).toUpperCase()}</span>
                                                </TableCell>
                                                <TableCell className="sticky left-[60px] z-20 bg-slate-50 border-r p-4 pl-8">
                                                    <p className="text-[10px] font-bold text-slate-600 line-clamp-1 uppercase italic">{child.description}</p>
                                                </TableCell>
                                                <TableCell colSpan={10} className="p-0 border-r">
                                                    <div className="flex items-center gap-4 h-full px-4">
                                                        <Badge variant="outline" className={cn("font-black text-[8px] uppercase tracking-tighter border-2 px-1.5 h-5", severityConfig[child.severity])}>{child.severity}</Badge>
                                                        <span className="text-[9px] font-black text-slate-400 uppercase">{child.currentStage} PHASE</span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </React.Fragment>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </ScrollArea>
          </Card>

          {/* --- CASE PREVIEW DRAWER --- */}
          <CapaCaseDrawer 
            observation={selectedObservation} 
            onOpenCockpit={() => setIsCockpitOpen(true)}
            onClose={() => setSelectedCaseId(null)}
          />
      </div>

      <CapaInitiateDialog isOpen={isInitiateOpen} onOpenChange={setIsInitiateOpen} />
    </div>
  );
}

