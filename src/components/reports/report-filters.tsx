'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, FilterX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useAppContext } from '@/contexts/app-provider';
import type { Filters } from '@/app/(app)/reports/page';
import type { DateRange } from 'react-day-picker';
import { Label } from '../ui/label';

interface ReportFiltersProps {
  onApplyFilters: (filters: Filters) => void;
  initialFilters: Filters;
}

export default function ReportFilters({ onApplyFilters, initialFilters }: ReportFiltersProps) {
  const { getVisibleUsers } = useAppContext();
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const visibleUsers = getVisibleUsers();

  const handleFilterChange = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    onApplyFilters(filters);
  };
  
  const handleReset = () => {
    const clearedFilters = {
        assigneeId: 'all',
        status: 'all',
        priority: 'all',
        dateRange: undefined,
    };
    setFilters(clearedFilters);
    onApplyFilters(clearedFilters);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        
        <div className="space-y-1">
            <Label>Assignee</Label>
            <Select value={filters.assigneeId} onValueChange={value => handleFilterChange('assigneeId', value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {visibleUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                        {user.name}
                    </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>

        <div className="space-y-1">
            <Label>Status</Label>
            <Select value={filters.status} onValueChange={value => handleFilterChange('status', value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="To Do">To Do</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="In Review">In Review</SelectItem>
                    <SelectItem value="Done">Done</SelectItem>
                </SelectContent>
            </Select>
        </div>

        <div className="space-y-1">
            <Label>Priority</Label>
            <Select value={filters.priority} onValueChange={value => handleFilterChange('priority', value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                </SelectContent>
            </Select>
        </div>

        <div className="space-y-1">
            <Label>Date Range</Label>
             <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={'outline'}
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !filters.dateRange && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange?.from ? (
                      filters.dateRange.to ? (
                        <>
                          {format(filters.dateRange.from, 'LLL dd, y')} -{' '}
                          {format(filters.dateRange.to, 'LLL dd, y')}
                        </>
                      ) : (
                        format(filters.dateRange.from, 'LLL dd, y')
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={filters.dateRange?.from}
                    selected={filters.dateRange}
                    onSelect={(value: DateRange | undefined) => handleFilterChange('dateRange', value)}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
        </div>

      </div>
      <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={handleReset}>
                <FilterX className="mr-2 h-4 w-4" /> Reset Filters
            </Button>
            <Button onClick={handleApply}>Apply Filters</Button>
        </div>
    </div>
  );
}
