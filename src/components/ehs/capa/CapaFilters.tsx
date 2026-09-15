
'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, FilterX, MapPin, Tag, ShieldCheck, Clock, Download, RotateCcw, LayoutGrid, ListFilter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGeneral } from '@/contexts/general-provider';
import { DateRangePicker } from '@/components/ui/date-range-picker';

interface CapaFiltersProps {
    filters: any;
    onFilterChange: (f: any) => void;
}

export default function CapaFilters({ filters, onFilterChange }: CapaFiltersProps) {
    const { projects } = useGeneral();

    const handleClear = () => {
        onFilterChange({
            search: '',
            category: 'all',
            risk: 'all',
            status: 'all',
            stage: 'all',
            site: 'all',
            dateRange: undefined,
        });
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Filter Toolbar */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                    <Select value={filters.category} onValueChange={(v) => onFilterChange({ ...filters, category: v })}>
                        <SelectTrigger className="h-10 rounded-xl font-bold border-slate-200 bg-white shadow-sm"><SelectValue placeholder="All Categories" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            <SelectItem value="Unsafe Act">Unsafe Act</SelectItem>
                            <SelectItem value="Unsafe Condition">Unsafe Condition</SelectItem>
                            <SelectItem value="Safe Act">Safe Act</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex-1 min-w-[150px]">
                    <Select value={filters.risk} onValueChange={(v) => onFilterChange({ ...filters, risk: v })}>
                        <SelectTrigger className="h-10 rounded-xl font-bold border-slate-200 bg-white shadow-sm"><SelectValue placeholder="All Risk Levels" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Risk Levels</SelectItem>
                            <SelectItem value="Low">Low</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Critical">Critical</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex-1 min-w-[150px]">
                    <Select value={filters.status} onValueChange={(v) => onFilterChange({ ...filters, status: v })}>
                        <SelectTrigger className="h-10 rounded-xl font-bold border-slate-200 bg-white shadow-sm"><SelectValue placeholder="All Status" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="Open">Open</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Closed">Closed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex-1 min-w-[180px]">
                    <Select value={filters.site} onValueChange={(v) => onFilterChange({ ...filters, site: v })}>
                        <SelectTrigger className="h-10 rounded-xl font-bold border-slate-200 bg-white shadow-sm"><SelectValue placeholder="All Sites" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Sites</SelectItem>
                            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex-1 min-w-[240px]">
                    <DateRangePicker 
                        date={filters.dateRange} 
                        onDateChange={(range) => onFilterChange({ ...filters, dateRange: range })}
                        className="h-10 w-full"
                    />
                </div>

                <Button variant="outline" className="h-10 px-4 rounded-xl border-slate-200 font-bold text-slate-500 shadow-sm">
                    <ListFilter className="mr-2 h-4 w-4" /> More Filters
                </Button>

                <div className="flex items-center gap-2 ml-auto">
                    <Button variant="ghost" className="h-10 font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-slate-900" onClick={handleClear}>
                        <RotateCcw className="mr-2 h-4 w-4" /> Reset
                    </Button>
                    <Button variant="outline" className="h-10 font-black uppercase text-[10px] tracking-widest border-2 border-slate-200">
                        <Download className="mr-2 h-4 w-4" /> Export
                    </Button>
                </div>
            </div>
        </div>
    );
}
