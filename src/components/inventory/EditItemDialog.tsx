
'use client';
import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '../ui/textarea';
import type { InventoryItem, InventoryItemStatus, InventoryCategory } from '@/lib/types';
import { DatePickerInput } from '../ui/date-picker-input';
import { isAfter, parseISO } from 'date-fns';


const itemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  serialNumber: z.string().optional(),
  ariesId: z.string().optional(),
  erpId: z.string().optional(),
  certification: z.string().optional(),
  purchaseDate: z.date().optional().nullable(),
  chestCrollNo: z.string().optional(),
  status: z.enum(['In Use', 'In Store', 'Damaged', 'Expired', 'Moved to another project', 'Quarantine']),
  projectId: z.string().optional(),
  movedToProjectId: z.string().optional(),
  transferDate: z.date().optional().nullable(),
  plantUnit: z.string().optional(),
  inspectionDate: z.date().optional().nullable(),
  inspectionDueDate: z.date().optional().nullable(),
  tpInspectionDueDate: z.date().optional().nullable(),
  certificateUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  inspectionCertificateUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  category: z.enum(['General', 'Daily Consumable', 'Job Consumable']).default('General'),
  remarks: z.string().optional(),
  quantity: z.coerce.number().optional(),
  unit: z.string().optional(),
}).superRefine((data, ctx) => {
    if(data.category === 'General' && !data.serialNumber) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Serial number is required for General items.",
            path: ['serialNumber'],
        });
    }
    if (data.status !== 'Moved to another project' && !data.projectId) {
      ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Location is required.',
          path: ['projectId'],
      });
  }
});

type ItemFormValues = z.infer<typeof itemSchema>;

interface EditItemDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  item: InventoryItem;
}

const statusOptions: InventoryItemStatus[] = ['In Use', 'In Store', 'Damaged', 'Expired', 'Moved to another project', 'Quarantine'];
const categoryOptions: InventoryCategory[] = ['General', 'Daily Consumable', 'Job Consumable'];
const excludedLocations = ['Store', 'Office', 'Kitchen Duty'];


