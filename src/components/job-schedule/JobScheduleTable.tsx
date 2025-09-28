
'use client';

import React, { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import ReadOnlyJobSchedule from './ReadOnlyJobSchedule';
import EditableJobSchedule from './EditableJobSchedule';
import { Button } from '../ui/button';
import { FileDown, Lock, Unlock } from 'lucide-react';
import { generateScheduleExcel } from './generateScheduleExcel';
import { generateSchedulePdf } from './generateSchedulePdf';
import type { JobSchedule } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface JobScheduleTableProps {
  selectedDate: string; // YYYY-MM-DD
  projectId: string; // 'all' or a specific project id
  globallyAssignedIds: Set<string>;
}

export default function JobScheduleTable({ selectedDate, projectId, globallyAssignedIds }: JobScheduleTableProps) {
  const { user, projects, jobSchedules, manpowerProfiles, vehicles, unlockJobSchedule } = useAppContext();
  const { toast } = useToast();

  const isSupervisorForProject = (projId: string) => {
    return (user?.role === 'Supervisor' || user?.role === 'Junior Supervisor') && user?.projectId === projId;
  };
  
  const handleExportExcel = (schedule: JobSchedule | undefined, projectName: string) => {
    if (!schedule) return;
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
  
  const handleExportPdf = (schedule: JobSchedule | undefined, projectName: string) => {
    if (!schedule) return;
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
  
  const isScheduleLocked = (schedule: JobSchedule | undefined) => {
      return schedule?.isLocked || false;
  };

  const handleUnlockSchedule = (projectIdToUnlock: string) => {
    unlockJobSchedule(selectedDate, projectIdToUnlock);
    toast({ title: 'Schedule Unlocked', description: 'This project schedule can now be edited.' });
  };

  // If a specific project is selected, display only that one.
  if (projectId !== 'all') {
    const project = projects.find(p => p.id === projectId);
    if (!project) {
        return <p className="text-center text-muted-foreground p-8">Project not found.</p>;
    }
    const scheduleForProject = jobSchedules.find(s => s.date === selectedDate && s.projectId === projectId);
    const locked = isScheduleLocked(scheduleForProject);
    const canEdit = (user?.role === 'Admin' || isSupervisorForProject(project.id)) && !locked;
    
    return (
        <div className="space-y-6">
            <div key={project.id}>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        {project.name}
                        {locked && <Lock className="h-4 w-4 text-muted-foreground" title="Schedule is locked" />}
                    </h3>
                    <div className="flex items-center gap-2">
                        {scheduleForProject && (
                            <>
                                <Button variant="outline" size="sm" onClick={() => handleExportExcel(scheduleForProject, project.name)}><FileDown className="mr-2 h-4 w-4" /> Excel</Button>
                                <Button variant="outline" size="sm" onClick={() => handleExportPdf(scheduleForProject, project.name)}><FileDown className="mr-2 h-4 w-4" /> PDF</Button>
                            </>
                        )}
                        {user?.role === 'Admin' && locked && (
                            <Button variant="destructive" size="sm" onClick={() => handleUnlockSchedule(project.id)}><Unlock className="mr-2 h-4 w-4"/> Unlock</Button>
                        )}
                    </div>
                </div>
                <div className="border rounded-lg">
                    {canEdit || !locked ? (
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
  
  if (schedulesToShow.length === 0 && projectId === 'all') {
      return <p className="text-center text-muted-foreground p-8">No schedules found for this date.</p>;
  }

  const projectsToDisplay = projectId === 'all' ? projects : projects.filter(p => p.id === projectId);

  return (
    <div className="space-y-6">
      {projectsToDisplay.map(project => {
        const scheduleForProject = schedulesToShow.find(s => s.projectId === project.id);
        const locked = isScheduleLocked(scheduleForProject);
        const canEdit = (user?.role === 'Admin' || isSupervisorForProject(project.id)) && !locked;
        
        return (
          <div key={project.id}>
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    {project.name}
                    {locked && <Lock className="h-4 w-4 text-muted-foreground" title="Schedule is locked" />}
                </h3>
                <div className="flex items-center gap-2">
                    {scheduleForProject && (
                        <>
                            <Button variant="outline" size="sm" onClick={() => handleExportExcel(scheduleForProject, project.name)}><FileDown className="mr-2 h-4 w-4" /> Excel</Button>
                            <Button variant="outline" size="sm" onClick={() => handleExportPdf(scheduleForProject, project.name)}><FileDown className="mr-2 h-4 w-4" /> PDF</Button>
                        </>
                    )}
                    {user?.role === 'Admin' && locked && (
                        <Button variant="destructive" size="sm" onClick={() => handleUnlockSchedule(project.id)}><Unlock className="mr-2 h-4 w-4"/> Unlock</Button>
                    )}
                </div>
            </div>
            <div className="border rounded-lg">
              {canEdit || !locked ? (
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
        );
      })}
    </div>
  );
}
