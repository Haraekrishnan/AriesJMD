
'use client';
import { useState, useEffect } from 'react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext } from '@/contexts/app-provider';
import type { InventoryItemStatus } from '@/lib/types';
import { X } from 'lucide-react';
import type { InventoryItem } from '@/lib/types';
import { DateRangePicker } from '../ui/date-range-picker';


export interface InventoryFilterValues {
    name: string;
    status: string;
    projectId: string;
    search: string;
    updatedDateRange: DateRange | undefined;
}

interface InventoryFiltersProps {
  onApplyFilters: (filters: InventoryFilterValues) => void;
}

const statusOptions: {value: InventoryItemStatus | 'Inspection Expired' | 'TP Expired' | 'Not Verified', label: string}[] = [
    { value: 'In Use', label: 'In Use' },
    { value: 'In Store', label: 'In Store' },
    { value: 'Damaged', label: 'Damaged' },
    { value: 'Quarantine', label: 'Quarantine' },
    { value: 'Expired', label: 'Expired (Item)' },
    { value: 'Moved to another project', label: 'Moved to another project' },
    { value: 'Inspection Expired', label: 'Inspection Expired' },
    { value: 'TP Expired', label: 'TP Expired' },
    { value: 'Not Verified', label: 'Not Verified (15+ days)' },
];

export default function InventoryFilters({ onApplyFilters }: InventoryFiltersProps) {
    const { projects, inventoryItems, user, can } = useAppContext();
    const [name, setName] = useState('all');
    const [status, setStatus] = useState('all');
    const [projectId, setProjectId] = useState('all');
    const [search, setSearch] = useState('');
    const [updatedDateRange, setUpdatedDateRange] = useState<DateRange | undefined>();

    const itemNames = Array.from(new Set(inventoryItems.map(item => item.name)));
    
    useEffect(() => {
        onApplyFilters({ name, status, projectId, search, updatedDateRange });
    }, [name, status, projectId, search, updatedDateRange, onApplyFilters]);


    const handleClear = () => {
        setName('all');
        setStatus('all');
        setProjectId('all');
        setSearch('');
        setUpdatedDateRange(undefined);
    };
    
    const canViewAllProjects = can.manage_inventory || user?.role === 'Admin';

    return (
        <div className="flex flex-wrap gap-4 items-center">
            <Input 
                placeholder="Search by serial, aries id, or croll no..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="w-full sm:w-auto"
            />
            <Select value={name} onValueChange={setName}><SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filter by item..." /></SelectTrigger><SelectContent><SelectItem value="all">All Items</SelectItem>{itemNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent></Select>
            <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filter by status..." /></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem>{statusOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select>
            <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filter by project..." /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map(p => {
                        const isAllowed = canViewAllProjects || user?.projectIds?.includes(p.id);
                        return (
                            <SelectItem key={p.id} value={p.id} disabled={!isAllowed} className={!isAllowed ? 'text-muted-foreground' : ''}>
                                {p.name}
                            </SelectItem>
                        );
                    })}
                </SelectContent>
            </Select>
            <DateRangePicker placeholder="Filter by updated date..." date={updatedDateRange} onDateChange={setUpdatedDateRange} />

            <div className="flex gap-2 ml-auto">
                <Button variant="secondary" onClick={handleClear}><X className="mr-2 h-4 w-4" /> Clear</Button>
            </div>
        </div>
    );
}
