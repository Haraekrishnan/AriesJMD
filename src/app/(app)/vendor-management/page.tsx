
'use client';

import { useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Download, Search } from 'lucide-react';
import VendorListTable from '@/components/vendor-management/VendorListTable';
import { Input } from '@/components/ui/input';

export default function VendorManagementPage() {
    const { vendors } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredVendors = vendors.filter(vendor => 
        vendor.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">
                    Vendors <span className="text-lg font-normal text-muted-foreground">{vendors.length}</span>
                </h1>
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
                <VendorListTable vendors={filteredVendors} />
            </div>
        </div>
    );
}
