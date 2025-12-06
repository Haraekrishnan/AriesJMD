
'use client';
import { useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { TpCertList, InventoryItem, UTMachine, DftMachine, Anemometer, DigitalCamera, OtherEquipment, LaptopDesktop, MobileSim } from '@/lib/types';
import { DatePickerInput } from '../ui/date-picker-input';
import { parseISO, isValid } from 'date-fns';
import { Checkbox } from '../ui/checkbox';

interface EditableItem {
  itemId: string;
  itemType: 'Inventory' | 'UTMachine' | 'DftMachine' | 'Anemometer' | 'DigitalCamera' | 'OtherEquipment' | 'LaptopDesktop' | 'MobileSim';
  materialName: string;
  manufacturerSrNo: string;
  tpInspectionDueDate: Date | null;
  certificateUrl: string;
}

interface UpdateCertValidityDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  certList: TpCertList;
}

export default function UpdateCertValidityDialog({ isOpen, setIsOpen, certList }: UpdateCertValidityDialogProps) {
  const { 
      inventoryItems, utMachines, dftMachines, anemometers, digitalCameras, otherEquipments, laptopsDesktops, mobileSims,
      updateInventoryItem, updateUTMachine, updateDftMachine, updateAnemometer, updateDigitalCamera, updateOtherEquipment, updateLaptopDesktop, updateMobileSim
  } = useAppContext();
  const { toast } = useToast();

  const [items, setItems] = useState<EditableItem[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [bulkDate, setBulkDate] = useState<Date | undefined>();
  const [bulkLink, setBulkLink] = useState('');

  useEffect(() => {
    if (certList && isOpen) {
      const allItems: (InventoryItem | UTMachine | DftMachine | Anemometer | DigitalCamera | OtherEquipment | LaptopDesktop | MobileSim)[] = [
        ...inventoryItems, ...utMachines, ...dftMachines, ...anemometers, ...digitalCameras, ...otherEquipments, ...laptopsDesktops, ...mobileSims
      ];

      const itemsWithData: EditableItem[] = certList.items.map(listItem => {
        const fullItem = allItems.find(i => i.id === listItem.itemId);
        let dueDate = null;
        if (fullItem?.tpInspectionDueDate) {
            const parsed = parseISO(fullItem.tpInspectionDueDate);
            if (isValid(parsed)) {
                dueDate = parsed;
            }
        }
        return {
          ...listItem,
          tpInspectionDueDate: dueDate,
          certificateUrl: fullItem?.certificateUrl || ''
        };
      });
      setItems(itemsWithData);
      setSelectedIndices(new Set());
      setBulkDate(undefined);
      setBulkLink('');
    }
  }, [certList, isOpen, inventoryItems, utMachines, dftMachines, anemometers, digitalCameras, otherEquipments, laptopsDesktops, mobileSims]);

  const handleItemChange = (index: number, field: keyof EditableItem, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };
  
  const handleBulkApply = () => {
    if (!bulkDate && !bulkLink) {
        toast({ title: 'No bulk values set', description: 'Please provide a date or a link to apply.', variant: 'destructive' });
        return;
    }
    const newItems = items.map((item, index) => {
        if (selectedIndices.has(index)) {
            return {
                ...item,
                tpInspectionDueDate: bulkDate !== undefined ? bulkDate : item.tpInspectionDueDate,
                certificateUrl: bulkLink !== '' ? bulkLink : item.certificateUrl,
            };
        }
        return item;
    });
    setItems(newItems);
    toast({ title: 'Applied to Selected', description: 'Bulk values have been applied to selected rows.' });
  };
  
  const handleSave = () => {
    if (selectedIndices.size === 0) {
      toast({
        title: 'No Items Selected',
        description: 'Please select items to update using the checkboxes.',
        variant: 'destructive',
      });
      return;
    }

    let updatedCount = 0;
    const allItemsFromContext: (InventoryItem | UTMachine | DftMachine | Anemometer | DigitalCamera | OtherEquipment | LaptopDesktop | MobileSim)[] = [
      ...inventoryItems, ...utMachines, ...dftMachines, ...anemometers, ...digitalCameras, ...otherEquipments, ...laptopsDesktops, ...mobileSims
    ];

    selectedIndices.forEach(index => {
      const itemToUpdate = items[index];
      const baseItem = allItemsFromContext.find(i => i.id === itemToUpdate.itemId);
      if (!baseItem) return;

      const updateData: any = {
        ...baseItem,
        tpInspectionDueDate: itemToUpdate.tpInspectionDueDate ? itemToUpdate.tpInspectionDueDate.toISOString() : null,
        certificateUrl: itemToUpdate.certificateUrl,
      };

      try {
        switch(itemToUpdate.itemType) {
            case 'Inventory': updateInventoryItem(updateData as InventoryItem); break;
            case 'UTMachine': updateUTMachine(updateData as UTMachine); break;
            case 'DftMachine': updateDftMachine(updateData as DftMachine); break;
            case 'Anemometer': updateAnemometer(updateData as Anemometer); break;
            case 'DigitalCamera': updateDigitalCamera(updateData as DigitalCamera); break;
            case 'OtherEquipment': updateOtherEquipment(updateData as OtherEquipment); break;
            case 'LaptopDesktop': updateLaptopDesktop(updateData as LaptopDesktop); break;
            case 'MobileSim': updateMobileSim(updateData as MobileSim); break;
        }
        updatedCount++;
      } catch (error) {
        console.error(`Failed to update item ${itemToUpdate.itemId}:`, error);
        toast({
          title: `Error updating ${itemToUpdate.materialName}`,
          description: (error as Error).message || "Could not save changes for this item.",
          variant: 'destructive',
        });
      }
    });

    if (updatedCount > 0) {
      toast({
          title: 'Validity Updated',
          description: `The details for ${updatedCount} items have been updated.`
      });
    }
    setIsOpen(false);
  };
  
  const handleSelectAll = (checked: boolean) => {
    const newSelected = new Set<number>();
    if (checked) {
      items.forEach((_, index) => newSelected.add(index));
    }
    setSelectedIndices(newSelected);
  };

  const handleRowSelect = (index: number) => {
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIndices(newSelected);
  };
  
  const isAllSelected = items.length > 0 && selectedIndices.size === items.length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Update TP Validity &amp; Certificate</DialogTitle>
          <DialogDescription>Update details for items in list: {certList.name}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-md">
            <div className="space-y-2">
                <Label>Bulk Update Date</Label>
                <DatePickerInput value={bulkDate} onChange={setBulkDate} />
            </div>
            <div className="space-y-2">
                <Label>Bulk Update Link</Label>
                <Input value={bulkLink} onChange={e => setBulkLink(e.target.value)} placeholder="https://..." />
            </div>
             <div className="flex items-end">
                <Button onClick={handleBulkApply}>Apply to Selected</Button>
            </div>
        </div>

        <ScrollArea className="flex-1 mt-4">
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead className="w-12">
                    <Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} />
                </TableHead>
                <TableHead>Sr. No</TableHead>
                <TableHead>Material Name</TableHead>
                <TableHead>Sr. No</TableHead>
                <TableHead>TP Insp. Due Date</TableHead>
                <TableHead>Certificate Link</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {items.map((item, index) => (
                <TableRow key={item.itemId}>
                    <TableCell>
                        <Checkbox checked={selectedIndices.has(index)} onCheckedChange={() => handleRowSelect(index)} />
                    </TableCell>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{item.materialName}</TableCell>
                    <TableCell>{item.manufacturerSrNo}</TableCell>
                    <TableCell>
                        <DatePickerInput
                            value={item.tpInspectionDueDate || undefined}
                            onChange={(date) => handleItemChange(index, 'tpInspectionDueDate', date)}
                        />
                    </TableCell>
                    <TableCell>
                         <Input
                           value={item.certificateUrl || ''}
                           onChange={e => handleItemChange(index, 'certificateUrl', e.target.value)}
                           placeholder="https://..."
                         />
                    </TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
        </ScrollArea>
        <DialogFooter className="pt-4 mt-auto border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Changes to Selected</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
