'use client';

import { useMemo, useState } from 'react';
import type { Task } from '@/lib/types';
import type { DateRange } from 'react-day-picker';
import { useAppContext } from '@/contexts/app-provider';
import ReportFilters from '@/components/reports/report-filters';
import ReportResultsTable from '@/components/reports/report-results-table';
import ReportDownloads from '@/components/reports/report-downloads';
import { Card, CardContent } from '@/components/ui/card';
import { isWithinInterval } from 'date-fns';

export interface Filters {
  assigneeId: string;
  status: string;
  priority: string;
  dateRange: DateRange | undefined;
}

export default function ReportsPage() {
  const { tasks, getVisibleUsers } = useAppContext();
  const [filters, setFilters] = useState<Filters>({
    assigneeId: 'all',
    status: 'all',
    priority: 'all',
    dateRange: undefined,
  });

  const visibleUsers = useMemo(() => getVisibleUsers(), [getVisibleUsers]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // First, ensure the task assignee is visible to the current user
      const isAssigneeVisible = visibleUsers.some(user => task.assigneeIds.includes(user.id));
      if (!isAssigneeVisible) {
        return false;
      }

      const { assigneeId, status, priority, dateRange } = filters;
      
      const assigneeMatch = assigneeId === 'all' || task.assigneeIds.includes(assigneeId);
      const statusMatch = status === 'all' || task.status === status;
      const priorityMatch = priority === 'all' || task.priority === priority;
      
      let dateMatch = true;
      if (dateRange?.from) {
        const taskDate = new Date(task.dueDate);
        const fromDate = dateRange.from;
        const toDate = dateRange.to || new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate(), 23, 59, 59);
        dateMatch = taskDate >= fromDate && taskDate <= toDate;
      }

      return assigneeMatch && statusMatch && priorityMatch && dateMatch;
    });
  }, [tasks, filters, visibleUsers]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Generate Reports</h1>
            <p className="text-muted-foreground">Filter tasks to generate a custom report.</p>
        </div>
        <ReportDownloads tasks={filteredTasks} />
      </div>

      <Card>
        <CardContent className="p-4">
          <ReportFilters onApplyFilters={setFilters} initialFilters={filters} />
        </CardContent>
      </Card>
      
      <ReportResultsTable tasks={filteredTasks} />
    </div>
  );
}
