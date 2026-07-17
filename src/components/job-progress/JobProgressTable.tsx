
'use client';

import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import type { JobProgress, JobStep } from '@/lib/types';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { Check, Clock, AlertTriangle } from 'lucide-react';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { JOB_PROGRESS_STEPS } from '@/lib/types';

interface JobProgressTableProps {
  jobs: JobProgress[];
  onViewJob: (job: JobProgress) => void;
}

export function JobProgressTable({ jobs, onViewJob }: JobProgressTableProps) {
  const { users } = useAuth();
  const { projects } = useGeneral();

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime());
  }, [jobs]);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '';
    const date = parseISO(dateString);
    return isValid(date) ? format(date, 'dd-MM-yy') : '';
  };

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg bg-muted/20">
        <p className="text-muted-foreground">No JMS records found for this period.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden border rounded-md shadow-sm bg-white dark:bg-slate-950">
      <ScrollArea className="h-full">
        <div className="min-w-max">
          <Table className="border-collapse text-[11px] font-sans">
            <TableHeader className="sticky top-0 z-20">
              <TableRow className="bg-[#D9E2F3] hover:bg-[#D9E2F3] border-b-2 border-black">
                <TableHead className="w-10 border-r border-black text-black font-bold text-center">SL</TableHead>
                <TableHead className="w-32 border-r border-black text-black font-bold">WO / ARC NO</TableHead>
                <TableHead className="w-40 border-r border-black text-black font-bold">PLANT / UNIT</TableHead>
                <TableHead className="w-64 border-r border-black text-black font-bold">JOB DESCRIPTION</TableHead>
                <TableHead className="w-36 border-r border-black text-black font-bold">JMS NO</TableHead>
                <TableHead className="w-28 border-r-2 border-black text-black font-bold text-right">VALUE (INR)</TableHead>
                <TableHead className="w-24 border-r border-black text-black font-bold text-center">START</TableHead>
                <TableHead className="w-24 border-r-2 border-black text-black font-bold text-center">END</TableHead>
                
                {/* Workflow Step Headers */}
                {JOB_PROGRESS_STEPS.map((stepName) => (
                  <TableHead 
                    key={stepName} 
                    className="w-32 border-r border-slate-300 text-black font-bold text-center leading-tight px-1"
                  >
                    {stepName.toUpperCase()}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedJobs.map((job, index) => {
                const project = projects.find(p => p.id === job.projectId);
                
                return (
                  <TableRow 
                    key={job.id} 
                    className="hover:bg-blue-50/50 cursor-pointer border-b border-slate-300"
                    onClick={() => onViewJob(job)}
                  >
                    <TableCell className="border-r border-slate-300 text-center font-bold bg-slate-50/50">{index + 1}</TableCell>
                    <TableCell className="border-r border-slate-300 font-semibold">{job.workOrderNo || 'N/A'}</TableCell>
                    <TableCell className="border-r border-slate-300 uppercase">{project?.name || 'N/A'}{job.plantUnit ? ` / ${job.plantUnit}` : ''}</TableCell>
                    <TableCell className="border-r border-slate-300 font-medium uppercase">{job.title}</TableCell>
                    <TableCell className="border-r border-slate-300 text-blue-700 font-bold">{job.jmsNo || '-'}</TableCell>
                    <TableCell className="border-r-2 border-black text-right font-mono">
                      {job.amount ? new Intl.NumberFormat('en-IN').format(job.amount) : '-'}
                    </TableCell>
                    <TableCell className="border-r border-slate-300 text-center text-muted-foreground">{formatDate(job.dateFrom)}</TableCell>
                    <TableCell className="border-r-2 border-black text-center text-muted-foreground">{formatDate(job.dateTo)}</TableCell>

                    {/* Workflow Step Cells */}
                    {JOB_PROGRESS_STEPS.map((stepName) => {
                      const step = job.steps.find(s => s.name === stepName);
                      const isCompleted = step?.status === 'Completed';
                      const isPending = step?.status === 'Pending' || step?.isReturned || step?.status === 'Acknowledged';
                      const assignee = step ? users.find(u => u.id === step.assigneeId) : null;

                      return (
                        <TableCell 
                          key={stepName} 
                          className={cn(
                            "border-r border-slate-300 p-1 text-center min-h-[40px]",
                            isCompleted && "bg-green-50/30",
                            isPending && "bg-yellow-50/50"
                          )}
                        >
                          {isCompleted ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <Check className="h-3 w-3 text-green-600" />
                              <span className="text-[9px] text-green-700 font-bold">{formatDate(step.completedAt)}</span>
                            </div>
                          ) : isPending ? (
                            <div className="flex flex-col items-center gap-0.5 px-1">
                              <Badge variant={step?.isReturned ? "destructive" : "outline"} className="text-[9px] h-4 px-1 py-0 border-yellow-500 bg-yellow-100 text-yellow-800">
                                {step?.isReturned ? 'RETURNED' : 'PENDING'}
                              </Badge>
                              <span className="text-[9px] font-semibold truncate w-full text-center" title={assignee?.name}>
                                {assignee ? assignee.name.split(' ')[0] : 'Unassigned'}
                              </span>
                            </div>
                          ) : null}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      
      {/* Footer Summary - Like an Excel info bar */}
      <div className="bg-[#f3f4f6] p-1 px-4 border-t flex justify-between items-center text-[10px] font-medium text-slate-500 italic">
        <div className="flex gap-4">
          <span>TOTAL JOBS: {jobs.length}</span>
          <span>COMPLETED: {jobs.filter(j => j.status === 'Completed').length}</span>
        </div>
        <div className="flex gap-2 items-center">
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-green-200 border border-green-400"></div> Step Done</div>
            <div className="flex items-center gap-1 ml-2"><div className="w-2 h-2 bg-yellow-100 border border-yellow-400"></div> In Progress</div>
        </div>
      </div>
    </div>
  );
}
