
'use client';
import { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, HardHat, Shirt, Upload } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import PpeReportDownloads from '@/components/requests/PpeReportDownloads';
import type { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import ImportPpeDistributionDialog from '@/components/requests/ImportPpeDistributionDialog';

export default function PpeStockPage() {
    const { can, ppeStock, updatePpeStock, loading } = useAppContext();
    const { toast } = useToast();
    const [reportDateRange, setReportDateRange] = useState<DateRange | undefined>();
    const [isImportOpen, setIsImportOpen] = useState(false);

    const coverallStock = useMemo(() => ppeStock?.find(s => s.id === 'coveralls'), [ppeStock]);
    const shoeStock = useMemo(() => ppeStock?.find(s => s.id === 'safetyShoes'), [ppeStock]);

    const [coverallSizes, setCoverallSizes] = useState(coverallStock?.sizes || {});
    const [shoeQuantity, setShoeQuantity] = useState(shoeStock?.quantity || 0);

    useEffect(() => {
        if (coverallStock) {
            setCoverallSizes(coverallStock.sizes || {});
        }
        if (shoeStock) {
            setShoeQuantity(shoeStock.quantity || 0);
        }
    }, [coverallStock, shoeStock]);

    const canEdit = useMemo(() => can.manage_ppe_stock, [can]);

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

    if (!can.manage_ppe_stock) {
        return (
            <Card className="w-full max-w-md mx-auto mt-20">
                <CardHeader className="text-center items-center">
                    <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4">
                        <AlertTriangle className="h-10 w-10 text-destructive" />
                    </div>
                    <CardTitle>Access Denied</CardTitle>
                    <CardDescription>You do not have permission to manage PPE stock.</CardDescription>
                </CardHeader>
            </Card>
        );
    }
    
    const coverallSizeOptions = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL'];

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                  <h1 className="text-3xl font-bold tracking-tight">PPE Stock Management</h1>
                  <p className="text-muted-foreground">Update stock levels and import distribution data.</p>
              </div>
              <Button onClick={() => setIsImportOpen(true)}><Upload className="mr-2 h-4 w-4"/> Import Distribution</Button>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Shirt/> Coverall Stock</CardTitle>
                        <CardDescription>Enter the available quantity for each size.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {coverallSizeOptions.map(size => (
                            <div key={size} className="space-y-2">
                                <Label htmlFor={`coverall-${size}`}>{size}</Label>
                                <Input 
                                    id={`coverall-${size}`} 
                                    type="number" 
                                    value={coverallSizes[size] || ''}
                                    onChange={(e) => handleCoverallChange(size, e.target.value)}
                                    disabled={!canEdit}
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
                        <CardDescription>Enter the total quantity of safety shoes available.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <Label htmlFor="safety-shoes">Total Quantity</Label>
                            <Input 
                                id="safety-shoes" 
                                type="number"
                                value={shoeQuantity}
                                onChange={(e) => setShoeQuantity(Number(e.target.value))}
                                disabled={!canEdit}
                            />
                        </div>
                    </CardContent>
                    {canEdit && (
                        <CardFooter>
                            <Button onClick={handleShoeSave}>Save Shoe Stock</Button>
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
