'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { PlusCircle, Trash2, CheckCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { isPast, parseISO, isValid } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import type { Harness, Tripod, Lifeline, GasDetector } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

type Item = Harness | Tripod | Lifeline | GasDetector;
type Category = 'harness' | 'tripod' | 'lifeline' | 'gas_detectors';

const EditableCell = ({ getValue, row, column, table }: any) => {
  const initialValue = getValue();
  const [value, setValue] = useState(initialValue);
  const { can } = useAppContext();

  const isEditable = can.manage_inventory_database;

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const onBlur = () => {
    if (value !== initialValue) {
      table.options.meta?.updateData(row.index, column.id, value);
    }
  };

  return (
    <Input
      value={value as string}
      onChange={e => setValue(e.target.value)}
      onBlur={onBlur}
      disabled={!isEditable}
      className="w-full h-full border-transparent bg-transparent focus:bg-white focus:border focus:ring-1 focus:ring-ring p-1"
    />
  );
};

const SelectCell = ({ getValue, row, column, table, options }: any) => {
  const initialValue = getValue();
  const { can } = useAppContext();
  const isEditable = can.manage_inventory_database;

  return (
    <Select
      value={initialValue}
      onValueChange={value => table.options.meta?.updateData(row.index, column.id, value)}
      disabled={!isEditable}
    >
      <SelectTrigger className="border-transparent bg-transparent focus:ring-0 w-full h-full p-1">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option: string) => (
          <SelectItem key={option} value={option}>{option}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const DateCell = ({ getValue, row, column, table }: any) => {
  const initialValue = getValue();
  const { can } = useAppContext();
  const isEditable = can.manage_inventory_database;
  const dateValue = initialValue ? parseISO(initialValue) : undefined;
  
  const isExpired = dateValue && isPast(dateValue);

  return (
    <div className={cn(isExpired && "text-destructive font-bold")}>
      <DatePickerInput
        value={isValid(dateValue) ? dateValue : undefined}
        onChange={date => table.options.meta?.updateData(row.index, column.id, date ? date.toISOString() : null)}
        disabled={!isEditable}
      />
    </div>
  );
};

const InventorySheet = ({ category }: { category: Category }) => {
  const {
    harnesses, tripods, lifelines, gasDetectors, projects, can,
    addHarness, updateHarness, deleteHarness,
    addTripod, updateTripod, deleteTripod,
    addLifeline, updateLifeline, deleteLifeline,
    addGasDetector, updateGasDetector, deleteGasDetector,
  } = useAppContext();
  
  const { toast } = useToast();
  const [rowSelection, setRowSelection] = useState({});

  const { data, addAction, updateAction, deleteAction } = useMemo(() => {
    switch (category) {
      case 'harness': return { data: (harnesses || []).filter(i => !i.isArchived), addAction: addHarness, updateAction: updateHarness, deleteAction: deleteHarness };
      case 'tripod': return { data: (tripods || []).filter(i => !i.isArchived), addAction: addTripod, updateAction: updateTripod, deleteAction: deleteTripod };
      case 'lifeline': return { data: (lifelines || []).filter(i => !i.isArchived), addAction: addLifeline, updateAction: updateLifeline, deleteAction: deleteLifeline };
      case 'gas_detectors': return { data: (gasDetectors || []).filter(i => !i.isArchived), addAction: addGasDetector, updateAction: updateGasDetector, deleteAction: deleteGasDetector };
      default: return { data: [], addAction: () => {}, updateAction: () => {}, deleteAction: () => {} };
    }
  }, [category, harnesses, tripods, lifelines, gasDetectors, addHarness, updateHarness, deleteHarness, addTripod, updateTripod, deleteTripod, addLifeline, updateLifeline, deleteLifeline, addGasDetector, updateGasDetector, deleteGasDetector]);

  const columns = useMemo<ColumnDef<Item>[]>(() => {
    const baseColumns: ColumnDef<Item>[] = [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      { accessorKey: 'serialNo', header: 'Serial No.', cell: EditableCell },
      { accessorKey: 'itemName', header: 'Item Name', cell: EditableCell },
      { accessorKey: 'ariesId', header: 'Aries ID', cell: EditableCell },
      { 
        accessorKey: 'status', 
        header: 'Status', 
        cell: (props) => <SelectCell {...props} options={['In Use', 'Expired', 'Repair', 'Idle', 'In Store']} />
      },
      { 
        accessorKey: 'projectId', 
        header: 'Project', 
        cell: (props) => <SelectCell {...props} options={projects.map(p => p.name)} />
      },
      { accessorKey: 'inspectionDueDate', header: 'Insp. Due', cell: DateCell },
      { accessorKey: 'tpInspectionDueDate', header: 'TP Insp. Due', cell: DateCell },
    ];
    if (category === 'harness') {
      baseColumns.splice(4, 0, { accessorKey: 'chestCrollNo', header: 'Chest Croll No.', cell: EditableCell });
    }
    return baseColumns;
  }, [category, projects]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
    meta: {
      updateData: (rowIndex: number, columnId: string, value: any) => {
        const itemToUpdate = data[rowIndex];
        updateAction(itemToUpdate.id, { [columnId]: value });
      },
    },
  });
  
  const handleAddRow = () => {
    addAction({
      serialNo: `NEW-${Math.floor(Math.random() * 1000)}`,
      itemName: category.charAt(0).toUpperCase() + category.slice(1, -1),
      status: 'In Store',
      isArchived: false,
    });
  };

  const handleDeleteSelected = () => {
    const selectedIds = table.getSelectedRowModel().rows.map(row => row.original.id);
    if(selectedIds.length === 0) {
        toast({ title: "No rows selected", variant: 'destructive'});
        return;
    }
    selectedIds.forEach(id => deleteAction(id));
    setRowSelection({});
    toast({ title: `${selectedIds.length} rows deleted` });
  };
  
  const isEditable = can.manage_inventory_database;

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <div/>
        <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" /> All changes are saved automatically.
            </span>
            {isEditable && (
                <>
                <Button size="sm" onClick={handleAddRow}><PlusCircle className="mr-2 h-4 w-4"/> Add Row</Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" disabled={table.getSelectedRowModel().rows.length === 0}><Trash2 className="mr-2 h-4 w-4"/> Delete Selected</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will archive the selected rows. They will no longer appear in the database view.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteSelected}>Confirm Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                </>
            )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[60vh] border rounded-md">
            <Table>
            <TableHeader>
                {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                    <TableHead key={header.id}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                    ))}
                </TableRow>
                ))}
            </TableHeader>
            <TableBody>
                {table.getRowModel().rows.map(row => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                    {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} className="p-0">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                    ))}
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default InventorySheet;
