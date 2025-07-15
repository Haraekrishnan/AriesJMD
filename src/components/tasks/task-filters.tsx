'use client';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import type { TaskStatus, Priority } from '@/types';

export type TaskFilters = {
    status: TaskStatus | 'all';
    priority: Priority | 'all';
    dateRange?: DateRange;
    showMyTasksOnly: boolean;
};

interface TaskFiltersProps {
  onApplyFilters: (filters: TaskFilters) => void;
  initialFilters: TaskFilters;
}

export default function TaskFiltersComponent({ onApplyFilters, initialFilters }: TaskFiltersProps) {
  const [filters, setFilters] = useState<TaskFilters>(initialFilters);

  const handleFilterChange = <K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onApplyFilters(newFilters);
  };
  
  const resetFilters = () => {
    const defaultFilters = {
        status: 'all',
        priority: 'all',
        dateRange: undefined,
        showMyTasksOnly: false
    };
    setFilters(defaultFilters);
    onApplyFilters(defaultFilters);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={filters.status} onValueChange={(val: TaskStatus | 'all') => handleFilterChange('status', val)}>
        <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="To Do">To Do</SelectItem>
          <SelectItem value="In Progress">In Progress</SelectItem>
          <SelectItem value="Completed">Completed</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.priority} onValueChange={(val: Priority | 'all') => handleFilterChange('priority', val)}>
        <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Priority" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priorities</SelectItem>
          <SelectItem value="Low">Low</SelectItem>
          <SelectItem value="Medium">Medium</SelectItem>
          <SelectItem value="High">High</SelectItem>
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant={'outline'} className={cn('w-full sm:w-[240px] justify-start text-left font-normal', !filters.dateRange && 'text-muted-foreground')}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {filters.dateRange?.from ? (filters.dateRange.to ? `${format(filters.dateRange.from, 'LLL dd, y')} - ${format(filters.dateRange.to, 'LLL dd, y')}` : format(filters.dateRange.from, 'LLL dd, y')) : <span>Filter by date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="range" selected={filters.dateRange} onSelect={(range) => handleFilterChange('dateRange', range)} />
        </PopoverContent>
      </Popover>

      <div className="flex items-center space-x-2">
        <Switch id="my-tasks" checked={filters.showMyTasksOnly} onCheckedChange={(val) => handleFilterChange('showMyTasksOnly', val)}/>
        <Label htmlFor="my-tasks">My Tasks Only</Label>
      </div>

      <Button variant="ghost" onClick={resetFilters}>
        <X className="mr-2 h-4 w-4" />
        Reset
      </Button>
    </div>
  );
}
