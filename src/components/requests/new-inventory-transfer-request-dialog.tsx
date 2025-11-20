
'use client';
import { useMemo, useState, useEffect } from "react";
import { useAppContext } from "@/contexts/app-provider";
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
  TransferReason,
} from "@/lib/types";
import { TRANSFER_REASONS } from "@/lib/types";

type SearchableItem =
  | (InventoryItem & { itemType: "Inventory" })
  | (UTMachine & { itemType: "UTMachine" })
  | (DftMachine & { itemType: "DftMachine" })
  | (DigitalCamera & { itemType: "DigitalCamera" })
  | (Anemometer & { itemType: "Anemometer" })
  | (OtherEquipment & { itemType: "OtherEquipment" });

type SelectedItem = {
  itemId: string;
  itemType: string;
  name: string;
  serialNumber: string;
  ariesId?: string;
};

export default function NewInventoryTransferRequestDialog({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
}) {
  const {
    user,
    users,
    projects,
    inventoryItems,
    utMachines,
    dftMachines,
    digitalCameras,
    anemometers,
    otherEquipments,
    addInventoryTransferRequest,
  } = useAppContext();
  const { toast } = useToast();

  // State management using useState
  const [fromProjectId, setFromProjectId] = useState(user?.projectIds?.[0] || "");
  const [toProjectId, setToProjectId] = useState("");
  const [reason, setReason] = useState<TransferReason | undefined>();
  const [requestedById, setRequestedById] = useState<string | undefined>();
  const [remarks, setRemarks] = useState("");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

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
    return arr;
  }, [
    inventoryItems,
    utMachines,
    dftMachines,
    digitalCameras,
    anemometers,
    otherEquipments,
  ]);

  const availableItems = useMemo(() => {
    if (!fromProjectId) return [];
    return allItems.filter(
      (it) =>
        it.projectId === fromProjectId &&
        !selectedItems.some(
          (s) => s.itemId === it.id && s.itemType === it.itemType
        ) &&
        (searchTerm
          ? it.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            it.ariesId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (it as any).name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (it as any).machineName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (it as any).equipmentName?.toLowerCase().includes(searchTerm.toLowerCase())
          : true)
    );
  }, [allItems, fromProjectId, selectedItems, searchTerm]);

  const handleAdd = (item: SearchableItem) => {
    setSelectedItems((prev) => [
      ...prev,
      {
        itemId: item.id,
        itemType: item.itemType,
        name: (item as any).name || (item as any).machineName || (item as any).equipmentName,
        serialNumber: item.serialNumber,
        ariesId: item.ariesId,
      },
    ]);
    setSearchTerm('');
  };

  const handleRemove = (itemId: string, type: string) => {
    setSelectedItems((prev) =>
      prev.filter((x) => !(x.itemId === itemId && x.itemType === type))
    );
  };

  const handleSubmit = () => {
    // Manual Validation
    if (!fromProjectId) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select an origin project.' });
      return;
    }
    if (!toProjectId) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select a destination project.' });
      return;
    }
    if (fromProjectId === toProjectId) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Destination must be different from origin.' });
      return;
    }
    if (!reason) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select a reason for the transfer.' });
      return;
    }
    if (reason === "Transfer to another project as requested by" && !requestedById) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select who requested the transfer.' });
      return;
    }
    if (selectedItems.length === 0) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please add at least one item to transfer.' });
      return;
    }

    addInventoryTransferRequest({
      fromProjectId,
      toProjectId,
      reason,
      requestedById,
      remarks,
      items: selectedItems,
    });
    toast({ title: "Transfer Request Submitted" });
    setIsOpen(false);
  };

  const resetForm = () => {
    setFromProjectId(user?.projectIds?.[0] || "");
    setToProjectId("");
    setReason(undefined);
    setRequestedById(undefined);
    setRemarks("");
    setSelectedItems([]);
    setSearchTerm("");
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>New Inventory Transfer Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>From Project</Label>
              <Select value={fromProjectId} onValueChange={setFromProjectId}>
                <SelectTrigger><SelectValue placeholder="Select origin..." /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>To Project</Label>
              <Select value={toProjectId} onValueChange={setToProjectId}>
                <SelectTrigger><SelectValue placeholder="Select destination..." /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (<SelectItem key={p.id} value={p.id} disabled={p.id === fromProjectId}>{p.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as TransferReason)}>
              <SelectTrigger><SelectValue placeholder="Select reason..." /></SelectTrigger>
              <SelectContent>
                {TRANSFER_REASONS.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          {reason === "Transfer to another project as requested by" && (
            <div>
              <Label>Requested By</Label>
              <Select value={requestedById} onValueChange={setRequestedById}>
                <SelectTrigger><SelectValue placeholder="Select requester..." /></SelectTrigger>
                <SelectContent>
                  {users.filter((u) => u.role !== "Manager").map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Remarks</Label>
            <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
          <div>
            <Label>Search & Add Items</Label>
            <Command className="border rounded-md">
              <CommandInput placeholder="Search name, serial, Aries ID..." value={searchTerm} onValueChange={setSearchTerm} />
              <ScrollArea className="h-40">
                <CommandList>
                  <CommandEmpty>No items match.</CommandEmpty>
                  <CommandGroup>
                    {availableItems.map((item) => (
                      <CommandItem key={item.id + item.itemType} onSelect={() => handleAdd(item)}>
                        {(item as any).name || (item as any).machineName || (item as any).equipmentName}{" "}
                        (SN: {item.serialNumber})
                        {item.ariesId && (<span className="ml-2 text-xs text-muted-foreground">(ID: {item.ariesId})</span>)}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </ScrollArea>
            </Command>
          </div>
          <div>
            <Label>Items to Transfer ({selectedItems.length})</Label>
            <ScrollArea className="h-48 border rounded-md p-2">
              {selectedItems.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">No items added yet.</p>
              ) : (
                selectedItems.map((item) => (
                  <div key={item.itemId + item.itemType} className="flex justify-between items-center bg-muted p-2 rounded-md text-sm mb-2">
                    <span>
                      {item.name} (SN: {item.serialNumber}{item.ariesId ? `, ID: ${item.ariesId}` : ""})
                    </span>
                    <Button type="button" variant="ghost" size="icon" onClick={() => handleRemove(item.itemId, item.itemType)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button type="button" onClick={handleSubmit}>Submit Request</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
