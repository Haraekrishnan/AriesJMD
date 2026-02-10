
'use client';
import React, { useEffect, useMemo, useState, useCallback, useRef, MouseEvent } from 'react';
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
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { PlusCircle, Trash2, CheckCircle, Settings, Save, ArrowUp, ArrowDown, Download, ArrowUpDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { isPast, parseISO, isValid, format, parse } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import type { InventoryItem, InventoryItemStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardContent } from '../ui/card';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Label } from '../ui/label';

// --- DEBOUNCE UTILITY ---
function debounce<T extends (...args: any[]) => void>(func: T, delay: number): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout>;
    return function(this: ThisParameterType<T>, ...args: Parameters<T>) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

const statusOptions: InventoryItemStatus[] = ['In Use', 'In Store', 'Damaged', 'Expired', 'Moved to another project', 'Quarantine'];

const statusColorMap: Record<string, string> = {
    'In Use': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 font-bold',
    'In Store': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 font-bold',
    'Expired': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 font-bold',
    'Damaged': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200 font-bold',
    'Quarantine': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200 font-bold',
    'Moved to another project': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 font-bold',
};


const EditableCell = React.memo(({ getValue, row, column, table }: any) => {
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
        className={cn(
            "w-full h-full border-transparent bg-transparent focus:bg-white dark:focus:bg-slate-800 focus:border focus:ring-1 focus:ring-ring p-1",
            !isEditable && "opacity-60 cursor-not-allowed"
        )}
      />
    );
});
EditableCell.displayName = 'EditableCell';

const SelectCell = React.memo(({ getValue, row, column, table, options, placeholder }: any) => {
    const initialValue = getValue();
    const { can } = useAppContext();
    const isEditable = can.manage_inventory_database;
    const { setActiveCell, updateData } = table.options.meta;
    const status = column.id === 'status' ? getValue() as InventoryItemStatus : null;
  
    const onFocus = () => {
      setActiveCell({ row: row.index, columnId: column.id });
    };
  
    return (
      <div onFocus={onFocus} className={cn("w-full h-full", status && statusColorMap[status])}>
          <Select
              value={initialValue || ''}
              onValueChange={value => updateData(row.index, column.id, value)}
              disabled={!isEditable}
          >
              <SelectTrigger className={cn(
                "border-transparent bg-transparent focus:ring-0 w-full h-full p-1",
                !isEditable && "opacity-60 cursor-not-allowed"
              )}>
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
});
SelectCell.displayName = 'SelectCell';

const DateCell = React.memo(({ getValue, row, column, table }: any) => {
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
          className={cn(!isEditable && "opacity-60 cursor-not-allowed")}
        />
      </div>
    );
});
DateCell.displayName = 'DateCell';
  

const DebouncedInput = ({
  value: initialValue,
  onChange,
  debounce: debounceTime = 500,
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
    }, debounceTime)

    return () => clearTimeout(timeout)
  }, [value, onChange, debounceTime])

  return (
    <Input {...props} value={value} onChange={e => setValue(e.target.value)} />
  )
}

