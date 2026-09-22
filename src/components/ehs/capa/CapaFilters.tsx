'use client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, RotateCcw, Calendar as CalendarIcon } from 'lucide-react';
import { useGeneral } from '@/contexts/general-provider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { EMPTY_OBSERVATION_FILTERS, type ObservationFilters } from '@/lib/ehs-observations';
export default function CapaFilters({ filters, onFilterChange }: { filters: ObservationFilters; onFilterChange: (filters: ObservationFilters) => void }) {
  const { projects } = useGeneral();
  const set = (key: keyof ObservationFilters, value: string | Date | undefined) => onFilterChange({ ...filters, [key]: value });
  const options = [
    { key: 'category' as const, label: 'Category', all: 'All categories', items: ['Unsafe Act', 'Unsafe Condition', 'Safe Act', 'Near Miss', 'Environmental'].map(v => [v,v]) },
    { key: 'risk' as const, label: 'Risk level', all: 'All risk levels', items: [['high-priority','High & critical'], ...['Low','Medium','High','Critical'].map(v => [v,v])] },
    { key: 'status' as const, label: 'Status', all: 'All statuses', items: [['active','Open & in progress'], ...['Open','Awaiting review','Rework required','Closed','Overdue'].map(v => [v,v])] },
    { key: 'site' as const, label: 'Site', all: 'All sites', items: projects.map(p => [p.id,p.name]) },
  ];
  return <div className="flex flex-wrap items-center gap-3">
    <div className="relative min-w-[220px] flex-1"><Search aria-hidden="true" className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input aria-label="Search observations" placeholder="Search observations…" value={filters.search} onChange={e => set('search', e.target.value)} className="h-10 bg-white pl-10" /></div>
    {options.map(option => <Select key={option.key} value={filters[option.key]} onValueChange={v => set(option.key,v)}><SelectTrigger aria-label={option.label} className="h-10 w-[155px] bg-white text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{option.all}</SelectItem>{option.items.map(([value,label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>)}
    <Popover><PopoverTrigger asChild><Button variant="outline" className="h-10 gap-2 font-normal"><CalendarIcon className="h-4 w-4" />{filters.date ? format(filters.date,'dd MMM yyyy') : 'Created date'}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="end"><Calendar mode="single" selected={filters.date} onSelect={date => set('date',date)} /></PopoverContent></Popover>
    <Button variant="ghost" onClick={() => onFilterChange({...EMPTY_OBSERVATION_FILTERS})} className="h-10 gap-2 text-slate-500"><RotateCcw className="h-4 w-4" />Reset</Button>
  </div>;
}
