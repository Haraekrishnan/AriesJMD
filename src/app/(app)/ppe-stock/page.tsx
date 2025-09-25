
'use client';
import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, HardHat, Shirt, Upload, Inbox } from 'lucide-react';
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

const coverallSizeOptions = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL'];

const inwardSchema = z.object({
    ppeType: z.enum(['Coverall', 'Safety Shoes']),
    date: z.date({ required_error: "Date is required" }),
    sizes: z.record(z.string(), z.coerce.number().min(0).optional()).optional(),
    quantity: z.coerce.number().min(0).optional(),
}).refine(data => {
    if (data.ppeType === 'Coverall') {
        return data.sizes && Object.values(data.sizes).some(q => q > 0);
    }
    if (data.ppeType === 'Safety Shoes') {
        return data.quantity && data.quantity > 0;
    }
    return false;
}, { message: "Please enter a quantity for at least one item.", path: ['sizes'] });

type InwardFormValues = z.infer<typeof inwardSchema>;


export default function PpeStockPage() {
    const { can, ppeStock, updatePpeStock, loading } = useAppContext();
    const { toast } = useToast();
    const [reportDateRange, setReportDateRange] = useState<DateRange | undefined>();
    const [isImportOpen, setIsImportOpen] = useState(false);

    const canEditStock = useMemo(() => can.manage_ppe_stock, [can]);
    const canDoInward = useMemo(() => can.manage_ppe_stock || can.manage_inventory, [can]);

    const coverallStock = useMemo(() => ppeStock?.find(s => s.id === 'coveralls'), [ppeStock]);
    const shoeStock = useMemo(() => ppeStock?.find(s => s.id === 'safetyShoes'), [ppeStock]);
    
    const form = useForm<InwardFormValues>({
        resolver: zodResolver(inwardSchema),
        defaultValues: { ppeType: 'Coverall', date: new Date() }
    });

    const watchPpeType = form.watch('ppeType');

    const handleInwardSubmit = (data: InwardFormValues) => {
        const stockToUpdate = data.ppeType === 'Coverall' ? coverallStock : shoeStock;
        if (!stockToUpdate) {
            toast({ variant: 'destructive', title: 'Error', description: 'Stock data not found.' });
            return;
        }

        if (data.ppeType === 'Coverall') {
            const newSizes = { ...stockToUpdate.sizes };
            for (const size in data.sizes) {
                newSizes[size] = (newSizes[size] || 0) + (data.sizes[size] || 0);
            }
            updatePpeStock('coveralls', newSizes);
        } else {
            const newQuantity = (stockToUpdate.quantity || 0) + (data.quantity || 0);
            updatePpeStock('safetyShoes', newQuantity);
        }
        
        toast({ title: 'Stock Updated', description: 'Inward stock has been added.' });
        form.reset({ ppeType: data.ppeType, date: new Date(), sizes: {}, quantity: 0 });
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

    if (!can.view_ppe_requests) {
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
                  <p className="text-muted-foreground">View current stock levels and manage inventory.</p>
              </div>
              <Button onClick={() => setIsImportOpen(true)}><Upload className="mr-2 h-4 w-4"/> Import Distribution</Button>
            </div>

             {canDoInward && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Inbox/> Inward Register</CardTitle>
                        <CardDescription>Add newly purchased stock to the inventory.</CardDescription>
                    </CardHeader>
                    <form onSubmit={form.handleSubmit(handleInwardSubmit)}>
                        <CardContent className="space-y-4">
                           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <Label>PPE Type</Label>
                                    <Controller name="ppeType" control={form.control} render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                                            <SelectContent><SelectItem value="Coverall">Coverall</SelectItem><SelectItem value="Safety Shoes">Safety Shoes</SelectItem></SelectContent>
                                        </Select>
                                    )} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Date of Inward/Purchase</Label>
                                    <Controller name="date" control={form.control} render={({ field }) => <DatePickerInput value={field.value} onChange={field.onChange} />} />
                                </div>
                            </div>
                            {watchPpeType === 'Coverall' ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {coverallSizeOptions.map(size => (
                                        <div key={size} className="space-y-2">
                                            <Label htmlFor={`inward-coverall-${size}`}>{size}</Label>
                                            <Input id={`inward-coverall-${size}`} type="number" {...form.register(`sizes.${size}`)} placeholder="0"/>
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
                        </CardContent>
                        <CardFooter>
                            <Button type="submit">Add to Stock</Button>
                        </CardFooter>
                    </form>
                </Card>
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
                                    value={coverallStock?.sizes?.[size] || 0}
                                    disabled={!canEditStock}
                                    readOnly={!canEditStock}
                                />
                            </div>
                        ))}
                    </CardContent>
                    {canEditStock && (
                        <CardFooter>
                            <p className="text-xs text-muted-foreground">Admin can edit values directly if needed.</p>
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
                                value={shoeStock?.quantity || 0}
                                disabled={!canEditStock}
                                readOnly={!canEditStock}
                            />
                        </div>
                    </CardContent>
                     {canEditStock && (
                        <CardFooter>
                           <p className="text-xs text-muted-foreground">Admin can edit values directly if needed.</p>
                        </CardFooter>
                    )}
                </Card>
            </div>
            
             <Card>
                <CardHeader>
                    <CardTitle>Generate PPE Issue Report</CardTitle>
                    <CardDescription>Select a date range to generate a downloadable Excel report of all issued PPE.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-4 items-center">
                    <DateRangePicker date={reportDateRange} onDateChange={setReportDateRange} />
                    <PpeReportDownloads dateRange={reportDateRange} />
                </CardContent>
            </Card>

            <ImportPpeDistributionDialog isOpen={isImportOpen} setIsOpen={setIsImportOpen} />
        </div>
    );
}
