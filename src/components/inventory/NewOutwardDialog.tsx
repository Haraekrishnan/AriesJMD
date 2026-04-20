'use client';

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/auth-provider";
import { useInventory } from "@/contexts/inventory-provider";
import { useInwardOutward } from "@/contexts/inward-outward-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useMemo, useState, useEffect } from "react";
import {
  Command,
  CommandInput,
  CommandGroup,
  CommandList,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";
import type { InventoryItem, UTMachine, DftMachine, DigitalCamera, Anemometer, OtherEquipment, LaptopDesktop, MobileSim, WeldingMachine, WalkieTalkie, PneumaticDrillingMachine, PneumaticAngleGrinder, WiredDrillingMachine, CordlessDrillingMachine, WiredAngleGrinder, CordlessAngleGrinder, CordlessReciprocatingSaw } from '@/lib/types';

type SearchableItem =
  | (InventoryItem & { itemType: "Inventory" })
  | (UTMachine & { itemType: "UTMachine" })
  | (DftMachine & { itemType: "DftMachine" })
  | (DigitalCamera & { itemType: "DigitalCamera" })
  | (Anemometer & { itemType: "Anemometer" })
  | (OtherEquipment & { itemType: "OtherEquipment" })
  | (LaptopDesktop & { itemType: 'LaptopDesktop' })
  | (MobileSim & { itemType: 'MobileSim' })
  | (WeldingMachine & { itemType: 'WeldingMachine' })
  | (WalkieTalkie & { itemType: 'WalkieTalkie' })
  | (PneumaticDrillingMachine & { itemType: 'PneumaticDrillingMachine' })
  | (PneumaticAngleGrinder & { itemType: 'PneumaticAngleGrinder' })
  | (WiredDrillingMachine & { itemType: 'WiredDrillingMachine' })
  | (CordlessDrillingMachine & { itemType: 'CordlessDrillingMachine' })
  | (WiredAngleGrinder & { itemType: 'WiredAngleGrinder' })
  | (CordlessAngleGrinder & { itemType: 'CordlessAngleGrinder' })
  | (CordlessReciprocatingSaw & { itemType: 'CordlessReciprocatingSaw' });

const outwardSchema = z.object({
  destination: z.string().min(1, 'Destination location is required.'),
  reason: z.string().min(1, 'A reason for the outward transfer is required.'),
  items: z.array(z.object({
    itemId: z.string(),
    itemType: z.string(),
    name: z.string(),
    serialNumber: z.string(),
  })).min(1, "Please add at least one item."),
});

type FormValues = z.infer<typeof outwardSchema>;

export default function NewOutwardDialog({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (v: boolean) => void; }) {
  const { user } = useAuth();
  const { createOutwardRecord } = useInwardOutward();
  const {
    inventoryItems, utMachines, dftMachines, digitalCameras, anemometers, otherEquipments, laptopsDesktops, mobileSims, weldingMachines, walkieTalkies,
    pneumaticDrillingMachines, pneumaticAngleGrinders, wiredDrillingMachines, cordlessDrillingMachines, wiredAngleGrinders, cordlessAngleGrinders, cordlessReciprocatingSaws
  } = useInventory();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(outwardSchema),
    defaultValues: { destination: '', reason: '', items: [] },
  });

  const selectedItems = form.watch("items");

  const allItems = useMemo(() => {
    const arr: SearchableItem[] = [];
    inventoryItems?.forEach((i) => arr.push({ ...i, itemType: "Inventory" }));
    utMachines?.forEach((i) => arr.push({ ...i, itemType: "UTMachine" }));
    dftMachines?.forEach((i) => arr.push({ ...i, itemType: "DftMachine" }));
    digitalCameras?.forEach((i) => arr.push({ ...i, itemType: "DigitalCamera" }));
    anemometers?.forEach((i) => arr.push({ ...i, itemType: "Anemometer" }));
    otherEquipments?.forEach((i) => arr.push({ ...i, itemType: "OtherEquipment" }));
    laptopsDesktops?.forEach((i) => arr.push({ ...i, itemType: "LaptopDesktop" }));
    mobileSims?.forEach((i) => arr.push({ ...i, itemType: "MobileSim" }));
    weldingMachines?.forEach((i) => arr.push({ ...i, itemType: "WeldingMachine" }));
    walkieTalkies?.forEach((i) => arr.push({ ...i, itemType: "WalkieTalkie" }));
    pneumaticDrillingMachines?.forEach((i) => arr.push({ ...i, itemType: "PneumaticDrillingMachine" }));
    pneumaticAngleGrinders?.forEach((i) => arr.push({ ...i, itemType: "PneumaticAngleGrinder" }));
    wiredDrillingMachines?.forEach((i) => arr.push({ ...i, itemType: "WiredDrillingMachine" }));
    cordlessDrillingMachines?.forEach((i) => arr.push({ ...i, itemType: "CordlessDrillingMachine" }));
    wiredAngleGrinders?.forEach((i) => arr.push({ ...i, itemType: "WiredAngleGrinder" }));
    cordlessAngleGrinders?.forEach((i) => arr.push({ ...i, itemType: "CordlessAngleGrinder" }));
    cordlessReciprocatingSaws?.forEach((i) => arr.push({ ...i, itemType: "CordlessReciprocatingSaw" }));
    return arr;
  }, [
    inventoryItems, utMachines, dftMachines, digitalCameras, anemometers, otherEquipments, laptopsDesktops, mobileSims, weldingMachines, walkieTalkies,
    pneumaticDrillingMachines, pneumaticAngleGrinders, wiredDrillingMachines, cordlessDrillingMachines, wiredAngleGrinders, cordlessAngleGrinders, cordlessReciprocatingSaws
  ]);

  const availableItems = useMemo(() => {
    if (!searchTerm) return [];
    
    return allItems.filter(it =>
      it.status !== 'Moved to another project' && // only available items
      !selectedItems.some(s => s.itemId === it.id && s.itemType === (it as any).itemType) &&
      (
        it.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        it.ariesId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (it as any).chestCrollNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (it as any).name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (it as any).machineName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (it as any).equipmentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${(it as any).make} ${(it as any).model}`.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [allItems, selectedItems, searchTerm]);

  const handleAdd = (item: SearchableItem) => {
    let name = (item as any).name || (item as any).machineName || (item as any).equipmentName;
    if (!name && (item as any).make && (item as any).model) {
      name = `${(item as any).make} ${(item as any).model}`;
    }
    if (!name) name = 'Unknown';
    
    form.setValue("items", [...selectedItems, {
      itemId: item.id,
      itemType: item.itemType,
      name,
      serialNumber: item.serialNumber,
    }]);
    setSearchTerm('');
  };

  const handleRemove = (itemId: string, itemType: string) => {
    form.setValue("items", selectedItems.filter(x => !(x.itemId === itemId && x.itemType === itemType)));
  };

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    await createOutwardRecord(data.items, data.destination, data.reason);
    setIsSubmitting(false);
    setIsOpen(false);
  };

  const resetForm = () => {
    form.reset({ destination: '', reason: '', items: [] });
    setSearchTerm("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) resetForm(); setIsOpen(v); }}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create Outward Record</DialogTitle>
          <DialogDescription>
            Log items moving out of the store. This will update their status and location.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Destination</Label><Input {...form.register("destination")} placeholder="e.g., Client Site, Repair Shop"/>{form.formState.errors.destination && <p className="text-xs text-destructive mt-1">{form.formState.errors.destination.message}</p>}</div>
            <div><Label>Reason for Outward</Label><Input {...form.register("reason")} placeholder="e.g., Project deployment, Repair"/>{form.formState.errors.reason && <p className="text-xs text-destructive mt-1">{form.formState.errors.reason.message}</p>}</div>
          </div>
          <div>
            <Label>Search & Add Items</Label>
            <Command className="border rounded-md">
              <CommandInput placeholder="Search by name, serial no, aries id..." value={searchTerm} onValueChange={setSearchTerm} />
              <ScrollArea className="h-40">
                <CommandList>
                  <CommandEmpty>No items match your search.</CommandEmpty>
                  <CommandGroup>
                    {availableItems.map(item => (
                      <CommandItem key={item.id + (item as any).itemType} onSelect={() => handleAdd(item)}>
                        {(item as any).name || (item as any).machineName || (item as any).equipmentName || `${(item as any).make} ${(item as any).model}`} (SN: {item.serialNumber})
                        {item.ariesId && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (ID: {item.ariesId})
                            </span>
                          )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </ScrollArea>
            </Command>
          </div>
          <div>
            <Label>Items to Move ({selectedItems.length})</Label>
            <ScrollArea className="h-40 border rounded-md p-2">
              {selectedItems.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground pt-4">
                  No items added.
                </p>
              ) : (
                selectedItems.map(item => (
                  <div key={item.itemId + item.itemType} className="flex justify-between items-center bg-muted p-2 rounded-md text-sm mb-2">
                    <span>{item.name} (SN: {item.serialNumber})</span>
                    <Button type="button" variant="ghost" size="icon" onClick={() => handleRemove(item.itemId, item.itemType)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </ScrollArea>
            {form.formState.errors.items && <p className="text-xs text-red-500 mt-1">{form.formState.errors.items.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Create Outward'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
