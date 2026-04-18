'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AddIgpOgpForm from '@/components/igp-ogp/AddIgpOgpForm';
import IgpOgpList from '@/components/igp-ogp/IgpOgpList';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-provider';
import { useInventory } from '@/contexts/inventory-provider';

export default function IgpOgpPage() {
    const { can } = useAuth();
    const { igpOgpRecords } = useInventory();

    if (!can.manage_igp_ogp && !can.view_all) {
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
            <div>
                <h1 className="text-3xl font-bold tracking-tight">IGP / OGP Register</h1>
                <p className="text-muted-foreground">Log and track all inward and outward goods passes.</p>
            </div>

            {can.manage_igp_ogp && (
              <Card>
                  <CardHeader>
                      <CardTitle>New Entry</CardTitle>
                      <CardDescription>Create a new Inward Goods Pass (IGP) or Outward Goods Pass (OGP) record.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <AddIgpOgpForm />
                  </CardContent>
              </Card>
            )}
            
            <Card>
                <CardHeader>
                    <CardTitle>Register History</CardTitle>
                    <CardDescription>View all past IGP and OGP records.</CardDescription>
                </CardHeader>
                <CardContent>
                    <IgpOgpList records={igpOgpRecords} />
                </CardContent>
            </Card>
        </div>
    );
}
