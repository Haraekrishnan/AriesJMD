'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DeliveryNoteList from '@/components/delivery-notes/DeliveryNoteList';
import CreateDeliveryNoteDialog from '@/components/delivery-notes/CreateDeliveryNoteDialog';

export default function DeliveryNotesPage() {
  const { can, user } = useAuth();
  const [isCreateOutwardOpen, setIsCreateOutwardOpen] = useState(false);
  const [isCreateInwardOpen, setIsCreateInwardOpen] = useState(false);

  if (!user || !can.manage_delivery_notes) {
    return (
      <Card className="w-full max-w-md mx-auto mt-20">
        <CardHeader className="text-center items-center">
          <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>You do not have permission to view Delivery Notes.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Delivery Notes</h1>
          <p className="text-muted-foreground">Create and manage inward and outward delivery notes.</p>
        </div>
        <div className="flex gap-2">
            <Button onClick={() => setIsCreateInwardOpen(true)} variant="outline">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Inward Note
            </Button>
            <Button onClick={() => setIsCreateOutwardOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create Outward Note
            </Button>
        </div>
      </div>

      <Tabs defaultValue="outward">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="outward">Outward Delivery Notes</TabsTrigger>
          <TabsTrigger value="inward">Inward Delivery Notes</TabsTrigger>
        </TabsList>
        <TabsContent value="outward">
          <Card>
            <CardHeader>
              <CardTitle>Outward Notes</CardTitle>
              <CardDescription>Notes for items being sent out from the store.</CardDescription>
            </CardHeader>
            <CardContent>
              <DeliveryNoteList type="Outward" />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="inward">
          <Card>
            <CardHeader>
              <CardTitle>Inward Notes</CardTitle>
              <CardDescription>Scanned copies of notes for items received.</CardDescription>
            </CardHeader>
            <CardContent>
               <DeliveryNoteList type="Inward" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <CreateDeliveryNoteDialog isOpen={isCreateOutwardOpen} setIsOpen={setIsCreateOutwardOpen} type="Outward" />
      <CreateDeliveryNoteDialog isOpen={isCreateInwardOpen} setIsOpen={setIsCreateInwardOpen} type="Inward" />
    </div>
  );
}
