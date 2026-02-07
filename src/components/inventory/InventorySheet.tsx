'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
  ColumnFiltersState,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
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
import { isPast, parseISO, isValid, format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import type { InventoryItem, InventoryItemStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardContent } from '../ui/card';

const statusOptions: InventoryItemStatus[] = ['In Use', 'In Store', 'Damaged', 'Expired', 'Moved to another project', 'Quarantine'];

const EditableCell = ({ getValue, row, column, table }: any) => {
  const initialValue = getValue() ?? '';
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
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={onBlur}
      disabled={!isEditable}
      className="w-full h-full border-transparent bg-transparent focus:bg-white focus:border focus:ring-1 focus:ring-ring p-1"
    />
  );
};

const SelectCell = ({ getValue, row, column, table, options, placeholder }: any) => {
  const initialValue = getValue();
  const { can } = useAppContext();
  const isEditable = can.manage_inventory_database;

  return (
    <Select
      value={initialValue || ''}
      onValueChange={value => table.options.meta?.updateData(row.index, column.id, value)}
      disabled={!isEditable}
    >
      <SelectTrigger className="border-transparent bg-transparent focus:ring-0 w-full h-full p-1">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option: { value: string; label: string }) => (
          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
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

const DebouncedInput = ({
  value: initialValue,
  onChange,
  debounce = 500,
  ...props
}: {
  value: string | number
  onChange: (value: string | number) => void
  debounce?: number
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) => {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value)
    }, debounce)

    return () => clearTimeout(timeout)
  }, [value])

  return (
    <Input {...props} value={value} onChange={e => setValue(e.target.value)} />
  )
}

const InventorySheet = ({ category }: { category: string }) => {
  const { 
    inventoryItems, 
    projects, 
    can, 
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
  } = useAppContext();
  
  const { toast } = useToast();
  const [rowSelection, setRowSelection] = useState({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const data = useMemo(() => {
    return (inventoryItems || []).filter(i => i.name === category && !i.isArchived);
  }, [category, inventoryItems]);

  const columns = useMemo<ColumnDef<InventoryItem>[]>(() => {
    const projectOptions = projects.map(p => ({ value: p.id, label: p.name }));
    const statusOptionsMapped = statusOptions.map(s => ({ value: s, label: s }));
    
    const FilterableHeader = ({ title, column }: { title: string, column: any }) => (
      <div className="flex flex-col gap-1">
        <span>{title}</span>
        <DebouncedInput
          value={column.getFilterValue() as string ?? ''}
          onChange={value => column.setFilterValue(String(value))}
          placeholder={`Search...`}
          className="h-7"
        />
      </div>
    );
    
    const SelectFilterHeader = ({ title, column, options }: { title: string, column: any, options: {value: string, label: string}[]}) => (
       <div className="flex flex-col gap-1">
          <span>{title}</span>
          <Select value={(column.getFilterValue() as string) ?? 'all'} onValueChange={value => column.setFilterValue(value === 'all' ? undefined : value)}>
            <SelectTrigger className="h-7 w-full"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
      </div>
    );

    let baseColumns: ColumnDef<InventoryItem>[] = [
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
      { accessorKey: 'serialNumber', header: ({column}) => <FilterableHeader title="Serial No." column={column} />, cell: EditableCell },
      { accessorKey: 'ariesId', header: ({column}) => <FilterableHeader title="Aries ID" column={column} />, cell: EditableCell },
      { accessorKey: 'erpId', header: ({column}) => <FilterableHeader title="ERP ID" column={column} />, cell: EditableCell },
      { accessorKey: 'certification', header: ({column}) => <FilterableHeader title="Certification" column={column} />, cell: EditableCell },
      { 
        accessorKey: 'projectId', 
        header: ({column}) => <SelectFilterHeader title="Project" column={column} options={projectOptions} />, 
        cell: (props) => <SelectCell {...props} options={projectOptions} placeholder="Select Project" />
      },
      { accessorKey: 'plantUnit', header: ({column}) => <FilterableHeader title="Plant/Unit" column={column} />, cell: EditableCell },
      { 
        accessorKey: 'status', 
        header: ({column}) => <SelectFilterHeader title="Status" column={column} options={statusOptionsMapped} />, 
        cell: (props) => <SelectCell {...props} options={statusOptionsMapped} />
      },
      { accessorKey: 'purchaseDate', header: 'Purchase Date', cell: DateCell },
      { accessorKey: 'inspectionDueDate', header: 'Insp. Due', cell: DateCell },
      { accessorKey: 'tpInspectionDueDate', header: 'TP Insp. Due', cell: DateCell },
      { accessorKey: 'certificateUrl', header: ({column}) => <FilterableHeader title="TP Cert Link" column={column} />, cell: EditableCell },
      { accessorKey: 'inspectionCertificateUrl', header: ({column}) => <FilterableHeader title="Insp Cert Link" column={column} />, cell: EditableCell },
      { accessorKey: 'remarks', header: ({column}) => <FilterableHeader title="Remarks" column={column} />, cell: EditableCell },
      { accessorKey: 'lastUpdated', header: 'Last Updated', cell: ({ getValue }) => {
          const value = getValue() as string;
          if (!value) return 'N/A';
          try {
              return format(parseISO(value), 'dd-MM-yy HH:mm');
          } catch {
              return 'Invalid Date';
          }
      }},
    ];
    if (category.toLowerCase() === 'harness') {
      baseColumns.splice(3, 0, { accessorKey: 'chestCrollNo', header: ({column}) => <FilterableHeader title="Chest Croll No." column={column} />, cell: EditableCell });
    }
    return baseColumns;
  }, [category, projects]);

  const table = useReactTable({
    data,
    columns,
    state: {
      rowSelection,
      columnFilters,
    },
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    meta: {
      updateData: (rowIndex: number, columnId: string, value: any) => {
        const itemToUpdate = table.getRow(rowIndex.toString()).original;
        updateInventoryItem({ ...itemToUpdate, [columnId]: value });
      },
    },
  });
  
  const handleAddRow = () => {
    addInventoryItem({
      name: category,
      serialNumber: `NEW-${Math.floor(Math.random() * 10000)}`,
      status: 'In Store',
      projectId: projects[0]?.id || '',
      isArchived: false,
    });
  };

  const handleDeleteSelected = () => {
    const selectedIds = table.getSelectedRowModel().rows.map(row => row.original.id);
    if(selectedIds.length === 0) {
        toast({ title: "No rows selected", variant: 'destructive'});
        return;
    }
    selectedIds.forEach(id => deleteInventoryItem(id));
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
                    <TableHead key={header.id} className="p-1 align-top">
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
