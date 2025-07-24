

'use client';
import { useState, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { TaskStatus, User } from '@/lib/types';
import { DateRangePicker } from '../ui/date-range-picker';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { useAppContext } from '@/contexts/app-provider';

export interface TaskFilters {
  status: 'all' | 'To Do' | 'In Progress' | 'Done' | 'Overdue';
  priority: 'all' | 'Low' | 'Medium' | 'High';
  assigneeId: string;
  dateRange?: DateRange;
  showMyTasksOnly: boolean;
}

interface TaskFiltersProps {
  onApplyFilters: (filters: TaskFilters) => void;
  initialFilters: TaskFilters;
  users: User[];
}

export default function TaskFilters({ onApplyFilters, initialFilters, users }: TaskFiltersProps) {
  const { user } = useAppContext();
  const [filters, setFilters] = useState<TaskFilters>(initialFilters);

  const handleFilterChange = <K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  const handleApply = () => {
    onApplyFilters(filters);
  };
  
  const handleReset = () => {
    const clearedFilters = {
        status: 'all',
        priority: 'all',
        assigneeId: 'all',
        dateRange: undefined,
        showMyTasksOnly: false,
    } as const;
    setFilters(clearedFilters);
    onApplyFilters(clearedFilters);
  }

  return (
    <div className="p-4 border rounded-lg bg-card">
        <div className="flex flex-wrap gap-4 items-center">
            <Select value={filters.assigneeId} onValueChange={value => handleFilterChange('assigneeId', value)}>
                <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="All Users" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
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
            
            <div className="flex items-center space-x-2">
                <Switch
                  id="my-tasks-switch"
                  checked={filters.showMyTasksOnly}
                  onCheckedChange={(checked) => handleFilterChange('showMyTasksOnly', checked)}
                />
                <Label htmlFor="my-tasks-switch">My Tasks Only</Label>
            </div>

            <div className="flex gap-2 ml-auto">
                <Button onClick={handleApply}>Apply</Button>
                <Button variant="ghost" onClick={handleReset}>
                    <X className="mr-2 h-4 w-4" /> Clear
                </Button>
            </div>
        </div>
    </div>
  );
}
