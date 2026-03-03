'use client';

import { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { ScrollArea } from '../ui/scroll-area';
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
  const [sorting, setSorting] = useState<SortingState>([{ id: 'lastUpdated', desc: true }]);
  
  const columns: ColumnDef<JobProgress>[] = useMemo(
    () => [
      {
        accessorKey: 'title',
        header: 'JMS Title',
        cell: ({ row }) => <span className="font-medium">{row.original.title}</span>
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
        id: 'assignee',
        header: 'Current Assignee',
        accessorFn: (row) => {
            const currentStep = row.original.steps.find(s => s.status === 'Pending' || s.isReturned) || row.original.steps.find(s => s.status === 'Acknowledged');
            return users.find(u => u.id === currentStep?.assigneeId)?.name || '';
        },
        cell: ({ row }) => {
            const returnedStep = row.original.steps.find(s => s.isReturned === true);
            const pendingStep = row.original.steps.find(s => s.status === 'Pending');
            const acknowledgedStep = row.original.steps.find(s => s.status === 'Acknowledged');
            const currentStep = returnedStep || pendingStep || acknowledgedStep || null;
            const assignee = currentStep ? users.find(u => u.id === currentStep.assigneeId) : null;
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
        accessorKey: 'lastUpdated', 
        header: ({ column }) => (
          <div className="flex items-center cursor-pointer" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Last Updated <ArrowUpDown className="ml-2 h-4 w-4" />
          </div>
        ),
        cell: ({ row }) => (
            <div className="text-xs whitespace-nowrap text-muted-foreground">
                {formatDistanceToNow(parseISO(row.original.lastUpdated), { addSuffix: true })}
            </div>
        )
      },
      {
        id: 'status',
        header: 'Current Step',
        accessorFn: (row) => {
            const returnedStep = row.steps.find(s => s.isReturned === true);
            if(returnedStep) return 'Returned';
            const pendingStep = row.steps.find(s => s.status === 'Pending');
            if(pendingStep) return pendingStep.name;
            const acknowledgedStep = row.steps.find(s => s.status === 'Acknowledged');
            if(acknowledgedStep) return acknowledgedStep.name;
            return row.status;
        },
        cell: ({ row }) => {
            const returnedStep = row.original.steps.find(s => s.isReturned === true);
            const pendingStep = row.original.steps.find(s => s.status === 'Pending');
            const acknowledgedStep = row.original.steps.find(s => s.status === 'Acknowledged');

            const currentStep = returnedStep || pendingStep || acknowledgedStep || null;
            
            const variant = returnedStep ? 'destructive' : (acknowledgedStep ? 'default' : (pendingStep ? 'warning' : 'success'));
            const text = currentStep ? currentStep.name : row.original.status;
            
            return <Badge variant={variant}>{text}</Badge>
        }
      },
      {
        id: 'actions',
        cell: ({ row }) => <div className="text-right"><Button variant="outline" size="sm" onClick={() => onViewJob(row.original)}><Eye className="mr-2 h-4 w-4" /> View</Button></div>
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
    return <p className="text-center text-muted-foreground py-8">No long pending jobs found.</p>;
  }

  return (
    <ScrollArea className="h-full">
        <Table>
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
      </ScrollArea>
  );
}
