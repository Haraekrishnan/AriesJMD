
'use client';

import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Search, PlusCircle, Briefcase, FileDown } from 'lucide-react';
import VendorListTable from '@/components/vendor-management/VendorListTable';
import { Input } from '@/components/ui/input';
import AddVendorDialog from '@/components/vendor-management/AddVendorDialog';
import EditVendorDialog from '@/components/vendor-management/EditVendorDialog';
import type { Vendor, Payment } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PaymentsTable from '@/components/payments/PaymentsTable';
import AddPaymentDialog from '@/components/payments/AddPaymentDialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';
import { isWithinInterval, parseISO } from 'date-fns';
import PaymentReportDownloads from '@/components/payments/PaymentReportDownloads';


export default function VendorManagementPage() {
    const { user, vendors, payments, can, pendingPaymentApprovalCount } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
    const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

    // Filters
    const [selectedVendorId, setSelectedVendorId] = useState('all');
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    const filteredPayments = useMemo(() => {
        return payments.filter(payment => {
            const vendorMatch = selectedVendorId === 'all' || payment.vendorId === selectedVendorId;
            const dateMatch = !dateRange?.from || isWithinInterval(parseISO(payment.date), { start: dateRange.from, end: dateRange.to || dateRange.from });
            return vendorMatch && dateMatch;
        });
    }, [payments, selectedVendorId, dateRange]);

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
        if (selectedVendorId !== 'all' && dateRange?.from) {
            return `Payments for ${vendors.find(v => v.id === selectedVendorId)?.name}`;
        }
        if (selectedVendorId !== 'all') {
            return `All Payments for ${vendors.find(v => v.id === selectedVendorId)?.name}`;
        }
        return 'All Payments';
    }, [selectedVendorId, dateRange, vendors]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Briefcase className="h-8 w-8" />
                    Vendor Ledger
                </h1>
                <div className="flex gap-2">
                    {canAddPayment && (
                        <Button onClick={() => setIsAddPaymentOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Payment
                        </Button>
                    )}
                    {can.manage_vendors && (
                        <Button variant="outline" onClick={() => setIsAddVendorOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Vendor
                        </Button>
                    )}
                </div>
            </div>
            
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
                                <DateRangePicker date={dateRange} onDateChange={setDateRange} />
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
            <AddPaymentDialog isOpen={isAddPaymentOpen} setIsOpen={setIsAddPaymentOpen} />
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
