
'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { useMemo, useState } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import type { InventoryItem, UTMachine, DftMachine, TransferReason } from '@/lib/types';
import { TRANSFER_REASONS } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { X } from 'lucide-react';
import { Badge } from '../ui/badge';

type SearchableItem = (InventoryItem | UTMachine | DftMachine) & { itemType: 'Inventory' | 'UTMachine' | 'DftMachine'; };

const transferRequestSchema = z.object({
  fromProjectId: z.string().min(1, 'Origin project is required'),
  toProjectId: z.string().min(1, 'Destination project is required'),
  reason: z.enum(TRANSFER_REASONS, { required_error: 'A reason for transfer is required.' }),
  remarks: z.string().optional(),
  items: z.array(z.object({
    itemId: z.string(),
    itemType: z.enum(['Inventory', 'UTMachine', 'DftMachine']),
    name: z.string(),
    serialNumber: z.string(),
  })).min(1, 'Please add at least one item to transfer'),
}).refine(data => data.fromProjectId !== data.toProjectId, {
    message: 'Destination project must be different from the origin.',
    path: ['toProjectId'],
});

type TransferRequestFormValues = z.infer<typeof transferRequestSchema>;

interface NewInventoryTransferRequestDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function NewInventoryTransferRequestDialog({ isOpen, setIsOpen }: NewInventoryTransferRequestDialogProps) {
  const { user, projects, inventoryItems, utMachines, dftMachines, addInventoryTransferRequest } = useAppContext();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const form = useForm<TransferRequestFormValues>({
    resolver: zodResolver(transferRequestSchema),
    defaultValues: {
      fromProjectId: user?.projectId,
      items: [],
    },
  });
  
  const fromProjectId = form.watch('fromProjectId');
  const selectedItems = form.watch('items');

  const allSearchableItems = useMemo(() => {
    const items: SearchableItem[] = [];
    inventoryItems?.forEach(item => items.push({ ...item, itemType: 'Inventory' }));
    utMachines?.forEach(item => items.push({ ...item, itemType: 'UTMachine' }));
    dftMachines?.forEach(item => items.push({ ...item, itemType: 'DftMachine' }));
    return items;
  }, [inventoryItems, utMachines, dftMachines]);

  const availableItems = useMemo(() => {
    return allSearchableItems.filter(item => 
        item.projectId === fromProjectId &&
        !selectedItems.some(sel => sel.itemId === item.id && sel.itemType === item.itemType) &&
        (searchTerm ? ((item.name || item.machineName)?.toLowerCase().includes(searchTerm.toLowerCase()) || item.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase())) : true)
    );
  }, [allSearchableItems, fromProjectId, selectedItems, searchTerm]);

  const handleItemSelect = (item: SearchableItem) => {
    form.setValue('items', [...selectedItems, {
        itemId: item.id,
        itemType: item.itemType,
        name: item.name || item.machineName,
        serialNumber: item.serialNumber
    }]);
    setSearchTerm('');
  };
  
  const handleItemRemove = (itemId: string, itemType: string) => {
    form.setValue('items', selectedItems.filter(item => !(item.itemId === itemId && item.itemType === itemType)));
  }

  const onSubmit = (data: TransferRequestFormValues) => {
    addInventoryTransferRequest(data);
    toast({ title: 'Transfer Request Submitted', description: 'Your request has been sent for approval.' });
    setIsOpen(false);
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset({ fromProjectId: user?.projectId, items: [], toProjectId: undefined, reason: undefined, remarks: '' });
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl flex flex-col h-full sm:h-auto sm:max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>New Inventory Transfer Request</DialogTitle>
          <DialogDescription>Request to move items from one project to another.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          <div className="space-y-4 px-1 flex-1 overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Project</Label>
                <Controller
                  name="fromProjectId"
                  control={form.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Select origin..." /></SelectTrigger>
                      <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>To Project</Label>
                <Controller
                  name="toProjectId"
                  control={form.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Select destination..." /></SelectTrigger>
                      <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id} disabled={p.id === fromProjectId}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                />
                 {form.formState.errors.toProjectId && <p className="text-xs text-destructive">{form.formState.errors.toProjectId.message}</p>}
              </div>
            </div>
             <div className="space-y-2">
                <Label>Reason for Transfer</Label>
                 <Controller
                  name="reason"
                  control={form.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Select a reason..." /></SelectTrigger>
                      <SelectContent>{TRANSFER_REASONS.map(reason => <SelectItem key={reason} value={reason}>{reason}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.reason && <p className="text-xs text-destructive">{form.formState.errors.reason.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Remarks (Optional)</Label>
              <Textarea {...form.register('remarks')} />
            </div>
            <div className="space-y-2">
              <Label>Search & Add Items</Label>
              <Command className="rounded-lg border shadow-md">
                <CommandInput placeholder="Search by name or serial number..." value={searchTerm} onValueChange={setSearchTerm} />
                <ScrollArea className="h-40">
                    <CommandList>
                        <CommandEmpty>No available items match your search.</CommandEmpty>
                        <CommandGroup>
                            {availableItems.map((item) => (
                                <CommandItem key={`${item.id}-${item.itemType}`} onSelect={() => handleItemSelect(item)}>
                                    {item.name || item.machineName} (SN: {item.serialNumber})
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </ScrollArea>
              </Command>
            </div>
            <div className="space-y-2">
                <Label>Items to Transfer ({selectedItems.length})</Label>
                <ScrollArea className="h-48 border rounded-md p-2">
                   {selectedItems.length > 0 ? (
                    <div className="space-y-2">
                        {selectedItems.map(item => (
                            <div key={`${item.itemId}-${item.itemType}`} className="flex items-center justify-between p-1.5 bg-muted rounded-md text-sm">
                                <span>{item.name} (SN: {item.serialNumber})</span>
                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleItemRemove(item.itemId, item.itemType)}><X className="h-4 w-4"/></Button>
                            </div>
                        ))}
                    </div>
                   ) : <p className="text-center text-sm text-muted-foreground pt-10">No items added yet.</p>}
                </ScrollArea>
                 {form.formState.errors.items && <p className="text-xs text-destructive">{form.formState.errors.items.message || form.formState.errors.items.root?.message}</p>}
            </div>
          </div>
          <DialogFooter className="pt-4 mt-auto border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Submit Request</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
