
'use client';

import React, { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import ReadOnlyJobSchedule from './ReadOnlyJobSchedule';
import EditableJobSchedule from './EditableJobSchedule';
import { Button } from '../ui/button';
import { FileDown } from 'lucide-react';
import { generateScheduleExcel } from './generateScheduleExcel';
import { generateSchedulePdf } from './generateSchedulePdf';

interface JobScheduleTableProps {
  selectedDate: string; // YYYY-MM-DD
  projectId: string; // 'all' or a specific project id
  globallyAssignedIds: Set<string>;
}

export default function JobScheduleTable({ selectedDate, projectId, globallyAssignedIds }: JobScheduleTableProps) {
  const { user, projects, jobSchedules, manpowerProfiles, vehicles } = useAppContext();

  const isSupervisorForProject = (projId: string) => {
    return (user?.role === 'Supervisor' || user?.role === 'Junior Supervisor') && user?.projectId === projId;
  };
  
  const handleExportExcel = (schedule: any, projectName: string) => {
    const scheduleWithNames = {
        ...schedule,
        items: schedule.items.map((item: any) => ({
            ...item,
            manpowerIds: item.manpowerIds.map((id: string) => manpowerProfiles.find(p => p.id === id)?.name || id),
            vehicleId: vehicles.find(v => v.id === item.vehicleId)?.vehicleNumber || 'N/A'
        }))
    };
    generateScheduleExcel(scheduleWithNames, projectName, new Date(selectedDate));
  };
  
  const handleExportPdf = (schedule: any, projectName: string) => {
    const scheduleWithNames = {
        ...schedule,
        items: schedule.items.map((item: any) => ({
            ...item,
            manpowerIds: item.manpowerIds.map((id: string) => manpowerProfiles.find(p => p.id === id)?.name || id),
            vehicleId: vehicles.find(v => v.id === item.vehicleId)?.vehicleNumber || 'N/A'
        }))
    };
    generateSchedulePdf(scheduleWithNames, projectName, new Date(selectedDate));
  };


  // If a specific project is selected, display only that one.
  if (projectId !== 'all') {
    const project = projects.find(p => p.id === projectId);
    if (!project) {
        return <p className="text-center text-muted-foreground p-8">Project not found.</p>;
    }
    const scheduleForProject = jobSchedules.find(s => s.date === selectedDate && s.projectId === projectId);
    const canEdit = user?.role === 'Admin' || isSupervisorForProject(project.id);
    
    return (
        <div className="space-y-6">
            <div key={project.id}>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold">{project.name}</h3>
                    {canEdit && scheduleForProject && (
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleExportExcel(scheduleForProject, project.name)}><FileDown className="mr-2 h-4 w-4" /> Excel</Button>
                            <Button variant="outline" size="sm" onClick={() => handleExportPdf(scheduleForProject, project.name)}><FileDown className="mr-2 h-4 w-4" /> PDF</Button>
                        </div>
                    )}
                </div>
                <div className="border rounded-lg">
                    {canEdit ? (
                        <EditableJobSchedule
                            schedule={scheduleForProject}
                            projectId={project.id}
                            selectedDate={selectedDate}
                            globallyAssignedIds={globallyAssignedIds}
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
        const canEdit = user?.role === 'Admin' || isSupervisorForProject(project.id);
        return (
          <div key={project.id}>
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">{project.name}</h3>
                 {canEdit && scheduleForProject && (
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleExportExcel(scheduleForProject, project.name)}><FileDown className="mr-2 h-4 w-4" /> Excel</Button>
                        <Button variant="outline" size="sm" onClick={() => handleExportPdf(scheduleForProject, project.name)}><FileDown className="mr-2 h-4 w-4" /> PDF</Button>
                    </div>
                )}
            </div>
            <div className="border rounded-lg">
              <ReadOnlyJobSchedule schedule={scheduleForProject} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
