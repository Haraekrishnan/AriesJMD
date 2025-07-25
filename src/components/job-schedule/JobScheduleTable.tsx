
'use client';

import React, { useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import ReadOnlyJobSchedule from './ReadOnlyJobSchedule';
import EditableJobSchedule from './EditableJobSchedule';

interface JobScheduleTableProps {
  selectedDate: string; // YYYY-MM-DD
  projectId: string; // 'all' or a specific project id
}

export default function JobScheduleTable({ selectedDate, projectId }: JobScheduleTableProps) {
  const { user, projects, jobSchedules, can } = useAppContext();

  const isSupervisorForProject = (projId: string) => {
    return (user?.role === 'Supervisor' || user?.role === 'Junior Supervisor') && user?.projectId === projId;
  };

  // If a specific project is selected, display only that one.
  if (projectId !== 'all') {
    const project = projects.find(p => p.id === projectId);
    if (!project) {
        return <p className="text-center text-muted-foreground p-8">Project not found.</p>;
    }
    const scheduleForProject = jobSchedules.find(s => s.date === selectedDate && s.projectId === projectId);
    const canEdit = isSupervisorForProject(project.id);

    return (
        <div className="space-y-6">
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
        </div>
    );
  }
  
  // If 'All Projects' is selected, display all schedules for the date.
  const schedulesToShow = jobSchedules.filter(s => s.date === selectedDate);
  const projectsWithSchedules = projects.filter(p => schedulesToShow.some(s => s.projectId === p.id));
  
  if (projectsWithSchedules.length === 0) {
      return <p className="text-center text-muted-foreground p-8">No schedules found for this date.</p>;
  }

  return (
    <div className="space-y-6">
      {projectsWithSchedules.map(project => {
        const scheduleForProject = schedulesToShow.find(s => s.projectId === project.id);
        return (
          <div key={project.id}>
            <h3 className="text-lg font-semibold mb-2">{project.name}</h3>
            <div className="border rounded-lg">
              <ReadOnlyJobSchedule schedule={scheduleForProject} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
