'use client';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
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
import { ChevronsUpDown, Check, PlusCircle, Trash2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { cn } from '@/lib/utils';
import { InventoryItem, UTMachine, DftMachine, DigitalCamera, Anemometer, OtherEquipment, LaptopDesktop, MobileSim, WeldingMachine, WalkieTalkie, PneumaticDrillingMachine, PneumaticAngleGrinder, WiredDrillingMachine, CordlessDrillingMachine, WiredAngleGrinder, CordlessAngleGrinder, CordlessReciprocatingSaw } from '@/lib/types';

const inwardItemSchema = z.object({
  id: z.string(),
  itemInfo: z.object({
    itemId: z.string(),
    itemType: z.string(),
    name: z.string(),
  }).refine(data => data.itemId, { message: "You must select a specific item." }),
  quantity: z.coerce.number().min(1, 'Qty > 0'),
  remarks: z.string().optional(),
});

const inwardSchema = z.object({
  source: z.string().min(1, "A source or reason is required."),
  items: z.array(inwardItemSchema).min(1, "Please add at least one item."),
});


type FormValues = z.infer<typeof inwardSchema>;

interface AddInwardRecordDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

type SearchableItem = (InventoryItem | UTMachine | DftMachine | DigitalCamera | Anemometer | OtherEquipment | LaptopDesktop | MobileSim | WeldingMachine | WalkieTalkie | PneumaticDrillingMachine | PneumaticAngleGrinder | WiredDrillingMachine | CordlessDrillingMachine | WiredAngleGrinder | CordlessAngleGrinder | CordlessReciprocatingSaw) & { itemType: string; };

const generateNewItemId = () => `item-${Date.now()}-${Math.random()}`;

export default function AddInwardRecordDialog({ isOpen, setIsOpen }: AddInwardRecordDialogProps) {
  const { 
    addInwardOutwardRecord, inventoryItems, utMachines, dftMachines, digitalCameras, 
    anemometers, otherEquipments, laptopsDesktops, mobileSims, weldingMachines, walkieTalkies,
    pneumaticDrillingMachines, pneumaticAngleGrinders, wiredDrillingMachines, cordlessDrillingMachines,
    wiredAngleGrinders, cordlessAngleGrinders, cordlessReciprocatingSaws,
  } = useAppContext();
  const { toast } = useToast();
  const [popoverOpenState, setPopoverOpenState] = useState<Record<number, boolean>>({});
  const [searchTerms, setSearchTerms] = useState<Record<number, string>>({});

  const form = useForm<FormValues>({
    resolver: zodResolver(inwardSchema),
    defaultValues: {
        source: '',
        items: [{ id: generateNewItemId(), quantity: 1, remarks: '', itemInfo: { itemId: '', itemType: '', name: '' } }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
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
    pneumaticDrillingMachines.forEach((i) => arr.push({ ...i, itemType: "PneumaticDrillingMachine" }));
    pneumaticAngleGrinders.forEach((i) => arr.push({ ...i, itemType: "PneumaticAngleGrinder" }));
    wiredDrillingMachines.forEach((i) => arr.push({ ...i, itemType: "WiredDrillingMachine" }));
    cordlessDrillingMachines.forEach((i) => arr.push({ ...i, itemType: "CordlessDrillingMachine" }));
    wiredAngleGrinders.forEach((i) => arr.push({ ...i, itemType: "WiredAngleGrinder" }));
    cordlessAngleGrinders.forEach((i) => arr.push({ ...i, itemType: "CordlessAngleGrinder" }));
    cordlessReciprocatingSaws.forEach((i) => arr.push({ ...i, itemType: "CordlessReciprocatingSaw" }));
    return arr;
  }, [inventoryItems, utMachines, dftMachines, digitalCameras, anemometers, otherEquipments, laptopsDesktops, mobileSims, weldingMachines, walkieTalkies, pneumaticDrillingMachines, pneumaticAngleGrinders, wiredDrillingMachines, cordlessDrillingMachines, wiredAngleGrinders, cordlessAngleGrinders, cordlessReciprocatingSaws]);

  const onSubmit = (data: FormValues) => {
    data.items.forEach(item => {
      addInwardOutwardRecord(item.itemInfo, item.quantity, 'Inward', data.source, item.remarks);
    });
    toast({ title: `${data.items.length} Inward Record(s) Added` });
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset({
        source: '',
        items: [{ id: generateNewItemId(), quantity: 1, remarks: '', itemInfo: { itemId: '', itemType: '', name: '' } }],
      });
    }
    setIsOpen(open);
  };
  
  const handleItemSelect = (index: number, item: SearchableItem) => {
    const name = (item as any).name || (item as any).machineName || (item as any).equipmentName || `Item ID: ${item.id}`;
    form.setValue(`items.${index}.itemInfo`, {
      itemId: item.id,
      itemType: item.itemType,
      name: name
    });
    setPopoverOpenState(prev => ({ ...prev, [index]: false }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl h-full flex flex-col sm:max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>New Inward Entry</DialogTitle>
          <DialogDescription>Record new stock coming into the main store.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          <div className="space-y-4 py-4 pr-6 -mr-6 flex-1 overflow-y-auto">
            <div className="space-y-2">
                <Label htmlFor="source">Source / Reason</Label>
                <Input id="source" {...form.register('source')} placeholder="e.g., From Vendor XYZ, Transfer from SEZ Project" />
                {form.formState.errors.source && <p className="text-xs text-destructive">{form.formState.errors.source.message}</p>}
            </div>
            <Separator />
             <div className="space-y-2">
                <Label className="font-semibold">Items</Label>
                <div className="grid grid-cols-12 gap-2 font-medium text-xs text-muted-foreground">
                    <div className="col-span-5">Item</div>
                    <div className="col-span-2">Quantity</div>
                    <div className="col-span-4">Remarks</div>
                    <div className="col-span-1"></div>
                </div>
                {fields.map((field, index) => {
                  const searchTerm = searchTerms[index] || '';
                  const filteredItems = searchTerm 
                    ? allItems.filter(item => 
                        ((item as any).name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                        ((item as any).machineName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                        ((item as any).equipmentName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                        (item.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                        (item.ariesId?.toLowerCase().includes(searchTerm.toLowerCase()))
                      )
                    : allItems;
                  return (
                    <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                      <div className="col-span-5">
                          <Controller
                              name={`items.${index}.itemInfo`}
                              control={form.control}
                              render={({ field: controllerField }) => (
                                  <Popover open={popoverOpenState[index]} onOpenChange={(open) => setPopoverOpenState(prev => ({ ...prev, [index]: open }))}>
                                      <PopoverTrigger asChild>
                                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                                              <span className="truncate">{controllerField.value?.name || "Select item..."}</span>
                                              <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50"/>
                                          </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                          <Command>
                                              <CommandInput placeholder="Search by name, serial, or ID..." onValueChange={(value) => setSearchTerms(prev => ({ ...prev, [index]: value }))}/>
                                              <CommandList>
                                                  <CommandEmpty>No item found.</CommandEmpty>
                                                  <CommandGroup>
                                                    {filteredItems.slice(0, 100).map((item) => (
                                                      <CommandItem
                                                          key={`${item.id}-${item.itemType}`}
                                                          value={`${(item as any).name || (item as any).machineName} ${item.serialNumber}`}
                                                          onSelect={() => handleItemSelect(index, item)}
                                                      >
                                                          <Check className={cn("mr-2 h-4 w-4", controllerField.value?.itemId === item.id ? "opacity-100" : "opacity-0")} />
                                                          {(item as any).name || (item as any).machineName || (item as any).equipmentName} (SN: {item.serialNumber})
                                                      </CommandItem>
                                                    ))}
                                                  </CommandGroup>
                                              </CommandList>
                                          </Command>
                                      </PopoverContent>
                                  </Popover>
                              )}
                          />
                          {form.formState.errors.items?.[index]?.itemInfo && <p className="text-xs text-destructive">{form.formState.errors.items[index]?.itemInfo?.message}</p>}
                      </div>
                       <div className="col-span-2">
                        <Input type="number" {...form.register(`items.${index}.quantity`)} placeholder="Qty"/>
                        {form.formState.errors.items?.[index]?.quantity && <p className="text-xs text-destructive">{form.formState.errors.items[index]?.quantity?.message}</p>}
                       </div>
                       <div className="col-span-4">
                        <Input {...form.register(`items.${index}.remarks`)} placeholder="Optional remarks"/>
                       </div>
                       <div className="col-span-1 flex items-center h-full">
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                       </div>
                    </div>
                  );
                })}
                <Button type="button" variant="outline" size="sm" onClick={() => append({ id: generateNewItemId(), quantity: 1, remarks: '', itemInfo: { itemId: '', itemType: '', name: '' } })}>
                    <PlusCircle className="mr-2 h-4 w-4"/>Add Item
                </Button>
                {form.formState.errors.items && <p className="text-xs text-destructive">{form.formState.errors.items.message || form.formState.errors.items.root?.message}</p>}
             </div>
          </div>
          <DialogFooter className="mt-auto pt-4 border-t shrink-0">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Add Inward Records</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
