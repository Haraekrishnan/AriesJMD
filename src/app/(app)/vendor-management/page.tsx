
'use client';

import { useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Search, PlusCircle } from 'lucide-react';
import VendorListTable from '@/components/vendor-management/VendorListTable';
import { Input } from '@/components/ui/input';
import AddVendorDialog from '@/components/vendor-management/AddVendorDialog';
import EditVendorDialog from '@/components/vendor-management/EditVendorDialog';
import type { Vendor } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PaymentsTable from '@/components/payments/PaymentsTable';
import AddPaymentDialog from '@/components/payments/AddPaymentDialog';

export default function VendorManagementPage() {
    const { vendors, can } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
    const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

    const filteredVendors = vendors.filter(vendor => 
        vendor.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEditVendor = (vendor: Vendor) => {
        setEditingVendor(vendor);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">
                    Vendor Ledger
                </h1>
                {can.manage_vendors && (
                    <div className="flex gap-2">
                        <Button onClick={() => setIsAddPaymentOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Payment
                        </Button>
                        <Button variant="outline" onClick={() => setIsAddVendorOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Vendor
                        </Button>
                    </div>
                )}
            </div>
            
            <Tabs defaultValue="payments">
                <TabsList>
                    <TabsTrigger value="payments">Payments Ledger</TabsTrigger>
                    <TabsTrigger value="vendors">Vendor List</TabsTrigger>
                </TabsList>
                <TabsContent value="payments">
                    <PaymentsTable />
                </TabsContent>
                <TabsContent value="vendors">
                    <div className="flex justify-between items-center mb-4">
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
                    <div className="border rounded-lg">
                        <VendorListTable vendors={filteredVendors} onEdit={handleEditVendor} />
                    </div>
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
