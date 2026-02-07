
'use client';
import { useState, useMemo, useEffect, forwardRef, ComponentProps } from 'react';
import Link from 'next/link';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Upload, AlertTriangle, ChevronsUpDown, X, FilePen, FilePlus, FileText, ArrowRightLeft, Package, Hammer, CheckCircle, Edit, Trash2, Check } from 'lucide-react';
import InventoryTable from '@/components/inventory/InventoryTable';
import AddItemDialog from '@/components/inventory/AddItemDialog';
import ImportItemsDialog from '@/components/inventory/ImportItemsDialog';
import InventoryFilters from '@/components/inventory/InventoryFilters';
import type { InventoryItem, CertificateRequest, Role, InventoryTransferRequest } from '@/lib/types';
import { isAfter, isBefore, addDays, parseISO, isWithinInterval, subDays, format } from 'date-fns';
import ViewCertificateRequestDialog from '@/components/inventory/ViewCertificateRequestDialog';
import InventorySummary from '@/components/inventory/InventorySummary';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import InventoryReportDownloads from '@/components/inventory/InventoryReportDownloads';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsList, TabsContent, TabsTrigger } from '@/components/ui/tabs';
import BulkUpdateTpCertDialog from '@/components/inventory/BulkUpdateTpCertDialog';
import GenerateTpCertDialog from '@/components/inventory/GenerateTpCertDialog';
import NewInventoryTransferRequestDialog from '@/components/requests/new-inventory-transfer-request-dialog';
import PendingTransfers from '@/components/requests/PendingTransfers';
import BulkUpdateInspectionDialog from '@/components/inventory/BulkUpdateInspectionDialog';
import UpdateItemsDialog from '@/components/inventory/UpdateItemsDialog';
import ActionRequiredReport from '@/components/inventory/ActionRequiredReport';
import NewDamageReportDialog from '@/components/damage-reports/NewDamageReportDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useReactTable, getCoreRowModel, flexRender, ColumnDef } from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';

// #region Editable Cell Components
const EditableCell = ({
    getValue,
    row: { index },
    column: { id },
    table,
  }: {
    getValue: any;
    row: any;
    column: any;
    table: any;
  }) => {
    const initialValue = getValue();
    const [value, setValue] = useState(initialValue);
  
    const onBlur = () => {
      table.options.meta?.updateData(index, id, value);
    };
  
    useEffect(() => {
      setValue(initialValue);
    }, [initialValue]);
  
    return (
      <Input
        value={value as string}
        onChange={(e) => setValue(e.target.value)}
        onBlur={onBlur}
        className="w-full border-transparent focus:border-ring focus:ring-ring focus:ring-1"
      />
    );
};

const StatusCell = ({
    getValue,
    row: { index },
    column: { id },
    table,
  }: {
    getValue: any;
    row: any;
    column: any;
    table: any;
  }) => {
    const initialValue = getValue();
    const [value, setValue] = useState(initialValue);
  
    useEffect(() => {
      setValue(initialValue);
    }, [initialValue]);
  
    const onSelectChange = (newValue: string) => {
        setValue(newValue);
        table.options.meta?.updateData(index, id, newValue);
    };

    const statusColor = (status: string) => {
        if(status === 'Expired') return 'bg-red-200 text-red-800';
        if(status === 'Due for Insp') return 'bg-yellow-200 text-yellow-800';
        if(status === 'In Use') return 'bg-green-200 text-green-800';
        return '';
    }
  
    return (
        <Select value={value} onValueChange={onSelectChange}>
            <SelectTrigger className={cn("w-full border-transparent focus:border-ring focus:ring-ring focus:ring-1", statusColor(value))}>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="In Use">In Use</SelectItem>
                <SelectItem value="Idle">Idle</SelectItem>
                <SelectItem value="Repair">Repair</SelectItem>
                <SelectItem value="Expired">Expired</SelectItem>
                <SelectItem value="Due for Insp">Due for Insp</SelectItem>
            </SelectContent>
        </Select>
    );
};

