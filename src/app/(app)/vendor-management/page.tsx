
'use client';

import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Search, PlusCircle, Briefcase, FileDown, IndianRupee, Handshake } from 'lucide-react';
import VendorListTable from '@/components/vendor-management/VendorListTable';
import { Input } from '@/components/ui/input';
import AddVendorDialog from '@/components/vendor-management/AddVendorDialog';
import EditVendorDialog from '@/components/vendor-management/EditVendorDialog';
import type { Vendor, Payment } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PaymentsTable from '@/components/payments/PaymentsTable';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';
import { format, isWithinInterval, parseISO, getYear, getMonth, startOfYear, endOfYear, startOfMonth, endOfMonth, subYears, addYears } from 'date-fns';
import PaymentReportDownloads from '@/components/payments/PaymentReportDownloads';
import { Badge } from '@/components/ui/badge';
import StatCard from '@/components/dashboard/stat-card';


export default function VendorManagementPage() {
    const { user, vendors, payments, can, pendingPaymentApprovalCount } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

    // Filters
    const [selectedVendorId, setSelectedVendorId] = useState('all');
    const [filterType, setFilterType] = useState<'year' | 'financial-year' | 'month' | 'custom'>('year');
    const [selectedYear, setSelectedYear] = useState<string>(getYear(new Date()).toString());
    const [selectedMonth, setSelectedMonth] = useState<string>((getMonth(new Date()) + 1).toString());
    const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();

    const availableYears = useMemo(() => {
        const years = new Set(payments.map(p => getYear(parseISO(p.date))));
        const currentYear = getYear(new Date());
        years.add(currentYear);
        return Array.from(years).sort((a,b) => b-a);
    }, [payments]);

    const filteredPayments = useMemo(() => {
        return payments.filter(payment => {
            const vendorMatch = selectedVendorId === 'all' || payment.vendorId === selectedVendorId;
            if (!vendorMatch) return false;

            const paymentDate = parseISO(payment.date);
            let dateMatch = false;

            if (filterType === 'year') {
                dateMatch = getYear(paymentDate) === parseInt(selectedYear, 10);
            } else if (filterType === 'financial-year') {
                const year = parseInt(selectedYear, 10);
                const start = new Date(year, 3, 1); // April 1st
                const end = new Date(year + 1, 2, 31); // March 31st
                dateMatch = isWithinInterval(paymentDate, { start, end });
            } else if (filterType === 'month') {
                const year = parseInt(selectedYear, 10);
                const month = parseInt(selectedMonth, 10) - 1;
                const start = startOfMonth(new Date(year, month));
                const end = endOfMonth(new Date(year, month));
                dateMatch = isWithinInterval(paymentDate, { start, end });
            } else if (filterType === 'custom' && customDateRange?.from) {
                const end = customDateRange.to || customDateRange.from;
                dateMatch = isWithinInterval(paymentDate, { start: customDateRange.from, end });
            } else if (filterType === 'year') { // Default case if others don't match
                 dateMatch = getYear(paymentDate) === parseInt(selectedYear, 10);
            }
            
            return dateMatch;
        });
    }, [payments, selectedVendorId, filterType, selectedYear, selectedMonth, customDateRange]);

    const filteredTotal = useMemo(() => {
        return filteredPayments.reduce((acc, p) => acc + p.amount, 0);
    }, [filteredPayments]);
    
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amount);
    }

    const filteredVendors = vendors.filter(vendor => 
        vendor.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEditVendor = (vendor: Vendor) => {
        setEditingVendor(vendor);
    };
    
    const canAddPayment = useMemo(() => {
        if (!user) return false;
        return user.role === 'Admin' || user.role === 'Project Coordinator';
    }, [user]);

    const ledgerTitle = useMemo(() => {
        if (selectedVendorId !== 'all') {
            return `Payments for ${vendors.find(v => v.id === selectedVendorId)?.name}`;
        }
        return 'All Payments';
    }, [selectedVendorId, vendors]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Briefcase className="h-8 w-8" />
                    Vendor Ledger
                </h1>
                <div className="flex gap-2">
                    {can.manage_vendors && (
                        <Button variant="outline" onClick={() => setIsAddVendorOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Vendor
                        </Button>
                    )}
                </div>
            </div>
            
             <StatCard 
                title="Total amount for the period" 
                value={formatCurrency(filteredTotal)} 
                icon={IndianRupee}
                description="Sum of all payments matching the current filter"
            />

            <Tabs defaultValue="payments" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="payments" className="flex items-center gap-2">
                        Payments Ledger
                        {pendingPaymentApprovalCount > 0 && <Badge variant="destructive">{pendingPaymentApprovalCount}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="vendors">Vendor List</TabsTrigger>
                </TabsList>
                <TabsContent value="payments" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Filters</CardTitle>
                            <CardDescription>Filter the payment ledger by vendor and date range.</CardDescription>
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
                                <PaymentReportDownloads payments={filteredPayments} />
                            </div>
                        </CardHeader>
                        <CardContent>
                             <PaymentsTable payments={filteredPayments} title={ledgerTitle} />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="vendors" className="mt-4">
                     <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>All Vendors</CardTitle>
                                <div className="relative w-full max-w-sm">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        placeholder="Filter & Search Vendors" 
                                        className="pl-9"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <VendorListTable vendors={filteredVendors} onEdit={handleEditVendor} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <AddVendorDialog isOpen={isAddVendorOpen} setIsOpen={setIsAddVendorOpen} />
            {editingVendor && (
                <EditVendorDialog
                    isOpen={!!editingVendor}
                    setIsOpen={() => setEditingVendor(null)}
                    vendor={editingVendor}
                />
            )}
        </div>
    );
}
