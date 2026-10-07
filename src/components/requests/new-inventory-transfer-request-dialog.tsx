'use client';
import { transferItemLabel } from './transfer-item-label';
import { useEquipmentOrganization } from '@/components/equipment/use-equipment-organization';

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/auth-provider";
import { useGeneral } from "@/contexts/general-provider";
import { useInventory } from "@/contexts/inventory-provider";
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
import type {
  InventoryItem,
  UTMachine,
  DftMachine,
  DigitalCamera,
  Anemometer,
  OtherEquipment,
  LaptopDesktop,
  MobileSim,
  TransferReason,
  Role,
  InventoryTransferRequest,
  WeldingMachine,
  WalkieTalkie,
  PneumaticDrillingMachine,
  PneumaticAngleGrinder,
  WiredDrillingMachine,
  CordlessDrillingMachine,
  WiredAngleGrinder,
  CordlessAngleGrinder,
  CordlessReciprocatingSaw,
} from "@/lib/types";

import { TRANSFER_REASONS } from "@/lib/types";
import { FormProvider } from "react-hook-form";
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ChevronsUpDown, Check } from 'lucide-react';
import { Badge } from '../ui/badge';

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

const transferRequestSchema = z
  .object({
    fromProjectId: z.string().min(1, "Origin project is required"),
    toProjectId: z.string().min(1, "Destination project is required"),
    reason: z.enum(TRANSFER_REASONS, { required_error: 'A reason is required.'}),
    requestedById: z.string().optional(),
    remarks: z.string().optional(),
    items: z
      .array(
        z.object({
          itemId: z.string(),
          itemType: z.enum([
            "Inventory",
            "UTMachine",
            "DftMachine",
            "DigitalCamera",
            "Anemometer",
            "OtherEquipment",
            "LaptopDesktop",
            "MobileSim",
            "WeldingMachine",
            "WalkieTalkie",
            "PneumaticDrillingMachine",
            "PneumaticAngleGrinder",
            "WiredDrillingMachine",
            "CordlessDrillingMachine",
            "WiredAngleGrinder",
            "CordlessAngleGrinder",
            "CordlessReciprocatingSaw",
          ]),
          name: z.string(),
          serialNumber: z.string(),
          length: z.string().optional(),
          ariesId: z.string().optional(),
        })
      )
      .min(1, "Please add at least one item to transfer"),
  })
  .refine((d) => d.fromProjectId !== d.toProjectId, {
    path: ["toProjectId"],
    message: "Destination must be different from origin",
  })
  .refine(
    (d) =>
      d.reason !== "Transfer to another project as requested by" ||
      !!d.requestedById,
    {
      path: ["requestedById"],
      message: "Requested By is required for selected reason",
    }
  );

type FormValues = z.infer<typeof transferRequestSchema>;

