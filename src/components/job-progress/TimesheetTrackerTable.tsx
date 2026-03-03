
'use client';

import { useMemo, useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
} from "@tanstack/react-table"
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAppContext } from '@/contexts/app-provider';
import type { Timesheet, TimesheetStatus } from '@/lib/types';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { Eye, ArrowUpDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
import ViewTimesheetDialog from './ViewTimesheetDialog';

const statusVariantMap: Record<
  TimesheetStatus,
  'default' | 'secondary' | 'destructive' | 'success' | 'warning'
> = {
  Pending: 'warning',
  Acknowledged: 'default',
  'Sent To Office': 'default',
  'Office Acknowledged': 'success',
  Rejected: 'destructive',
};

export default function TimesheetTrackerTable({
  timesheets,
}: {
  timesheets: Timesheet[];
}) {
  const { users, projects } = useAppContext();
  const [viewingTimesheet, setViewingTimesheet] = useState<Timesheet | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  
  const columns: ColumnDef<Timesheet>[] = useMemo(
    () => [
      {
        id: 'project',
        header: 'Project/Unit',
        accessorFn: (row) => projects.find(p => p.id === row.projectId)?.name || '',
        cell: ({ row }) => {
          const project = projects.find(p => p.id === row.original.projectId);
          return (
            <div>
              <p>{project?.name || 'N/A'}</p>
              <p className="text-xs text-muted-foreground">{row.original.plantUnit}</p>
            </div>
          )
        }
      },
      {
        id: 'submitter',
        header: 'Submitted By',
        accessorFn: (row) => users.find(u => u.id === row.submitterId)?.name || '',
      },
      {
        id: 'period',
        header: 'Period',
        cell: ({ row }) => (
          <div className="whitespace-nowrap">
            {format(parseISO(row.original.startDate), 'dd/MM/yy')} - {format(parseISO(row.original.endDate), 'dd/MM/yy')}
          </div>
        )
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <Badge variant={statusVariantMap[row.original.status]}>{row.original.status}</Badge>
      },
      {
        id: 'lastUpdated',
        header: ({ column }) => (
            <div className="flex items-center cursor-pointer" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
              Last Updated <ArrowUpDown className="ml-2 h-4 w-4" />
            </div>
        ),
        accessorFn: (row) => row.officeAcknowledgedDate || row.sentToOfficeDate || row.acknowledgedDate || row.submissionDate,
        cell: ({ row }) => {
          const lastUpdateDate = row.original.officeAcknowledgedDate || row.original.sentToOfficeDate || row.original.acknowledgedDate || row.original.submissionDate;
          return (
            <div className="text-xs">
              {formatDistanceToNow(parseISO(lastUpdateDate), { addSuffix: true })}
            </div>
          );
        },
      },
      {
        id: 'actions',
        cell: ({ row }) => <div className="text-right"><Button variant="outline" size="sm" onClick={() => setViewingTimesheet(row.original)}><Eye className="mr-2 h-4 w-4" /> View</Button></div>
      }
    ],
    [users, projects]
  );
  
  const table = useReactTable({
    data: timesheets,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (timesheets.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No timesheets found for this period.
      </p>
    );
  }

  return (
    <>
        <ScrollArea className="h-96">
            <Table className="text-sm">
                <TableHeader>
                    {table.getHeaderGroups().map(headerGroup => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map(header => (
                                <TableHead key={header.id}>
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
                        <TableRow key={row.id}>
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
      {viewingTimesheet && (
        <ViewTimesheetDialog
          isOpen={!!viewingTimesheet}
          setIsOpen={() => setViewingTimesheet(null)}
          timesheet={viewingTimesheet}
        />
      )}
    </>
  );
}
