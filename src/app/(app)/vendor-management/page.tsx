
'use client';

import { useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VendorListTable from '@/components/vendor-management/VendorListTable';
import AddVendorDialog from '@/components/vendor-management/AddVendorDialog';
import PaymentsTable from '@/components/payments/PaymentsTable';
import AddPaymentDialog from '@/components/payments/AddPaymentDialog';

export default function VendorManagementPage() {
    const { can, vendors, payments } = useAppContext();
    const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
    const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);

    if (!can.manage_payments) {
        return (
            <Card className="w-full max-w-md mx-auto mt-20">
                <CardHeader className="text-center items-center">
                    <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4">
                        <AlertTriangle className="h-10 w-10 text-destructive" />
                    </div>
                    <CardTitle>Access Denied</CardTitle>
                    <CardDescription>You do not have permission to manage vendors and payments.</CardDescription>
                </CardHeader>
            </Card>
        );
    }
    
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Vendor Management</h1>
                <p className="text-muted-foreground">Manage vendors and track their payment statuses.</p>
            </div>

            <Tabs defaultValue="payments">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="payments">Payments</TabsTrigger>
                    <TabsTrigger value="vendors">Vendors</TabsTrigger>
                </TabsList>
                 <TabsContent value="payments" className="mt-4">
                    <Card>
                        <CardHeader>
                             <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Payment Records</CardTitle>
                                    <CardDescription>A list of all payment records.</CardDescription>
                                </div>
                                {can.manage_payments && (
                                    <Button onClick={() => setIsAddPaymentOpen(true)}>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Add Payment
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                           <PaymentsTable payments={payments} />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="vendors" className="mt-4">
                    <Card>
                        <CardHeader>
                             <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Vendor List</CardTitle>
                                    <CardDescription>A list of all vendors in the system.</CardDescription>
                                </div>
                                {can.manage_vendors && (
                                    <Button onClick={() => setIsAddVendorOpen(true)}>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Add Vendor
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                           <VendorListTable vendors={vendors} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            <AddVendorDialog isOpen={isAddVendorOpen} setIsOpen={setIsAddVendorOpen} />
            <AddPaymentDialog isOpen={isAddPaymentOpen} setIsOpen={setIsAddPaymentOpen} />
        </div>
    );
}
