
'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, FilterX, MapPin, Tag, ShieldCheck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGeneral } from '@/contexts/general-provider';

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
        <Card className="bg-white border-slate-100 shadow-sm rounded-[1.5rem] p-4">
            <div className="flex flex-col gap-6">
                {/* Top Row: Search */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input 
                        placeholder="Search Registry by Case ID, finding narrative, site or person..." 
                        className="pl-12 h-14 bg-slate-50/50 border-none rounded-2xl font-bold text-sm focus-visible:ring-emerald-600/20"
                        value={filters.search}
                        onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
                    />
                </div>

                {/* Bottom Row: Selectors */}
                <div className="flex flex-wrap items-center gap-4">
                    <FilterItem label="Classification" icon={Tag}>
                        <Select value={filters.category} onValueChange={(v) => onFilterChange({ ...filters, category: v })}>
                            <SelectTrigger className="h-10 rounded-xl font-bold border-slate-100 bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                <SelectItem value="Unsafe Act">Unsafe Act</SelectItem>
                                <SelectItem value="Unsafe Condition">Unsafe Condition</SelectItem>
                                <SelectItem value="Safe Act">Safe Act</SelectItem>
                                <SelectItem value="Near Miss">Near Miss</SelectItem>
                                <SelectItem value="Environmental">Environmental</SelectItem>
                            </SelectContent>
                        </Select>
                    </FilterItem>

                    <FilterItem label="Severity Index" icon={ShieldCheck}>
                        <Select value={filters.risk} onValueChange={(v) => onFilterChange({ ...filters, risk: v })}>
                            <SelectTrigger className="h-10 rounded-xl font-bold border-slate-100 bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Risk Levels</SelectItem>
                                <SelectItem value="Low">Low</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="High">High</SelectItem>
                                <SelectItem value="Critical">Critical</SelectItem>
                            </SelectContent>
                        </Select>
                    </FilterItem>

                    <FilterItem label="Operational Site" icon={MapPin}>
                        <Select value={filters.site} onValueChange={(v) => onFilterChange({ ...filters, site: v })}>
                            <SelectTrigger className="h-10 rounded-xl font-bold border-slate-100 bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Projects</SelectItem>
                                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </FilterItem>

                    <FilterItem label="Process Phase" icon={Clock}>
                        <Select value={filters.stage} onValueChange={(v) => onFilterChange({ ...filters, stage: v })}>
                            <SelectTrigger className="h-10 rounded-xl font-bold border-slate-100 bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Stages</SelectItem>
                                <SelectItem value="Investigation">Investigation</SelectItem>
                                <SelectItem value="Resolution">Resolution</SelectItem>
                                <SelectItem value="Implementation">Implementation</SelectItem>
                                <SelectItem value="Effectiveness Review">Effectiveness Review</SelectItem>
                            </SelectContent>
                        </Select>
                    </FilterItem>

                    <Button variant="ghost" className="h-10 rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-slate-900 mt-5" onClick={handleClear}>
                        <FilterX className="mr-2 h-4 w-4" /> Reset Filters
                    </Button>
                </div>
            </div>
        </Card>
    );
}

function FilterItem({ label, icon: Icon, children }: { label: string, icon: any, children: React.ReactNode }) {
    return (
        <div className="space-y-1.5 flex-1 min-w-[180px]">
            <div className="flex items-center gap-2 ml-1">
                <Icon className="h-3 w-3 text-slate-300" />
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{label}</p>
            </div>
            {children}
        </div>
    );
}
