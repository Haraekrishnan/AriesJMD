
'use client';

import React, { useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import ReadOnlyJobSchedule from './ReadOnlyJobSchedule';
import EditableJobSchedule from './EditableJobSchedule';
import type { JobSchedule } from '@/lib/types';

interface JobScheduleTableProps {
  selectedDate: string; // YYYY-MM-DD
}

export default function JobScheduleTable({ selectedDate }: JobScheduleTableProps) {
  const { user, jobSchedules, can } = useAppContext();

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

  const isScheduleLocked = scheduleForDate?.isLocked || false;
  const canEdit = can.manage_job_schedule && !isScheduleLocked;

  return (
    <div className="border rounded-lg">
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
  );
}
