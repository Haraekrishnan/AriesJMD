'use client';
import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, FileCheck2, AlertTriangle, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { InspectionChecklist } from '@/lib/types';
import CreateInspectionDialog from '@/components/inspections/CreateInspectionDialog';
import ViewInspectionDialog from '@/components/inspections/ViewInspectionDialog';
import { format, parseISO } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function InspectionsPage() {
  const { can, inspectionChecklists, inventoryItems, users } = useAppContext();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewingChecklist, setViewingChecklist] = useState<InspectionChecklist | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const canPerformInspection = can.perform_inventory_inspection;

  const filteredChecklists = useMemo(() => {
    const sorted = [...(inspectionChecklists || [])].sort((a, b) => parseISO(b.inspectionDate).getTime() - parseISO(a.inspectionDate).getTime());
    if (!searchTerm) return sorted;
    
    const lowercasedTerm = searchTerm.toLowerCase();
    return sorted.filter(checklist => {
      const item = inventoryItems.find(i => i.id === checklist.itemId);
      return item?.name.toLowerCase().includes(lowercasedTerm) ||
             item?.serialNumber?.toLowerCase().includes(lowercasedTerm) ||
             item?.ariesId?.toLowerCase().includes(lowercasedTerm);
    });
  }, [inspectionChecklists, searchTerm, inventoryItems]);

  if (!canPerformInspection) {
    return (
        <Card className="w-full max-w-md mx-auto mt-20">
           <CardHeader className="text-center items-center">
               <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4">
                   <AlertTriangle className="h-10 w-10 text-destructive" />
               </div>
               <CardTitle>Access Denied</CardTitle>
               <CardDescription>You do not have permission to perform inspections.</CardDescription>
           </CardHeader>
       </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <FileCheck2 /> Equipment Inspections
          </h1>
          <p className="text-muted-foreground">Create and manage semi-annual inspection checklists.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Inspection
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Inspection History</CardTitle>
              <CardDescription>
                A log of all completed inspection checklists.
              </CardDescription>
            </div>
            <div className="w-full sm:w-64">
              <Input
                placeholder="Search by item name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Serial No.</TableHead>
                <TableHead>Inspector</TableHead>
                <TableHead>Inspection Date</TableHead>
                <TableHead>Verdict</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredChecklists.length > 0 ? filteredChecklists.map(checklist => {
                const item = inventoryItems.find(i => i.id === checklist.itemId);
                const inspector = users.find(u => u.id === checklist.inspectedBy);
                return (
                  <TableRow key={checklist.id}>
                    <TableCell>{item?.name || 'Unknown Item'}</TableCell>
                    <TableCell>{item?.serialNumber || 'N/A'}</TableCell>
                    <TableCell>{inspector?.name || 'Unknown'}</TableCell>
                    <TableCell>{format(parseISO(checklist.inspectionDate), 'dd MMM, yyyy')}</TableCell>
                    <TableCell>{checklist.verdict}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setViewingChecklist(checklist)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              }) : (
                <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">No inspections found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CreateInspectionDialog isOpen={isCreateOpen} setIsOpen={setIsCreateOpen} />
      {viewingChecklist && (
        <ViewInspectionDialog
          isOpen={!!viewingChecklist}
          setIsOpen={() => setViewingChecklist(null)}
          checklist={viewingChecklist}
        />
      )}
    </div>
  );
}
