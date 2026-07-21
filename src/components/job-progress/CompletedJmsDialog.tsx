'use client';
import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { usePlanner } from '@/contexts/planner-provider';
import { useGeneral } from '@/contexts/general-provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { CheckCircle, Eye, Search, FilterX, CheckCheck } from 'lucide-react';
import type { JobProgress } from '@/lib/types';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface CompletedJmsDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onViewJob: (job: JobProgress) => void;
}

export default function CompletedJmsDialog({ isOpen, setIsOpen, onViewJob }: CompletedJmsDialogProps) {
  const { user, users } = useAuth();
  const { jobProgress, markJmsAsNoted, bulkMarkJmsAsNoted } = usePlanner();
  const { projects } = useGeneral();
  
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');
  const [plantFilter, setPlantFilter] = useState('all');
  const [unitFilter, setUnitFilter] = useState('all');

  const baseCompletedJms = useMemo(() => {
    if (!user) return [];
    
    const isPrivileged = ['Admin', 'Project Coordinator', 'Document Controller'].includes(user.role);

    return jobProgress.filter(job => {
        // Must be completed
        if (job.status !== 'Completed') return false;
        
        // Must not be already noted
        if (job.notedById) return false;

        // Visibility rule:
        // 1. Privileged roles see all completed
        // 2. Creator sees their own completed
        if (isPrivileged) return true;
        return job.creatorId === user.id;
    }).sort((a, b) => parseISO(b.lastUpdated).getTime() - parseISO(a.lastUpdated).getTime());
  }, [user, jobProgress]);

  // Derived filter options
  const filterOptions = useMemo(() => {
      const months = new Set<string>();
      const units = new Set<string>();
      const plantIds = new Set<string>();

      baseCompletedJms.forEach(job => {
          if (job.lastUpdated) months.add(format(parseISO(job.lastUpdated), 'yyyy-MM'));
          if (job.plantUnit) units.add(job.plantUnit);
          if (job.projectId) plantIds.add(job.projectId);
      });

      return {
          months: Array.from(months).sort().reverse(),
          units: Array.from(units).sort(),
          plants: projects.filter(p => plantIds.has(p.id))
      };
  }, [baseCompletedJms, projects]);

  const filteredJms = useMemo(() => {
    return baseCompletedJms.filter(job => {
        // Search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const matchesJms = job.jmsNo?.toLowerCase().includes(term);
            const matchesAmount = job.amount?.toString().includes(term);
            const matchesTitle = job.title.toLowerCase().includes(term);
            if (!matchesJms && !matchesAmount && !matchesTitle) return false;
        }
        
        // Month
        if (monthFilter !== 'all') {
            const jobDate = parseISO(job.lastUpdated);
            if (format(jobDate, 'yyyy-MM') !== monthFilter) return false;
        }

        // Plant
        if (plantFilter !== 'all' && job.projectId !== plantFilter) return false;

        // Unit
        if (unitFilter !== 'all' && job.plantUnit !== unitFilter) return false;

        return true;
    });
  }, [baseCompletedJms, searchTerm, monthFilter, plantFilter, unitFilter]);

  const dynamicButtonLabel = useMemo(() => {
    if (searchTerm) return 'MARK SEARCH RESULTS AS NOTED';
    
    const parts = [];
    if (monthFilter !== 'all') {
        parts.push(format(parseISO(`${monthFilter}-01`), 'MMMM'));
    }
    if (plantFilter !== 'all') {
        const plant = filterOptions.plants.find(p => p.id === plantFilter);
        if (plant) parts.push(plant.name);
    }
    if (unitFilter !== 'all') {
        parts.push(unitFilter);
    }

    if (parts.length === 0) return 'MARK ALL AS NOTED';
    return `MARK ${parts.join(' ')} AS NOTED`.toUpperCase();
  }, [searchTerm, monthFilter, plantFilter, unitFilter, filterOptions]);

  const handleNoted = (jobId: string) => {
    markJmsAsNoted(jobId);
  };

  const handleMarkAllAsNoted = () => {
      if (filteredJms.length === 0) return;
      const ids = filteredJms.map(j => j.id);
      bulkMarkJmsAsNoted(ids);
  };

  const handleView = (job: JobProgress) => {
    onViewJob(job);
    setIsOpen(false);
  };

  const clearFilters = () => {
      setSearchTerm('');
      setMonthFilter('all');
      setPlantFilter('all');
      setUnitFilter('all');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-4xl h-[95vh] flex flex-col">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pr-8">
            <div>
              <DialogTitle>Completed JMS (Awaiting Review)</DialogTitle>
              <DialogDescription>
                Filter and mark finalized jobs as noted.
              </DialogDescription>
            </div>
            {filteredJms.length > 0 && (
                <Button 
                    variant="success" 
                    size="sm" 
                    className="font-black h-10 px-4 bg-green-600 hover:bg-green-700 text-white shadow-md transition-all active:scale-95 uppercase text-[11px] tracking-wider"
                    onClick={handleMarkAllAsNoted}
                >
                    <CheckCheck className="mr-2 h-4 w-4" />
                    {dynamicButtonLabel}
                </Button>
            )}
          </div>
        </DialogHeader>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-muted/20 border rounded-lg shrink-0">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search JMS, Amount..." 
                    className="pl-8 h-9 text-xs" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {filterOptions.months.map(m => (
                        <SelectItem key={m} value={m}>{format(parseISO(`${m}-01`), 'MMMM yyyy')}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={plantFilter} onValueChange={setPlantFilter}>
                <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Plant" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Plants</SelectItem>
                    {filterOptions.plants.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <div className="flex gap-2">
                <Select value={unitFilter} onValueChange={setUnitFilter}>
                    <SelectTrigger className="h-9 text-xs flex-1">
                        <SelectValue placeholder="Unit" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Units</SelectItem>
                        {filterOptions.units.map(u => (
                            <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={clearFilters} title="Clear Filters">
                    <FilterX className="h-4 w-4" />
                </Button>
            </div>
        </div>

        <ScrollArea className="flex-1 overflow-auto mt-2">
          <div className="space-y-3 p-1">
            {filteredJms.length > 0 ? filteredJms.map(job => {
              const project = projects.find(p => p.id === job.projectId);
              const creator = users.find(u => u.id === job.creatorId);
              const locationText = [project?.name, job.plantUnit].filter(Boolean).join(' / ');
              
              return (
                <div key={job.id} className="border p-4 rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-muted/20 hover:bg-muted/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate text-sm sm:text-base mb-1 uppercase">{job.title}</p>
                    <p className="text-xs text-muted-foreground truncate mb-2">{locationText || 'N/A'}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[10px]">
                        <Badge variant="outline" className="h-4 py-0 text-[9px] font-mono">JMS: {job.jmsNo || 'N/A'}</Badge>
                        <Badge variant="outline" className="h-4 py-0 text-[9px] font-bold">Amt: {job.amount ? new Intl.NumberFormat('en-IN').format(job.amount) : '0'}</Badge>
                        <span className="text-muted-foreground font-medium">by {creator?.name}</span>
                        <span className="text-muted-foreground italic ml-auto">{format(parseISO(job.lastUpdated), 'dd MMM, p')}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 shrink-0">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-9 text-xs px-4 font-bold whitespace-nowrap" 
                      onClick={() => handleView(job)}
                    >
                        <Eye className="mr-2 h-4 w-4" />
                        DETAILS
                    </Button>
                    <Button 
                      size="sm" 
                      className="h-9 text-xs px-4 bg-green-600 hover:bg-green-700 font-bold whitespace-nowrap text-white" 
                      onClick={() => handleNoted(job.id)}
                    >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        MARK AS NOTED
                    </Button>
                  </div>
                </div>
              )
            }) : (
              <div className="text-center py-24 text-muted-foreground space-y-4">
                  <CheckCircle className="h-16 w-16 mx-auto opacity-10" />
                  <div className="space-y-1">
                      <p className="text-lg font-semibold">No jobs found.</p>
                      <p className="text-sm">Try adjusting your filters or search term.</p>
                  </div>
                  {(searchTerm || monthFilter !== 'all' || plantFilter !== 'all' || unitFilter !== 'all') && (
                      <Button variant="link" onClick={clearFilters}>Reset Filters</Button>
                  )}
              </div>
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="mt-auto border-t pt-4">
          <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
