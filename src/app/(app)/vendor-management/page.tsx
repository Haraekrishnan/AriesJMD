
'use client';

import { useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Download, Search, PlusCircle } from 'lucide-react';
import VendorListTable from '@/components/vendor-management/VendorListTable';
import { Input } from '@/components/ui/input';
import AddVendorDialog from '@/components/vendor-management/AddVendorDialog';
import EditVendorDialog from '@/components/vendor-management/EditVendorDialog';
import { Vendor } from '@/lib/types';

export default function VendorManagementPage() {
    const { vendors, can } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
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
                    Vendors <span className="text-lg font-normal text-muted-foreground">{vendors.length}</span>
                </h1>
                {can.manage_vendors && (
                    <Button onClick={() => setIsAddVendorOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Vendor
                    </Button>
                )}
            </div>

            <div className="flex justify-between items-center">
                 <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Filter & Search Vendors" 
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                </Button>
            </div>

            <div className="border rounded-lg">
                <VendorListTable vendors={filteredVendors} onEdit={handleEditVendor} />
            </div>

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
