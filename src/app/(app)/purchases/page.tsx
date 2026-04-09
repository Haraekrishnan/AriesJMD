'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/contexts/app-provider';
import { IndianRupee, PlusCircle, FileText, Edit } from 'lucide-react';
import PurchaseRegisterList from '@/components/purchase-register/PurchaseRegisterList';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';
import { format, isWithinInterval, parseISO, getYear, getMonth, startOfMonth, endOfMonth } from 'date-fns';
import StatCard from '@/components/dashboard/stat-card';
import AddPurchaseLedgerDialog from '@/components/vendor-management/AddPurchaseLedgerDialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import QuotationList from '@/components/purchase-register/QuotationList';
import CreateQuotationDialog from '@/components/purchase-register/CreateQuotationDialog';
import { usePurchase } from '@/contexts/purchase-provider';
import { Quotation } from '@/lib/types';

export default function PurchasesPage() {
    const { can, vendors, purchaseRegisters, quotations } = usePurchase();
    const [selectedVendorId, setSelectedVendorId] = useState('all');
    const [filterType, setFilterType] = useState<'year' | 'financial-year' | 'month' | 'custom'>('year');
    const [selectedYear, setSelectedYear] = useState<string>(getYear(new Date()).toString());
    const [selectedMonth, setSelectedMonth] = useState<string>((getMonth(new Date()) + 1).toString());
    const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
    const [isAddLedgerOpen, setIsAddLedgerOpen] = useState(false);
    const [isCreateQuotationOpen, setIsCreateQuotationOpen] = useState(false);
    const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);

    const availableYears = useMemo(() => {
        const years = new Set(purchaseRegisters.map(p => getYear(parseISO(p.date))));
        const currentYear = getYear(new Date());
        years.add(currentYear);
        return Array.from(years).sort((a,b) => b-a);
    }, [purchaseRegisters]);

     const filteredPurchases = useMemo(() => {
        return purchaseRegisters.filter(purchase => {
            const vendorMatch = selectedVendorId === 'all' || purchase.vendorId === selectedVendorId;
            if (!vendorMatch) return false;

            const purchaseDate = parseISO(purchase.date);
            let dateMatch = false;

            if (filterType === 'year') {
                dateMatch = getYear(purchaseDate) === parseInt(selectedYear, 10);
            } else if (filterType === 'financial-year') {
                const year = parseInt(selectedYear, 10);
                const start = new Date(year, 3, 1);
                const end = new Date(year + 1, 2, 31);
                dateMatch = isWithinInterval(purchaseDate, { start, end });
            } else if (filterType === 'month') {
                const year = parseInt(selectedYear, 10);
                const month = parseInt(selectedMonth, 10) - 1;
                const start = startOfMonth(new Date(year, month));
                const end = endOfMonth(new Date(year, month));
                dateMatch = isWithinInterval(purchaseDate, { start, end });
            } else if (filterType === 'custom' && customDateRange?.from) {
                const end = customDateRange.to || customDateRange.from;
                dateMatch = isWithinInterval(purchaseDate, { start: customDateRange.from, end });
            } else if (filterType === 'year') {
                 dateMatch = getYear(purchaseDate) === parseInt(selectedYear, 10);
            }
            
            return dateMatch;
        });
    }, [purchaseRegisters, selectedVendorId, filterType, selectedYear, selectedMonth, customDateRange]);

    const filteredTotal = useMemo(() => {
        return filteredPurchases.reduce((acc, p) => acc + p.grandTotal, 0);
    }, [filteredPurchases]);
    
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amount);
    }

    const handleEditQuotation = (quotation: Quotation) => {
        setEditingQuotation(quotation);
        setIsCreateQuotationOpen(true);
    };

    const handleCloseDialog = () => {
        setIsCreateQuotationOpen(false);
        setEditingQuotation(null);
    };
    
    return (
        <div className="space-y-8">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Purchases</h1>
                    <p className="text-muted-foreground">Log purchases and compare quotations.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setIsCreateQuotationOpen(true)} variant="outline">
                        <FileText className="mr-2 h-4 w-4"/> New Price Comparison
                    </Button>
                    <Button onClick={() => setIsAddLedgerOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Add Purchase
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="register">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="register">Purchase Register</TabsTrigger>
                    <TabsTrigger value="quotations">Price Comparison</TabsTrigger>
                </TabsList>

                <TabsContent value="register" className="mt-4">
                    <StatCard 
                        title="Total amount for the period" 
                        value={formatCurrency(filteredTotal)} 
                        icon={IndianRupee}
                        description="Sum of all purchases matching the current filter"
                    />
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle>Purchase History</CardTitle>
                            <CardDescription>View all logged purchases and add PO numbers.</CardDescription>
                            <div className="flex flex-wrap items-center gap-4 pt-4">
                                <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                                    <SelectTrigger className="w-[220px]"><SelectValue placeholder="All Vendors" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Vendors</SelectItem>
                                        {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Select value={filterType} onValueChange={(value) => setFilterType(value as any)}>
                                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="year">By Year</SelectItem>
                                        <SelectItem value="financial-year">By Financial Year</SelectItem>
                                        <SelectItem value="month">By Month</SelectItem>
                                        <SelectItem value="custom">Custom Range</SelectItem>
                                    </SelectContent>
                                </Select>
                                {(filterType === 'year' || filterType === 'financial-year' || filterType === 'month') && (
                                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                                        <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {availableYears.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )}
                                {filterType === 'month' && (
                                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                        <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {Array.from({length: 12}, (_, i) => <SelectItem key={i} value={(i + 1).toString()}>{format(new Date(2000, i), 'MMMM')}</SelectItem>)}
                                        </SelectContent>
                                     </Select>
                                )}
                                {filterType === 'custom' && (
                                    <DateRangePicker date={customDateRange} onDateChange={setCustomDateRange} />
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <PurchaseRegisterList registers={filteredPurchases} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="quotations" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Quotation / Price Comparison</CardTitle>
                            <CardDescription>Compare prices from different vendors before making a purchase.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <QuotationList quotations={quotations} onEdit={handleEditQuotation} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            
            <AddPurchaseLedgerDialog isOpen={isAddLedgerOpen} setIsOpen={setIsAddLedgerOpen} />
            <CreateQuotationDialog isOpen={isCreateQuotationOpen} setIsOpen={handleCloseDialog} existingQuotation={editingQuotation} />
        </div>
    );
}