export default function EditItemDialog({ isOpen, setIsOpen, item }: EditItemDialogProps) {
  const { updateInventoryItem, projects, inventoryItems } = useAppContext();
  const { toast } = useToast();
  
  const itemNames = useMemo(() => Array.from(new Set(inventoryItems.map(item => item.name))), [inventoryItems]);

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
  });
  
  const itemName = form.watch('name');
  const category = form.watch('category');
  const selectedProjectId = form.watch('projectId');
  const status = form.watch('status');

  const selectedProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);

  const showPlantUnit = useMemo(() => {
    if (!selectedProject) return false;
    return !excludedLocations.includes(selectedProject.name);
  }, [selectedProject]);


  useEffect(() => {
    if (!showPlantUnit) {
      form.setValue('plantUnit', '');
    }
  }, [showPlantUnit, form]);
  
  useEffect(() => {
    if (status !== 'Moved to another project') {
      form.setValue('movedToProjectId', '');
      form.setValue('transferDate', null);
    } else {
      form.setValue('projectId', '');
    }
  }, [status, form]);


  useEffect(() => {
    if(item && isOpen) {
        const now = new Date();
        const inspectionDueDate = item.inspectionDueDate ? parseISO(item.inspectionDueDate) : null;
        const tpInspectionDueDate = item.tpInspectionDueDate ? parseISO(item.tpInspectionDueDate) : null;
        const isItemExpired = (inspectionDueDate && isAfter(now, inspectionDueDate)) || (tpInspectionDueDate && isAfter(now, tpInspectionDueDate));
        const effectiveStatus = isItemExpired ? 'Expired' : item.status;
        
        form.reset({
            ...item,
            status: effectiveStatus,
            purchaseDate: item.purchaseDate ? new Date(item.purchaseDate) : undefined,
            inspectionDate: item.inspectionDate ? new Date(item.inspectionDate) : undefined,
            inspectionDueDate: item.inspectionDueDate ? new Date(item.inspectionDueDate) : undefined,
            tpInspectionDueDate: item.tpInspectionDueDate ? new Date(item.tpInspectionDueDate) : undefined,
            transferDate: item.transferDate ? new Date(item.transferDate) : undefined,
            category: item.category || 'General',
        });
    }
  }, [item, isOpen, form]);

  const onSubmit = (data: ItemFormValues) => {
    updateInventoryItem({ 
        ...item, 
        ...data,
        serialNumber: data.serialNumber || `N/A-${Date.now()}`,
        inspectionDate: data.inspectionDate ? data.inspectionDate.toISOString() : '',
        inspectionDueDate: data.inspectionDueDate ? data.inspectionDueDate.toISOString() : '',
        tpInspectionDueDate: data.tpInspectionDueDate ? data.tpInspectionDueDate.toISOString() : '',
        purchaseDate: data.purchaseDate ? data.purchaseDate.toISOString() : null,
        transferDate: data.transferDate ? data.transferDate.toISOString() : null,
        movedToProjectId: data.movedToProjectId,
        chestCrollNo: data.chestCrollNo,
    });
    toast({
      title: 'Item Updated',
      description: `${data.name} has been updated.`,
    });
    setIsOpen(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit: {item.name}</DialogTitle>
          <DialogDescription>Update the details for this item.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto -mr-6 pr-6">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="name">Item Name</Label>
                        <Input id="name" {...form.register('name')} placeholder="e.g., Harness or select" list="item-names" />
                        <datalist id="item-names">
                            {itemNames.map(n => <option key={n} value={n} />)}
                        </datalist>
                        {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
                    </div>
                    <div>
                        <Label>Category</Label>
                        <Controller control={form.control} name="category" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categoryOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>)}/>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="serialNumber">Serial Number</Label>
                        <Input id="serialNumber" {...form.register('serialNumber')} disabled={category !== 'General'}/>
                        {form.formState.errors.serialNumber && <p className="text-xs text-destructive">{form.formState.errors.serialNumber.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="ariesId">Aries ID</Label>
                        <Input id="ariesId" {...form.register('ariesId')} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="erpId">ERP ID</Label>
                        <Input id="erpId" {...form.register('erpId')} />
                    </div>
                    <div>
                        <Label htmlFor="certification">Certification</Label>
                        <Input id="certification" {...form.register('certification')} />
                    </div>
                </div>

                {itemName?.toLowerCase() === 'harness' && category === 'General' && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="chestCrollNo">Chest Croll No</Label>
                            <Input id="chestCrollNo" {...form.register('chestCrollNo')} />
                        </div>
                    </div>
                )}
                {category !== 'General' && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="quantity">Quantity</Label>
                            <Input id="quantity" type="number" {...form.register('quantity')} />
                        </div>
                        <div>
                            <Label htmlFor="unit">Unit</Label>
                            <Input id="unit" {...form.register('unit')} placeholder="e.g., pcs, box, m" />
                        </div>
                    </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label>Status</Label>
                        <Controller control={form.control} name="status" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>)}/>
                    </div>
                     {status !== 'Moved to another project' ? (
                        <div>
                            <Label>Location</Label>
                            <Controller control={form.control} name="projectId" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue placeholder="Select location..."/></SelectTrigger><SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>)}/>
                            {form.formState.errors.projectId && <p className="text-xs text-destructive">{form.formState.errors.projectId.message}</p>}
                        </div>
                    ) : (
                        <div>
                            <Label>Transferred Date</Label>
                            <Controller name="transferDate" control={form.control} render={({ field }) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />} />
                        </div>
                    )}
                </div>
                 {status === 'Moved to another project' && (
                    <div>
                        <Label>Moved To Project</Label>
                        <Input {...form.register('movedToProjectId')} placeholder="Enter destination project name..." />
                    </div>
                )}
                {showPlantUnit && status !== 'Moved to another project' && (
                <div>
                    <Label htmlFor="plantUnit">Plant/Unit</Label>
                    <Input id="plantUnit" {...form.register('plantUnit')} placeholder="e.g., Unit A" />
                </div>
                )}
                
                {category === 'General' && (
                <>
                    <div><Label>Purchase Date</Label><Controller name="purchaseDate" control={form.control} render={({ field }) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />} /></div>
                    <div><Label>Inspection Date</Label><Controller name="inspectionDate" control={form.control} render={({ field }) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />} />{form.formState.errors.inspectionDate && <p className="text-xs text-destructive">{form.formState.errors.inspectionDate.message}</p>}</div>
                    <div><Label>Inspection Due Date</Label><Controller name="inspectionDueDate" control={form.control} render={({ field }) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />} />{form.formState.errors.inspectionDueDate && <p className="text-xs text-destructive">{form.formState.errors.inspectionDueDate.message}</p>}</div>
                    <div><Label>TP Inspection Due Date</Label><Controller name="tpInspectionDueDate" control={form.control} render={({ field }) => <DatePickerInput value={field.value ?? undefined} onChange={field.onChange} />} />{form.formState.errors.tpInspectionDueDate && <p className="text-xs text-destructive">{form.formState.errors.tpInspectionDueDate.message}</p>}</div>
                    <div>
                        <Label htmlFor="certificateUrl">TP Certificate URL</Label>
                        <Input id="certificateUrl" {...form.register('certificateUrl')} placeholder="https://..." />
                        {form.formState.errors.certificateUrl && <p className="text-xs text-destructive">{form.formState.errors.certificateUrl.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="inspectionCertificateUrl">Inspection Certificate URL</Label>
                        <Input id="inspectionCertificateUrl" {...form.register('inspectionCertificateUrl')} placeholder="https://..." />
                        {form.formState.errors.inspectionCertificateUrl && <p className="text-xs text-destructive">{form.formState.errors.inspectionCertificateUrl.message}</p>}
                    </div>
                </>
                )}

                <div>
                    <Label>Remarks (Description)</Label>
                    <Textarea {...form.register('remarks')} placeholder="Add any notes..." />
                </div>

                <DialogFooter className="pt-4 sticky bottom-0 bg-background">
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button type="submit">Save Changes</Button>
                </DialogFooter>
            </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
