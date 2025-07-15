'use client';

import { useMemo, useState } from 'react';
import { useAppContext } from '@/hooks/use-app-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ExternalLink, GanttChartSquare, PlusCircle } from 'lucide-react';
import NewInternalRequestDialog from '@/components/requests/NewInternalRequestDialog';
import InternalRequestTable from '@/components/requests/InternalRequestTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import NewManagementRequestDialog from '@/components/requests/NewManagementRequestDialog';
import ManagementRequestTable from '@/components/requests/ManagementRequestTable';
import { Badge } from '@/components/ui/badge';

export default function MyRequestsPage() {
    const { user, internalRequests, managementRequests, pendingInternalRequestCount, updatedInternalRequestCount, pendingManagementRequestCount, updatedManagementRequestCount } = useAppContext();
    const [isNewRequestDialogOpen, setIsNewRequestDialogOpen] = useState(false);
    const [isNewMgmtRequestDialogOpen, setIsNewMgmtRequestDialogOpen] = useState(false);

    const visibleInternalRequests = useMemo(() => {
        if (!user) return [];
        return internalRequests.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [internalRequests, user]);
    
    const visibleManagementRequests = useMemo(() => {
        if (!user) return [];
        return managementRequests.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [managementRequests, user]);

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">My Requests</h1>
                    <p className="text-muted-foreground">
                        Track your submitted requests or create a new PPE request.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button asChild>
                        <Link href="https://docs.google.com/forms/d/1gT2AtCHMgCLgLNaYErxKMKju2Z0OCax1UjM40P_EWrQ/viewform" target="_blank">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            PPE Request Form
                        </Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href="https://docs.google.com/spreadsheets/d/15p72GMqmomDqE1vuHbE7JwoULRynOZCf7S2WPq9KYUY/edit?gid=589863394#gid=589863394" target="_blank">
                             <GanttChartSquare className="mr-2 h-4 w-4" />
                            View Request Status
                        </Link>
                    </Button>
                </div>
            </div>
            
            <Tabs defaultValue="store-requests">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="store-requests">Internal Store Requests
                         {(pendingInternalRequestCount + updatedInternalRequestCount > 0) && (
                            <Badge className="ml-2" variant="secondary">{pendingInternalRequestCount + updatedInternalRequestCount}</Badge>
                         )}
                    </TabsTrigger>
                    <TabsTrigger value="management-requests">Management Requests
                         {(pendingManagementRequestCount + updatedManagementRequestCount > 0) && (
                            <Badge className="ml-2" variant="secondary">{pendingManagementRequestCount + updatedManagementRequestCount}</Badge>
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
        </div>
    );
}
