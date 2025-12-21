
'use client';
import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, AlertTriangle } from 'lucide-react';
import NewDirectiveDialog from '@/components/directives/NewDirectiveDialog';
import DirectiveList from '@/components/directives/DirectiveList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DirectivesPage() {
    const { user, can, directives } = useAppContext();
    const [isNewDirectiveOpen, setIsNewDirectiveOpen] = useState(false);

    const { activeDirectives, archivedDirectives } = useMemo(() => {
        if (!user) return { activeDirectives: [], archivedDirectives: [] };

        const myDirectives = directives.filter(d => 
            d.toUserId === user.id || 
            (d.ccUserIds || []).includes(user.id) ||
            d.creatorId === user.id
        );
        
        const active = myDirectives.filter(d => d.status !== 'Closed');
        const archived = myDirectives.filter(d => d.status === 'Closed');

        return { 
            activeDirectives: active.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()),
            archivedDirectives: archived.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
        };

    }, [user, directives]);

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
                    <h1 className="text-3xl font-bold tracking-tight">Directives</h1>
                    <p className="text-muted-foreground">Your internal communication inbox.</p>
                </div>
                <Button onClick={() => setIsNewDirectiveOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Directive
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>My Directives</CardTitle>
                    <CardDescription>Manage communications sent to you or by you.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="active">
                        <TabsList>
                            <TabsTrigger value="active">Active ({activeDirectives.length})</TabsTrigger>
                            <TabsTrigger value="archived">Archived ({archivedDirectives.length})</TabsTrigger>
                        </TabsList>
                        <TabsContent value="active" className="mt-4">
                            <DirectiveList directives={activeDirectives} />
                        </TabsContent>
                        <TabsContent value="archived" className="mt-4">
                            <DirectiveList directives={archivedDirectives} />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <NewDirectiveDialog isOpen={isNewDirectiveOpen} setIsOpen={setIsNewDirectiveOpen} />
        </div>
    );
}
