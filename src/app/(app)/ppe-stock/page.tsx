
'use client';
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { useInventory } from '@/contexts/inventory-provider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, HardHat, Shirt, Upload, Inbox, Edit, Trash2, ArrowUpDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import PpeReportDownloads from '@/components/requests/PpeReportDownloads';
import type { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import ImportPpeDistributionDialog from '@/components/requests/ImportPpeDistributionDialog';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, isValid, parseISO } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import EditPpeInwardDialog from '@/components/ppe-stock/EditPpeInwardDialog';
import type { PpeInwardRecord } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';

const coverallSizeOptions = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL'];

const inwardSchema = z.object({
    type: z.enum(['Inward', 'Outward']),
    ppeType: z.enum(['Coverall', 'Safety Shoes']),
    date: z.date({ required_error: "Date is required" }),
    sizes: z.record(z.string(), z.coerce.number().min(0).optional()).optional(),
    quantity: z.coerce.number().min(0).optional(),
    remarks: z.string().optional(),
}).refine(data => {
    if (data.ppeType === 'Coverall') {
        return data.sizes && Object.values(data.sizes).some(q => q && q > 0);
    }
    if (data.ppeType === 'Safety Shoes') {
        return data.quantity && data.quantity > 0;
    }
    return false;
}, { message: "Please enter a quantity for at least one item.", path: ['sizes'] });

type InwardFormValues = z.infer<typeof inwardSchema>;


