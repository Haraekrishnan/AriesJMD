
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
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import type { Timesheet, TimesheetStatus } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Eye } from 'lucide-react';
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
        header: 'SL',
        cell: ({ row }) => row.index + 1,
      },
      {
        id: 'project',
        header: 'PROJECT / UNIT',
        accessorFn: (row) => projects.find(p => p.id === row.projectId)?.name || '',
        cell: ({ row }) => {
          const project = projects.find(p => p.id === row.original.projectId);
          return (
            <div className="uppercase">
              <p className="font-bold">{project?.name || 'N/A'}</p>
              <p className="text-[10px] text-muted-foreground">{row.original.plantUnit}</p>
            </div>
          )
        }
      },
      {
        id: 'submitter',
        header: 'SUBMITTED BY',
        accessorFn: (row) => users.find(u => u.id === row.submitterId)?.name || '',
        cell: ({ row }) => {
          const submitter = users.find(u => u.id === row.original.submitterId);
          return submitter ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6 border">
                <AvatarImage src={submitter.avatar} />
                <AvatarFallback>{submitter.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="truncate font-medium">{submitter.name}</span>
            </div>
          ) : null;
        }
      },
      {
        id: 'period',
        header: 'PERIOD',
        cell: ({ row }) => (
          <div className="whitespace-nowrap font-mono">
            {format(parseISO(row.original.startDate), 'dd/MM/yy')} - {format(parseISO(row.original.endDate), 'dd/MM/yy')}
          </div>
        )
      },
      {
        accessorKey: 'numberOfTimesheets',
        header: 'QTY',
        cell: ({ row }) => <div className="text-center font-bold">{row.original.numberOfTimesheets}</div>
      },
      {
        accessorKey: 'submissionDate',
        header: 'SUBMITTED DATE',
        cell: ({ row }) => (
          <div className="whitespace-nowrap text-muted-foreground">
            {format(parseISO(row.original.submissionDate), 'dd MMM, yy')}
          </div>
        )
      },
      {
        accessorKey: 'status',
        header: 'STATUS',
        cell: ({ row }) => <Badge variant={statusVariantMap[row.original.status]} className="text-[10px] py-0">{row.original.status.toUpperCase()}</Badge>
      },
      {
        id: 'actions',
        header: 'VIEW',
        cell: ({ row }) => <div className="text-right"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onViewTimesheet(row.original)}><Eye className="h-4 w-4" /></Button></div>
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
      <div className="flex-1 flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg bg-muted/20">
        <p className="text-muted-foreground">No timesheets found for this period.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden border rounded-md shadow-sm bg-white dark:bg-slate-950">
      <ScrollArea className="flex-1">
        <div className="min-w-max">
          <Table className="border-collapse text-[11px] font-sans">
            <TableHeader className="sticky top-0 z-20">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="bg-[#D9E2F3] hover:bg-[#D9E2F3] border-b-2 border-black">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="border-r border-black text-black font-bold h-10 px-3">
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
                  className="hover:bg-blue-50/50 cursor-pointer border-b border-slate-300"
                  onClick={() => onViewTimesheet(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="border-r border-slate-300 p-2">
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
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
