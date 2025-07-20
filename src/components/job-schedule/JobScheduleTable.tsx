
'use client';

import React, { useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import JobScheduleRow from './JobScheduleRow';

interface JobScheduleTableProps {
  selectedDate: string; // YYYY-MM-DD
  projectId: string; // 'all' or a specific project id
}

export default function JobScheduleTable({ selectedDate, projectId }: JobScheduleTableProps) {
  const { user, users, projects, jobSchedules, manpowerProfiles, can } = useAppContext();

  const schedulesToShow = useMemo(() => {
    if (!jobSchedules) return []; // Guard against undefined
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

  const isSupervisor = user?.role === 'Supervisor';

  return (
    <div className="space-y-6">
      {projectsToDisplay.map(project => {
        const scheduleForProject = schedulesToShow.find(s => s.projectId === project.id);
        const canEdit = isSupervisor && user?.projectId === project.id;
        
        return (
          <div key={project.id}>
            <h3 className="text-lg font-semibold mb-2">{project.name}</h3>
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">Sl.No</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Job Description</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Manpower</TableHead>
                            <TableHead>Equipment</TableHead>
                            <TableHead>Remarks</TableHead>
                            {canEdit && <TableHead className="w-[50px]"></TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <JobScheduleRow
                            schedule={scheduleForProject}
                            projectId={project.id}
                            selectedDate={selectedDate}
                            isEditable={canEdit}
                        />
                    </TableBody>
                </Table>
            </div>
          </div>
        );
      })}
      {projectsToDisplay.length === 0 && <p className="text-center text-muted-foreground p-8">Select a project to view or edit its schedule.</p>}
    </div>
  );
}
