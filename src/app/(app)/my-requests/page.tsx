
'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { useInventory } from '@/contexts/inventory-provider';
import { useConsumable } from '@/contexts/consumable-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, HardHat, Package, Store, ChevronRight } from 'lucide-react';
import styles from '@/components/requests/my-requests.module.css';
import NewInternalRequestDialog from '@/components/requests/new-internal-request-dialog';
import InternalRequestTable from '@/components/requests/internal-request-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
        ppeRequests,
        pendingConsumableRequestCount,
        updatedConsumableRequestCount,
        pendingGeneralRequestCount,
        updatedGeneralRequestCount,
        pendingPpeRequestCount,
        updatedPpeRequestCount,
     } = useInventory();
    const { consumableItems } = useConsumable();

    const [requestType, setRequestType] = useState('ppe-requests');
    const [isNewRequestDialogOpen, setIsNewRequestDialogOpen] = useState(false);
    const [isNewConsumableRequestDialogOpen, setIsNewConsumableRequestDialogOpen] = useState(false);
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
    const ppeNotifCount = pendingPpeRequestCount + updatedPpeRequestCount;

    return (
        <div className={styles.page}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">My Requests</h1>
                    <p className="text-muted-foreground">
                        Track, manage and create PPE and store requests easily.
                    </p>
                </div>
                <Button className={styles.create} onClick={() => requestType === 'ppe-requests' ? setIsNewPpeRequestDialogOpen(true) : requestType === 'consumable-requests' ? setIsNewConsumableRequestDialogOpen(true) : setIsNewRequestDialogOpen(true)}><PlusCircle size={17}/>{requestType === 'ppe-requests' ? 'New PPE Request' : requestType === 'consumable-requests' ? 'Request Consumables' : 'New General Request'}</Button>
            </div>
            
            <Tabs value={requestType} onValueChange={setRequestType}>
                <TabsList className={styles.categories} aria-label="Request category">
                    {[
                        {value:'ppe-requests',title:'PPE Requests',count:visiblePpeRequests.length,notifications:ppeNotifCount,icon:HardHat,tone:'blue'},
                        {value:'consumable-requests',title:'Consumable Requests',count:consumableRequests.length,notifications:consumableNotifCount,icon:Package,tone:'green'},
                        {value:'store-requests',title:'General Store Requests',count:generalStoreRequests.length,notifications:generalNotifCount,icon:Store,tone:'purple'},
                    ].map(({value,title,count,notifications,icon:Icon,tone}) => <TabsTrigger key={value} value={value} className={styles.category+' '+styles[tone]}>
                        <span className={styles.categoryIcon}><Icon aria-hidden="true" /></span>
                        <span className={styles.categoryText}><span>{title}</span><strong>{count.toLocaleString()} <ChevronRight aria-hidden="true" size={18}/></strong></span>
                        {notifications > 0 && <Badge variant="destructive" className={styles.notification} aria-label={notifications+' notifications'}>{notifications}</Badge>}
                    </TabsTrigger>)}
                </TabsList>
                <TabsContent value="ppe-requests">
                    <Card className={styles.register}>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>PPE Requests</CardTitle>
                                <CardDescription>
                                    Request coveralls and safety shoes for personnel.
                                </CardDescription>
                            </div>

                        </CardHeader>
                        <CardContent>
                            <PpeRequestTable requests={visiblePpeRequests} />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="consumable-requests">
                    <Card className={styles.register}>
                        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <CardTitle>Consumable Requests</CardTitle>
                                <CardDescription>
                                    Request daily or job-specific consumables.
                                </CardDescription>
                            </div>

                        </CardHeader>
                        <CardContent>
                            <InternalRequestTable requests={consumableRequests} showAcknowledge={false} isConsumable={true} />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="store-requests">
                    <Card className={styles.register}>
                        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <CardTitle>General Store Requests</CardTitle>
                                <CardDescription>
                                    Request general items from the store inventory.
                                </CardDescription>
                            </div>

                        </CardHeader>
                        <CardContent>
                            <InternalRequestTable requests={generalStoreRequests} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>


            <NewInternalRequestDialog isOpen={isNewRequestDialogOpen} setIsOpen={setIsNewRequestDialogOpen} />
            <NewConsumableRequestDialog isOpen={isNewConsumableRequestDialogOpen} setIsOpen={setIsNewConsumableRequestDialogOpen} />
            <NewPpeRequestDialog isOpen={isNewPpeRequestDialogOpen} setIsOpen={setIsNewPpeRequestDialogOpen} />
        </div>
    );
}