
'use client';

import { useState } from 'react';
import { useGeneral } from '@/contexts/general-provider';
import { useAuth } from '@/contexts/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, AlertTriangle } from 'lucide-react';
import ServiceCodeList from '@/components/service-codes/ServiceCodeList';
import AddServiceCodeDialog from '@/components/service-codes/AddServiceCodeDialog';
import type { ServiceCode } from '@/lib/types';
import EditServiceCodeDialog from '@/components/service-codes/EditServiceCodeDialog';

export default function ServiceCodesPage() {
    const { can } = useAuth();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingCode, setEditingCode] = useState<ServiceCode | null>(null);

    if (!can.manage_service_codes) {
        return (
            <Card className="w-full max-w-md mx-auto mt-20">
               <CardHeader className="text-center items-center">
                   <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4">
                       <AlertTriangle className="h-10 w-10 text-destructive" />
                   </div>
                   <CardTitle>Access Denied</CardTitle>
                   <CardDescription>You do not have permission to manage service codes.</CardDescription>
               </CardHeader>
           </Card>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Service Code Register</h1>
                    <p className="text-muted-foreground">Manage service codes, descriptions, and rates for JMS entries.</p>
                </div>
                <Button onClick={() => setIsAddOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Service Code
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Registered Service Codes</CardTitle>
                </CardHeader>
                <CardContent>
                    <ServiceCodeList onEdit={setEditingCode} />
                </CardContent>
            </Card>

            <AddServiceCodeDialog isOpen={isAddOpen} setIsOpen={setIsAddOpen} />
            {editingCode && (
                <EditServiceCodeDialog 
                    isOpen={!!editingCode}
                    setIsOpen={() => setEditingCode(null)}
                    serviceCode={editingCode}
                />
            )}
        </div>
    );
}

