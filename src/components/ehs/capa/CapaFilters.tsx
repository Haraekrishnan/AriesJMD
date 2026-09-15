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
    CalendarDays,
    Filter,
    RotateCcw,
    Download,
} from 'lucide-react';
import { useGeneral } from '@/contexts/general-provider';
import { DateRangePicker } from '@/components/ui/date-range-picker';

interface CapaFiltersProps {
    filters: {
        search: string;
        category: string;
        risk: string;
        status: string;
        stage: string;
        site: string;
        dateRange?: { from?: Date; to?: Date };
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
            stage: 'all',
            site: 'all',
            dateRange: undefined,
        });
    };

    return (
        <div className="flex flex-wrap items-center gap-2">
            <Select
                value={filters.category}
                onValueChange={value => set('category', value)}
            >
                <SelectTrigger className="h-10 w-[145px] rounded-lg border-slate-200 bg-white text-[12px] font-semibold">
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
                <SelectTrigger className="h-10 w-[135px] rounded-lg border-slate-200 bg-white text-[12px] font-semibold">
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
                <SelectTrigger className="h-10 w-[125px] rounded-lg border-slate-200 bg-white text-[12px] font-semibold">
                    <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Returned">Returned</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                    <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
            </Select>

            <Select
                value={filters.site}
                onValueChange={value => set('site', value)}
            >
                <SelectTrigger className="h-10 w-[130px] rounded-lg border-slate-200 bg-white text-[12px] font-semibold">
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

            <DateRangePicker
                date={filters.dateRange}
                onDateChange={range => set('dateRange', range)}
                className="h-10 w-[160px] rounded-lg"
            />

            <Button
                variant="outline"
                className="h-10 rounded-lg border-slate-200 px-3 text-[11px] font-bold"
            >
                <Filter className="mr-2 h-3.5 w-3.5" />
                More Filters
            </Button>

            <div className="ml-auto flex items-center gap-1">
                <Button
                    variant="ghost"
                    onClick={reset}
                    className="h-10 px-3 text-[10px] font-black uppercase tracking-wider text-slate-500"
                >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    Reset
                </Button>

                <Button
                    variant="outline"
                    className="h-10 rounded-lg border-slate-200 px-3 text-[10px] font-black uppercase tracking-wider"
                >
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Export
                </Button>
            </div>
        </div>
    );
}
