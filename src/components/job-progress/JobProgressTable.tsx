
'use client';

import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/app-provider';
import type { JobProgress, JobProgressStatus } from '@/lib/types';
import { format, parseISO } from 'date-fns';

interface JobProgressTableProps {
  jobs: JobProgress[];
  onViewJob: (job: JobProgress) => void;
}

const statusVariantMap: { [key in JobProgressStatus]: 'default' | 'secondary' | 'destructive' | 'success' } = {
  'Not Started': 'secondary',
  'In Progress': 'default',
  'On Hold': 'destructive',
  'Completed': 'success',
};

export function JobProgressTable({ jobs, onViewJob }: JobProgressTableProps) {
  const { users } = useAppContext();

  const sortedJobs = useMemo(() => {
    if (!jobs) return [];
    return [...jobs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [jobs]);
  
  if (sortedJobs.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No jobs created yet.</p>;
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Job Title</TableHead>
            <TableHead>Created By</TableHead>
            <TableHead>Date Created</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[200px]">Progress</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedJobs.map(job => {
            const creator = users.find(u => u.id === job.creatorId);
            const totalSteps = job.steps.length;
            const completedSteps = job.steps.filter(s => s.status === 'Completed').length;
            const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

            return (
              <TableRow key={job.id} className="cursor-pointer" onClick={() => onViewJob(job)}>
                <TableCell className="font-medium">{job.title}</TableCell>
                <TableCell>{creator?.name || 'Unknown'}</TableCell>
                <TableCell>{format(parseISO(job.createdAt), 'dd MMM, yyyy')}</TableCell>
                <TableCell><Badge variant={statusVariantMap[job.status]}>{job.status}</Badge></TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={progress} className="w-full" />
                    <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                    <Button variant="outline" size="sm">View Details</Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
