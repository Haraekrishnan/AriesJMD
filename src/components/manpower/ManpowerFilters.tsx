'use client';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useAppContext } from '@/hooks/use-app-context';
import { TRADES } from '@/lib/mock-data';

export type ManpowerFilterValues = {
    status: 'all' | 'Working' | 'On Leave' | 'Resigned' | 'Terminated';
    trade: 'all' | string;
    projectId: 'all' | string;
    returnDateRange?: DateRange;
    expiryDateRange?: DateRange;
};

type ManpowerFiltersProps = {
    onApplyFilters: (filters: ManpowerFilterValues) => void;
};

const INITIAL_FILTERS: ManpowerFilterValues = {
    status: 'all',
    trade: 'all',
    projectId: 'all',
    returnDateRange: undefined,
    expiryDateRange: undefined,
};

export default function ManpowerFilters({ onApplyFilters }: ManpowerFiltersProps) {
    const { projects } = useAppContext();
    const [filters, setFilters] = useState<ManpowerFilterValues>(INITIAL_FILTERS);

    const handleFilterChange = (key: keyof ManpowerFilterValues, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleApply = () => {
        onApplyFilters(filters);
    };

    const handleReset = () => {
        setFilters(INITIAL_FILTERS);
        onApplyFilters(INITIAL_FILTERS);
    };
    
    // Create a unique list of project names from manpower profiles
    const projectNames = useMemo(() => {
        return projects.map(p => p.name)
    }, [projects]);


    return (
        <div className="flex flex-wrap items-center gap-4">
            <Select value={filters.status} onValueChange={val => handleFilterChange('status', val)}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Working">Working</SelectItem>
                    <SelectItem value="On Leave">On Leave</SelectItem>
                    <SelectItem value="Resigned">Resigned</SelectItem>
                    <SelectItem value="Terminated">Terminated</SelectItem>
                </SelectContent>
            </Select>

            <Select value={filters.trade} onValueChange={val => handleFilterChange('trade', val)}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Trade" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Trades</SelectItem>
                    {TRADES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
            </Select>

            <Select value={filters.projectId} onValueChange={val => handleFilterChange('projectId', val)}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Project" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projectNames.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
            </Select>

            <Popover>
                <PopoverTrigger asChild>
                    <Button variant={'outline'} className={cn('w-[240px] justify-start text-left font-normal', !filters.returnDateRange && 'text-muted-foreground' )}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.returnDateRange?.from ? (filters.returnDateRange.to ? `${format(filters.returnDateRange.from, 'LLL dd, y')} - ${format(filters.returnDateRange.to, 'LLL dd, y')}` : format(filters.returnDateRange.from, 'LLL dd, y')) : <span>Return Date</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="range" selected={filters.returnDateRange} onSelect={val => handleFilterChange('returnDateRange', val)} />
                </PopoverContent>
            </Popover>

            <Popover>
                <PopoverTrigger asChild>
                     <Button variant={'outline'} className={cn('w-[240px] justify-start text-left font-normal', !filters.expiryDateRange && 'text-muted-foreground' )}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                         {filters.expiryDateRange?.from ? (filters.expiryDateRange.to ? `${format(filters.expiryDateRange.from, 'LLL dd, y')} - ${format(filters.expiryDateRange.to, 'LLL dd, y')}` : format(filters.expiryDateRange.from, 'LLL dd, y')) : <span>Doc Expiry Date</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="range" selected={filters.expiryDateRange} onSelect={val => handleFilterChange('expiryDateRange', val)} />
                </PopoverContent>
            </Popover>

            <Button onClick={handleApply}>Apply Filters</Button>
            <Button variant="ghost" onClick={handleReset}><X className="mr-2 h-4 w-4" />Reset</Button>
        </div>
    );
}
