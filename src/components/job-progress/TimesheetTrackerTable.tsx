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
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import type { Timesheet, TimesheetStatus } from '@/lib/types';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { Eye, ArrowUpDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';

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

interface TimesheetTrackerTableProps {
  timesheets: Timesheet[];
  onViewTimesheet: (timesheet: Timesheet) => void;
}

export default function TimesheetTrackerTable({
  timesheets,
  onViewTimesheet,
}: TimesheetTrackerTableProps) {
  const { users } = useAuth();
  const { projects } = useGeneral();
  const [sorting, setSorting] = useState<SortingState>([]);
  
  const columns: ColumnDef<Timesheet>[] = useMemo(
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
              <p className="text-xs text-muted-foreground">{row.original.plantUnit}</p>
            </div>
          )
        }
      },
      {
        id: 'submitter',
        header: 'Submitted By',
        accessorFn: (row) => users.find(u => u.id === row.submitterId)?.name || '',
        cell: ({ row }) => {
          const submitter = users.find(u => u.id === row.original.submitterId);
          return submitter ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={submitter.avatar} />
                <AvatarFallback>{submitter.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="truncate">{submitter.name}</span>
            </div>
          ) : null;
        }
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
        accessorKey: 'numberOfTimesheets',
        header: 'Qty',
        cell: ({ row }) => <div className="text-center font-semibold">{row.original.numberOfTimesheets}</div>
      },
      {
        accessorKey: 'submissionDate',
        header: ({ column }) => (
            <div className="flex items-center cursor-pointer" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
              Submitted Date <ArrowUpDown className="ml-2 h-4 w-4" />
            </div>
        ),
        cell: ({ row }) => (
          <div className="whitespace-nowrap">
            {format(parseISO(row.original.submissionDate), 'dd MMM, yyyy')}
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
            <div className="flex items-center cursor-pointer" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
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
        cell: ({ row }) => <div className="text-right"><Button variant="outline" size="sm" onClick={() => onViewTimesheet(row.original)}><Eye className="mr-2 h-4 w-4" /> View</Button></div>
      }
    ],
    [users, projects, onViewTimesheet]
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
      {/* Mobile View */}
      <div className="md:hidden">
        <ScrollArea className="h-[calc(100vh-32rem)]">
          <div className="space-y-3 p-2">
            {timesheets.map((ts) => {
              const submitter = users.find((u) => u.id === ts.submitterId);
              const project = projects.find((p) => p.id === ts.projectId);
              return (
                <Card key={ts.id} onClick={() => onViewTimesheet(ts)} className="cursor-pointer">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{project?.name} - {ts.plantUnit}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(ts.startDate), 'dd/MM/yy')} - {format(parseISO(ts.endDate), 'dd/MM/yy')}
                        </p>
                      </div>
                      <Badge variant={statusVariantMap[ts.status]}>{ts.status}</Badge>
                    </div>
                    <div className="flex justify-between items-center mt-2 text-xs">
                      {submitter && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={submitter.avatar} />
                            <AvatarFallback>{submitter.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span>{submitter.name}</span>
                        </div>
                      )}
                      <span className="font-semibold">Qty: {ts.numberOfTimesheets}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Desktop View */}
      <div className="hidden md:block h-full">
        <ScrollArea className="h-[calc(100vh-28rem)] whitespace-nowrap">
          <Table className="text-sm">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => onViewTimesheet(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </>
  );
}
