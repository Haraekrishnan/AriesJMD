
'use client';
import { useState, useEffect } from 'react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import type { ManpowerProfile, Trade } from '@/lib/types';
import { DateRangePicker } from '../ui/date-range-picker';
import { TRADES } from '@/lib/mock-data';
import { useAppContext } from '@/contexts/app-provider';

export interface ManpowerFilterValues {
  status: 'all' | ManpowerProfile['status'];
  trade: 'all' | Trade;
  returnDateRange: DateRange | undefined;
  projectId: 'all' | string;
  expiryDateRange: DateRange | undefined;
}

interface ManpowerFiltersProps {
  onFiltersChange: (filters: ManpowerFilterValues) => void;
}

const statusOptions: ManpowerProfile['status'][] = ['Working', 'On Leave', 'Resigned', 'Terminated', 'Left the Project'];

export default function ManpowerFilters({ onFiltersChange }: ManpowerFiltersProps) {
    const { projects } = useAppContext();
    const [filters, setFilters] = useState<ManpowerFilterValues>({
        status: 'all',
        trade: 'all',
        returnDateRange: undefined,
        projectId: 'all',
        expiryDateRange: undefined,
    });

    useEffect(() => {
        onFiltersChange(filters);
    }, [filters, onFiltersChange]);

    const handleFilterChange = <K extends keyof ManpowerFilterValues>(key: K, value: ManpowerFilterValues[K]) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleClear = () => {
        setFilters({
            status: 'all',
            trade: 'all',
            returnDateRange: undefined,
            projectId: 'all',
            expiryDateRange: undefined,
        });
    };

    return (
        <div className="flex flex-wrap gap-2 items-center">
            <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v as ManpowerFilterValues['status'])}>
                <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Filter by status..." /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={filters.trade} onValueChange={(v) => handleFilterChange('trade', v as ManpowerFilterValues['trade'])}>
                <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Filter by trade..." /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Trades</SelectItem>
                    {TRADES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={filters.projectId} onValueChange={(v) => handleFilterChange('projectId', v)}>
                <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Filter by plant..." /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Plants</SelectItem>
                    {projects.filter(p => p.isPlant).map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                </SelectContent>
            </Select>
            
            <div className="flex flex-col sm:flex-row gap-2">
                <DateRangePicker placeholder="Filter by return date..." date={filters.returnDateRange} onDateChange={(d) => handleFilterChange('returnDateRange', d)} />
                <DateRangePicker placeholder="Filter by expiry date..." date={filters.expiryDateRange} onDateChange={(d) => handleFilterChange('expiryDateRange', d)} />
            </div>

            <div className="flex gap-2 ml-auto">
                <Button variant="ghost" onClick={handleClear}><X className="mr-2 h-4 w-4" /> Clear</Button>
            </div>
        </div>
    );
}
