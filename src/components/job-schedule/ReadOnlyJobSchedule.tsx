'use client';

import React from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { JobSchedule, JobScheduleItem } from '@/lib/types';
import { Badge } from '../ui/badge';
import { Users } from 'lucide-react';

interface ReadOnlyJobScheduleProps {
  schedule?: JobSchedule;
}

export default function ReadOnlyJobSchedule({ schedule }: ReadOnlyJobScheduleProps) {
  const { manpowerProfiles, vehicles, projects, users } = useAppContext();

  const getManpowerNames = (ids: string[]) => {
    return ids.map(id => {
        const mp = manpowerProfiles.find(p => p.id === id);
        if (mp) return mp.name;
        const u = users.find(u => u.id === id);
        return u ? u.name : id;
    }).join(', ');
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
      <div className="text-center p-20 text-muted-foreground bg-muted/5 rounded-md">
        No schedule items defined for this instance.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table className="text-[11px]">
        <TableHeader>
          <TableRow className="bg-muted/30">
              <TableHead className="w-[50px] text-center">Sr.</TableHead>
              <TableHead>Personnel</TableHead>
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
            <TableRow key={item.id} className="hover:bg-muted/10">
              <TableCell className="font-bold text-center">{index + 1}</TableCell>
              <TableCell className="max-w-[300px]">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="shrink-0 font-bold px-1.5 py-0 text-[10px] h-5">
                    <Users className="mr-1 h-3 w-3" />
                    {item.manpowerIds?.length || 0}
                  </Badge>
                  <span className="font-medium">{getManpowerNames(item.manpowerIds)}</span>
                </div>
              </TableCell>
              <TableCell className="uppercase">{item.jobType}</TableCell>
              <TableCell className="font-mono">{item.jobNo}</TableCell>
              <TableCell className="uppercase">{item.projectVesselName}</TableCell>
              <TableCell className="uppercase">{getLocationText(item)}</TableCell>
              <TableCell>{item.reportingTime}</TableCell>
              <TableCell>{item.clientContact}</TableCell>
              <TableCell>{getVehicleNumber(item.vehicleId)}</TableCell>
              <TableCell className="italic text-muted-foreground whitespace-pre-wrap max-w-[200px]">{item.remarks}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
