'use client';

import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/app-provider';
import type { JobProgress, JobProgressStatus } from '@/lib/types';
import { format, startOfMonth, addMonths, subMonths, isSameMonth, parseISO, isBefore, isAfter, startOfToday, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Undo2 } from 'lucide-react';

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
  const { users, projects } = useAppContext();

  const sortedJobs = useMemo(() => {
    if (!jobs) return [];
    return [...jobs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [jobs]);
  
  if (sortedJobs.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No JMS created yet for this month.</p>;
  }

  const calculateProgress = (job: JobProgress): number => {
    const completedSteps = job.steps.filter(s => s.status === 'Completed' && !s.isReturned).length;
    if (job.steps.length === 0) return 0;
    return (completedSteps / job.steps.length) * 100;
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN').format(amount);

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>JMS Title</TableHead>
            <TableHead>Project/Unit</TableHead>
            <TableHead>JMS No.</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Created By</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Currently With</TableHead>
            <TableHead className="w-[200px]">Progress</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedJobs.map(job => {
            const creator = users.find(u => u.id === job.creatorId);
            const progress = calculateProgress(job);
            
            // Priority-based step detection
            let currentStep =
              job.steps.find(s => s.isReturned === true) ||
              job.steps.find(s => s.status === 'Pending') ||
              job.steps.find(s => s.status === 'Acknowledged') ||
              null;

            const isReturnedStepActive = currentStep?.isReturned === true;
            
            const project = projects.find(p => p.id === job.projectId);
            const currentAssignee = currentStep ? users.find(u => u.id === currentStep.assigneeId) : null;
            
            let returnerInfo: { name: string; date: string } | null = null;
            if (isReturnedStepActive && currentStep) {
                const comments = Array.isArray(currentStep.comments)
                    ? currentStep.comments
                    : Object.values(currentStep.comments || {});
                
                const returnComment = comments
                    .filter(c => c && c.text && c.text.includes('was returned by'))
                    .sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())[0];

                if (returnComment) {
                    const returner = users.find(u => u.id === returnComment.userId);
                    returnerInfo = {
                        name: returner?.name || 'Unknown',
                        date: formatDistanceToNow(parseISO(returnComment.date), { addSuffix: true })
                    };
                }
            }

            let sinceDate: string | null = null;
            if (currentStep && !returnerInfo) {
                const dateToCompare = currentStep.status === 'Acknowledged' && currentStep.acknowledgedAt
                    ? currentStep.acknowledgedAt
                    : job.lastUpdated;
                
                if (dateToCompare) {
                    sinceDate = formatDistanceToNow(parseISO(dateToCompare), { addSuffix: true });
                }
            }

            return (
              <TableRow 
                key={job.id} 
                className={cn("cursor-pointer", job.isReopened && "bg-orange-100 dark:bg-orange-900/40 border-l-4 border-orange-500")}
                onClick={() => onViewJob(job)}
              >
                <TableCell className="font-medium">{job.title}</TableCell>
                <TableCell>
                    <p className="font-medium">{project?.name || 'N/A'}</p>
                    {job.plantUnit && <p className="text-xs text-muted-foreground">{job.plantUnit}</p>}
                </TableCell>
                <TableCell>{job.jmsNo || 'N/A'}</TableCell>
                <TableCell className="font-medium">
                  {job.amount ? formatCurrency(job.amount) : 'N/A'}
                </TableCell>
                <TableCell>
                    {job.dateFrom ? format(parseISO(job.dateFrom), 'dd-MM-yy') : 'N/A'} - {job.dateTo ? format(parseISO(job.dateTo), 'dd-MM-yy') : 'N/A'}
                </TableCell>
                <TableCell>{creator?.name || 'Unknown'}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant={isReturnedStepActive ? 'destructive' : statusVariantMap[job.status]}>
                        {isReturnedStepActive ? 'Returned' : (currentStep ? currentStep.name : job.status)}
                    </Badge>
                    {job.isReopened && <Badge variant="warning">Reopened</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  {currentAssignee ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={currentAssignee.avatar} />
                        <AvatarFallback>{currentAssignee.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="text-sm">{currentAssignee.name}</span>
                        {sinceDate && <p className="text-xs text-muted-foreground">since {sinceDate}</p>}
                      </div>
                    </div>
                  ) : returnerInfo ? (
                    <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 border-2 border-destructive flex items-center justify-center bg-destructive/10">
                            <Undo2 className="h-3 w-3 text-destructive" />
                        </Avatar>
                        <div>
                            <span className="text-sm text-destructive">Returned by {returnerInfo.name}</span>
                            <p className="text-xs text-muted-foreground">{returnerInfo.date}</p>
                        </div>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">{isReturnedStepActive ? 'Unassigned' : 'N/A'}</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={progress} />
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
