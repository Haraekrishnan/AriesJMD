

'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { useInventory } from '@/contexts/inventory-provider';
import { useConsumable } from '@/contexts/consumable-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import NewInternalRequestDialog from '@/components/requests/new-internal-request-dialog';
import InternalRequestTable from '@/components/requests/internal-request-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import NewManagementRequestDialog from '@/components/requests/NewManagementRequestDialog';
import ManagementRequestTable from '@/components/requests/ManagementRequestTable';
import { Badge } from '@/components/ui/badge';
import NewPpeRequestDialog from '@/components/requests/NewPpeRequestDialog';
import PpeRequestTable from '@/components/requests/PpeRequestTable';
import { Role } from '@/lib/types';
import NewConsumableRequestDialog from '@/components/requests/NewConsumableRequestDialog';
import { usePurchase } from '@/contexts/purchase-provider';

export default function MyRequestsPage() {
    const { user, roles, can } = useAuth();
    const { 
        internalRequests, 
        managementRequests, 
        ppeRequests,
        pendingConsumableRequestCount,
        updatedConsumableRequestCount,
        pendingGeneralRequestCount,
        updatedGeneralRequestCount,
        pendingManagementRequestCount,
        updatedManagementRequestCount,
        pendingPpeRequestCount,
        updatedPpeRequestCount,
     } = useInventory();
    const { consumableItems } = useConsumable();

    const [isNewRequestDialogOpen, setIsNewRequestDialogOpen] = useState(false);
    const [isNewConsumableRequestDialogOpen, setIsNewConsumableRequestDialogOpen] = useState(false);
    const [isNewMgmtRequestDialogOpen, setIsNewMgmtRequestDialogOpen] = useState(false);
    const [isNewPpeRequestDialogOpen, setIsNewPpeRequestDialogOpen] = useState(false);

    const consumableItemIds = useMemo(() => new Set(consumableItems.map(item => item.id)), [consumableItems]);

    const { consumableRequests, generalStoreRequests } = useMemo(() => {
        const consumables: any[] = [];
        const general: any[] = [];
        const corruptedRequestId = "-OaA1ma81MdDVw62D8Xg";

        internalRequests
            .filter(req => req.id !== corruptedRequestId)
            .forEach(req => {
                const isConsumableReq = req.items?.some(item => item.inventoryItemId && consumableItemIds.has(item.inventoryItemId));
                
                if (isConsumableReq) {
                    consumables.push(req);
                } else {
                    general.push(req);
                }
            });

        const filterAndSort = (requests: any[]) => {
          if (!user) return [];
          return requests
              .filter(req => req.requesterId === user.id || can.view_internal_store_request || can.manage_store_requests)
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }

        return {
            consumableRequests: filterAndSort(consumables),
            generalStoreRequests: filterAndSort(general),
        };
    }, [internalRequests, consumableItemIds, user, can.view_internal_store_request, can.manage_store_requests]);

    const visibleManagementRequests = useMemo(() => {
        if (!user || !managementRequests) return [];
        return managementRequests
            .filter(req => req.requesterId === user.id || req.recipientId === user.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [managementRequests, user]);
    
    const visiblePpeRequests = useMemo(() => {
        if (!user || !ppeRequests) return [];
        if (can.view_ppe_requests || can.manage_ppe_request) {
            return ppeRequests.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
        return ppeRequests
            .filter(req => req.requesterId === user.id)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [ppeRequests, user, can.view_ppe_requests, can.manage_ppe_request]);

    const consumableNotifCount = pendingConsumableRequestCount + updatedConsumableRequestCount;
    const generalNotifCount = pendingGeneralRequestCount + updatedGeneralRequestCount;
    const mgmtNotifCount = pendingManagementRequestCount + updatedManagementRequestCount;
    const ppeNotifCount = pendingPpeRequestCount + updatedPpeRequestCount;

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
            
            <Tabs defaultValue="ppe-requests">
                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-4 h-auto sm:h-10">
                    <TabsTrigger value="ppe-requests" className="flex items-center gap-2">
                        PPE Requests
                        {ppeNotifCount > 0 && (
                           <Badge variant="destructive">{ppeNotifCount}</Badge>
                        )}
                    </TabsTrigger>
                     <TabsTrigger value="consumable-requests" className="flex items-center gap-2">
                        Consumable Requests
                         {consumableNotifCount > 0 && (
                            <Badge variant="destructive">{consumableNotifCount}</Badge>
                         )}
                    </TabsTrigger>
                    <TabsTrigger value="store-requests" className="flex items-center gap-2">
                        General Store Requests
                         {generalNotifCount > 0 && (
                            <Badge variant="destructive">{generalNotifCount}</Badge>
                         )}
                    </TabsTrigger>
                    <TabsTrigger value="management-requests" className="flex items-center gap-2">
                        Management Requests
                         {mgmtNotifCount > 0 && (
                            <Badge variant="destructive">{mgmtNotifCount}</Badge>
                         )}
                    </TabsTrigger>
                </TabsList>
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
                <TabsContent value="consumable-requests">
                    <Card>
                        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <CardTitle>Consumable Requests</CardTitle>
                                <CardDescription>
                                    Request daily or job-specific consumables.
                                </CardDescription>
                            </div>
                            <Button onClick={() => setIsNewConsumableRequestDialogOpen(true)}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Request Consumables
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <InternalRequestTable requests={consumableRequests} showAcknowledge={false} />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="store-requests">
                    <Card>
                        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <CardTitle>General Store Requests</CardTitle>
                                <CardDescription>
                                    Request general items from the store inventory.
                                </CardDescription>
                            </div>
                            <Button onClick={() => setIsNewRequestDialogOpen(true)}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                New General Request
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <InternalRequestTable requests={generalStoreRequests} />
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
            <NewConsumableRequestDialog isOpen={isNewConsumableRequestDialogOpen} setIsOpen={setIsNewConsumableRequestDialogOpen} />
            <NewManagementRequestDialog isOpen={isNewMgmtRequestDialogOpen} setIsOpen={setIsNewMgmtRequestDialogOpen} />
            <NewPpeRequestDialog isOpen={isNewPpeRequestDialogOpen} setIsOpen={setIsNewPpeRequestDialogOpen} />
        </div>
    );
}
