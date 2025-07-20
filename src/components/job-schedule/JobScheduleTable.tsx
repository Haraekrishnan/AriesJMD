'use client';

import React, { useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ReadOnlyJobSchedule from './ReadOnlyJobSchedule';
import EditableJobSchedule from './EditableJobSchedule';

interface JobScheduleTableProps {
  selectedDate: string; // YYYY-MM-DD
  projectId: string; // 'all' or a specific project id
}

export default function JobScheduleTable({ selectedDate, projectId }: JobScheduleTableProps) {
  const { user, projects, jobSchedules, can } = useAppContext();

  const schedulesToShow = useMemo(() => {
    if (!jobSchedules) return [];
    if (projectId === 'all') {
      return jobSchedules.filter(s => s.date === selectedDate);
    }
    return jobSchedules.filter(s => s.date === selectedDate && s.projectId === projectId);
  }, [jobSchedules, selectedDate, projectId]);

  const projectsToDisplay = useMemo(() => {
    if (projectId !== 'all') {
      const project = projects.find(p => p.id === projectId);
      return project ? [project] : [];
    }
    return projects;
  }, [projects, projectId]);

  const isSupervisorForProject = (projId: string) => {
    return (user?.role === 'Supervisor' || user?.role === 'Junior Supervisor') && user?.projectId === projId;
  }

  return (
    <div className="space-y-6">
      {projectsToDisplay.map(project => {
        const scheduleForProject = schedulesToShow.find(s => s.projectId === project.id);
        const canEdit = isSupervisorForProject(project.id);
        
        return (
          <div key={project.id}>
            <h3 className="text-lg font-semibold mb-2">{project.name}</h3>
            <div className="border rounded-lg">
              {canEdit ? (
                <EditableJobSchedule
                  schedule={scheduleForProject}
                  projectId={project.id}
                  selectedDate={selectedDate}
                />
              ) : (
                <ReadOnlyJobSchedule schedule={scheduleForProject} />
              )}
            </div>
          </div>
        );
      })}
      {projectsToDisplay.length === 0 && projectId !== 'all' && (
        <p className="text-center text-muted-foreground p-8">No project selected.</p>
      )}
      {projectsToDisplay.length === 0 && projectId === 'all' && (
        <p className="text-center text-muted-foreground p-8">No schedules found for this date.</p>
      )}
    </div>
  );
}