export default function NewInventoryTransferRequestDialog({
  isOpen,
  setIsOpen,
  preSelectedItems = [],
  onClearSelection = () => {},
  existingRequest,
}: {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  preSelectedItems?: InventoryItem[];
  onClearSelection?: () => void;
  existingRequest?: InventoryTransferRequest | null;
}) {
  const { user, users, can } = useAuth();
  const { projects } = useGeneral();
  const {
    inventoryItems,
    utMachines,
    dftMachines,
    digitalCameras,
    anemometers,
    otherEquipments,
    laptopsDesktops,
    mobileSims,
    weldingMachines,
    walkieTalkies,
    pneumaticDrillingMachines,
    pneumaticAngleGrinders,
    wiredDrillingMachines,
    cordlessDrillingMachines,
    wiredAngleGrinders,
    cordlessAngleGrinders,
    cordlessReciprocatingSaws,
    addInventoryTransferRequest,
    updateInventoryTransferRequest,
  } = useInventory();
  const { toast } = useToast();
  const { state: equipmentOrganization } = useEquipmentOrganization();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(transferRequestSchema),
    defaultValues: {
      fromProjectId: user?.projectIds?.[0] || "",
      toProjectId: "",
      reason: undefined,
      requestedById: undefined,
      remarks: "",
      items: [],
    },
  });
  
  useEffect(() => {
    if (isOpen) {
      if (existingRequest) {
        form.reset({
          ...existingRequest,
          items: existingRequest.items.map(item => ({...item, ariesId: item.ariesId || undefined}))
        });
      } else if (preSelectedItems.length > 0) {
        const firstItemProjectId = preSelectedItems[0].projectId;
        form.setValue('fromProjectId', firstItemProjectId);
        form.setValue('items', preSelectedItems.map(item => ({
          itemId: item.id,
          itemType: 'Inventory', // Assuming pre-selected items are always 'Inventory'
          name: item.name,
          serialNumber: item.serialNumber,
          length: 'length' in item ? String(item.length || '') : '',
          ariesId: item.ariesId,
        })));
      }
    }
  }, [isOpen, preSelectedItems, existingRequest, form]);


  const fromProjectId = form.watch("fromProjectId");
  const selectedItems = form.watch("items");
  const reason = form.watch("reason");
  
  const canTransferFromAll = useMemo(() => {
    if (!user) return false;
    const privilegedRoles: Role[] = ['Admin', 'Project Coordinator', 'Store in Charge', 'Assistant Store Incharge', 'Document Controller'];
    return privilegedRoles.includes(user.role);
  }, [user]);

  const fromProjectOptions = useMemo(() => {
    if (!projects) return [];
    if (canTransferFromAll) {
      return [{ id: 'all', name: 'All Projects' }, ...projects];
    }
    return projects.filter(p => user?.projectIds?.includes(p.id));
  }, [projects, user, canTransferFromAll]);

  const allItems = useMemo(() => {
    const arr: SearchableItem[] = [];
    inventoryItems?.forEach((i) => arr.push({ ...i, itemType: "Inventory" }));
    utMachines?.forEach((i) => arr.push({ ...i, itemType: "UTMachine" }));
    dftMachines?.forEach((i) => arr.push({ ...i, itemType: "DftMachine" }));
    digitalCameras?.forEach((i) =>
      arr.push({ ...i, itemType: "DigitalCamera" })
    );
    anemometers?.forEach((i) =>
      arr.push({ ...i, itemType: "Anemometer" })
    );
    otherEquipments?.forEach((i) =>
      arr.push({ ...i, itemType: "OtherEquipment" })
    );
    weldingMachines?.forEach((i) =>
      arr.push({ ...i, itemType: "WeldingMachine" })
    );
    walkieTalkies?.forEach((i) =>
      arr.push({ ...i, itemType: "WalkieTalkie" })
    );
    laptopsDesktops?.forEach((i) => arr.push({ ...i, itemType: "LaptopDesktop" }));
    mobileSims?.forEach((i) => arr.push({ ...i, itemType: "MobileSim" }));
    pneumaticDrillingMachines?.forEach(i => arr.push({...i, itemType: 'PneumaticDrillingMachine'}));
    pneumaticAngleGrinders?.forEach(i => arr.push({...i, itemType: 'PneumaticAngleGrinder'}));
    wiredDrillingMachines?.forEach(i => arr.push({...i, itemType: 'WiredDrillingMachine'}));
    cordlessDrillingMachines?.forEach(i => arr.push({...i, itemType: 'CordlessDrillingMachine'}));
    wiredAngleGrinders?.forEach(i => arr.push({...i, itemType: 'WiredAngleGrinder'}));
    cordlessAngleGrinders?.forEach(i => arr.push({...i, itemType: 'CordlessAngleGrinder'}));
    cordlessReciprocatingSaws?.forEach(i => arr.push({...i, itemType: 'CordlessReciprocatingSaw'}));
    return arr;
  }, [
    inventoryItems,
    utMachines,
    dftMachines,
    digitalCameras,
    anemometers,
    otherEquipments,
    laptopsDesktops,
    mobileSims,
    weldingMachines,
    walkieTalkies,
    pneumaticDrillingMachines,
    pneumaticAngleGrinders,
    wiredDrillingMachines,
    cordlessDrillingMachines,
    wiredAngleGrinders,
    cordlessAngleGrinders,
    cordlessReciprocatingSaws,
  ]);

  const availableItems = useMemo(() => {
    if (!fromProjectId) return [];

    const term = searchTerm.trim().toLowerCase();

    const sourceItems = (fromProjectId === 'all' && canTransferFromAll)
      ? allItems
      : allItems.filter(it => it.projectId === fromProjectId);

    return sourceItems.filter(
      (it) =>
        !selectedItems.some(
          (s) => s.itemId === it.id && s.itemType === it.itemType
        ) &&
        (
            String(it.serialNumber || '').toLowerCase().includes(term) ||
            String(it.ariesId || '').toLowerCase().includes(term) ||
            String((it as any).name || '').toLowerCase().includes(term) ||
            String((it as any).machineName || '').toLowerCase().includes(term) ||
            String((it as any).equipmentName || '').toLowerCase().includes(term) ||
            transferItemLabel(it, equipmentOrganization).toLowerCase().includes(term)
        )
    );
  }, [allItems, fromProjectId, selectedItems, searchTerm, canTransferFromAll, equipmentOrganization]);

  const handleAdd = (item: SearchableItem) => {
    const name = transferItemLabel(item, equipmentOrganization);

    form.setValue("items", [
      ...selectedItems,
      {
        itemId: item.id,
        itemType: item.itemType,
        name: name,
        serialNumber: String(item.serialNumber || ''),
        length: 'length' in item ? String(item.length || '') : '',
        ariesId: item.ariesId ? String(item.ariesId) : undefined,
      },
    ]);
    setSearchTerm('');
  };

  const handleRemove = (itemId: string, type: string) => {
    form.setValue(
      "items",
      selectedItems.filter((x) => !(x.itemId === itemId && x.itemType === type))
    );
  };

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    let success = false;
    try {
      if (existingRequest) {
        success = await updateInventoryTransferRequest({ ...existingRequest, ...data });
        if (success) toast({ title: "Transfer Request Updated" });
      } else {
        success = await addInventoryTransferRequest(data);
      }
      if (success) {
        setIsOpen(false);
      }
    } catch (error) {
        console.error("Submission handler error:", error);
        toast({ title: "An unexpected error occurred.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    form.reset({
      fromProjectId: user?.projectIds?.[0] || "",
      toProjectId: "",
      reason: undefined,
      requestedById: undefined,
      remarks: "",
      items: [],
    });
    setSearchTerm("");
    onClearSelection();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(v) => { if (!v) resetForm(); setIsOpen(v); }}
    >
      <FormProvider {...form}>
        <DialogContent 
            className="sm:max-w-3xl"
            onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{existingRequest ? 'Edit' : 'New'} Inventory Transfer Request</DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* ------------------- Projects ------------------- */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>From Project</Label>
                <Controller
                  name="fromProjectId"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={preSelectedItems.length > 0 || !!existingRequest}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select origin..." />
                      </SelectTrigger>
                      <SelectContent>
                        {fromProjectOptions.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div>
                <Label>To Project</Label>
                <Controller
                  name="toProjectId"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select destination..." />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem
                            key={p.id}
                            value={p.id}
                            disabled={p.id === fromProjectId}
                          >
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.toProjectId && (
                  <p className="text-xs text-red-500 mt-1">
                    {form.formState.errors.toProjectId.message}
                  </p>
                )}
              </div>
            </div>

            {/* ------------------- Reason ------------------- */}
            <div>
              <Label>Reason</Label>
              <Controller
                name="reason"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason..." />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSFER_REASONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.reason && (
                <p className="text-xs text-red-500 mt-1">
                  {form.formState.errors.reason.message}
                </p>
              )}
            </div>

            {/* ------------------- Requested By ------------------- */}
            {reason === "Transfer to another project as requested by" && (
              <div>
                <Label>Requested By</Label>
                <Controller
                  name="requestedById"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select requester..." />
                      </SelectTrigger>
                      <SelectContent>
                        {users
                          .filter((u) => u.role !== "Manager" && u.status !== 'deactivated')
                          .map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.requestedById && (
                  <p className="text-xs text-red-500 mt-1">
                    {form.formState.errors.requestedById.message}
                  </p>
                )}
              </div>
            )}

            {/* ------------------- Remarks ------------------- */}
            <div>
              <Label>Remarks</Label>
              <Textarea {...form.register("remarks")} />
            </div>

            {/* ------------------- Search Items ------------------- */}
            <div>
              <Label>Search & Add Items</Label>
              <Command shouldFilter={false} className="border rounded-md">
                <CommandInput
                  placeholder="Search name, serial, Aries ID..."
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                />
                <ScrollArea className="h-40">
                  <CommandList>
                    <CommandEmpty>{!fromProjectId ? 'Select an origin project to see inventory and equipment.' : 'No available items match this project and search.'}</CommandEmpty>
                    <CommandGroup>
                      {availableItems.map((item) => (
                        <CommandItem
                          value={item.itemType + ':' + item.id}
                          key={item.id + item.itemType}
                          onSelect={() => handleAdd(item)}
                        >
                          {transferItemLabel(item, equipmentOrganization)}{" "}
                          (SN: {item.serialNumber})
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

            {/* ------------------- Selected Items ------------------- */}
            <div>
              <Label>Items to Transfer ({selectedItems.length})</Label>
              <ScrollArea className="h-40 border rounded-md p-2">
                {selectedItems.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground pt-4">
                    No items added yet.
                  </p>
                ) : (
                  selectedItems.map((item) => (
                    <div
                      key={item.itemId + item.itemType}
                      className="flex justify-between items-center bg-muted p-2 rounded-md text-sm mb-2"
                    >
                      <span>
                        {item.name}{'length' in item && !!item.length && <span> · Length: {String(item.length)}</span>} (SN: {item.serialNumber}
                        {item.ariesId ? `, ID: ${item.ariesId}` : ""})
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(item.itemId, item.itemType)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </ScrollArea>
              {form.formState.errors.items && (
                <p className="text-xs text-red-500 mt-1">
                  {form.formState.errors.items.message}
                </p>
              )}
            </div>

            {/* ------------------- Footer ------------------- */}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm();
                  setIsOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : (existingRequest ? 'Update Request' : 'Submit Request')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </FormProvider>
    </Dialog>
  );
}