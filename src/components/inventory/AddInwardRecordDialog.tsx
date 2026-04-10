'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ChevronsUpDown, Check } from 'lucide-react';
import { useState, useMemo } from 'react';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { InventoryItem, UTMachine, DftMachine, DigitalCamera, Anemometer, OtherEquipment, LaptopDesktop, MobileSim, WeldingMachine, WalkieTalkie } from '@/lib/types';


const inwardSchema = z.object({
  itemInfo: z.object({
    itemId: z.string(),
    itemType: z.string(),
    name: z.string(),
  }).refine(data => data.itemId, { message: "You must select a specific item." }),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  remarks: z.string().optional(),
});

type FormValues = z.infer<typeof inwardSchema>;

interface AddInwardRecordDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

type SearchableItem = (InventoryItem | UTMachine | DftMachine | DigitalCamera | Anemometer | OtherEquipment | LaptopDesktop | MobileSim | WeldingMachine | WalkieTalkie) & { itemType: string; };

export default function AddInwardRecordDialog({ isOpen, setIsOpen }: AddInwardRecordDialogProps) {
  const { 
    addInwardOutwardRecord, inventoryItems, utMachines, dftMachines, digitalCameras, 
    anemometers, otherEquipments, laptopsDesktops, mobileSims, weldingMachines, walkieTalkies 
  } = useAppContext();
  const { toast } = useToast();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(inwardSchema),
    defaultValues: { quantity: 1 }
  });

  const allItems = useMemo(() => {
    const arr: SearchableItem[] = [];
    inventoryItems.forEach((i) => arr.push({ ...i, itemType: "Inventory" }));
    utMachines.forEach((i) => arr.push({ ...i, itemType: "UTMachine" }));
    dftMachines.forEach((i) => arr.push({ ...i, itemType: "DftMachine" }));
    digitalCameras.forEach((i) => arr.push({ ...i, itemType: "DigitalCamera" }));
    anemometers.forEach((i) => arr.push({ ...i, itemType: "Anemometer" }));
    otherEquipments.forEach((i) => arr.push({ ...i, itemType: "OtherEquipment" }));
    laptopsDesktops.forEach((i) => arr.push({ ...i, itemType: "LaptopDesktop" }));
    mobileSims.forEach((i) => arr.push({ ...i, itemType: "MobileSim" }));
    weldingMachines.forEach((i) => arr.push({ ...i, itemType: "WeldingMachine" }));
    walkieTalkies.forEach((i) => arr.push({ ...i, itemType: "WalkieTalkie" }));
    return arr;
  }, [inventoryItems, utMachines, dftMachines, digitalCameras, anemometers, otherEquipments, laptopsDesktops, mobileSims, weldingMachines, walkieTalkies]);

  const filteredItems = useMemo(() => {
    if (!searchTerm) return [];
    const lowercasedTerm = searchTerm.toLowerCase();
    return allItems.filter(item => 
        (item.name?.toLowerCase().includes(lowercasedTerm)) ||
        ((item as any).machineName?.toLowerCase().includes(lowercasedTerm)) ||
        ((item as any).equipmentName?.toLowerCase().includes(lowercasedTerm)) ||
        (item.serialNumber?.toLowerCase().includes(lowercasedTerm)) ||
        (item.ariesId?.toLowerCase().includes(lowercasedTerm))
    );
  }, [allItems, searchTerm]);

  const onSubmit = (data: FormValues) => {
    addInwardOutwardRecord(data.itemInfo, data.quantity, 'Inward', 'Direct Entry', data.remarks);
    toast({ title: 'Inward Record Added' });
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) form.reset();
    setIsOpen(open);
  };

  const selectedItemInfo = form.watch('itemInfo');

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Inward Entry</DialogTitle>
          <DialogDescription>Record new stock coming into the main store.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Item</Label>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between">
                  {selectedItemInfo?.name || "Select an item..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Search by name, serial, or ID..." value={searchTerm} onValueChange={setSearchTerm}/>
                  <CommandList>
                    <CommandEmpty>No item found.</CommandEmpty>
                    <CommandGroup>
                      {filteredItems.map((item) => (
                        <CommandItem
                          key={item.id}
                          value={item.name}
                          onSelect={() => {
                            form.setValue('itemInfo', { itemId: item.id, itemType: item.itemType, name: (item as any).name || (item as any).machineName || (item as any).equipmentName });
                            setPopoverOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", selectedItemInfo?.itemId === item.id ? "opacity-100" : "opacity-0")} />
                          {(item as any).name || (item as any).machineName || (item as any).equipmentName} (SN: {item.serialNumber})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {form.formState.errors.itemInfo && <p className="text-xs text-destructive">{form.formState.errors.itemInfo.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input id="quantity" type="number" {...form.register('quantity')} />
            {form.formState.errors.quantity && <p className="text-xs text-destructive">{form.formState.errors.quantity.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks (Optional)</Label>
            <Textarea id="remarks" {...form.register('remarks')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Add Inward Record</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}