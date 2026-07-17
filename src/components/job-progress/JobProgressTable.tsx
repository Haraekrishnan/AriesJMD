
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
import { Check, AlertCircle } from 'lucide-react';
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
      <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg bg-muted/20">
        <p className="text-muted-foreground">No JMS records found for this period.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden border rounded-md shadow-sm bg-white dark:bg-slate-950 h-full">
      <TooltipProvider>
        <ScrollArea className="flex-1">
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
                      <TableCell className="border-r-2 border-black text-right font-bold">
                        {job.amount ? new Intl.NumberFormat('en-IN').format(job.amount) : '-'}
                      </TableCell>
                      <TableCell className="border-r border-slate-300 text-center">{formatDate(job.dateFrom)}</TableCell>
                      <TableCell className="border-r-2 border-black text-center">{formatDate(job.dateTo)}</TableCell>

                      {/* Workflow Step Cells */}
                      {JOB_PROGRESS_STEPS.map((stepName) => {
                        const step = job.steps.find(s => s.name === stepName);
                        const isCompleted = step?.status === 'Completed';
                        const isUnacknowledged = step?.status === 'Pending' || step?.isReturned;
                        const isAcknowledgedPending = step?.status === 'Acknowledged';
                        const assignee = step ? users.find(u => u.id === step.assigneeId) : null;
                        
                        // Calculate days since last update for the tooltip
                        const daysElapsed = differenceInDays(new Date(), parseISO(job.lastUpdated));
                        const isCritical = daysElapsed > 2 && (isUnacknowledged || isAcknowledgedPending);

                        return (
                          <TableCell 
                            key={stepName} 
                            className={cn(
                              "border-r border-slate-300 p-1 text-center min-h-[40px] group",
                              isCompleted && "bg-green-50/30",
                              !isCritical && isUnacknowledged && "bg-orange-200/50",
                              !isCritical && isAcknowledgedPending && "bg-yellow-50/50",
                              isCritical && "bg-red-600/20"
                            )}
                          >
                            {isCompleted ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <Check className="h-3 w-3 text-green-600" />
                                <span className="text-green-700 font-bold">{formatDate(step.completedAt)}</span>
                              </div>
                            ) : (isUnacknowledged || isAcknowledgedPending) ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex flex-col items-center gap-0.5 px-1">
                                    <Badge 
                                      variant={step?.isReturned ? "destructive" : "outline"} 
                                      className={cn(
                                        "text-[9px] h-4 px-1 py-0 font-black",
                                        isCritical 
                                          ? "bg-red-600 text-white border-red-700 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" 
                                          : (isUnacknowledged ? "bg-orange-500 text-white border-orange-600 animate-pulse" : "border-yellow-500 bg-yellow-100 text-yellow-800")
                                      )}
                                    >
                                      {isCritical ? 'URGENT' : (step?.isReturned ? 'RETURNED' : isUnacknowledged ? 'NOT ACK' : 'PENDING')}
                                    </Badge>
                                    <span className={cn("font-semibold truncate w-full text-center", isCritical ? "text-red-700 font-black" : "text-foreground")} title={assignee?.name}>
                                      {assignee ? assignee.name.split(' ')[0] : 'Unassigned'}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs space-y-1">
                                    <p className={cn("font-bold", isCritical && "text-red-600")}>
                                      {isCritical ? 'CRITICAL DELAY' : (isUnacknowledged ? 'Awaiting Acknowledgment' : 'In Progress')}
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
      
      {/* Footer Summary - Like an Excel info bar */}
      <div className="bg-[#f3f4f6] p-1 px-4 border-t flex justify-between items-center text-[10px] font-medium text-slate-500 italic shrink-0">
        <div className="flex gap-4">
          <span>TOTAL JOBS: {jobs.length}</span>
          <span>COMPLETED: {jobs.filter(j => j.status === 'Completed').length}</span>
        </div>
        <div className="flex gap-2 items-center">
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-green-200 border border-green-400"></div> Step Done</div>
            <div className="flex items-center gap-1 ml-2"><div className="w-2 h-2 bg-yellow-100 border border-yellow-400"></div> In Progress</div>
            <div className="flex items-center gap-1 ml-2"><div className="w-2 h-2 bg-orange-200 border border-orange-500 animate-pulse"></div> Not Acknowledged</div>
            <div className="flex items-center gap-1 ml-2"><div className="w-2 h-2 bg-red-600/30 border border-red-600 animate-pulse"></div> Critical (&gt;2 Days)</div>
        </div>
      </div>
    </div>
  );
}