export default function PpeStockPage() {
    const { user, can, loading } = useAuth();
    const { ppeStock, updatePpeStock, addPpeInwardRecord, ppeInwardHistory, deletePpeInwardRecord } = useInventory();
    const { toast } = useToast();
    const [reportDateRange, setReportDateRange] = useState<DateRange | undefined>();
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<PpeInwardRecord | null>(null);
    const [formKey, setFormKey] = useState(Date.now());

    const coverallStock = useMemo(() => ppeStock?.find(s => s.id === 'coveralls'), [ppeStock]);
    const shoeStock = useMemo(() => ppeStock?.find(s => s.id === 'safetyShoes'), [ppeStock]);
    
    const form = useForm<InwardFormValues>({
        resolver: zodResolver(inwardSchema),
        defaultValues: { type: 'Inward', ppeType: 'Coverall', date: new Date(), sizes: {}, quantity: 0, remarks: '' }
    });
    
    const [coverallSizes, setCoverallSizes] = useState<{[key: string]: number}>(coverallStock?.sizes || {});
    const [shoeQuantity, setShoeQuantity] = useState(shoeStock?.quantity || 0);

    useEffect(() => {
        setCoverallSizes(coverallStock?.sizes || {});
        setShoeQuantity(shoeStock?.quantity || 0);
    }, [ppeStock, coverallStock, shoeStock]);

    const canEdit = useMemo(() => can.manage_ppe_stock, [can]);

    const watchPpeType = form.watch('ppeType');

    const handleInwardSubmit = (data: InwardFormValues) => {
        addPpeInwardRecord(data);
        toast({ title: 'Record Added', description: `${data.type} stock has been logged and stock levels updated.` });
        form.reset({ type: 'Inward', ppeType: 'Coverall', date: new Date(), sizes: {}, quantity: 0, remarks: '' });
        setFormKey(Date.now()); // Force re-render of the form
    };

    const handleDeleteRecord = (record: PpeInwardRecord) => {
        deletePpeInwardRecord(record);
        toast({ variant: 'destructive', title: 'Record Deleted', description: 'The record has been removed and stock levels adjusted.' });
    };

    const handleCoverallChange = (size: string, value: string) => {
        setCoverallSizes(prev => ({ ...prev, [size]: Number(value) }));
    };

    const handleCoverallSave = () => {
        updatePpeStock('coveralls', coverallSizes);
        toast({ title: 'Coverall Stock Updated' });
    };

    const handleShoeSave = () => {
        updatePpeStock('safetyShoes', shoeQuantity);
        toast({ title: 'Safety Shoe Stock Updated' });
    };

    if (loading) {
        return (
             <div className="space-y-8">
                <Skeleton className="h-10 w-1/2" />
                <div className="grid md:grid-cols-2 gap-8">
                    <Skeleton className="h-64" />
                    <Skeleton className="h-64" />
                </div>
             </div>
        )
    }

    if (!can.manage_ppe_stock && !can.view_all) {
        return (
            <Card className="w-full max-w-md mx-auto mt-20">
                <CardHeader className="text-center items-center">
                    <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4">
                        <AlertTriangle className="h-10 w-10 text-destructive" />
                    </div>
                    <CardTitle>Access Denied</CardTitle>
                    <CardDescription>You do not have permission to view this page.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                  <h1 className="text-3xl font-bold tracking-tight">PPE Stock Management</h1>
                  <p className="text-muted-foreground">View current stock levels and manage inventory transactions.</p>
              </div>
              <Button onClick={() => setIsImportOpen(true)}><Upload className="mr-2 h-4 w-4"/> Import Distribution</Button>
            </div>

             {can.manage_ppe_stock && (
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="inward-register" className="border rounded-lg overflow-hidden">
                        <AccordionTrigger className="p-4 bg-muted/50 hover:no-underline hover:bg-muted/80 transition-colors">
                            <div className="flex items-center gap-2 text-lg font-semibold">
                                <Inbox className="h-5 w-5"/> PPE Transaction Register
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 bg-card">
                            <p className="text-sm text-muted-foreground mb-6">Log inward stock from purchases or outward stock issued to projects.</p>
                            <form key={formKey} onSubmit={form.handleSubmit(handleInwardSubmit)}>
                                <div className="space-y-6">
                                   <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="space-y-2">
                                            <Label>Transaction Type</Label>
                                            <Controller name="type" control={form.control} render={({ field }) => (
                                                <Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Inward">Inward (Add to Stock)</SelectItem>
                                                        <SelectItem value="Outward">Outward (Subtract from Stock)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>PPE Item</Label>
                                            <Controller name="ppeType" control={form.control} render={({ field }) => (
                                                <Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                                                    <SelectContent><SelectItem value="Coverall">Coverall</SelectItem><SelectItem value="Safety Shoes">Safety Shoes</SelectItem></SelectContent>
                                                </Select>
                                            )} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Date of Transaction</Label>
                                            <Controller name="date" control={form.control} render={({ field }) => <DatePickerInput value={field.value} onChange={field.onChange} />} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Remarks (Optional)</Label>
                                            <Input {...form.register('remarks')} placeholder="e.g., PO #123, Site X" />
                                        </div>
                                    </div>
                                    {watchPpeType === 'Coverall' ? (
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                                            {coverallSizeOptions.map(size => (
                                                <div key={size} className="space-y-2">
                                                    <Label htmlFor={`inward-coverall-${size}`} className="text-xs">{size}</Label>
                                                    <Input id={`inward-coverall-${size}`} type="number" {...form.register(`sizes.${size}`)} placeholder="0" className="h-8"/>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-w-xs">
                                            <Label htmlFor="inward-shoe-quantity">Quantity</Label>
                                            <Input id="inward-shoe-quantity" type="number" {...form.register('quantity')} placeholder="0"/>
                                        </div>
                                    )}
                                    {form.formState.errors.sizes && <p className="text-xs text-destructive">{form.formState.errors.sizes.message}</p>}
                                </div>
                                <div className="pt-6 flex justify-end">
                                    <Button type="submit" className="w-full sm:w-auto">Record Transaction</Button>
                                </div>
                            </form>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            )}

            <div className="grid md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Shirt/> Coverall Stock</CardTitle>
                        <CardDescription>Current available quantity for each size.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {coverallSizeOptions.map(size => (
                            <div key={size} className="space-y-2">
                                <Label htmlFor={`coverall-${size}`}>{size}</Label>
                                <Input 
                                    id={`coverall-${size}`} 
                                    type="number" 
                                    value={coverallSizes[size] || 0}
                                    readOnly={!canEdit}
                                    onChange={(e) => canEdit && handleCoverallChange(size, e.target.value)}
                                />
                            </div>
                        ))}
                    </CardContent>
                    {canEdit && (
                        <CardFooter>
                            <Button onClick={handleCoverallSave}>Save Coverall Stock</Button>
                        </CardFooter>
                    )}
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><HardHat /> Safety Shoes Stock</CardTitle>
                        <CardDescription>Total quantity of safety shoes available.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <Label htmlFor="safety-shoes">Total Quantity</Label>
                            <Input 
                                id="safety-shoes" 
                                type="number"
                                value={shoeQuantity || 0}
                                readOnly={!canEdit}
                                onChange={(e) => canEdit && setShoeQuantity(Number(e.target.value))}
                            />
                        </div>
                    </CardContent>
                    {canEdit && (
                        <CardFooter>
                            <Button onClick={handleShoeSave}>Save Shoe Stock</Button>
                        </CardFooter>
                    )}
                </div>
            </div>
            
             <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="history" className="border rounded-lg overflow-hidden">
                    <AccordionTrigger className="p-4 bg-muted/50 hover:no-underline hover:bg-muted/80 transition-colors">
                        <CardTitle className="flex items-center gap-2"><ArrowUpDown className="h-5 w-5"/> Transaction History</CardTitle>
                    </AccordionTrigger>
                    <AccordionContent className="p-0">
                        <Card className="border-0 shadow-none rounded-none">
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30">
                                            <TableHead>Date</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Item</TableHead>
                                            <TableHead>Details</TableHead>
                                            <TableHead>Remarks</TableHead>
                                            {user?.role === 'Admin' && <TableHead className="text-right">Actions</TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(ppeInwardHistory || []).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(record => (
                                            <TableRow key={record.id}>
                                                <TableCell className="whitespace-nowrap">{format(new Date(record.date), 'dd MMM, yyyy')}</TableCell>
                                                <TableCell>
                                                    <Badge variant={record.type === 'Inward' ? 'success' : 'destructive'}>
                                                        {record.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-medium">{record.ppeType}</TableCell>
                                                <TableCell>
                                                    <div className="text-xs text-muted-foreground">
                                                        {record.ppeType === 'Coverall' 
                                                            ? Object.entries(record.sizes || {}).filter(([_, q]) => q && q > 0).map(([size, qty]) => `${size}: ${qty}`).join(', ')
                                                            : `Qty: ${record.quantity}`
                                                        }
                                                    </div>
                                                </TableCell>
                                                <TableCell className="max-w-[200px] truncate" title={record.remarks}>{record.remarks || 'N/A'}</TableCell>
                                                {user?.role === 'Admin' && (
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <Button variant="ghost" size="icon" onClick={() => setEditingRecord(record)}><Edit className="h-4 w-4"/></Button>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4"/></Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Delete Record?</AlertDialogTitle>
                                                                        <AlertDialogDescription>This will permanently delete this {record.type.toLowerCase()} record and update the stock levels. This action cannot be undone.</AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={() => handleDeleteRecord(record)}>Delete</AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </div>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {(ppeInwardHistory || []).length === 0 && <p className="text-center text-muted-foreground py-8">No transaction history found.</p>}
                            </CardContent>
                        </Card>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
            
             <Card>
                <CardHeader>
                    <CardTitle>Generate PPE Issue Report</CardTitle>
                    <CardDescription>Select a date range to generate a downloadable Excel report of all issued PPE.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-4 items-center">
                    <DateRangePicker 
                        date={reportDateRange} 
                        onDateChange={setReportDateRange} 
                    />
                    <PpeReportDownloads dateRange={reportDateRange} />
                </CardContent>
            </Card>

            <ImportPpeDistributionDialog isOpen={isImportOpen} setIsOpen={setIsImportOpen} />
            {editingRecord && <EditPpeInwardDialog isOpen={!!editingRecord} setIsOpen={() => setEditingRecord(null)} record={editingRecord} />}
        </div>
    );
}