const InventorySheet = ({ category }: { category: string }) => {
  const { 
    inventoryItems: dataFromContext, 
    projects, 
    can, 
    batchAddInventoryItems,
    batchUpdateInventoryItems,
    batchDeleteInventoryItems
  } = useAppContext();

  const [localData, setLocalData] = useState<InventoryItem[]>([]);

  useEffect(() => {
    setLocalData(dataFromContext.filter(i => i.name === category && !i.isArchived));
  }, [dataFromContext, category]);
  
  const { toast } = useToast();
  const [rowSelection, setRowSelection] = useState({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [activeCell, setActiveCell] = useState<{row: number, columnId: string} | null>(null);
  const [selection, setSelection] = useState<{
    start: { row: number, col: number } | null;
    end: { row: number, col: number } | null;
  }>({ start: null, end: null });
  const [isSelecting, setIsSelecting] = useState(false);
  const [isAddRowsDialogOpen, setIsAddRowsDialogOpen] = useState(false);
  const [numRowsToAdd, setNumRowsToAdd] = useState(1);
  
  const { updateInventoryItem } = useAppContext();
  
  const debouncedUpdate = useRef(
      debounce((item: InventoryItem) => {
          updateInventoryItem(item);
      }, 500)
  ).current;

  const columns = useMemo<ColumnDef<InventoryItem>[]>(() => {
    const projectOptions = projects.map(p => ({ value: p.id, label: p.name }));
    const statusOptionsMapped = statusOptions.map(s => ({ value: s, label: s }));
    
    const FilterableHeader = ({ title, column }: { title: string, column: any }) => (
      <div className="flex flex-col gap-1">
        <span
          className="cursor-pointer flex items-center"
          onClick={column.getToggleSortingHandler()}
        >
          {title}
          {{
            asc: <ArrowUp className="ml-2 h-4 w-4" />,
            desc: <ArrowDown className="ml-2 h-4 w-4" />,
          }[column.getIsSorted() as string] ?? <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />}
        </span>
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
          <span
            className="cursor-pointer flex items-center"
            onClick={column.getToggleSortingHandler()}
          >
            {title}
            {{
              asc: <ArrowUp className="ml-2 h-4 w-4" />,
              desc: <ArrowDown className="ml-2 h-4 w-4" />,
            }[column.getIsSorted() as string] ?? <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />}
          </span>
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
        size: 60,
      },
      {
        id: 'slNo',
        header: 'Sl. No.',
        cell: () => null, // Content rendered in the body mapping
        size: 60,
      },
      { accessorKey: 'serialNumber', header: ({column}) => <FilterableHeader title="Serial No." column={column} />, cell: EditableCell, size: 200 },
      { accessorKey: 'ariesId', header: ({column}) => <FilterableHeader title="Aries ID" column={column} />, cell: EditableCell, size: 150 },
      { accessorKey: 'erpId', header: ({column}) => <FilterableHeader title="ERP ID" column={column} />, cell: EditableCell, size: 150 },
      { accessorKey: 'certification', header: ({column}) => <FilterableHeader title="Certification" column={column} />, cell: EditableCell, size: 150 },
      { 
        accessorKey: 'projectId', 
        header: ({column}) => <SelectFilterHeader title="Project" column={column} options={projectOptions} />, 
        cell: (props) => <SelectCell {...props} options={projectOptions} placeholder="Select Project" />,
        size: 200,
      },
      { accessorKey: 'plantUnit', header: ({column}) => <FilterableHeader title="Plant/Unit" column={column} />, cell: EditableCell, size: 150 },
      { 
        accessorKey: 'status', 
        header: ({column}) => <SelectFilterHeader title="Status" column={column} options={statusOptionsMapped} />, 
        cell: (props) => <SelectCell {...props} options={statusOptionsMapped} />,
        size: 180,
      },
      { accessorKey: 'purchaseDate', header: ({column}) => <FilterableHeader title="Purchase Date" column={column} />, cell: DateCell, size: 150 },
      { accessorKey: 'inspectionDueDate', header: ({column}) => <FilterableHeader title="Insp. Due" column={column} />, cell: DateCell, size: 150 },
      { accessorKey: 'tpInspectionDueDate', header: ({column}) => <FilterableHeader title="TP Insp. Due" column={column} />, cell: DateCell, size: 150 },
      { accessorKey: 'certificateUrl', header: ({column}) => <FilterableHeader title="TP Cert Link" column={column} />, cell: EditableCell, size: 250 },
      { accessorKey: 'inspectionCertificateUrl', header: ({column}) => <FilterableHeader title="Insp Cert Link" column={column} />, cell: EditableCell, size: 250 },
      { accessorKey: 'remarks', header: ({column}) => <FilterableHeader title="Remarks" column={column} />, cell: EditableCell, size: 300 },
      { accessorKey: 'lastUpdated', header: ({column}) => <FilterableHeader title="Last Updated" column={column} />, cell: ({ getValue }) => {
          const value = getValue() as string;
          if (!value) return 'N/A';
          try {
              return format(parseISO(value), 'dd-MM-yy HH:mm');
          } catch {
              return 'Invalid Date';
          }
      }, size: 150 },
    ];
    if (category.toLowerCase() === 'harness') {
      baseColumns.splice(4, 0, { accessorKey: 'chestCrollNo', header: ({column}) => <FilterableHeader title="Chest Croll No." column={column} />, cell: EditableCell, size: 150 });
    }
    return baseColumns;
  }, [category, projects]);

  const table = useReactTable({
    data: localData,
    columns,
    columnResizeMode: 'onChange',
    state: {
      rowSelection,
      columnFilters,
      sorting,
    },
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    meta: {
      updateData: (rowIndex: number, columnId: string, value: any) => {
        setLocalData(old => {
          const newData = old.map((row, index) => {
            if (index === rowIndex) {
              const updatedRow = {
                ...row,
                [columnId]: value,
                lastUpdated: new Date().toISOString(),
              };
              debouncedUpdate(updatedRow);
              return updatedRow;
            }
            return row;
          });
          return newData;
        });
      },
      setActiveCell: setActiveCell,
    },
  });
  
  const handleAddMultipleRows = () => {
    if (numRowsToAdd > 0) {
        const newItems: Omit<InventoryItem, 'id' | 'lastUpdated'>[] = [];
        for (let i = 0; i < numRowsToAdd; i++) {
            newItems.push({
                name: category,
                serialNumber: `NEW-${Date.now()}-${i}`,
                status: 'In Store',
                projectId: projects.find(p => p.name === 'Store')?.id || projects[0]?.id || '',
                isArchived: false,
            });
        }
        batchAddInventoryItems(newItems);
        toast({ title: `${numRowsToAdd} rows added successfully.` });
        setNumRowsToAdd(1);
        setIsAddRowsDialogOpen(false);
    }
  };

  const handleDeleteSelected = () => {
    const selectedIds = table.getSelectedRowModel().rows.map(row => row.original.id);
    if(selectedIds.length === 0) {
        toast({ title: "No rows selected", variant: 'destructive'});
        return;
    }
    batchDeleteInventoryItems(selectedIds);
    setRowSelection({});
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
    
    const rowModel = table.getRowModel().rows;
    const updatesById: { [key: string]: { id: string; data: Partial<InventoryItem> } } = {};

    rows.forEach((row, rowIndex) => {
        const cells = row.split('\t');
        const targetRowIndex = startRowIndex + rowIndex;
        const targetRow = rowModel[targetRowIndex];

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
                    if (columnId && columnId !== 'select' && columnId !== 'slNo') {
                        let processedValue: any = cellValue.trim();
                        
                        if (column.id === 'projectId') {
                            const project = projects.find(p => p.name.toLowerCase() === processedValue.toLowerCase());
                            processedValue = project ? project.id : null;
                        } else if (column.id?.toLowerCase().includes('date')) {
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
    
    const minRow = Math.min(selection.start.row, selection.end.row);
    const maxRow = Math.max(selection.start.row, selection.end.row);
    const minCol = Math.min(selection.start.col, selection.end.col);
    const maxCol = Math.max(selection.start.col, selection.end.col);

    return rowIndex >= minRow && rowIndex <= maxRow && colIndex >= minCol && colIndex <= maxCol;
  };

  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, rowIndex: number, colIndex: number) => {
    const { key } = e;
    const rows = table.getRowModel().rows;
    const cols = table.getVisibleLeafColumns();

    let nextRow = rowIndex;
    let nextCol = colIndex;

    switch(key) {
        case 'ArrowUp': nextRow = Math.max(0, rowIndex - 1); break;
        case 'ArrowDown': nextRow = Math.min(rows.length - 1, rowIndex + 1); break;
        case 'ArrowLeft': nextCol = Math.max(0, colIndex - 1); break;
        case 'ArrowRight': nextCol = Math.min(cols.length - 1, colIndex + 1); break;
        case 'Tab':
            e.preventDefault();
            nextCol = e.shiftKey ? Math.max(0, colIndex - 1) : Math.min(cols.length - 1, colIndex + 1);
            break;
        default: return;
    }
    
    const cellId = `cell-${rows[nextRow].id}-${cols[nextCol].id}`;
    const element = document.getElementById(cellId)?.querySelector('input, button, select');
    (element as HTMLElement)?.focus();
  };

  const handleExport = async () => {
    const rows = table.getRowModel().rows;
    if (rows.length === 0) {
      toast({
        variant: "destructive",
        title: "No data to export",
        description: "The current view is empty.",
      });
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const sheetName = category.replace(/[\\/*?:]/g, "").substring(0, 31);
    const worksheet = workbook.addWorksheet(sheetName);

    const visibleColumns = table
      .getVisibleLeafColumns()
      .filter((col) => col.id !== "select");

    worksheet.columns = visibleColumns.map((col) => {
        let headerText = col.id
          .replace(/([A-Z])/g, ' $1')
          .replace(/_/g, ' ')
          .replace(/^./, (str) => str.toUpperCase());
        return { header: headerText, key: col.id, width: 25 };
    });

    const dataToExport = rows.map((row, rowIndex) => {
        const rowData: {[key: string]: any} = {};
        visibleColumns.forEach(col => {
            const columnId = col.id as keyof InventoryItem;
            let value = row.original[columnId];

            if (columnId === 'slNo') {
              rowData[col.id] = rowIndex + 1;
              return;
            }

            if (columnId === 'projectId') {
                value = projects.find(p => p.id === value)?.name || value;
            } else if (String(columnId).toLowerCase().includes('date') && typeof value === 'string') {
                try {
                    value = format(parseISO(value), 'dd-MM-yyyy');
                } catch (e) {
                    // keep original value if parsing fails
                }
            }
            
            rowData[col.id] = value ?? '';
        });
        return rowData;
    });

    worksheet.addRows(dataToExport);

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }
    };
    worksheet.getRow(1).border = {
        bottom: { style: 'thin' }
    };


    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${category}_Inventory.xlsx`);
    toast({ title: "Export Complete" });
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <div/>
        <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleExport} variant="outline"><Download className="mr-2 h-4 w-4"/> Export Excel</Button>
            <span className="text-xs text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" /> All changes are saved automatically.
            </span>
            {isEditable && (
                <>
                <Button size="sm" onClick={() => setIsAddRowsDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4"/> Add Rows</Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" disabled={table.getSelectedRowModel().rows.length === 0}><Trash2 className="mr-2 h-4 w-4"/> Delete Selected</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action will permanently delete the selected rows. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
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
            <ScrollArea className="h-[60vh] w-full border rounded-md">
                <div className="relative" style={{ width: table.getCenterTotalSize() }}>
                    <Table>
                    <TableHeader className="sticky top-0 z-20 bg-card">
                        {table.getHeaderGroups().map(headerGroup => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map(header => (
                            <TableHead key={header.id} className={cn("relative p-1 align-top bg-card", header.column.id === 'select' && 'sticky left-0 z-10', header.column.id === 'slNo' && 'sticky left-[60px] z-10', header.column.id === 'serialNumber' && 'sticky left-[120px] z-10')} style={{width: header.getSize()}}>
                                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                <div
                                    onMouseDown={header.getResizeHandler()}
                                    onTouchStart={header.getResizeHandler()}
                                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none"
                                />
                            </TableHead>
                            ))}
                        </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows.map((row, rowIndex) => (
                        <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className={cn(rowIndex % 2 === 0 ? "bg-muted/30" : "bg-card", row.getIsSelected() && "bg-blue-100 dark:bg-blue-900")}>
                            {row.getVisibleCells().map((cell, colIndex) => (
                            <TableCell 
                                key={cell.id}
                                id={`cell-${row.id}-${cell.column.id}`}
                                onMouseDown={() => handleMouseDown(row.index, colIndex)}
                                onMouseEnter={() => handleMouseEnter(row.index, colIndex)}
                                onKeyDown={(e) => handleCellKeyDown(e, row.index, colIndex)}
                                className={cn(
                                    "p-0 h-10 text-center",
                                    { 'sticky left-0 z-10': cell.column.id === 'select' },
                                    { 'sticky left-[60px] z-10': cell.column.id === 'slNo' },
                                    { 'sticky left-[120px] z-10': cell.column.id === 'serialNumber' },
                                    cell.column.id === 'select' && (rowIndex % 2 === 0 ? 'bg-muted/30' : 'bg-card'),
                                    cell.column.id === 'slNo' && (rowIndex % 2 === 0 ? 'bg-muted/30' : 'bg-card'),
                                    cell.column.id === 'serialNumber' && (rowIndex % 2 === 0 ? 'bg-muted/30' : 'bg-card'),
                                    row.getIsSelected() && 'bg-blue-100 dark:bg-blue-900',
                                    activeCell?.row === row.index && activeCell?.columnId === cell.column.id && "ring-2 ring-ring ring-offset-2 z-20",
                                    isCellSelected(rowIndex, colIndex) && "bg-blue-200 dark:bg-blue-800/50"
                                )}
                                style={{width: cell.column.getSize()}}
                            >
                                {cell.column.id === 'slNo' 
                                    ? rowIndex + 1 
                                    : flexRender(cell.column.columnDef.cell, cell.getContext())
                                }
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
         <AlertDialog open={isAddRowsDialogOpen} onOpenChange={setIsAddRowsDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Add New Rows</AlertDialogTitle>
                    <AlertDialogDescription>
                        How many blank rows would you like to add to the end of the sheet?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                    <Label htmlFor="num-rows">Number of Rows</Label>
                    <Input
                        id="num-rows"
                        type="number"
                        value={numRowsToAdd}
                        onChange={(e) => setNumRowsToAdd(Math.max(1, parseInt(e.target.value) || 1))}
                        min="1"
                        autoFocus
                    />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleAddMultipleRows}>Add Rows</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default InventorySheet;

    