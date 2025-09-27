

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


export interface InventoryFilterValues {
    name: string;
    status: string;
    projectId: string;
    search: string;
}

interface InventoryFiltersProps {
  onApplyFilters: (filters: InventoryFilterValues) => void;
}

const statusOptions: {value: InventoryItemStatus | 'Inspection Expired' | 'TP Expired', label: string}[] = [
    { value: 'In Use', label: 'In Use' },
    { value: 'In Store', label: 'In Store' },
    { value: 'Damaged', label: 'Damaged' },
    { value: 'Expired', label: 'Expired (Item)' },
    { value: 'Inspection Expired', label: 'Inspection Expired' },
    { value: 'TP Expired', label: 'TP Expired' },
];

export default function InventoryFilters({ onApplyFilters }: InventoryFiltersProps) {
    const { projects, inventoryItems } = useAppContext();
    const [name, setName] = useState('all');
    const [status, setStatus] = useState('all');
    const [projectId, setProjectId] = useState('all');
    const [search, setSearch] = useState('');

    const itemNames = Array.from(new Set(inventoryItems.map(item => item.name)));
    
    useEffect(() => {
        onApplyFilters({ name, status, projectId, search });
    }, [name, status, projectId, search, onApplyFilters]);


    const handleClear = () => {
        setName('all');
        setStatus('all');
        setProjectId('all');
        setSearch('');
    };

    return (
        <div className="flex flex-wrap gap-4 items-center">
            <Input 
                placeholder="Search by serial, aries id, or croll no..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="w-full md:w-auto"
            />
            <Select value={name} onValueChange={setName}><SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Filter by item..." /></SelectTrigger><SelectContent><SelectItem value="all">All Items</SelectItem>{itemNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent></Select>
            <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Filter by status..." /></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem>{statusOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select>
            <Select value={projectId} onValueChange={setProjectId}><SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Filter by project..." /></SelectTrigger><SelectContent><SelectItem value="all">All Projects</SelectItem>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>

            <div className="flex gap-2 ml-auto">
                <Button variant="secondary" onClick={handleClear}><X className="mr-2 h-4 w-4" /> Clear</Button>
            </div>
        </div>
    );
}
