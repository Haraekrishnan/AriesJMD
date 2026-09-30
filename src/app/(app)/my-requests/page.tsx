
'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { useInventory } from '@/contexts/inventory-provider';
import { useConsumable } from '@/contexts/consumable-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, HardHat, Package, Store, ChevronRight } from 'lucide-react';
import { summarizeRequests, myRequestLists } from '@/components/requests/request-summary';
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
    const { internalRequests, ppeRequests } = useInventory();
    const { consumableItems } = useConsumable();

    const [requestType, setRequestType] = useState('ppe-requests');
    const [isNewRequestDialogOpen, setIsNewRequestDialogOpen] = useState(false);
    const [isNewConsumableRequestDialogOpen, setIsNewConsumableRequestDialogOpen] = useState(false);
    const [isNewPpeRequestDialogOpen, setIsNewPpeRequestDialogOpen] = useState(false);

    const consumableItemIds = useMemo(() => new Set(consumableItems.map(item => item.id)), [consumableItems]);

    const visible = useMemo(() => myRequestLists(ppeRequests || [], internalRequests || [], user?.id, can), [ppeRequests, internalRequests, user?.id, can]);
    const visiblePpeRequests = visible.ppeRequests;
    const {consumableRequests, generalStoreRequests} = useMemo(() => ({
        consumableRequests: visible.internalRequests.filter(req => req.items?.some(item => item.inventoryItemId && consumableItemIds.has(item.inventoryItemId))),
        generalStoreRequests: visible.internalRequests.filter(req => !req.items?.some(item => item.inventoryItemId && consumableItemIds.has(item.inventoryItemId))),
    }), [visible.internalRequests, consumableItemIds]);

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
                        {value:'ppe-requests',title:'PPE Requests',summary:summarizeRequests(visiblePpeRequests),icon:HardHat,tone:'blue'},
                        {value:'consumable-requests',title:'Consumable Requests',summary:summarizeRequests(consumableRequests),icon:Package,tone:'green'},
                        {value:'store-requests',title:'General Store Requests',summary:summarizeRequests(generalStoreRequests),icon:Store,tone:'purple'},
                    ].map(({value,title,summary,icon:Icon,tone}) => <TabsTrigger key={value} value={value} className={styles.category+' '+styles[tone]}>
                        <span className={styles.categoryIcon}><Icon aria-hidden="true" /></span>
                        <span className={styles.categoryText}><span>{title}</span><strong>{summary.total.toLocaleString()} <ChevronRight aria-hidden="true" size={18}/></strong><small className={styles.countDetails}>Total requests · {summary.completed.toLocaleString()} completed</small></span>
                        <Badge variant={summary.active > 0 ? 'destructive' : 'secondary'} className={styles.notification} aria-label={summary.active+' active requests'}>{summary.active} active</Badge>
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