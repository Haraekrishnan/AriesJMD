
'use client';

import React, { useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import ReadOnlyJobSchedule from './ReadOnlyJobSchedule';
import EditableJobSchedule from './EditableJobSchedule';
import type { JobSchedule } from '@/lib/types';
import { Badge } from '../ui/badge';
import { Users } from 'lucide-react';

interface JobScheduleTableProps {
  selectedDate: string; // YYYY-MM-DD
}

export default function JobScheduleTable({ selectedDate }: JobScheduleTableProps) {
  const { user, jobSchedules, can, manpowerProfiles, users } = useAppContext();

  const scheduleForDate = useMemo(() => {
    if (!jobSchedules) return undefined;
    return jobSchedules.find(s => s.date === selectedDate);
  }, [jobSchedules, selectedDate]);

  const globallyAssignedIds = useMemo(() => {
      const ids = new Set<string>();
      if (!jobSchedules) return ids;
      const schedulesForDate = jobSchedules.filter(s => s.date === selectedDate);
      schedulesForDate.forEach(schedule => {
          if (schedule.items) {
              schedule.items.forEach(item => {
                  item.manpowerIds.forEach(id => ids.add(id));
              });
          }
      });
      return ids;
  }, [jobSchedules, selectedDate]);

  const tradeSummary = useMemo(() => {
    if (!scheduleForDate || !scheduleForDate.items) return null;
    
    // Get unique IDs from all items in this schedule
    const allAssignedIds = Array.from(new Set(scheduleForDate.items.flatMap(item => item.manpowerIds)));
    const counts: Record<string, number> = {};
    let total = 0;

    allAssignedIds.forEach(id => {
        const mp = manpowerProfiles.find(p => p.id === id);
        const u = users.find(u => u.id === id);
        // Fallback to role if trade is not found (for Admin/Manager roles)
        const trade = mp?.trade || u?.role || 'Unknown';
        counts[trade] = (counts[trade] || 0) + 1;
        total++;
    });

    return { 
        counts: Object.entries(counts).sort((a, b) => b[1] - a[1]), 
        total 
    };
  }, [scheduleForDate, manpowerProfiles, users]);

  const isScheduleLocked = scheduleForDate?.isLocked || false;
  const canEdit = can.manage_job_schedule && !isScheduleLocked;

  return (
    <div className="space-y-4">
      {tradeSummary && tradeSummary.total > 0 && (
        <div className="p-4 bg-muted/30 border rounded-lg">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-2 mr-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="font-bold text-sm uppercase tracking-wider">Daily Headcount Summary:</span>
              <Badge variant="default" className="ml-1 text-sm font-black px-3">
                {tradeSummary.total} Total
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {tradeSummary.counts.map(([trade, count]) => (
                <div key={trade} className="flex items-center gap-1.5 px-3 py-1 bg-background border rounded-full shadow-sm">
                  <span className="text-xs font-semibold text-muted-foreground">{trade}:</span>
                  <span className="text-sm font-black text-primary">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <div className="border rounded-lg overflow-hidden">
        {canEdit ? (
            <EditableJobSchedule
                schedule={scheduleForDate}
                selectedDate={selectedDate}
                globallyAssignedIds={globallyAssignedIds}
            />
        ) : (
            <ReadOnlyJobSchedule schedule={scheduleForDate} />
        )}
      </div>
    </div>
  );
}
