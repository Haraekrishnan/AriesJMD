
'use client';
import { useState, useMemo, useEffect } from 'react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from '@/components/ui/select';
import { X, Search, Archive } from 'lucide-react';
import { TaskStatus, User } from '@/lib/types';
import { DateRangePicker } from '../ui/date-range-picker';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { useAuth } from '@/contexts/auth-provider';
import { useTask } from '@/contexts/task-provider';
import { getMonth, format, getYear, isValid } from 'date-fns';
import { Input } from '../ui/input';
import { cn } from '@/lib/utils';

export interface TaskFilters {
  status: 'all' | 'To Do' | 'In Progress' | 'Done' | 'Overdue';
  priority: 'all' | 'Low' | 'Medium' | 'High';
  assigneeId: string;
  dateRange?: DateRange;
  showMyTasksOnly: boolean;
  month: string;
  year: string;
  search: string;
  includeArchived: boolean;
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
  const { user, getVisibleUsers } = useAuth();
  const { tasks } = useTask();
  const [filters, setFilters] = useState<TaskFilters>(initialFilters);

  const users = useMemo(() => {
    return getVisibleUsers().filter(u => u.role !== 'Manager');
  }, [getVisibleUsers]);
  
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    tasks.forEach(t => {
      const d = new Date(t.dueDate);
      if (isValid(d)) {
        const y = getYear(d);
        if (!isNaN(y)) {
          years.add(y);
        }
      }
    });
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
    const clearedFilters: TaskFilters = {
        status: 'all',
        priority: 'all',
        assigneeId: 'all',
        dateRange: undefined,
        showMyTasksOnly: false,
        month: 'all',
        year: new Date().getFullYear().toString(),
        search: '',
        includeArchived: false,
    };
    setFilters(clearedFilters);
  }

  return (
    <div className="p-4 border rounded-lg bg-card space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search task title, description, or unique ID..." 
                    className="pl-9 h-10 text-sm font-medium focus-visible:ring-primary/20" 
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                />
            </div>
            <div className="flex items-center gap-3 px-3 py-2 bg-muted/40 rounded-lg border border-dashed shrink-0">
                <div className="flex items-center gap-2">
                    <Archive className={cn("h-4 w-4", filters.includeArchived ? "text-primary" : "text-slate-500")} />
                    <Label htmlFor="include-archived" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Archived Tasks</Label>
                </div>
                <Switch 
                    id="include-archived" 
                    checked={filters.includeArchived} 
                    onCheckedChange={(checked) => handleFilterChange('includeArchived', checked)} 
                />
            </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center pt-2">
            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Period</Label>
              <div className="flex gap-2">
                  <Select value={filters.year} onValueChange={(value) => handleFilterChange('year', value)}>
                    <SelectTrigger className="w-full sm:w-[100px] h-9 text-xs font-bold"><SelectValue placeholder="Year" /></SelectTrigger>
                    <SelectContent>
                        {availableYears.map(y => <SelectItem key={y} value={y.toString()}>{y.toString()}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filters.month} onValueChange={(value) => handleFilterChange('month', value)}>
                    <SelectTrigger className="w-full sm:w-[130px] h-9 text-xs font-bold"><SelectValue placeholder="Month" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
                        {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Assignee</Label>
              <Select value={filters.assigneeId} onValueChange={handleAssigneeChange}>
                  <SelectTrigger className="w-full sm:w-[180px] h-9 text-xs font-bold"><SelectValue placeholder="All Users" /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">All Personnel</SelectItem>
                      {users.map((user, index) => (
                      <SelectItem key={`${user.id}-${index}`} value={user.id}>
                          {user.name}
                      </SelectItem>
                      ))}
                  </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Status</Label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value as TaskFilters['status'])}>
                  <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs font-bold"><SelectValue placeholder="All Status" /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">All Active</SelectItem>
                      <SelectItem value="To Do">To Do</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Done">Completed</SelectItem>
                      <SelectItem value="Overdue">Overdue</SelectItem>
                  </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Priority</Label>
              <Select value={filters.priority} onValueChange={value => handleFilterChange('priority', value as TaskFilters['priority'])}>
                  <SelectTrigger className="w-full sm:w-[120px] h-9 text-xs font-bold"><SelectValue placeholder="Priority"/></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                  </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Specific Range</Label>
              <DateRangePicker
                  placeholder="Select dates..."
                  date={filters.dateRange}
                  onDateChange={(value: DateRange | undefined) => handleFilterChange('dateRange', value)}
                  className="h-9"
              />
            </div>
            
            {user?.role !== 'Manager' && (
                <div className="flex items-center space-x-2 pt-5">
                    <Switch
                    id="my-tasks-switch"
                    checked={filters.showMyTasksOnly}
                    onCheckedChange={(checked) => handleFilterChange('showMyTasksOnly', checked)}
                    />
                    <Label htmlFor="my-tasks-switch" className="text-xs font-bold text-slate-600">My Tasks</Label>
                </div>
            )}

            <div className="flex gap-2 ml-auto pt-5">
                <Button variant="ghost" onClick={handleReset} size="sm" className="h-9 px-3 text-xs font-bold text-slate-500">
                    <X className="mr-1.5 h-3.5 w-3.5" /> CLEAR
                </Button>
            </div>
        </div>
    </div>
  );
}
