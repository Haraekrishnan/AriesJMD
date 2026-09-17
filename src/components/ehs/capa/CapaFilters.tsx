'use client';

import React from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
    Filter,
    RotateCcw,
    Download,
    Calendar as CalendarIcon
} from 'lucide-react';
import { useGeneral } from '@/contexts/general-provider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

interface CapaFiltersProps {
    filters: {
        search: string;
        category: string;
        risk: string;
        status: string;
        site: string;
        date?: Date;
    };
    onFilterChange: (filters: CapaFiltersProps['filters']) => void;
}

export default function CapaFilters({
    filters,
    onFilterChange,
}: CapaFiltersProps) {
    const { projects } = useGeneral();

    const set = (key: string, value: unknown) => {
        onFilterChange({
            ...filters,
            [key]: value,
        });
    };

    const reset = () => {
        onFilterChange({
            search: '',
            category: 'all',
            risk: 'all',
            status: 'all',
            site: 'all',
            date: undefined,
        });
    };

    return (
        <div className="flex flex-wrap items-center gap-3">
            <Select
                value={filters.category}
                onValueChange={value => set('category', value)}
            >
                <SelectTrigger className="h-10 w-[160px] rounded-lg border-slate-200 bg-white text-[12px] font-bold uppercase tracking-tight">
                    <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Unsafe Act">Unsafe Act</SelectItem>
                    <SelectItem value="Unsafe Condition">Unsafe Condition</SelectItem>
                    <SelectItem value="Safe Act">Safe Act</SelectItem>
                    <SelectItem value="Near Miss">Near Miss</SelectItem>
                    <SelectItem value="Environmental">Environmental</SelectItem>
                </SelectContent>
            </Select>

            <Select
                value={filters.risk}
                onValueChange={value => set('risk', value)}
            >
                <SelectTrigger className="h-10 w-[150px] rounded-lg border-slate-200 bg-white text-[12px] font-bold uppercase tracking-tight">
                    <SelectValue placeholder="All Risk Levels" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Risk Levels</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
            </Select>

            <Select
                value={filters.status}
                onValueChange={value => set('status', value)}
            >
                <SelectTrigger className="h-10 w-[140px] rounded-lg border-slate-200 bg-white text-[12px] font-bold uppercase tracking-tight">
                    <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Returned">Returned</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
            </Select>

            <Select
                value={filters.site}
                onValueChange={value => set('site', value)}
            >
                <SelectTrigger className="h-10 w-[140px] rounded-lg border-slate-200 bg-white text-[12px] font-bold uppercase tracking-tight">
                    <SelectValue placeholder="All Sites" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Sites</SelectItem>
                    {projects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                            {project.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="h-10 rounded-lg border-slate-200 bg-white px-4 text-[11px] font-bold uppercase text-slate-500">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.date ? format(filters.date, 'dd MMM yyyy') : 'Pick a date'}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={filters.date} onSelect={d => set('date', d)} />
                </PopoverContent>
            </Popover>

            <Button
                variant="outline"
                className="h-10 rounded-lg border-slate-200 px-4 text-[11px] font-black uppercase text-slate-500"
            >
                <Filter className="mr-2 h-4 w-4" />
                More Filters
            </Button>

            <div className="ml-auto flex items-center gap-4">
                <Button
                    variant="ghost"
                    onClick={reset}
                    className="h-10 px-3 text-[10px] font-black uppercase tracking-widest text-slate-500"
                >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    RESET
                </Button>

                <Button
                    variant="outline"
                    className="h-10 rounded-lg border-slate-200 px-6 text-[10px] font-black uppercase tracking-widest bg-white"
                >
                    <Download className="mr-2 h-4 w-4" />
                    EXPORT
                </Button>
            </div>
        </div>
    );
}
