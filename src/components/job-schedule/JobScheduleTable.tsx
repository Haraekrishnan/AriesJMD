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
  schedule?: JobSchedule;
}

export default function JobScheduleTable({ selectedDate, schedule }: JobScheduleTableProps) {
  const { user, jobSchedules, can, manpowerProfiles, users } = useAppContext();

  const globallyAssignedIdsForSummary = useMemo(() => {
      const ids = new Set<string>();
      if (!jobSchedules) return ids;
      const schedulesForDate = jobSchedules.filter(s => s.date === selectedDate);
      schedulesForDate.forEach(s => {
          if (s.items) {
              s.items.forEach(item => {
                  item.manpowerIds.forEach(id => ids.add(id));
              });
          }
      });
      return ids;
  }, [jobSchedules, selectedDate]);

  const isScheduleLocked = schedule?.isLocked || false;
  const canEdit = can.manage_job_schedule && !isScheduleLocked;

  return (
    <div className="border rounded-lg overflow-hidden">
        {canEdit ? (
            <EditableJobSchedule
                schedule={schedule}
                selectedDate={selectedDate}
                globallyAssignedIds={globallyAssignedIdsForSummary}
            />
        ) : (
            <ReadOnlyJobSchedule schedule={schedule} />
        )}
    </div>
  );
}
