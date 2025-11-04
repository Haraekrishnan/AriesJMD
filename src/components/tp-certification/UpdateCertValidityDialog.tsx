
'use client';
import { useState, useEffect } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { TpCertList, InventoryItem, UTMachine, DftMachine } from '@/lib/types';
import { DatePickerInput } from '../ui/date-picker-input';
import { parseISO } from 'date-fns';
import { Checkbox } from '../ui/checkbox';

const itemUpdateSchema = z.object({
  tpInspectionDueDate: z.date().optional().nullable(),
  certificateUrl: z.string().url().optional().or(z.literal('')),
});

const formSchema = z.object({
  items: z.array(z.object({
    itemId: z.string(),
    itemType: z.enum(['Inventory', 'UTMachine', 'DftMachine']),
    materialName: z.string(),
    manufacturerSrNo: z.string(),
    ...itemUpdateSchema.shape
  })),
  bulkDate: z.date().optional().nullable(),
  bulkLink: z.string().url().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

interface UpdateCertValidityDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  certList: TpCertList;
}

export default function UpdateCertValidityDialog({ isOpen, setIsOpen, certList }: UpdateCertValidityDialogProps) {
  const { inventoryItems, utMachines, dftMachines, updateInventoryItem, updateUTMachine, updateDftMachine } = useAppContext();
  const { toast } = useToast();
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({});

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      items: [],
      bulkDate: null,
      bulkLink: ''
    }
  });

  const { fields, update } = useFieldArray({
    control: form.control,
    name: "items"
  });

  useEffect(() => {
    if (certList && isOpen) {
      const allItems: (InventoryItem | UTMachine | DftMachine)[] = [...inventoryItems, ...utMachines, ...dftMachines];
      const itemsWithData = certList.items.map(listItem => {
        const fullItem = allItems.find(i => i.id === listItem.itemId);
        return {
          ...listItem,
          tpInspectionDueDate: fullItem?.tpInspectionDueDate ? parseISO(fullItem.tpInspectionDueDate) : null,
          certificateUrl: fullItem?.certificateUrl || ''
        };
      });
      form.reset({ items: itemsWithData, bulkDate: null, bulkLink: '' });
      setSelectedRowIds({});
    }
  }, [certList, inventoryItems, utMachines, dftMachines, isOpen, form]);
  
  const handleBulkApply = () => {
    const { bulkDate, bulkLink } = form.getValues();
    if (!bulkDate && !bulkLink) {
        toast({ title: 'No bulk values set', description: 'Please provide a date or a link to apply.', variant: 'destructive' });
        return;
    }
    
    fields.forEach((field, index) => {
        if (selectedRowIds[field.id]) {
            const currentItem = { ...field };
            if (bulkDate) {
                currentItem.tpInspectionDueDate = bulkDate;
            }
            if (bulkLink) {
                currentItem.certificateUrl = bulkLink;
            }
            update(index, currentItem);
        }
    });
    toast({ title: 'Applied to Selected', description: 'Bulk values have been applied to selected rows.' });
  };

  const onSubmit = async (data: FormValues) => {
    let updatedCount = 0;
    const selectedItemsToUpdate = data.items.filter((_, index) => selectedRowIds[fields[index].id]);

    for (const item of selectedItemsToUpdate) {
        try {
            if (item.itemType === 'Inventory') {
                const originalItem = inventoryItems.find(i => i.id === item.itemId);
                if (originalItem) {
                    await updateInventoryItem({
                        ...originalItem,
                        tpInspectionDueDate: item.tpInspectionDueDate?.toISOString(),
                        certificateUrl: item.certificateUrl,
                    });
                    updatedCount++;
                }
            } else if (item.itemType === 'UTMachine') {
                const originalItem = utMachines.find(i => i.id === item.itemId);
                 if (originalItem) {
                    await updateUTMachine({
                        ...originalItem,
                        tpInspectionDueDate: item.tpInspectionDueDate?.toISOString(),
                        certificateUrl: item.certificateUrl,
                    } as any);
                    updatedCount++;
                }
            } else if (item.itemType === 'DftMachine') {
                const originalItem = dftMachines.find(i => i.id === item.itemId);
                 if (originalItem) {
                    await updateDftMachine({
                        ...originalItem,
                        tpInspectionDueDate: item.tpInspectionDueDate?.toISOString(),
                        certificateUrl: item.certificateUrl,
                    } as any);
                    updatedCount++;
                }
            }
        } catch (error) {
            console.error(`Failed to update item ${item.itemId}:`, error);
            toast({
                title: `Error updating ${item.name}`,
                description: "Could not save changes for this item.",
                variant: 'destructive',
            });
        }
    }

    if (updatedCount > 0) {
      toast({
          title: 'Validity Updated',
          description: `The details for ${updatedCount} items have been updated.`
      });
    } else {
        toast({
            title: 'No Items Selected',
            description: 'No items were selected for update.',
            variant: 'destructive'
        });
    }
    setIsOpen(false);
  };
  
  const handleSelectAll = (checked: boolean) => {
    const newSelected: Record<string, boolean> = {};
    if (checked) {
      fields.forEach(field => {
        newSelected[field.id] = true;
      });
    }
    setSelectedRowIds(newSelected);
  };

  const handleRowSelect = (id: string, checked: boolean) => {
    setSelectedRowIds(prev => ({
      ...prev,
      [id]: checked
    }));
  };
  
  const isAllSelected = fields.length > 0 && fields.every(field => selectedRowIds[field.id]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Update TP Validity &amp; Certificate</DialogTitle>
          <DialogDescription>Update details for items in list: {certList.name}</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-md">
                <div className="space-y-2">
                    <Label>Bulk Update Date</Label>
                    <Controller control={form.control} name="bulkDate" render={({field}) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />} />
                </div>
                <div className="space-y-2">
                    <Label>Bulk Update Link</Label>
                    <Input {...form.register('bulkLink')} placeholder="https://..." />
                </div>
                 <div className="flex items-end">
                    <Button type="button" onClick={handleBulkApply}>Apply to Selected</Button>
                </div>
            </div>

            <ScrollArea className="flex-1 mt-4">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="w-12">
                        <Checkbox
                            checked={isAllSelected}
                            onCheckedChange={handleSelectAll}
                        />
                    </TableHead>
                    <TableHead>Sr. No</TableHead>
                    <TableHead>Material Name</TableHead>
                    <TableHead>Sr. No</TableHead>
                    <TableHead>TP Insp. Due Date</TableHead>
                    <TableHead>Certificate Link</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {fields.map((field, index) => (
                    <TableRow key={field.id}>
                        <TableCell>
                            <Checkbox
                                checked={!!selectedRowIds[field.id]}
                                onCheckedChange={(checked) => handleRowSelect(field.id, !!checked)}
                            />
                        </TableCell>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{field.materialName}</TableCell>
                        <TableCell>{field.manufacturerSrNo}</TableCell>
                        <TableCell>
                             <Controller
                                name={`items.${index}.tpInspectionDueDate`}
                                control={form.control}
                                render={({ field: dateField }) => (
                                    <DatePickerInput value={dateField.value ?? undefined} onChange={dateField.onChange} />
                                )}
                            />
                        </TableCell>
                        <TableCell>
                             <Input {...form.register(`items.${index}.certificateUrl`)} placeholder="https://..." />
                        </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            </ScrollArea>
             <DialogFooter className="pt-4 mt-auto border-t">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit">Save All Changes</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
