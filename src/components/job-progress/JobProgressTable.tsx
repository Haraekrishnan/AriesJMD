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
import type { JobProgress } from '@/lib/types';
import { format, parseISO, isValid, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Check, Clock } from 'lucide-react';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { JOB_PROGRESS_STEPS } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

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
      <div className="flex flex-col items-center justify-center h-full border-2 border-dashed rounded-lg bg-muted/20">
        <p className="text-muted-foreground">No JMS records found for this period.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <TooltipProvider>
        <ScrollArea className="flex-1 min-h-0 h-full">
          <div className="min-w-max min-h-full">
            <Table className="border-collapse text-[11px] font-sans">
              <TableHeader className="sticky top-0 z-40">
                <TableRow className="bg-[#D9E2F3] hover:bg-[#D9E2F3] border-b-2 border-black">
                  <TableHead className="w-10 border-r border-black text-black font-bold text-center md:sticky md:left-0 md:z-50 bg-[#D9E2F3]">SL</TableHead>
                  <TableHead className="w-32 border-r border-black text-black font-bold md:sticky md:left-[40px] md:z-50 bg-[#D9E2F3]">WO / ARC NO</TableHead>
                  <TableHead className="w-40 border-r border-black text-black font-bold md:sticky md:left-[168px] md:z-50 bg-[#D9E2F3]">PLANT / UNIT</TableHead>
                  <TableHead className="w-64 border-r border-black text-black font-bold md:sticky md:left-[328px] md:z-50 bg-[#D9E2F3]">JOB DESCRIPTION</TableHead>
                  <TableHead className="w-36 border-r-2 border-black text-black font-bold md:sticky md:left-[584px] md:z-50 bg-[#D9E2F3] md:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.2)]">JMS NO</TableHead>
                  
                  <TableHead className="w-28 border-r-2 border-black text-black font-bold text-right">VALUE (INR)</TableHead>
                  <TableHead className="w-24 border-r border-black text-black font-bold text-center">START</TableHead>
                  <TableHead className="w-24 border-r-2 border-black text-black font-bold text-center">END</TableHead>
                  
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
                  const isEven = index % 2 !== 0;
                  const rowBg = isEven ? "bg-slate-50 dark:bg-slate-800" : "bg-white dark:bg-slate-900";
                  
                  return (
                    <TableRow 
                      key={job.id} 
                      className={cn(
                        "hover:bg-blue-100/50 cursor-pointer border-b border-slate-300 transition-colors",
                        rowBg
                      )}
                      onClick={() => onViewJob(job)}
                    >
                      <TableCell className={cn("border-r border-slate-300 text-center font-bold md:sticky md:left-0 md:z-20", rowBg)}>{index + 1}</TableCell>
                      <TableCell className={cn("border-r border-slate-300 font-semibold md:sticky md:left-[40px] md:z-20", rowBg)}>{job.workOrderNo || 'N/A'}</TableCell>
                      <TableCell className={cn("border-r border-slate-300 uppercase font-bold md:sticky md:left-[168px] md:z-20", rowBg)}>{project?.name || 'N/A'}{job.plantUnit ? ` / ${job.plantUnit}` : ''}</TableCell>
                      <TableCell className={cn("border-r border-slate-300 font-medium uppercase md:sticky md:left-[328px] md:z-20", rowBg)}>{job.title}</TableCell>
                      <TableCell className={cn("border-r-2 border-black text-blue-700 font-bold md:sticky md:left-[584px] md:z-20 md:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]", rowBg)}>{job.jmsNo || '-'}</TableCell>
                      
                      <TableCell className="border-r-2 border-black text-right font-bold text-[11px] text-foreground">
                        {job.amount ? new Intl.NumberFormat('en-IN').format(job.amount) : '-'}
                      </TableCell>
                      <TableCell className="border-r border-slate-300 text-center text-[11px] text-foreground">{formatDate(job.dateFrom)}</TableCell>
                      <TableCell className="border-r-2 border-black text-center text-[11px] text-foreground">{formatDate(job.dateTo)}</TableCell>

                      {JOB_PROGRESS_STEPS.map((stepName) => {
                        const step = job.steps.find(s => s.name === stepName);
                        const isCompleted = step?.status === 'Completed';
                        const isUnacknowledged = step?.status === 'Pending' || step?.isReturned;
                        const isAcknowledgedPending = step?.status === 'Acknowledged';
                        const assignee = step ? users.find(u => u.id === step.assigneeId) : null;
                        
                        const daysElapsed = differenceInDays(new Date(), parseISO(job.lastUpdated));
                        const isLongDelay = daysElapsed > 2 && (isUnacknowledged || isAcknowledgedPending);

                        return (
                          <TableCell 
                            key={stepName} 
                            className={cn(
                              "border-r border-slate-300 p-1 text-center min-h-[40px] group text-[11px] relative",
                              isCompleted && "bg-green-50/20",
                              isUnacknowledged ? "bg-orange-50/40" : (isAcknowledgedPending ? "bg-yellow-50/40" : "")
                            )}
                          >
                            {isLongDelay && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600 z-10" />}
                            {isCompleted ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <Check className="h-3 w-3 text-green-600" />
                                <span className="text-green-700 font-bold">{formatDate(step.completedAt)}</span>
                              </div>
                            ) : (isUnacknowledged || isAcknowledgedPending) ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex flex-col items-center gap-0.5 px-1">
                                    <div className="flex items-center gap-1">
                                      {isLongDelay && <Clock className="h-3 w-3 text-red-600" />}
                                      <Badge 
                                        variant={step?.isReturned ? "destructive" : "outline"} 
                                        className={cn(
                                          "text-[10px] h-4 px-1 py-0 font-black",
                                          isUnacknowledged 
                                            ? "bg-orange-100 text-orange-700 border-orange-300" 
                                            : "bg-yellow-100 text-yellow-800 border-yellow-500",
                                          isLongDelay && "border-red-500 shadow-[0_0_2px_rgba(220,38,38,0.5)]"
                                        )}
                                      >
                                        {step?.isReturned ? 'RETURNED' : isUnacknowledged ? 'NOT ACK' : 'PENDING'}
                                      </Badge>
                                    </div>
                                    <span className="font-bold truncate w-full text-center text-foreground" title={assignee?.name}>
                                      {assignee ? assignee.name.split(' ')[0] : 'Unassigned'}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs space-y-1">
                                    <p className={cn("font-bold", isLongDelay && "text-red-600")}>
                                      {isLongDelay ? 'ACTION OVERDUE' : (isUnacknowledged ? 'Awaiting Acknowledgment' : 'In Progress')}
                                    </p>
                                    <p>{daysElapsed} days since last update</p>
                                    {assignee && <p className="italic">Current: {assignee.name}</p>}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
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
      </TooltipProvider>
      
      <div className="shrink-0 border-t bg-[#f3f4f6] p-1 px-4 flex justify-between items-center text-[10px] font-medium text-slate-500 italic">
        <div className="flex gap-4">
          <span>TOTAL JOBS: {jobs.length}</span>
          <span>COMPLETED: {jobs.filter(j => j.status === 'Completed').length}</span>
        </div>
        <div className="flex gap-2 items-center">
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-green-100 border border-green-400"></div> Step Done</div>
            <div className="flex items-center gap-1 ml-2"><div className="w-2 h-2 bg-yellow-100 border border-yellow-500"></div> In Progress (PENDING)</div>
            <div className="flex items-center gap-1 ml-2"><div className="w-2 h-2 bg-orange-100 border border-orange-300"></div> Not Acknowledged (NOT ACK)</div>
            <div className="flex items-center gap-1 ml-2">
              <div className="w-1 h-3 bg-red-600"></div> 
              Action Overdue (&gt;2 Days)
            </div>
        </div>
      </div>
    </div>
  );
}
