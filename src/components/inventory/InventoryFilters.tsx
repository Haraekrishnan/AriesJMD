
'use client';

import { useState, useEffect } from 'react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from '@/components/ui/select';
import { X, FileDown, Search as SearchIcon } from 'lucide-react';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { useInventory } from '@/contexts/inventory-provider';
import type { InventoryItemStatus } from '@/lib/types';
import { DateRangePicker } from '../ui/date-range-picker';
import { Input } from '../ui/input';
import { Card, CardContent } from '@/components/ui/card';
import InventoryReportDownloads from './InventoryReportDownloads';

export interface InventoryFilterValues {
  name: string;
  status: string;
  projectId: string;
  search: string;
  updatedDateRange: DateRange | undefined;
}

interface InventoryFiltersProps {
  onApplyFilters: (filters: InventoryFilterValues) => void;
  initialFilters: InventoryFilterValues;
}

const detailedStatusOptions: InventoryItemStatus[] = ['In Use', 'In Store', 'Damaged', 'Expired', 'Moved to another project', 'Quarantine'];

export default function InventoryFilters({ onApplyFilters, initialFilters }: InventoryFiltersProps) {
    const { projects } = useGeneral();
    const { inventoryItems } = useInventory();
    const { user, can } = useAuth();
    const [filters, setFilters] = useState<InventoryFilterValues>(initialFilters);

    const itemNames = Array.from(new Set(inventoryItems.filter(item => item.category === 'General').map(item => item.name))).sort();

    useEffect(() => {
        onApplyFilters(filters);
    }, [filters, onApplyFilters]);

    const handleFilterChange = <K extends keyof InventoryFilterValues>(key: K, value: InventoryFilterValues[K]) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleClear = () => {
        setFilters({
            name: 'all',
            status: 'all',
            projectId: 'all',
            search: '',
            updatedDateRange: undefined,
        });
    };
    
    const canViewAllProjects = can.manage_equipment_status || user?.role === 'Admin' || user?.role === 'NDT Supervisor';

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardContent className="p-0 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                    <div className="relative">
                        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input 
                            placeholder="Search by serial, aries id..." 
                            value={filters.search} 
                            onChange={(e) => handleFilterChange('search', e.target.value)} 
                            className="h-9 w-full sm:w-[200px] pl-8 text-xs font-bold"
                        />
                    </div>

                    <Select value={filters.name} onValueChange={(v) => handleFilterChange('name', v)}>
                        <SelectTrigger className="h-9 w-full sm:w-[150px] text-xs font-bold">
                            <SelectValue placeholder="All Items" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Items</SelectItem>
                            {itemNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    
                    <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
                        <SelectTrigger className="h-9 w-full sm:w-[150px] text-xs font-bold">
                            <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectSeparator />
                            {detailedStatusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Select value={filters.projectId} onValueChange={(v) => handleFilterChange('projectId', v)}>
                        <SelectTrigger className="h-9 w-full sm:w-[150px] text-xs font-bold">
                            <SelectValue placeholder="All Projects" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Projects</SelectItem>
                            {projects.map(p => {
                                const isAllowed = canViewAllProjects || user?.projectIds?.includes(p.id);
                                return (
                                    <SelectItem key={p.id} value={p.id} disabled={!isAllowed}>
                                        {p.name}
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>

                    <DateRangePicker 
                        placeholder="Filter by updated date..." 
                        date={filters.updatedDateRange} 
                        onDateChange={(d) => handleFilterChange('updatedDateRange', d)}
                        className="h-9 text-xs"
                    />

                    <Button variant="ghost" size="sm" onClick={handleClear} className="h-9 text-xs font-bold text-muted-foreground hover:text-foreground">
                        <X className="mr-1.5 h-3.5 w-3.5" /> Clear
                    </Button>
                </div>

                <div className="shrink-0">
                    <InventoryReportDownloads items={inventoryItems} />
                </div>
            </CardContent>
        </Card>
    );
}
