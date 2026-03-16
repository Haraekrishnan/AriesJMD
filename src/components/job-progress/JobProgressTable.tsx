'use client';

import { useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/app-provider';
import type { JobProgress, JobProgressStatus } from '@/lib/types';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Undo2, ArrowUpDown, User, Eye } from 'lucide-react';
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
    SortingState,
  } from "@tanstack/react-table"
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';


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
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: false }]);
  
  const columns: ColumnDef<JobProgress>[] = useMemo(
    () => [
      {
        id: 'slNo',
        header: 'Sl.No.',
        cell: ({ row }) => row.index + 1,
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
      {
        accessorKey: 'title',
        header: 'Job Description',
        cell: ({ row }) => <span className="font-medium">{row.original.title}</span>
      },
      {
        accessorKey: 'dateFrom',
        header: 'Start Date',
        cell: ({ row }) => row.original.dateFrom ? format(parseISO(row.original.dateFrom), 'dd-MM-yyyy') : 'N/A'
      },
      {
        accessorKey: 'dateTo',
        header: 'End Date',
        cell: ({ row }) => row.original.dateTo ? format(parseISO(row.original.dateTo), 'dd-MM-yyyy') : 'N/A'
      },
      {
        accessorKey: 'jmsNo',
        header: 'JMS No.',
        cell: ({ row }) => row.original.jmsNo || 'N/A'
      },
      {
        accessorKey: 'amount',
        header: 'Value',
        cell: ({ row }) => {
          const amount = row.original.amount;
          return amount ? new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(amount) : 'N/A';
        }
      },
      {
        id: 'assignee',
        header: 'Current Assignee',
        accessorFn: (row) => {
            if (row.status === 'Completed') {
                const lastStep = row.steps[row.steps.length - 1];
                return users.find(u => u.id === lastStep?.completedBy)?.name || 'Completed';
            }
            const returnedStep = row.steps.find(s => s.isReturned === true);
            const pendingStep = row.steps.find(s => s.status === 'Pending');
            const acknowledgedStep = row.steps.find(s => s.status === 'Acknowledged');
            const currentStep = returnedStep || pendingStep || acknowledgedStep || null;
            return users.find(u => u.id === currentStep?.assigneeId)?.name || '';
        },
        cell: ({ row }) => {
            if (row.original.status === 'Completed') {
                const lastStep = row.original.steps[row.original.steps.length - 1];
                const completer = lastStep?.completedBy ? users.find(u => u.id === lastStep.completedBy) : null;
                return completer ? (
                    <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={completer.avatar} />
                            <AvatarFallback>{completer.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="truncate">{completer.name}</span>
                    </div>
                ) : <span className="text-muted-foreground">Completed</span>;
            }

            const returnedStep = row.original.steps.find(s => s.isReturned === true);
            const pendingStep = row.original.steps.find(s => s.status === 'Pending');
            const acknowledgedStep = row.original.steps.find(s => s.status === 'Acknowledged');
            const currentStep = returnedStep || pendingStep || acknowledgedStep || null;
            const assignee = currentStep ? users.find(u => u.id === currentStep?.assigneeId) : null;
            
            return assignee ? (
                <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={assignee.avatar} />
                        <AvatarFallback>{assignee.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate">{assignee.name}</span>
                </div>
            ) : <span className="text-muted-foreground">Unassigned</span>;
        }
      },
      {
        id: 'duration',
        header: 'Pending Since',
        cell: ({ row }) => {
            const job = row.original;
            if (job.status === 'Completed') {
                return <span className="text-muted-foreground">-</span>;
            }
    
            const returnedStep = job.steps.find(s => s.isReturned);
            const pendingStep = job.steps.find(s => s.status === 'Pending');
            const acknowledgedStep = job.steps.find(s => s.status === 'Acknowledged');
    
            let dateToCompare: string | null | undefined = null;
    
            if (returnedStep && returnedStep.returnDetails?.date) {
                dateToCompare = returnedStep.returnDetails.date;
            } else if (acknowledgedStep && acknowledgedStep.acknowledgedAt) {
                dateToCompare = acknowledgedStep.acknowledgedAt;
            } else {
                dateToCompare = job.lastUpdated; 
            }
    
            if (!dateToCompare) {
                return <span className="text-muted-foreground">-</span>;
            }
    
            return (
                <div className="text-xs whitespace-nowrap text-muted-foreground">
                    {formatDistanceToNow(parseISO(dateToCompare), { addSuffix: true })}
                </div>
            );
        }
      },
      {
        id: 'acknowledgment',
        header: 'Acknowledgment',
        cell: ({ row }) => {
          if (row.original.status === 'Completed') {
            return <Badge variant="success">Completed</Badge>;
          }
          const returnedStep = row.original.steps.find(s => s.isReturned === true);
          if (returnedStep) {
            return <Badge variant="destructive">Returned</Badge>;
          }
          const acknowledgedStep = row.original.steps.find(s => s.status === 'Acknowledged');
          if (acknowledgedStep) {
            return <Badge variant="default">Acknowledged</Badge>;
          }
          const pendingStep = row.original.steps.find(s => s.status === 'Pending');
          if (pendingStep) {
            return <Badge variant="warning">Pending</Badge>;
          }
          return <Badge variant="secondary">{row.original.status}</Badge>;
        }
      },
      { 
        accessorKey: 'createdAt', 
        header: ({ column }) => (
          <div className="flex items-center cursor-pointer" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Created <ArrowUpDown className="ml-2 h-4 w-4" />
          </div>
        ),
        cell: ({ row }) => (
            <div className="text-xs whitespace-nowrap text-muted-foreground">
                {formatDistanceToNow(parseISO(row.original.createdAt), { addSuffix: true })}
            </div>
        )
      },
      {
        id: 'status',
        header: 'Current Step',
        accessorFn: (row) => {
            if (row.status === 'Completed') {
                const lastStep = row.steps[row.steps.length - 1];
                if (lastStep?.status === 'Completed') {
                    return lastStep.name;
                }
                return 'Completed';
            }
            const returnedStep = row.steps.find(s => s.isReturned === true);
            if(returnedStep) return returnedStep.name;
            const pendingStep = row.steps.find(s => s.status === 'Pending');
            if(pendingStep) return pendingStep.name;
            const acknowledgedStep = row.steps.find(s => s.status === 'Acknowledged');
            if(acknowledgedStep) return acknowledgedStep.name;
            return row.status;
        },
        cell: ({ row }) => {
            const stepName = row.getValue('status') as string;
            
            let variant: 'success' | 'destructive' | 'default' | 'warning' | 'secondary' = 'secondary';
            if (row.original.status === 'Completed') {
              variant = 'success';
            } else {
              const returnedStep = row.original.steps.find(s => s.isReturned === true);
              const pendingStep = row.original.steps.find(s => s.status === 'Pending');
              const acknowledgedStep = row.original.steps.find(s => s.status === 'Acknowledged');
              if (returnedStep) variant = 'destructive';
              else if (acknowledgedStep) variant = 'default';
              else if (pendingStep) variant = 'warning';
            }
            
            return <Badge variant={variant}>{stepName}</Badge>
        }
      },
      {
        id: 'actions',
        cell: ({ row }) => <div className="text-right"><Button variant="outline" size="sm" onClick={() => onViewJob(row.original)}><Eye className="mr-2 h-4 w-4" /> View</Button></div>
      }
    ],
    [projects, users, onViewJob]
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
    return <p className="text-center text-muted-foreground py-8">No jobs found.</p>;
  }

  return (
    <ScrollArea className="h-full whitespace-nowrap">
        <Table className="text-sm">
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id} >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map(row => (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={() => onViewJob(row.original)}
              >
                {row.getVisibleCells().map(cell => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
  );
}

    