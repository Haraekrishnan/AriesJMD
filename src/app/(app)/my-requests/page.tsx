
'use client';

import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ExternalLink, GanttChartSquare, PlusCircle } from 'lucide-react';
import NewInternalRequestDialog from '@/components/requests/new-internal-request-dialog';
import InternalRequestTable from '@/components/requests/internal-request-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import NewManagementRequestDialog from '@/components/requests/NewManagementRequestDialog';
import ManagementRequestTable from '@/components/requests/ManagementRequestTable';
import { Badge } from '@/components/ui/badge';
import NewPpeRequestDialog from '@/components/requests/NewPpeRequestDialog';
import PpeRequestTable from '@/components/requests/PpeRequestTable';

export default function MyRequestsPage() {
    const { user, roles, internalRequests, managementRequests, ppeRequests, pendingInternalRequestCount, updatedInternalRequestCount, pendingManagementRequestCount, updatedManagementRequestCount } = useAppContext();
    const [isNewRequestDialogOpen, setIsNewRequestDialogOpen] = useState(false);
    const [isNewMgmtRequestDialogOpen, setIsNewMgmtRequestDialogOpen] = useState(false);
    const [isNewPpeRequestDialogOpen, setIsNewPpeRequestDialogOpen] = useState(false);

    const isStoreApprover = useMemo(() => {
        if (!user) return false;
        const userRole = roles.find(r => r.name === user.role);
        return userRole?.permissions.includes('approve_store_requests');
    }, [user, roles]);

    const isManager = useMemo(() => {
        if(!user) return false;
        return user.role === 'Manager' || user.role === 'Admin';
    }, [user]);

    const visibleInternalRequests = useMemo(() => {
        if (!user) return [];
        return internalRequests
            .filter(req => req.requesterId === user.id || isStoreApprover)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [internalRequests, user, isStoreApprover]);
    
    const visibleManagementRequests = useMemo(() => {
        if (!user) return [];
        return managementRequests
            .filter(req => req.requesterId === user.id || req.recipientId === user.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [managementRequests, user]);
    
    const visiblePpeRequests = useMemo(() => {
        if (!user) return [];
        return ppeRequests
            .filter(req => req.requesterId === user.id || isManager)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [ppeRequests, user, isManager]);

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">My Requests</h1>
                    <p className="text-muted-foreground">
                        Track your submitted requests or create a new PPE request.
                    </p>
                </div>
            </div>
            
            <Tabs defaultValue="store-requests">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="store-requests">Internal Store Requests
                         {(pendingInternalRequestCount + updatedInternalRequestCount > 0) && (
                            <Badge className="ml-2" variant="destructive">{pendingInternalRequestCount + updatedInternalRequestCount}</Badge>
                         )}
                    </TabsTrigger>
                    <TabsTrigger value="ppe-requests">PPE Requests</TabsTrigger>
                    <TabsTrigger value="management-requests">Management Requests
                         {(pendingManagementRequestCount + updatedManagementRequestCount > 0) && (
                            <Badge className="ml-2" variant="destructive">{pendingManagementRequestCount + updatedManagementRequestCount}</Badge>
                         )}
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="store-requests">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Internal Store Requests</CardTitle>
                                <CardDescription>
                                    Create new requests and track their status.
                                </CardDescription>
                            </div>
                            <Button onClick={() => setIsNewRequestDialogOpen(true)}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                New Store Request
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <InternalRequestTable requests={visibleInternalRequests} />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="ppe-requests">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>PPE Requests</CardTitle>
                                <CardDescription>
                                    Request coveralls and safety shoes for personnel.
                                </CardDescription>
                            </div>
                            <Button onClick={() => setIsNewPpeRequestDialogOpen(true)}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                New PPE Request
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <PpeRequestTable requests={visiblePpeRequests} />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="management-requests">
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Management Requests</CardTitle>
                                <CardDescription>
                                    Direct requests to supervisors and management for non-store items.
                                </CardDescription>
                            </div>
                            <Button onClick={() => setIsNewMgmtRequestDialogOpen(true)}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                New Management Request
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <ManagementRequestTable requests={visibleManagementRequests} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>


            <NewInternalRequestDialog isOpen={isNewRequestDialogOpen} setIsOpen={setIsNewRequestDialogOpen} />
            <NewManagementRequestDialog isOpen={isNewMgmtRequestDialogOpen} setIsOpen={setIsNewMgmtRequestDialogOpen} />
            <NewPpeRequestDialog isOpen={isNewPpeRequestDialogOpen} setIsOpen={setIsNewPpeRequestDialogOpen} />
        </div>
    );
}
