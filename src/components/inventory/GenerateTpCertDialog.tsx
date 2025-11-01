
'use client';
import { useMemo, useState } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2 } from 'lucide-react';
import { generateTpCertExcel, generateTpCertPdf } from './generateTpCertReport';
import { InventoryItem, UTMachine, DftMachine, TpCertList } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Input } from '@/components/ui/input';

interface GenerateTpCertDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

type CertItem = (InventoryItem | UTMachine | DftMachine) & { itemType: string };

export default function GenerateTpCertDialog({ isOpen, setIsOpen }: GenerateTpCertDialogProps) {
  const { inventoryItems, utMachines, dftMachines, addTpCertList } = useAppContext();
  const { toast } = useToast();
  const [selectedItems, setSelectedItems] = useState<CertItem[]>([]);
  const [selectedItemName, setSelectedItemName] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [listName, setListName] = useState('');

  const allSearchableItems = useMemo(() => {
    const items: CertItem[] = [];
    inventoryItems?.forEach(item => items.push({ ...item, itemType: 'Inventory' }));
    utMachines?.forEach(item => items.push({ ...item, itemType: 'UT Machine' }));
    dftMachines?.forEach(item => items.push({ ...item, itemType: 'DFT Machine' }));
    return items;
  }, [inventoryItems, utMachines, dftMachines]);
  
  const uniqueItemNames = useMemo(() => {
    const names = new Set<string>();
    allSearchableItems.forEach(item => {
        const name = 'name' in item ? item.name : ('machineName' in item ? item.machineName : null);
        if (name) names.add(name);
    });
    return Array.from(names).sort();
  }, [allSearchableItems]);

  const itemsOfSelectedName = useMemo(() => {
    if (!selectedItemName) return [];
    return allSearchableItems.filter(item => {
        const name = 'name' in item ? item.name : ('machineName' in item ? item.machineName : '');
        return name === selectedItemName;
    });
  }, [selectedItemName, allSearchableItems]);

  const filteredItems = useMemo(() => {
    if (!searchTerm) {
        return itemsOfSelectedName;
    }
    const term = searchTerm.toLowerCase();
    return itemsOfSelectedName.filter(item => 
        (item.serialNumber && item.serialNumber.toLowerCase().includes(term)) ||
        ('ariesId' in item && item.ariesId && item.ariesId.toLowerCase().includes(term))
    );
  }, [searchTerm, itemsOfSelectedName]);


  const handleSelect = (item: CertItem) => {
    if (!selectedItems.some(i => i.id === item.id && i.itemType === item.itemType)) {
      setSelectedItems(prev => [...prev, item]);
    }
    setSearchTerm('');
  };

  const handleRemove = (itemId: string, itemType: string) => {
    setSelectedItems(prev => prev.filter(item => !(item.id === itemId && item.itemType === itemType)));
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

    const listToSave: Omit<TpCertList, 'id' | 'creatorId' | 'createdAt'> & {date: string} = {
      name: listName,
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      items: selectedItems.map(item => ({
        materialName: getItemName(item),
        manufacturerSrNo: item.serialNumber,
      })),
    };

    addTpCertList(listToSave);
    toast({ title: 'List Saved', description: 'Your certification list has been saved.'});
    setListName('');
    setSelectedItems([]);
    setSelectedItemName(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setIsOpen(true);
    } else {
      handleCloseAttempt();
    }
  };

  const handleCloseAttempt = () => {
    if (selectedItems.length > 0) {
      toast({
        title: 'Save Required',
        description: 'Please save the list before closing.',
        variant: 'destructive',
      });
    } else {
      // Clear state on close
      setListName('');
      setSelectedItems([]);
      setSelectedItemName(null);
      setSearchTerm('');
      setIsOpen(false);
    }
  };

  const getItemName = (item: CertItem) => {
    if ('name' in item && item.name) return item.name;
    if ('machineName' in item && item.machineName) return item.machineName;
    return 'Unknown Item';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="max-w-4xl h-[90vh] flex flex-col"
        onInteractOutside={(e) => {
            if (selectedItems.length > 0) {
                e.preventDefault();
                handleCloseAttempt();
            }
        }}
      >
        <DialogHeader>
          <DialogTitle>Generate TP Certification List</DialogTitle>
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
                    <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup>
                            {filteredItems.map(item => (
                            <CommandItem
                                key={`${item.id}-${item.itemType}`}
                                onSelect={() => handleSelect(item)}
                                className="cursor-pointer"
                            >
                                {getItemName(item)} — (SN: {item.serialNumber || 'N/A'})
                            </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedItems.length > 0 ? (
                  selectedItems.map((item, index) => (
                    <TableRow key={`${item.id}-${item.itemType}`}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{getItemName(item)}</TableCell>
                      <TableCell>{item.serialNumber || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleRemove(item.id, item.itemType)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
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
            <Button variant="outline" onClick={handleSaveList} disabled={selectedItems.length === 0 || !listName.trim()}>
              Save List
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCloseAttempt} disabled={selectedItems.length > 0 && !listName.trim()}>Close</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
