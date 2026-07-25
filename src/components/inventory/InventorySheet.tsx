'use client';
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { useInventory } from '@/contexts/inventory-provider';
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
import { 
    PlusCircle, Trash2, CheckCircle, Save, ArrowUp, ArrowDown, Download, 
    ArrowUpDown, Database, Link as LinkIcon, ExternalLink, Hammer, MoreHorizontal, Edit, ShieldQuestion 
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { format, parseISO, isValid, parse, isPast } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import type { InventoryItem, InventoryItemStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Label } from '../ui/label';
import EditItemDialog from './EditItemDialog';
import NewCertificateRequestDialog from './NewCertificateRequestDialog';

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
    const { can } = useAuth();
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
            "w-full h-full border-transparent bg-transparent focus:bg-white dark:focus:bg-slate-800 focus:border focus:ring-1 focus:ring-ring p-1 text-sm font-medium",
            !isEditable && "opacity-60 cursor-not-allowed"
        )}
      />
    );
});
EditableCell.displayName = 'EditableCell';

const SelectCell = React.memo(({ getValue, row, column, table, options, placeholder }: any) => {
    const initialValue = getValue();
    const { can } = useAuth();
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
                "border-transparent bg-transparent focus:ring-0 w-full h-full p-1 text-xs font-bold",
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
    const { can } = useAuth();
    const isEditable = can.manage_inventory_database;
    const dateValue = initialValue ? parseISO(initialValue) : undefined;
    const { setActiveCell, updateData } = table.options.meta;
  
    const isExpired = dateValue && isPast(dateValue);
    
    const onFocus = () => {
      setActiveCell({ row: row.index, columnId: column.id });
    };
  
    return (
      <div className={cn("h-full", isExpired && "text-destructive font-bold")} onFocus={onFocus}>
        <DatePickerInput
          value={isValid(dateValue) ? dateValue : undefined}
          onChange={date => updateData(row.index, column.id, date ? date.toISOString() : null)}
          disabled={!isEditable}
          className={cn("h-full border-none shadow-none focus-visible:ring-0", !isEditable && "opacity-60 cursor-not-allowed")}
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
  const { can, user } = useAuth();
  const { projects } = useGeneral();
  const { 
    inventoryItems: dataFromContext, 
    batchAddInventoryItems,
    batchUpdateInventoryItems,
    batchDeleteInventoryItems,
    updateInventoryItem,
    damageReports
  } = useInventory();

  const [localData, setLocalData] = useState<InventoryItem[]>([]);
  const [editingItem, setSelectedItemForEdit] = useState<InventoryItem | null>(null);
  const [certRequestItem, setCertRequestItem] = useState<InventoryItem | null>(null);

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
  
  const debouncedUpdate = useRef(
      debounce((item: InventoryItem) => {
          updateInventoryItem(item);
      }, 500)
  ).current;

  const columns = useMemo<ColumnDef<InventoryItem>[]>(() => {
    const projectOptions = projects.map(p => ({ value: p.id, label: p.name }));
    const statusOptionsMapped = statusOptions.map(s => ({ value: s, label: s }));
    
    const FilterableHeader = ({ title, column }: { title: string, column: any }) => (
      <div className="flex flex-col gap-1 py-1">
        <span
          className="cursor-pointer flex items-center text-[10px] uppercase font-black tracking-widest text-slate-500"
          onClick={column.getToggleSortingHandler()}
        >
          {title}
          {{
            asc: <ArrowUp className="ml-1 h-3 w-3" />,
            desc: <ArrowDown className="ml-1 h-3 w-3" />,
          }[column.getIsSorted() as string] ?? <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />}
        </span>
        <DebouncedInput
          value={(column.getFilterValue() as string) ?? ''}
          onChange={value => column.setFilterValue(String(value))}
          placeholder={`Filter...`}
          className="h-7 text-[10px] px-2"
        />
      </div>
    );
    
    const SelectFilterHeader = ({ title, column, options }: { title: string, column: any, options: {value: string, label: string}[]}) => (
       <div className="flex flex-col gap-1 py-1">
          <span
            className="cursor-pointer flex items-center text-[10px] uppercase font-black tracking-widest text-slate-500"
            onClick={column.getToggleSortingHandler()}
          >
            {title}
            {{
              asc: <ArrowUp className="ml-1 h-3 w-3" />,
              desc: <ArrowDown className="ml-1 h-3 w-3" />,
            }[column.getIsSorted() as string] ?? <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />}
          </span>
          <Select value={(column.getFilterValue() as string) ?? 'all'} onValueChange={value => column.setFilterValue(value === 'all' ? undefined : value)}>
            <SelectTrigger className="h-7 w-full text-[10px] px-2"><SelectValue placeholder="All" /></SelectTrigger>
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
          <div className="flex items-center justify-center h-full">
            <Checkbox
                checked={table.getIsAllPageRowsSelected()}
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center h-full">
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
      },
      {
        id: 'slNo',
        header: () => <div className="text-[10px] uppercase font-black tracking-widest text-slate-500 text-center">SL</div>,
        cell: ({ row }) => <div className="text-center font-bold text-slate-400">{row.index + 1}</div>,
        size: 50,
      },
      { accessorKey: 'serialNumber', header: ({column}) => <FilterableHeader title="SERIAL NO." column={column} />, cell: EditableCell, size: 180 },
      { accessorKey: 'ariesId', header: ({column}) => <FilterableHeader title="ARIES ID" column={column} />, cell: EditableCell, size: 130 },
      { 
        accessorKey: 'status', 
        header: ({column}) => <SelectFilterHeader title="STATUS" column={column} options={statusOptionsMapped} />, 
        cell: (props) => <SelectCell {...props} options={statusOptionsMapped} />,
        size: 160,
      },
      { 
        accessorKey: 'projectId', 
        header: ({column}) => <SelectFilterHeader title="LOCATION" column={column} options={projectOptions} />, 
        cell: (props) => <SelectCell {...props} options={projectOptions} placeholder="Select Location" />,
        size: 180,
      },
      { accessorKey: 'transferDate', header: ({column}) => <FilterableHeader title="TRANSFER DATE" column={column} />, cell: DateCell, size: 140 },
      { accessorKey: 'inspectionDueDate', header: ({column}) => <FilterableHeader title="INSP. DUE" column={column} />, cell: DateCell, size: 140 },
      { accessorKey: 'tpInspectionDueDate', header: ({column}) => <FilterableHeader title="TP INSP. DUE" column={column} />, cell: DateCell, size: 140 },
      { accessorKey: 'lastUpdated', header: ({column}) => <FilterableHeader title="LAST UPDATED" column={column} />, cell: ({ getValue }) => {
          const value = getValue() as string;
          if (!value) return <span className="text-[10px] text-slate-400 italic">N/A</span>;
          try {
              return <span className="text-[10px] font-medium text-slate-500">{format(parseISO(value), 'dd-MM-yy HH:mm')}</span>;
          } catch {
              return <span className="text-[10px] text-rose-500">Error</span>;
          }
      }, size: 130 },
      { 
        id: 'tpCert',
        header: () => <div className="text-[10px] uppercase font-black tracking-widest text-slate-500 text-center">TP CERT.</div>,
        cell: ({ row }) => (
            <div className="flex justify-center">
                {row.original.certificateUrl ? (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button asChild variant="ghost" size="icon" className="h-7 w-7 text-blue-600">
                                    <a href={row.original.certificateUrl} target="_blank" rel="noopener noreferrer"><LinkIcon className="h-3.5 w-3.5" /></a>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Open TP Cert</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ) : <span className="text-[10px] text-slate-300">-</span>}
            </div>
        ),
        size: 80,
      },
      { 
        id: 'inspCert',
        header: () => <div className="text-[10px] uppercase font-black tracking-widest text-slate-500 text-center">INSP. CERT.</div>,
        cell: ({ row }) => (
            <div className="flex justify-center">
                {row.original.inspectionCertificateUrl ? (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button asChild variant="ghost" size="icon" className="h-7 w-7 text-green-600">
                                    <a href={row.original.inspectionCertificateUrl} target="_blank" rel="noopener noreferrer"><CheckCircle className="h-3.5 w-3.5" /></a>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Open Inspection Cert</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ) : <span className="text-[10px] text-slate-300">-</span>}
            </div>
        ),
        size: 80,
      },
      { 
        id: 'damageReport',
        header: () => <div className="text-[10px] uppercase font-black tracking-widest text-slate-500 text-center">DAMAGE REPORT</div>,
        cell: ({ row }) => {
            const report = damageReports.find(dr => dr.itemId === row.original.id);
            const link = report?.attachmentDownloadUrl || report?.attachmentOriginalUrl;
            return (
                <div className="flex justify-center">
                    {link ? (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button asChild variant="ghost" size="icon" className="h-7 w-7 text-red-500">
                                        <a href={link} target="_blank" rel="noopener noreferrer"><Hammer className="h-3.5 w-3.5" /></a>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Damage Report</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ) : <span className="text-[10px] text-slate-300">-</span>}
                </div>
            );
        },
        size: 100,
      },
      {
        id: 'actions',
        header: () => <div className="text-[10px] uppercase font-black tracking-widest text-slate-500 text-center">ACTIONS</div>,
        cell: ({ row }) => (
            <div className="flex justify-center">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {can.manage_inventory && (
                            <>
                                <DropdownMenuItem onSelect={() => setSelectedItemForEdit(row.original)}><Edit className="mr-2 h-4 w-4"/>Edit Details</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => updateInventoryItem({ ...row.original, lastUpdated: new Date().toISOString() })}><CheckCircle className="mr-2 h-4 w-4"/>Verify Status</DropdownMenuItem>
                            </>
                        )}
                        <DropdownMenuItem onSelect={() => setCertRequestItem(row.original)}><ShieldQuestion className="mr-2 h-4 w-4"/>Request Cert</DropdownMenuItem>
                        {user?.role === 'Admin' && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete Item</DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Confirm Deletion</AlertDialogTitle><AlertDialogDescription>Permanently remove item with SN: {row.original.serialNumber}?</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => batchDeleteInventoryItems([row.original.id])} className="bg-destructive">Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        ),
        size: 80,
      }
    ];

    if (category.toLowerCase() === 'harness') {
      baseColumns.splice(4, 0, { accessorKey: 'chestCrollNo', header: ({column}) => <FilterableHeader title="CHEST CROLL NO." column={column} />, cell: EditableCell, size: 130 });
    }
    return baseColumns;
  }, [category, projects, damageReports, can.manage_inventory, user, updateInventoryItem, batchDeleteInventoryItems]);

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
  
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    if (!activeCell || !can.manage_inventory_database) return;
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const rows = pastedText.split(/\r?\n/).filter(r => r.trim() !== '');

    const startRowIndex = activeCell.row;
    const allTableColumns = table.getVisibleLeafColumns();
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
                    
                    if (columnId && !['select', 'slNo', 'lastUpdated', 'actions', 'tpCert', 'inspCert', 'damageReport'].includes(columnId)) {
                        let processedValue: any = cellValue.trim();
                        
                        if (columnId === 'projectId') {
                            const project = projects.find(p => p.name.toLowerCase() === processedValue.toLowerCase());
                            processedValue = project ? project.id : processedValue;
                        } else if (columnId.toLowerCase().includes('date') || columnId.toLowerCase().includes('due')) {
                             const formats = ['dd-MM-yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd'];
                             let parsedDate: Date | null = null;
                             for (const fmt of formats) {
                                 const p = parse(processedValue, fmt, new Date());
                                 if (isValid(p)) {
                                     parsedDate = p;
                                     break;
                                 }
                             }
                             processedValue = parsedDate ? parsedDate.toISOString() : null;
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
  }, [activeCell, table, batchUpdateInventoryItems, toast, projects, can.manage_inventory_database]);

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

  const handleExport = async () => {
    const rows = table.getRowModel().rows;
    if (rows.length === 0) return;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(category.substring(0, 31));
    const visibleColumns = table.getVisibleLeafColumns().filter((col) => !['select', 'lastUpdated', 'actions', 'tpCert', 'inspCert', 'damageReport'].includes(col.id));
    worksheet.columns = visibleColumns.map((col) => ({ header: col.id.toUpperCase(), key: col.id, width: 20 }));
    worksheet.addRows(rows.map(row => row.original));
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${category}_Inventory.xlsx`);
  };
  
  return (
    <div className="flex flex-col h-full overflow-hidden bg-card border rounded-lg">
      <div className="p-3 border-b flex flex-col sm:flex-row justify-between items-center gap-3 bg-muted/20">
        <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Database className="h-4 w-4" /> 
                {category} ({localData.length})
            </span>
        </div>
        <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs font-bold" onClick={handleExport}><Download className="mr-1.5 h-3.5 w-3.5"/> EXPORT</Button>
            {can.manage_inventory_database && (
                <>
                <Button size="sm" variant="default" className="h-8 text-xs font-bold" onClick={() => setIsAddRowsDialogOpen(true)}><PlusCircle className="mr-1.5 h-3.5 w-3.5"/> ADD ROWS</Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" className="h-8 text-xs font-bold" disabled={table.getSelectedRowModel().rows.length === 0}><Trash2 className="mr-1.5 h-3.5 w-3.5"/> DELETE ({table.getSelectedRowModel().rows.length})</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Delete Selected Items?</AlertDialogTitle><AlertDialogDescription>Permanently remove {table.getSelectedRowModel().rows.length} items from the database?</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive">Confirm Delete</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                </>
            )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onPaste={handlePaste}>
            <ScrollArea className="h-full w-full">
                <div className="relative w-full">
                    <Table className="border-collapse border-spacing-0">
                    <TableHeader className="sticky top-0 z-30 bg-muted/80 backdrop-blur-sm shadow-sm">
                        {table.getHeaderGroups().map(headerGroup => (
                        <TableRow key={headerGroup.id} className="hover:bg-transparent">
                            {headerGroup.headers.map(header => (
                            <TableHead key={header.id} className={cn("relative p-0 h-auto align-top border-r bg-muted/40", header.column.id === 'select' && 'sticky left-0 z-40', header.column.id === 'slNo' && 'sticky left-[40px] z-40', header.column.id === 'serialNumber' && 'sticky left-[90px] z-40')} style={{width: header.getSize()}}>
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                <div onMouseDown={header.getResizeHandler()} onTouchStart={header.getResizeHandler()} className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none hover:bg-primary/50" />
                            </TableHead>
                            ))}
                        </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows.map((row, rowIndex) => (
                        <TableRow key={row.id} className={cn(rowIndex % 2 === 0 ? "bg-card" : "bg-muted/5", row.getIsSelected() && "bg-blue-100 dark:bg-blue-900/40")}>
                            {row.getVisibleCells().map((cell, colIndex) => (
                            <TableCell 
                                key={cell.id}
                                onMouseDown={() => handleMouseDown(row.index, colIndex)}
                                onMouseEnter={() => handleMouseEnter(row.index, colIndex)}
                                className={cn(
                                    "p-0 h-10 border-r text-center transition-colors relative",
                                    { 'sticky left-0 z-10': cell.column.id === 'select' },
                                    { 'sticky left-[40px] z-10': cell.column.id === 'slNo' },
                                    { 'sticky left-[90px] z-10': cell.column.id === 'serialNumber' },
                                    ['select', 'slNo', 'serialNumber'].includes(cell.column.id) && (rowIndex % 2 === 0 ? 'bg-card' : 'bg-muted/5'),
                                    row.getIsSelected() && (['select', 'slNo', 'serialNumber'].includes(cell.column.id) ? 'bg-blue-100 dark:bg-blue-900/40' : ''),
                                    activeCell?.row === row.index && activeCell?.columnId === cell.column.id && "ring-2 ring-inset ring-primary/50 z-30",
                                    isCellSelected(rowIndex, colIndex) && "bg-primary/5"
                                )}
                                style={{width: cell.column.getSize()}}
                            >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
            <AlertDialogContent className="sm:max-w-md">
                <AlertDialogHeader><AlertDialogTitle>Add New Spreadsheet Rows</AlertDialogTitle><AlertDialogDescription>Insert multiple blank rows into the {category} database.</AlertDialogDescription></AlertDialogHeader>
                <div className="py-6 space-y-3">
                    <Label htmlFor="num-rows" className="font-bold text-xs uppercase tracking-widest text-slate-500">Rows to Add</Label>
                    <Input id="num-rows" type="number" value={numRowsToAdd} onChange={(e) => setNumRowsToAdd(Math.max(1, parseInt(e.target.value) || 1))} min="1" autoFocus className="text-lg font-bold h-12" />
                </div>
                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleAddMultipleRows}>ADD ROWS</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {editingItem && <EditItemDialog isOpen={!!editingItem} setIsOpen={() => setSelectedItemForEdit(null)} item={editingItem} />}
        {certRequestItem && <NewCertificateRequestDialog isOpen={!!certRequestItem} setIsOpen={() => setCertRequestItem(null)} item={certRequestItem} />}
    </div>
  );
};

export default InventorySheet;
