
'use client';
import { useState, useMemo, useEffect } from 'react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import { TaskStatus, User } from '@/lib/types';
import { DateRangePicker } from '../ui/date-range-picker';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { useAppContext } from '@/contexts/app-provider';
import { getMonth, format, getYear } from 'date-fns';

export interface TaskFilters {
  status: 'all' | 'To Do' | 'In Progress' | 'Done' | 'Overdue';
  priority: 'all' | 'Low' | 'Medium' | 'High';
  assigneeId: string;
  dateRange?: DateRange;
  showMyTasksOnly: boolean;
  month: string;
  year: string;
}

interface TaskFiltersProps {
  onFiltersChange: (filters: TaskFilters) => void;
  initialFilters: TaskFilters;
}

const months = Array.from({ length: 12 }, (_, i) => ({
  value: (i + 1).toString(),
  label: format(new Date(0, i), 'MMMM'),
}));

export default function TaskFilters({ onFiltersChange, initialFilters }: TaskFiltersProps) {
  const { user, getVisibleUsers, tasks } = useAppContext();
  const [filters, setFilters] = useState<TaskFilters>(initialFilters);

  const users = useMemo(() => {
    return getVisibleUsers().filter(u => u.role !== 'Manager');
  }, [getVisibleUsers]);
  
  const availableYears = useMemo(() => {
    const years = new Set(tasks.map(t => getYear(new Date(t.dueDate))));
    const currentYear = new Date().getFullYear();
    years.add(currentYear);
    return Array.from(years).sort((a,b) => b - a);
  }, [tasks]);

  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const handleFilterChange = <K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  const handleAssigneeChange = (assigneeId: string) => {
    setFilters(prev => ({
        ...prev,
        assigneeId,
        showMyTasksOnly: assigneeId !== 'all' ? false : prev.showMyTasksOnly,
    }));
  };

  const handleReset = () => {
    const clearedFilters = {
        status: 'all',
        priority: 'all',
        assigneeId: 'all',
        dateRange: undefined,
        showMyTasksOnly: false,
        month: 'all',
        year: new Date().getFullYear().toString(),
    } as const;
    setFilters(clearedFilters);
  }

  return (
    <div className="p-4 border rounded-lg bg-card">
        <div className="flex flex-wrap gap-4 items-center">
            <Select value={filters.year} onValueChange={(value) => handleFilterChange('year', value)}>
                <SelectTrigger className="w-full sm:w-[120px]"><SelectValue placeholder="All Years" /></SelectTrigger>
                <SelectContent>
                    {availableYears.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={filters.month} onValueChange={(value) => handleFilterChange('month', value)}>
                <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="All Months" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={filters.assigneeId} onValueChange={handleAssigneeChange}>
                <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="All Users" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {users.map((user, index) => (
                    <SelectItem key={`${user.id}-${index}`} value={user.id}>
                        {user.name}
                    </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value as TaskFilters['status'])}>
                <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="To Do">To Do</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Done">Completed</SelectItem>
                    <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
            </Select>

            <Select value={filters.priority} onValueChange={value => handleFilterChange('priority', value as TaskFilters['priority'])}>
                <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="All Priorities"/></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                </SelectContent>
            </Select>

            <DateRangePicker
                placeholder="Filter by due date..."
                date={filters.dateRange}
                onDateChange={(value: DateRange | undefined) => handleFilterChange('dateRange', value)}
            />
            
            {user?.role !== 'Manager' && (
                <div className="flex items-center space-x-2">
                    <Switch
                    id="my-tasks-switch"
                    checked={filters.showMyTasksOnly}
                    onCheckedChange={(checked) => handleFilterChange('showMyTasksOnly', checked)}
                    />
                    <Label htmlFor="my-tasks-switch">My Tasks Only</Label>
                </div>
            )}

            <div className="flex gap-2 ml-auto">
                <Button variant="ghost" onClick={handleReset}>
                    <X className="mr-2 h-4 w-4" /> Clear
                </Button>
            </div>
        </div>
    </div>
  );
}
