'use client';

import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, AlertTriangle } from 'lucide-react';
import NewManagementRequestDialog from '@/components/requests/NewManagementRequestDialog';
import ManagementRequestList from '@/components/requests/ManagementRequestList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ManagementRequestsPage() {
    const { user, can, managementRequests = [] } = useAppContext();
    const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);

    const { activeRequests, archivedRequests } = useMemo(() => {
        if (!user) return { activeRequests: [], archivedRequests: [] };

        const myRequests = managementRequests.filter(d => 
            d.toUserId === user.id || 
            (d.ccUserIds || []).includes(user.id) ||
            d.creatorId === user.id
        );
        
        const active = myRequests.filter(d => d.status !== 'Closed');
        const archived = myRequests.filter(d => d.status === 'Closed');

        return { 
            activeRequests: active.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()),
            archivedRequests: archived.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
        };

    }, [user, managementRequests]);

    if (!can.manage_directives) {
        return (
            <Card className="w-full max-w-md mx-auto mt-20">
               <CardHeader className="text-center items-center">
                   <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4">
                       <AlertTriangle className="h-10 w-10 text-destructive" />
                   </div>
                   <CardTitle>Access Denied</CardTitle>
                   <CardDescription>You do not have permission to view this page.</CardDescription>
               </CardHeader>
           </Card>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Management Requests</h1>
                    <p className="text-muted-foreground">Your internal communication inbox.</p>
                </div>
                <Button onClick={() => setIsNewRequestOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Request
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>My Requests</CardTitle>
                    <CardDescription>Manage communications sent to you or by you.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="active">
                        <TabsList>
                            <TabsTrigger value="active">Active ({activeRequests.length})</TabsTrigger>
                            <TabsTrigger value="archived">Archived ({archivedRequests.length})</TabsTrigger>
                        </TabsList>
                        <TabsContent value="active" className="mt-4">
                            <ManagementRequestList requests={activeRequests} />
                        </TabsContent>
                        <TabsContent value="archived" className="mt-4">
                            <ManagementRequestList requests={archivedRequests} />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <NewManagementRequestDialog isOpen={isNewRequestOpen} setIsOpen={setIsNewRequestOpen} />
        </div>
    );
}
