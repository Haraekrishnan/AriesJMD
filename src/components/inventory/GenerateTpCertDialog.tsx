
'use client';
import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileDown, Trash2 } from 'lucide-react';
import { generateTpCertExcel, generateTpCertPdf } from './generateTpCertReport';
import { InventoryItem, UTMachine, DftMachine } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface GenerateTpCertDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

type CertItem = (InventoryItem | UTMachine | DftMachine) & { itemType: string };

export default function GenerateTpCertDialog({ isOpen, setIsOpen }: GenerateTpCertDialogProps) {
  const { inventoryItems, utMachines, dftMachines } = useAppContext();
  const { toast } = useToast();
  const [selectedItems, setSelectedItems] = useState<CertItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const allSearchableItems = useMemo(() => {
    const items: CertItem[] = [];
    inventoryItems.forEach(item => items.push({ ...item, itemType: 'Inventory' }));
    utMachines.forEach(item => items.push({ ...item, itemType: 'UT Machine' }));
    dftMachines.forEach(item => items.push({ ...item, itemType: 'DFT Machine' }));
    return items;
  }, [inventoryItems, utMachines, dftMachines]);

  const filteredItems = useMemo(() => {
    if (!searchTerm) return [];
    return allSearchableItems.filter(item => {
      const serial = 'serialNumber' in item ? item.serialNumber.toLowerCase() : '';
      const ariesId = 'ariesId' in item && item.ariesId ? item.ariesId.toLowerCase() : '';
      return serial.includes(searchTerm.toLowerCase()) || ariesId.includes(searchTerm.toLowerCase());
    }).slice(0, 10); // Limit results for performance
  }, [searchTerm, allSearchableItems]);

  const handleSelect = (item: CertItem) => {
    if (!selectedItems.some(i => i.id === item.id)) {
      setSelectedItems(prev => [...prev, item]);
    }
    setSearchTerm('');
  };

  const handleRemove = (itemId: string) => {
    setSelectedItems(prev => prev.filter(item => item.id !== itemId));
  };
  
  const handleExport = (type: 'excel' | 'pdf') => {
    if (selectedItems.length === 0) {
      toast({ title: "No items to export", variant: "destructive" });
      return;
    }
    const exportData = selectedItems.map(item => ({
        materialName: 'name' in item ? item.name : item.machineName,
        manufacturerSrNo: item.serialNumber,
    }));
    
    if (type === 'excel') {
        generateTpCertExcel(exportData);
    } else {
        generateTpCertPdf(exportData);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Generate TP Certification List</DialogTitle>
          <DialogDescription>
            Search and add items to generate a list for third-party certification.
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative">
          <Command className="rounded-lg border shadow-md">
            <CommandInput 
              placeholder="Search by Serial No or Aries ID..."
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            {filteredItems.length > 0 && (
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup>
                        {filteredItems.map(item => (
                        <CommandItem
                            key={item.id}
                            onSelect={() => handleSelect(item)}
                            className="cursor-pointer"
                        >
                            { 'name' in item ? item.name : item.machineName } (SN: {item.serialNumber})
                        </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            )}
          </Command>
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
                    <TableRow key={item.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{'name' in item ? item.name : item.machineName}</TableCell>
                      <TableCell>{item.serialNumber}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleRemove(item.id)}>
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

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
          <div className="flex gap-2">
            <Button onClick={() => handleExport('excel')}><FileDown className="mr-2 h-4 w-4" /> Export Excel</Button>
            <Button onClick={() => handleExport('pdf')}><FileDown className="mr-2 h-4 w-4" /> Export PDF</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
