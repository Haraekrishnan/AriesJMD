'use client';
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
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
import { PlusCircle, Trash2, CheckCircle, Settings, Save, ArrowUp, ArrowDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { isPast, parseISO, isValid, format, parse } from 'date-fns';
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
  const { updateData, setActiveCell } = table.options.meta;

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const onBlur = () => {
    if (value !== initialValue) {
      updateData(row.index, column.id, value);
    }
  };

  const onFocus = () => {
    setActiveCell({ row: row.index, columnId: column.id });
  };

  return (
    <Input
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={onBlur}
      onFocus={onFocus}
      disabled={!isEditable}
      className="w-full h-full border-transparent bg-transparent focus:bg-white focus:border focus:ring-1 focus:ring-ring p-1"
    />
  );
};

const SelectCell = ({ getValue, row, column, table, options, placeholder }: any) => {
  const initialValue = getValue();
  const { can } = useAppContext();
  const isEditable = can.manage_inventory_database;
  const { setActiveCell, updateData } = table.options.meta;

  const onFocus = () => {
    setActiveCell({ row: row.index, columnId: column.id });
  };

  return (
    <div onFocus={onFocus}>
        <Select
            value={initialValue || ''}
            onValueChange={value => updateData(row.index, column.id, value)}
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
    </div>
  );
};

const DateCell = ({ getValue, row, column, table }: any) => {
  const initialValue = getValue();
  const { can } = useAppContext();
  const isEditable = can.manage_inventory_database;
  const dateValue = initialValue ? parseISO(initialValue) : undefined;
  const { setActiveCell, updateData } = table.options.meta;

  const isExpired = dateValue && isPast(dateValue);
  
  const onFocus = () => {
    setActiveCell({ row: row.index, columnId: column.id });
  };

  return (
    <div className={cn(isExpired && "text-destructive font-bold")} onFocus={onFocus}>
      <DatePickerInput
        value={isValid(dateValue) ? dateValue : undefined}
        onChange={date => updateData(row.index, column.id, date ? date.toISOString() : null)}
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
  }, [value, onChange, debounce])

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
    batchUpdateInventoryItems,
    deleteInventoryItem,
  } = useAppContext();
  
  const { toast } = useToast();
  const [rowSelection, setRowSelection] = useState({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [activeCell, setActiveCell] = useState<{row: number, columnId: string} | null>(null);
  const [selection, setSelection] = useState<{
    start: { row: number, col: number } | null;
    end: { row: number, col: number } | null;
  }>({ start: null, end: null });
  const [isSelecting, setIsSelecting] = useState(false);

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
          value={(column.getFilterValue() as string) ?? ''}
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
        const itemToUpdate = table.getRowModel().rows[rowIndex].original;
        updateInventoryItem({ ...itemToUpdate, [columnId]: value });
      },
      setActiveCell: setActiveCell,
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

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    if (!activeCell || !isEditable) return;
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const rows = pastedText.split('\n').filter(r => r.trim() !== '');

    const startRowIndex = activeCell.row;
    const allTableColumns = table.getAllLeafColumns();
    const startColumnIndex = allTableColumns.findIndex(c => c.id === activeCell.columnId);

    if (startColumnIndex === -1) return;

    const updatesById: { [key: string]: { id: string; data: Partial<InventoryItem> } } = {};

    rows.forEach((row, rowIndex) => {
        const cells = row.split('\t');
        const targetRowIndex = startRowIndex + rowIndex;
        const targetRow = table.getRowModel().rows[targetRowIndex];

        if (targetRow) {
            const originalItemId = targetRow.original.id;
            if (!updatesById[originalItemId]) {
                updatesById[originalItemId] = { id: originalItemId, data: {} };
            }

            cells.forEach((cellValue, colIndex) => {
                const targetColumnIndex = startColumnIndex + colIndex;
                if (targetColumnIndex < allTableColumns.length) {
                    const column = allTableColumns[targetColumnIndex];
                    const columnId = column.id;
                    if (columnId && columnId !== 'select') {
                        let processedValue: any = cellValue.trim();
                        
                        if (column.id === 'projectId') {
                            const project = projects.find(p => p.name.toLowerCase() === processedValue.toLowerCase());
                            processedValue = project ? project.id : null;
                        } else if (column.id?.includes('Date')) {
                             const parsedDate = parse(processedValue, 'dd-MM-yyyy', new Date());
                             processedValue = isValid(parsedDate) ? parsedDate.toISOString() : null;
                        }

                        (updatesById[originalItemId].data as any)[columnId] = processedValue;
                    }
                }
            });
        }
    });
    
    const batchUpdates = Object.values(updatesById);
    if(batchUpdates.length > 0) {
        batchUpdateInventoryItems(batchUpdates);
        toast({ title: 'Paste Complete', description: `${batchUpdates.length} rows updated.` });
    }
  }, [activeCell, table, batchUpdateInventoryItems, toast, projects, isEditable]);

  const handleMouseDown = (rowIndex: number, colIndex: number) => {
    setIsSelecting(true);
    setSelection({ start: { row: rowIndex, col: colIndex }, end: { row: rowIndex, col: colIndex } });
  };

  const handleMouseEnter = (rowIndex: number, colIndex: number) => {
    if (isSelecting) {
      setSelection(prev => ({ ...prev, end: { row: rowIndex, col: colIndex } }));
    }
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
  };

  const isCellSelected = (rowIndex: number, colIndex: number) => {
    if (!selection.start || !selection.end) return false;
    
    const visibleColumns = table.getVisibleLeafColumns();
    const startCol = selection.start.col < 0 ? 0 : selection.start.col;
    const endCol = selection.end.col < 0 ? 0 : selection.end.col;
    
    const minRow = Math.min(selection.start.row, selection.end.row);
    const maxRow = Math.max(selection.start.row, selection.end.row);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);

    return rowIndex >= minRow && rowIndex <= maxRow && colIndex >= minCol && colIndex <= maxCol;
  };

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
        <div onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onPaste={handlePaste}>
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
                    {table.getRowModel().rows.map((row, rowIndex) => (
                    <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                        {row.getVisibleCells().map((cell, colIndex) => (
                        <TableCell 
                            key={cell.id} 
                            onMouseDown={() => handleMouseDown(row.index, colIndex)}
                            onMouseEnter={() => handleMouseEnter(row.index, colIndex)}
                            className={cn(
                                "p-0",
                                activeCell?.row === row.index && activeCell?.columnId === cell.column.id && "ring-2 ring-ring ring-offset-2 z-10",
                                isCellSelected(rowIndex, colIndex) && "bg-blue-100 dark:bg-blue-800/50"
                            )}
                        >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                        ))}
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};

export default InventorySheet;
