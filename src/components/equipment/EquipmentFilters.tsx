'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import { useAppContext } from '@/contexts/app-provider';

export interface EquipmentFilterValues {
  status: string;
  projectId: string;
}

interface EquipmentFiltersProps {
  onFiltersChange: (filters: EquipmentFilterValues) => void;
}

const statusOptions = ["In Service", "Idle", "Damaged", "Out of Service", "Moved to another project", "Active", "Inactive", "Returned"];

export default function EquipmentFilters({ onFiltersChange }: EquipmentFiltersProps) {
    const { projects } = useAppContext();
    const [filters, setFilters] = useState<EquipmentFilterValues>({
        status: 'all',
        projectId: 'all',
    });

    useEffect(() => {
        onApplyFilters();
    }, [filters]);

    const handleFilterChange = <K extends keyof EquipmentFilterValues>(key: K, value: EquipmentFilterValues[K]) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleApplyFilters = () => {
        onFiltersChange(filters);
    };

    const handleClear = () => {
        setFilters({
            status: 'all',
            projectId: 'all',
        });
    };
    
    const uniqueStatusOptions = Array.from(new Set(statusOptions));

    return (
        <Card>
            <CardHeader>
                <CardTitle>Filters</CardTitle>
                <CardDescription>Filter equipment across all categories by location and status.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4 items-center">
                <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
                    <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filter by status..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {uniqueStatusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={filters.projectId} onValueChange={(v) => handleFilterChange('projectId', v)}>
                    <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filter by project..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Projects</SelectItem>
                        {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Button variant="ghost" onClick={handleClear}><X className="mr-2 h-4 w-4" /> Clear Filters</Button>
            </CardContent>
        </Card>
    );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';