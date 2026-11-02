'use client';

import React, { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import ReadOnlyJobSchedule from './ReadOnlyJobSchedule';
import EditableJobSchedule from './EditableJobSchedule';
import type { JobSchedule } from '@/lib/types';
import { Button } from '../ui/button';
import { CheckCircle2, Edit, Lock } from 'lucide-react';
import { otherScheduleAssignments } from './schedule-worksheet';
import styles from './schedule-worksheet.module.css';
import design from './schedule-page.module.css';

interface JobScheduleTableProps { selectedDate: string; schedule?: JobSchedule; onDirtyChange?: (dirty: boolean) => void; onRename?: () => void; }

export default function JobScheduleTable(props: JobScheduleTableProps) {
  // Changing schedule/date starts an independent editing session.
  return <ScheduleInstance key={`${props.selectedDate}:${props.schedule?.id || 'new'}`} {...props} />;
}
function ScheduleInstance({ selectedDate, schedule, onDirtyChange, onRename }: JobScheduleTableProps) {
  const { jobSchedules, can } = useAppContext();
  const [editing, setEditing] = useState(!schedule?.items?.length);
  const [savedSnapshot, setSavedSnapshot] = useState<JobSchedule | null>(null);
  const current = savedSnapshot && (!schedule || savedSnapshot.updatedAt > schedule.updatedAt) ? savedSnapshot : schedule;
  const otherIds = useMemo(() => otherScheduleAssignments(jobSchedules || [], selectedDate, schedule?.id), [jobSchedules, selectedDate, schedule?.id]);
  const canEdit = can.manage_job_schedule && !schedule?.isLocked;
  const count = new Set((current?.items || []).flatMap(item => item.manpowerIds || [])).size;
  return <section className={styles.workspace}>
    {editing && canEdit ? <EditableJobSchedule
      schedule={current} selectedDate={selectedDate} globallyAssignedIds={otherIds} onDirtyChange={onDirtyChange}
      onSaved={saved => { setSavedSnapshot(saved); setEditing(false); }} onCancel={() => setEditing(false)}
    /> : <>
      <div className={design.compactHeading}>
        <div><span className={styles.saved}>{current?.isLocked ? <><Lock size={14} /> Locked</> : <><CheckCircle2 size={14} /> Saved</>}</span></div>
        {canEdit && <div className="flex gap-2"><Button variant="ghost" onClick={onRename}>Rename</Button><Button variant="outline" onClick={() => setEditing(true)}><Edit className="mr-2 h-4 w-4" />Edit Schedule</Button></div>}
      </div>
      <ReadOnlyJobSchedule schedule={current} />
    </>}
  </section>;
}
