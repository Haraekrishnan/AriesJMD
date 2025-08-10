
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import PurchaseRegisterForm from '@/components/purchase-register/PurchaseRegisterForm';
import { useAppContext } from '@/contexts/app-provider';
import { AlertTriangle } from 'lucide-react';


export default function PurchaseRegisterPage() {
    const { can } = useAppContext();

    if (!can.manage_purchase_register) {
        return (
            <Card className="w-full max-w-md mx-auto mt-20">
               <CardHeader className="text-center items-center">
                   <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4">
                       <AlertTriangle className="h-10 w-10 text-destructive" />
                   </div>
                   <CardTitle>Access Denied</CardTitle>
                   <CardDescription>You do not have permission to manage the purchase register.</CardDescription>
               </CardHeader>
           </Card>
        );
    }
    
    return (
        <div className="space-y-8">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Purchase Register</h1>
                    <p className="text-muted-foreground">Log new purchases and track item costs.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>New Purchase Entry</CardTitle>
                    <CardDescription>Select a vendor and add the items to be purchased. The entry will be sent for approval.</CardDescription>
                </CardHeader>
                <CardContent>
                    <PurchaseRegisterForm />
                </CardContent>
            </Card>
        </div>
    );
}
