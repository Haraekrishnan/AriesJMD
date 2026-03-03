
'use client';
import { useMemo, useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '../ui/scroll-area';
import { Trash2 } from 'lucide-react';
import { InventoryItem, UTMachine, DftMachine, TpCertList, TpCertListItem, DigitalCamera, Anemometer, OtherEquipment, LaptopDesktop, MobileSim } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Input } from '@/components/ui/input';
import { DatePickerInput } from '../ui/date-picker-input';
import { parseISO, isValid, format } from 'date-fns';

interface GenerateTpCertDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  existingList?: TpCertList | null;
  listToCreate?: Partial<TpCertList> | null;
}

type SearchableItem = (InventoryItem | UTMachine | DftMachine | DigitalCamera | Anemometer | OtherEquipment | LaptopDesktop | MobileSim) & { itemType: 'Inventory' | 'UTMachine' | 'DftMachine' | 'DigitalCamera' | 'Anemometer' | 'OtherEquipment' | 'LaptopDesktop' | 'MobileSim'; };

export default function GenerateTpCertDialog({ isOpen, setIsOpen, existingList = null, listToCreate = null }: GenerateTpCertDialogProps) {
  const { 
      inventoryItems, utMachines, dftMachines, digitalCameras, anemometers, otherEquipments, laptopsDesktops, mobileSims, 
      addTpCertList, updateTpCertList 
  } = useAppContext();
      const { toast } = useToast();
      const [selectedItems, setSelectedItems] = useState<TpCertListItem[]>([]);
      const [selectedItemName, setSelectedItemName] = useState<string | null>(null);
      const [searchTerm, setSearchTerm] = useState('');
      const [listName, setListName] = useState('');
      const [listDate, setListDate] = useState<Date | undefined>(new Date());

      const allSearchableItems = useMemo(() => {
        const items: SearchableItem[] = [];
        inventoryItems?.forEach(item => items.push({ ...item, itemType: 'Inventory' }));
        utMachines?.forEach(item => items.push({ ...item, itemType: 'UTMachine' }));
        dftMachines?.forEach(item => items.push({ ...item, itemType: 'DftMachine' }));
        digitalCameras?.forEach(item => items.push({ ...item, itemType: 'DigitalCamera' }));
        anemometers?.forEach(item => items.push({ ...item, itemType: 'Anemometer' }));
        otherEquipments?.forEach(item => items.push({ ...item, itemType: 'OtherEquipment' }));
        laptopsDesktops?.forEach(item => items.push({ ...item, itemType: 'LaptopDesktop' }));
        mobileSims?.forEach(item => items.push({ ...item, itemType: 'MobileSim' }));
        return items;
      }, [inventoryItems, utMachines, dftMachines, digitalCameras, anemometers, otherEquipments, laptopsDesktops, mobileSims]);

      useEffect(() => {
        if (existingList) {
          setListName(existingList.name);
          const enrichedItems = existingList.items.map(listItem => {
            const fullItem = allSearchableItems.find(i => i.id === listItem.itemId);
            return {
                ...listItem,
                ariesId: fullItem?.ariesId || listItem.ariesId, // Use fullItem's ariesId
                manufacturerSrNo: (fullItem as any)?.serialNumber || listItem.manufacturerSrNo,
            };
          });
          setSelectedItems(enrichedItems);
          const parsedDate = parseISO(existingList.date);
          setListDate(isValid(parsedDate) ? parsedDate : new Date());
        } else if (listToCreate) {
          setListName(listToCreate.name || '');
          setSelectedItems(listToCreate.items || []);
          const parsedDate = listToCreate.date ? parseISO(listToCreate.date) : new Date();
          setListDate(isValid(parsedDate) ? parsedDate : new Date());
        } else {
            setListDate(new Date());
        }
      }, [existingList, listToCreate, isOpen, allSearchableItems]);

      const sortedSelectedItems = useMemo(() => {
        return [...selectedItems].sort((a, b) => a.materialName.localeCompare(b.materialName));
      }, [selectedItems]);

      const uniqueItemNames = useMemo(() => {
        const names = new Set<string>();
        allSearchableItems.forEach(item => {
            const name = (item as any).name || (item as any).machineName || (item as any).equipmentName || (item as any).model;
            if (name) names.add(name);
        });
        return Array.from(names).sort();
      }, [allSearchableItems]);

      const itemsOfSelectedName = useMemo(() => {
        if (!selectedItemName) return [];
        return allSearchableItems.filter(item => {
            const name = (item as any).name || (item as any).machineName || (item as any).equipmentName || (item as any).model;
            return name === selectedItemName;
        });
      }, [selectedItemName, allSearchableItems]);

      const filteredItems = useMemo(() => {
        if (!searchTerm) {
            return itemsOfSelectedName;
        }
        const term = searchTerm.toLowerCase();
        return itemsOfSelectedName.filter(item => 
            ((item as any).serialNumber && (item as any).serialNumber.toLowerCase().includes(term)) ||
            (item.ariesId && item.ariesId.toLowerCase().includes(term))
        );
      }, [searchTerm, itemsOfSelectedName]);


      const handleSelect = (item: SearchableItem) => {
        const materialName = (item as any).name || (item as any).machineName || (item as any).equipmentName || (item as any).model;
        const serialNumber = (item as any).serialNumber || (item as any).model || (item as any).makeModel || (item as any).number || 'N/A';

        const newItem: TpCertListItem = {
          itemId: item.id,
          itemType: item.itemType,
          materialName,
          manufacturerSrNo: serialNumber,
          chestCrollNo: (item as InventoryItem).chestCrollNo,
          ariesId: item.ariesId || null,
        };
      
        if (!selectedItems.some(i => i.itemId === newItem.itemId && i.itemType === newItem.itemType)) {
          setSelectedItems(prev => [...prev, newItem]);
        }
      
        setSearchTerm('');
      };
      
      const handleRemove = (itemId: string, itemType: string) => {
        setSelectedItems(prev => prev.filter(item => !(item.itemId === itemId && item.itemType === itemType)));
      };
      
      const handleSaveList = () => {
        if (selectedItems.length === 0) {
          toast({ title: 'No items in the list', variant: 'destructive' });
          return;
        }
        if (!listName.trim()) {
          toast({ title: 'List name required', description: 'Please provide a name for this list.', variant: 'destructive'});
          return;
        }
        if (!listDate) {
            toast({ title: 'Date required', description: 'Please select a date for this list.', variant: 'destructive'});
            return;
        }
        
        if (existingList) {
          updateTpCertList({ ...existingList, name: listName, items: selectedItems, date: format(listDate, 'yyyy-MM-dd') });
          toast({ title: 'List Updated', description: 'Your certification list has been updated.' });
        } else {
          const listToSave: Omit<TpCertList, 'id' | 'creatorId' | 'createdAt'> = {
            name: listName,
            date: format(listDate, 'yyyy-MM-dd'),
            items: selectedItems,
          };
          addTpCertList(listToSave);
          toast({ title: 'List Saved', description: 'Your certification list has been saved.'});
        }
        
        handleClose();
      };

      const handleClose = () => {
        setListName('');
        setSelectedItems([]);
        setSelectedItemName(null);
        setSearchTerm('');
        setListDate(new Date());
        setIsOpen(false);
      }

      const handleOpenChange = (open: boolean) => {
        if (open) {
          setIsOpen(true);
        } else {
          handleClose();
        }
      };

      return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogContent 
            className="max-w-4xl h-[90vh] flex flex-col"
          >
            <DialogHeader>
              <DialogTitle>{existingList ? "Edit TP Certification List" : "Generate TP Certification List"}</DialogTitle>
              <DialogDescription>
                Search and add items to generate a list for third-party certification.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>1. Select Item Type</Label>
                    <Select onValueChange={setSelectedItemName} value={selectedItemName || ''}>
                        <SelectTrigger><SelectValue placeholder="Select an item..." /></SelectTrigger>
                        <SelectContent>
                            {uniqueItemNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label>2. Search & Add (by Serial No. or Aries ID)</Label>
                     <Command className="rounded-lg border shadow-md">
                        <CommandInput
                          placeholder="Search within selected item..."
                          value={searchTerm}
                          onValueChange={setSearchTerm}
                          disabled={!selectedItemName}
                        />
                        <ScrollArea className="h-24">
                          <CommandList>
                              <CommandEmpty>No results found.</CommandEmpty>
                              <CommandGroup>
                                  {filteredItems.map(item => (
                                  <CommandItem
                                      key={`${item.id}-${item.itemType}`}
                                      onSelect={() => handleSelect(item)}
                                      className="cursor-pointer"
                                  >
                                      <span>{item.serialNumber || 'N/A'}</span>
                                      {item.ariesId && <span className="ml-auto text-xs text-muted-foreground">(ID: {item.ariesId})</span>}
                                  </CommandItem>
                                  ))}
                              </CommandGroup>
                          </CommandList>
                        </ScrollArea>
                    </Command>
                 </div>
            </div>

            <div className="flex-1 mt-4 border rounded-md overflow-hidden">
              <ScrollArea className="h-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sr. No.</TableHead>
                      <TableHead>Material Name</TableHead>
                      <TableHead>Manufacturer Sr. No.</TableHead>
                      <TableHead>Chest Croll No.</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedSelectedItems.length > 0 ? (
                      sortedSelectedItems.map((item, index) => {
                        return (
                            <TableRow key={`${item.itemId}-${item.itemType}`}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>{item.materialName}</TableCell>
                              <TableCell>{item.manufacturerSrNo || '-'}</TableCell>
                              <TableCell>{item.chestCrollNo || '-'}</TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => handleRemove(item.itemId, item.itemType)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          No items added to the list.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            <DialogFooter className="pt-4 justify-between">
              <div className='flex gap-2 items-center'>
                <Input 
                  placeholder="Enter list name..." 
                  value={listName} 
                  onChange={(e) => setListName(e.target.value)} 
                  className="w-48"
                />
                <div className="flex items-center gap-2">
                    <Label className="text-sm shrink-0">List Date:</Label>
                    <DatePickerInput value={listDate} onChange={setListDate} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                 <Button variant="default" onClick={handleSaveList} disabled={selectedItems.length === 0 || !listName.trim()}>
                  {existingList ? 'Save Changes' : 'Save List'}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
}
