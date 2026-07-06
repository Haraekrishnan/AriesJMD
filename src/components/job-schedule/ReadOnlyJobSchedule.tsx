'use client';

import React, { useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { JobSchedule, JobScheduleItem } from '@/lib/types';
import { Badge } from '../ui/badge';
import { Users } from 'lucide-react';

interface ReadOnlyJobScheduleProps {
  schedule?: JobSchedule;
}

export default function ReadOnlyJobSchedule({ schedule }: ReadOnlyJobScheduleProps) {
  const { manpowerProfiles, vehicles, projects } = useAppContext();

  const getManpowerNames = (ids: string[]) => {
    return ids.map(id => manpowerProfiles.find(p => p.id === id)?.name || id).join(', ');
  };

  const getVehicleNumber = (id?: string) => {
    if (!id || id === 'none') return 'N/A';
    return vehicles.find(v => v.id === id)?.vehicleNumber || 'N/A';
  };

  const getLocationText = (item: JobScheduleItem) => {
    const project = projects.find(p => p.id === item.projectId);
    return [project?.name, item.location].filter(Boolean).join(' - ');
  }

  if (!schedule || !schedule.items || schedule.items.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        No schedule has been set for this project on this date.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
            <TableHead className="w-[50px]">Sr.No</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Job Type</TableHead>
            <TableHead>Job No.</TableHead>
            <TableHead>Project/Vessel's Name</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Reporting Time</TableHead>
            <TableHead>Client/Contact</TableHead>
            <TableHead>Vehicle</TableHead>
            <TableHead>Remarks</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {schedule.items.map((item, index) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium text-center">{index + 1}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="shrink-0 font-bold px-2 py-0.5">
                  <Users className="mr-1 h-3 w-3" />
                  {item.manpowerIds?.length || 0}
                </Badge>
                <span>{getManpowerNames(item.manpowerIds)}</span>
              </div>
            </TableCell>
            <TableCell>{item.jobType}</TableCell>
            <TableCell>{item.jobNo}</TableCell>
            <TableCell>{item.projectVesselName}</TableCell>
            <TableCell>{getLocationText(item)}</TableCell>
            <TableCell>{item.reportingTime}</TableCell>
            <TableCell>{item.clientContact}</TableCell>
            <TableCell>{getVehicleNumber(item.vehicleId)}</TableCell>
            <TableCell>{item.remarks}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}