const DateCell = ({
    getValue,
    row: { index },
    column: { id },
    table,
  }: {
    getValue: any;
    row: any;
    column: any;
    table: any;
  }) => {
    const initialValue = getValue();
    const [value, setValue] = useState(initialValue ? new Date(initialValue) : undefined);
  
    useEffect(() => {
        if(initialValue) setValue(new Date(initialValue));
        else setValue(undefined);
    }, [initialValue]);
  
    const onDateChange = (date: Date | undefined) => {
        setValue(date);
        table.options.meta?.updateData(index, id, date?.toISOString());
    };
  
    return (
        <DatePickerInput value={value} onChange={onDateChange} />
    );
};

// #endregion

// #region Inventory Sheet Component
const InventorySheet = ({ category }: { category: string }) => {
    const { can, harnesses, tripods, lifelines, gasDetectors, addInventoryRow, updateInventoryItem, deleteInventoryItems, projects } = useAppContext();
    const [rowSelection, setRowSelection] = useState({});
    const { toast } = useToast();

    const data = useMemo(() => {
        switch (category) {
            case 'Harness': return harnesses;
            case 'Tripod': return tripods;
            case 'Lifeline': return lifelines;
            case 'Gas Detectors': return gasDetectors;
            default: return [];
        }
    }, [category, harnesses, tripods, lifelines, gasDetectors]);

    const canManageDb = can.manage_inventory_database;

    const columns: ColumnDef<InventoryItem>[] = useMemo(() => [
        {
            id: 'select',
            header: ({ table }) => (
              <Checkbox
                checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
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
        { accessorKey: 'id', header: 'ID', cell: info => <div className="text-xs text-muted-foreground">{info.getValue<string>()?.slice(-6) || ''}</div> },
        { accessorKey: 'name', header: 'Item Name', cell: canManageDb ? EditableCell : info => info.getValue() },
        { accessorKey: 'serialNumber', header: 'Serial Number', cell: canManageDb ? EditableCell : info => info.getValue() },
        { accessorKey: 'ariesId', header: 'Aries ID', cell: canManageDb ? EditableCell : info => info.getValue() },
        { accessorKey: 'status', header: 'Status', cell: canManageDb ? StatusCell : info => info.getValue() },
        { accessorKey: 'projectId', header: 'Project', cell: canManageDb ? ({ getValue, row, column, table }) => {
            const initialValue = getValue();
            const onSelectChange = (newValue: string) => {
                table.options.meta?.updateData(row.index, column.id, newValue);
            };
            return (
                <Select value={initialValue} onValueChange={onSelectChange}>
                    <SelectTrigger className="w-full border-transparent focus:border-ring focus:ring-ring focus:ring-1">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            )
        } : info => projects.find(p => p.id === info.getValue())?.name || info.getValue() },
        { accessorKey: 'inspectionDueDate', header: 'Inspection Due', cell: canManageDb ? DateCell : info => format(new Date(info.getValue<string>()), 'dd/MM/yyyy') },
        { accessorKey: 'tpInspectionDueDate', header: 'TP Cert Due', cell: canManageDb ? DateCell : info => format(new Date(info.getValue<string>()), 'dd/MM/yyyy') },
        { accessorKey: 'lastUpdated', header: 'Last Updated', cell: info => format(new Date(info.getValue<string>()), 'dd/MM/yy, p') },
    ], [canManageDb, projects]);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        onRowSelectionChange: setRowSelection,
        state: { rowSelection },
        meta: {
            updateData: (rowIndex: number, columnId: string, value: any) => {
                const itemToUpdate = data[rowIndex];
                if (itemToUpdate) {
                    updateInventoryItem({ ...itemToUpdate, [columnId]: value }, category);
                }
            }
        }
    });

    const handleAddRow = () => {
        addInventoryRow(category);
    };

    const handleDeleteRows = () => {
        const selectedIds = table.getFilteredSelectedRowModel().rows.map(row => row.original.id);
        if (selectedIds.length === 0) {
            toast({ title: "No rows selected", variant: "destructive" });
            return;
        }
        deleteInventoryItems(selectedIds, category);
        setRowSelection({});
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{category} Inventory Database</CardTitle>
                <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                        <Badge variant={canManageDb ? "success" : "secondary"}>
                            {canManageDb ? "Editing enabled - All changes saved automatically" : "Read-only mode"}
                        </Badge>
                    </div>
                    <div className="flex gap-2">
                        {canManageDb && (
                           <>
                             <Button onClick={handleAddRow}><PlusCircle className="mr-2 h-4 w-4" /> Add Row</Button>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" disabled={Object.keys(rowSelection).length === 0}><Trash2 className="mr-2 h-4 w-4" /> Delete Row(s)</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>This will permanently archive the selected {Object.keys(rowSelection).length} item(s).</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDeleteRows}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                           </>
                        )}
                        <Button variant="outline">Export</Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="border rounded-md">
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
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
};
// #endregion

// #region Inventory Database Main Component
const InventoryDatabase = () => {
    const categories = ['Harness', 'Tripod', 'Lifeline', 'Gas Detectors'];

    return (
        <Tabs defaultValue="Harness">
            <TabsList>
                {categories.map(cat => <TabsTrigger key={cat} value={cat}>{cat}</TabsTrigger>)}
            </TabsList>
            {categories.map(cat => (
                <TabsContent key={cat} value={cat}>
                    <InventorySheet category={cat} />
                </TabsContent>
            ))}
        </Tabs>
    );
};
// #endregion


export default function StoreInventoryPage() {
    const { user, can, inventoryItems, revalidateExpiredItems, pendingInventoryTransferRequestCount } = useAppContext();
    const [isAddItemOpen, setIsAddItemOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isUpdateItemsOpen, setIsUpdateItemsOpen] = useState(false);
    const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
    const [isBulkInspectionUpdateOpen, setIsBulkInspectionUpdateOpen] = useState(false);
    const [isGenerateCertOpen, setIsGenerateCertOpen] = useState(false);
    const [isTransferRequestOpen, setIsTransferRequestOpen] = useState(false);
    const [editingTransferRequest, setEditingTransferRequest] = useState<InventoryTransferRequest | null>(null);
    const [isNewDamageReportOpen, setIsNewDamageReportOpen] = useState(false);
    const [viewingCertRequest, setViewingCertRequest] = useState<CertificateRequest | null>(null);

    const [filters, setFilters] = useState({
        name: 'all',
        status: 'all',
        projectId: 'all',
        search: '',
        updatedDateRange: undefined,
    });
    
    const [selectedItemsForTransfer, setSelectedItemsForTransfer] = useState<InventoryItem[]>([]);

    const filteredItems = useMemo(() => {
        // This is now for the old "Inventory List" view only. 
        // The new database will handle its own filtering internally if needed.
        return inventoryItems.filter(item => {
            // Your existing filter logic here...
            return true; 
        });
    }, [inventoryItems, filters, user, can.manage_inventory]);


    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Store Inventory</h1>
                    <p className="text-muted-foreground">Manage and track all equipment and items.</p>
                </div>
            </div>

            <Tabs defaultValue="database">
                <TabsList>
                    <TabsTrigger value="list">Inventory List</TabsTrigger>
                    <TabsTrigger value="database">Inventory Database</TabsTrigger>
                </TabsList>
                <TabsContent value="list" className="mt-4">
                    <p className="text-sm text-muted-foreground p-4 text-center border rounded-md">
                        The previous inventory list view is now deprecated. Please use the new <Badge>Inventory Database</Badge> tab for a live, spreadsheet-like editing experience.
                    </p>
                </TabsContent>
                <TabsContent value="database" className="mt-4">
                    <InventoryDatabase />
                </TabsContent>
            </Tabs>
        </div>
    );
}
