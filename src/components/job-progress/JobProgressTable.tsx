'use client';

import { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/app-provider';
import type { JobProgress, JobProgressStatus } from '@/lib/types';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Undo2, ArrowUpDown } from 'lucide-react';
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
    SortingState,
  } from "@tanstack/react-table"
import { ScrollArea } from '../ui/scroll-area';

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
  const [sorting, setSorting] = useState<SortingState>([]);
  
  const calculateProgress = (job: JobProgress): number => {
    const completedSteps = job.steps.filter(s => s.status === 'Completed' && !s.isReturned).length;
    if (job.steps.length === 0) return 0;
    return (completedSteps / job.steps.length) * 100;
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN').format(amount);

  const columns: ColumnDef<JobProgress>[] = useMemo(
    () => [
      {
        accessorKey: 'title',
        header: 'JMS Title',
        cell: ({ row }) => <div className="font-medium">{row.original.title}</div>
      },
      {
        id: 'project',
        header: 'Project/Unit',
        accessorFn: (row) => projects.find(p => p.id === row.projectId)?.name || '',
        cell: ({ row }) => {
          const project = projects.find(p => p.id === row.original.projectId);
          return (
            <div>
              <p>{project?.name || 'N/A'}</p>
              {row.original.plantUnit && <p className="text-xs text-muted-foreground">{row.original.plantUnit}</p>}
            </div>
          )
        }
      },
      { accessorKey: 'jmsNo', header: 'JMS No.' },
      { 
        accessorKey: 'amount', 
        header: 'Amount',
        cell: ({ row }) => row.original.amount ? formatCurrency(row.original.amount) : 'N/A'
      },
      {
        id: 'period',
        header: 'Period',
        cell: ({ row }) => (
          <div className="text-xs whitespace-nowrap">
            {row.original.dateFrom ? format(parseISO(row.original.dateFrom), 'dd-MM-yy') : 'N/A'} - {row.original.dateTo ? format(parseISO(row.original.dateTo), 'dd-MM-yy') : 'N/A'}
          </div>
        )
      },
      {
        id: 'creator',
        header: 'Created By',
        accessorFn: (row) => users.find(u => u.id === row.creatorId)?.name || '',
      },
      {
        id: 'status',
        header: 'Status',
        accessorFn: (row) => {
            const currentStep = row.steps.find(s => s.isReturned === true) || row.steps.find(s => s.status === 'Pending') || row.steps.find(s => s.status === 'Acknowledged');
            return currentStep?.isReturned ? 'Returned' : currentStep?.name || row.status;
        },
        cell: ({ row }) => {
            const currentStep =
                row.original.steps.find(s => s.isReturned === true) ||
                row.original.steps.find(s => s.status === 'Pending') ||
                row.original.steps.find(s => s.status === 'Acknowledged');
            const isReturnedStepActive = currentStep?.isReturned === true;
            return (
                <div className="flex items-center gap-2">
                    <Badge variant={isReturnedStepActive ? 'destructive' : statusVariantMap[row.original.status]}>
                        {isReturnedStepActive ? 'Returned' : (currentStep ? currentStep.name : row.original.status)}
                    </Badge>
                    {row.original.isReopened && <Badge variant="warning">Reopened</Badge>}
                </div>
            )
        }
      },
      {
        id: 'currentlyWith',
        header: 'Currently With',
        accessorFn: (row) => {
            const currentStep = row.steps.find(s => s.isReturned === true) || row.steps.find(s => s.status === 'Pending') || row.steps.find(s => s.status === 'Acknowledged');
            return currentStep ? users.find(u => u.id === currentStep.assigneeId)?.name : '';
        },
        cell: ({ row }) => {
            const currentStep =
                row.original.steps.find(s => s.isReturned === true) ||
                row.original.steps.find(s => s.status === 'Pending') ||
                row.original.steps.find(s => s.status === 'Acknowledged');
            const isReturnedStepActive = currentStep?.isReturned === true;
            const currentAssignee = currentStep ? users.find(u => u.id === currentStep.assigneeId) : null;
            let returnerInfo: { name: string; date: string } | null = null;
            if (isReturnedStepActive && currentStep) {
                const comments = Array.isArray(currentStep.comments) ? currentStep.comments : Object.values(currentStep.comments || {});
                const returnComment = comments.filter(c => c && c.text && c.text.includes('was returned by')).sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())[0];
                if (returnComment) {
                    const returner = users.find(u => u.id === returnComment.userId);
                    returnerInfo = { name: returner?.name || 'Unknown', date: formatDistanceToNow(parseISO(returnComment.date), { addSuffix: true }) };
                }
            }
            let sinceDate: string | null = null;
            if (currentStep && !returnerInfo) {
                const dateToCompare = currentStep.status === 'Acknowledged' && currentStep.acknowledgedAt ? currentStep.acknowledgedAt : row.original.lastUpdated;
                if (dateToCompare) sinceDate = formatDistanceToNow(parseISO(dateToCompare), { addSuffix: true });
            }
            return currentAssignee ? (
                <div><span>{currentAssignee.name}</span>{sinceDate && <p className="text-xs text-muted-foreground">since {sinceDate}</p>}</div>
            ) : returnerInfo ? (
                <div className="flex items-center gap-2"><Undo2 className="h-4 w-4 text-destructive shrink-0" /><div><span className="text-sm text-destructive">Returned by {returnerInfo.name}</span><p className="text-xs text-muted-foreground">{returnerInfo.date}</p></div></div>
            ) : (<span className="text-sm text-muted-foreground">{isReturnedStepActive ? 'Unassigned' : 'N/A'}</span>)
        }
      },
      {
        id: 'progress',
        header: 'Progress',
        cell: ({ row }) => {
          const progress = calculateProgress(row.original);
          return (
            <div className="flex items-center gap-2">
              <Progress value={progress} className="h-2" />
              <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
            </div>
          )
        }
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => <div className="text-right"><Button variant="outline" size="sm" onClick={() => onViewJob(row.original)}>View Details</Button></div>
      }
    ],
    [projects, users]
  );
  
  const table = useReactTable({
    data: jobs,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (jobs.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No JMS created yet for this month.</p>;
  }

  return (
    <div className="border rounded-lg overflow-hidden flex-1 flex flex-col min-h-0">
      <ScrollArea className="h-full">
        <Table className="text-sm">
          <TableHeader className="sticky top-0 bg-card z-10">
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id} onClick={header.column.getToggleSortingHandler()} className="cursor-pointer">
                    {header.isPlaceholder
                      ? null
                      : <div className="flex items-center">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: <ArrowUpDown className="ml-2 h-4 w-4" />,
                            desc: <ArrowUpDown className="ml-2 h-4 w-4" />,
                          }[header.column.getIsSorted() as string] ?? (header.column.getCanSort() ? <ArrowUpDown className="ml-2 h-4 w-4 opacity-30"/> : null) }
                        </div>
                    }
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map(row => (
              <TableRow
                key={row.id}
                className={cn("cursor-pointer", row.original.isReopened && "bg-orange-100 dark:bg-orange-900/40 border-l-4 border-orange-500")}
                onClick={() => onViewJob(row.original)}
              >
                {row.getVisibleCells().map(cell => (
                  <TableCell key={cell.id} className="p-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
