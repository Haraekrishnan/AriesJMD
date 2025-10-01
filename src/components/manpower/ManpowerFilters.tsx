
'use client';
import { useState } from 'react';
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
  onApplyFilters: (filters: ManpowerFilterValues) => void;
}

const statusOptions: ManpowerProfile['status'][] = ['Working', 'On Leave', 'Resigned', 'Terminated', 'Left the Project'];

export default function ManpowerFilters({ onApplyFilters }: ManpowerFiltersProps) {
    const { projects } = useAppContext();
    const [status, setStatus] = useState<ManpowerFilterValues['status']>('all');
    const [trade, setTrade] = useState<ManpowerFilterValues['trade']>('all');
    const [returnDateRange, setReturnDateRange] = useState<DateRange | undefined>();
    const [projectId, setProjectId] = useState<ManpowerFilterValues['projectId']>('all');
    const [expiryDateRange, setExpiryDateRange] = useState<DateRange | undefined>();

    const handleApply = () => {
        onApplyFilters({ status, trade, returnDateRange, projectId, expiryDateRange });
    };

    const handleClear = () => {
        setStatus('all');
        setTrade('all');
        setReturnDateRange(undefined);
        setProjectId('all');
        setExpiryDateRange(undefined);
        onApplyFilters({ status: 'all', trade: 'all', returnDateRange: undefined, projectId: 'all', expiryDateRange: undefined });
    };

    return (
        <div className="flex flex-wrap gap-2 items-center">
            <Select value={status} onValueChange={(v) => setStatus(v as ManpowerFilterValues['status'])}>
                <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Filter by status..." /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={trade} onValueChange={(v) => setTrade(v as ManpowerFilterValues['trade'])}>
                <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Filter by trade..." /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Trades</SelectItem>
                    {TRADES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Filter by plant..." /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Plants</SelectItem>
                    {projects.filter(p => p.isPlant).map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                </SelectContent>
            </Select>
            
            <div className="flex flex-col sm:flex-row gap-2">
                <DateRangePicker placeholder="Filter by return date..." date={returnDateRange} onDateChange={setReturnDateRange} />
                <DateRangePicker placeholder="Filter by expiry date..." date={expiryDateRange} onDateChange={setExpiryDateRange} />
            </div>

            <div className="flex gap-2 ml-auto">
                <Button onClick={handleApply}>Apply</Button>
                <Button variant="ghost" onClick={handleClear}><X className="mr-2 h-4 w-4" /> Clear</Button>
            </div>
        </div>
    );
}
