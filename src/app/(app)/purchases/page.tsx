'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IndianRupee, PlusCircle, FileText, Search, FilterX } from 'lucide-react';
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
import { useAuth } from '@/contexts/auth-provider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function PurchasesPage() {
    const { can, vendors, purchaseRegisters, quotations } = usePurchase();
    const { users } = useAuth();
    
    // Filters state
    const [selectedVendorId, setSelectedVendorId] = useState('all');
    const [selectedCreatorId, setSelectedCreatorId] = useState('all');
    const [filterType, setFilterType] = useState<'year' | 'financial-year' | 'month' | 'custom'>('year');
    const [selectedYear, setSelectedYear] = useState<string>(getYear(new Date()).toString());
    const [selectedMonth, setSelectedMonth] = useState<string>((getMonth(new Date()) + 1).toString());
    const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
    const [itemNameSearch, setItemNameSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    const [isAddLedgerOpen, setIsAddLedgerOpen] = useState(false);
    const [isCreateQuotationOpen, setIsCreateQuotationOpen] = useState(false);
    const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);

    const availableYears = useMemo(() => {
        const years = new Set<number>();
        purchaseRegisters.forEach(p => years.add(getYear(parseISO(p.date))));
        quotations.forEach(q => years.add(getYear(parseISO(q.createdAt))));
        const currentYear = getYear(new Date());
        years.add(currentYear);
        return Array.from(years).sort((a,b) => b-a);
    }, [purchaseRegisters, quotations]);

    const categories = ['Store Inventory', 'Equipment', 'Daily Consumable', 'Job Consumable'];

    const filteredPurchases = useMemo(() => {
        return purchaseRegisters.filter(purchase => {
            // Vendor Filter
            if (selectedVendorId !== 'all' && purchase.vendorId !== selectedVendorId) return false;

            // Creator Filter
            if (selectedCreatorId !== 'all' && purchase.creatorId !== selectedCreatorId) return false;

            // Date Filter
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
            } else {
                dateMatch = true;
            }
            if (!dateMatch) return false;

            // Item Name Filter
            if (itemNameSearch) {
                const matchesItem = purchase.items?.some(item => 
                    item.name.toLowerCase().includes(itemNameSearch.toLowerCase())
                );
                if (!matchesItem) return false;
            }

            return true;
        });
    }, [purchaseRegisters, selectedVendorId, selectedCreatorId, filterType, selectedYear, selectedMonth, customDateRange, itemNameSearch]);

    const filteredQuotations = useMemo(() => {
        return quotations.filter(q => {
            // Vendor Filter
            if (selectedVendorId !== 'all' && !q.vendors.some(v => v.vendorId === selectedVendorId)) return false;

            // Creator Filter
            if (selectedCreatorId !== 'all' && q.creatorId !== selectedCreatorId) return false;

            // Date Filter
            const qDate = parseISO(q.createdAt);
            let dateMatch = false;
            if (filterType === 'year') {
                dateMatch = getYear(qDate) === parseInt(selectedYear, 10);
            } else if (filterType === 'financial-year') {
                const year = parseInt(selectedYear, 10);
                const start = new Date(year, 3, 1);
                const end = new Date(year + 1, 2, 31);
                dateMatch = isWithinInterval(qDate, { start, end });
            } else if (filterType === 'month') {
                const year = parseInt(selectedYear, 10);
                const month = parseInt(selectedMonth, 10) - 1;
                const start = startOfMonth(new Date(year, month));
                const end = endOfMonth(new Date(year, month));
                dateMatch = isWithinInterval(qDate, { start, end });
            } else if (filterType === 'custom' && customDateRange?.from) {
                const end = customDateRange.to || customDateRange.from;
                dateMatch = isWithinInterval(qDate, { start: customDateRange.from, end });
            } else {
                dateMatch = true;
            }
            if (!dateMatch) return false;

            // Item Name & Category Filter
            if (itemNameSearch || selectedCategory !== 'all') {
                const matchesItem = q.items?.some(item => {
                    const nameMatch = !itemNameSearch || item.description.toLowerCase().includes(itemNameSearch.toLowerCase());
                    const catMatch = selectedCategory === 'all' || item.itemType === selectedCategory || item.newItemCategory === selectedCategory;
                    return nameMatch && catMatch;
                });
                if (!matchesItem) return false;
            }

            return true;
        });
    }, [quotations, selectedVendorId, selectedCreatorId, filterType, selectedYear, selectedMonth, customDateRange, itemNameSearch, selectedCategory]);

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

    const resetFilters = () => {
        setSelectedVendorId('all');
        setSelectedCreatorId('all');
        setFilterType('year');
        setSelectedYear(getYear(new Date()).toString());
        setSelectedMonth((getMonth(new Date()) + 1).toString());
        setCustomDateRange(undefined);
        setItemNameSearch('');
        setSelectedCategory('all');
    }
    
    return (
        <div className="space-y-8">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Purchases</h1>
                    <p className="text-muted-foreground">Log purchases and compare quotations.</p>
                </div>
                <div className="flex gap-2">
                    {can.manage_purchase_register && (
                        <Button onClick={() => setIsCreateQuotationOpen(true)} variant="outline">
                            <FileText className="mr-2 h-4 w-4"/> New Price Comparison
                        </Button>
                    )}
                    <Button onClick={() => setIsAddLedgerOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Add Purchase
                    </Button>
                </div>
            </div>

            {/* --- FILTER BAR --- */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Search className="h-5 w-5" /> Filters
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label>Item Name</Label>
                            <Input 
                                placeholder="Search items..." 
                                value={itemNameSearch}
                                onChange={e => setItemNameSearch(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Vendor</Label>
                            <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                                <SelectTrigger><SelectValue placeholder="All Vendors" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Vendors</SelectItem>
                                    {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Added By</Label>
                            <Select value={selectedCreatorId} onValueChange={setSelectedCreatorId}>
                                <SelectTrigger><SelectValue placeholder="All Users" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Users</SelectItem>
                                    {users.filter(u => u.role !== 'Manager').map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label>Filter Type</Label>
                            <Select value={filterType} onValueChange={(value) => setFilterType(value as any)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="year">By Year</SelectItem>
                                    <SelectItem value="financial-year">By Financial Year</SelectItem>
                                    <SelectItem value="month">By Month</SelectItem>
                                    <SelectItem value="custom">Custom Range</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {(filterType === 'year' || filterType === 'financial-year' || filterType === 'month') && (
                            <div className="space-y-2">
                                <Label>Year</Label>
                                <Select value={selectedYear} onValueChange={setSelectedYear}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {availableYears.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {filterType === 'month' && (
                            <div className="space-y-2">
                                <Label>Month</Label>
                                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Array.from({length: 12}, (_, i) => (
                                            <SelectItem key={i} value={(i + 1).toString()}>
                                                {format(new Date(2000, i), 'MMMM')}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {filterType === 'custom' && (
                            <div className="space-y-2">
                                <Label>Date Range</Label>
                                <DateRangePicker date={customDateRange} onDateChange={setCustomDateRange} />
                            </div>
                        )}

                        <div className="flex items-end lg:col-start-4">
                            <Button variant="ghost" onClick={resetFilters} className="w-full">
                                <FilterX className="mr-2 h-4 w-4" /> Clear Filters
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="quotations">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="register">Purchase Register</TabsTrigger>
                    <TabsTrigger value="quotations">Price Comparison</TabsTrigger>
                </TabsList>

                <TabsContent value="register" className="mt-4 space-y-4">
                    <StatCard 
                        title="Total amount for the period" 
                        value={formatCurrency(filteredTotal)} 
                        icon={IndianRupee}
                        description="Sum of all purchases matching the current filter"
                    />
                    <Card>
                        <CardHeader>
                            <CardTitle>Purchase History</CardTitle>
                            <CardDescription>View all logged purchases and add PO numbers.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <PurchaseRegisterList registers={filteredPurchases} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="quotations" className="mt-4">
                    <QuotationList quotations={filteredQuotations} onEdit={handleEditQuotation} />
                </TabsContent>
            </Tabs>
            
            <AddPurchaseLedgerDialog isOpen={isAddLedgerOpen} setIsOpen={setIsAddLedgerOpen} />
            <CreateQuotationDialog isOpen={isCreateQuotationOpen} setIsOpen={handleCloseDialog} existingQuotation={editingQuotation} />
        </div>
    );
}
