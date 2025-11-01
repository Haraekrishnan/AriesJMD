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

  // Compose unified list of items with itemType
  const allSearchableItems = useMemo(() => {
    const items: CertItem[] = [];
    inventoryItems?.forEach(item => items.push({ ...item, itemType: 'Inventory' }));
    utMachines?.forEach(item => items.push({ ...item, itemType: 'UT Machine' }));
    dftMachines?.forEach(item => items.push({ ...item, itemType: 'DFT Machine' }));
    return items;
  }, [inventoryItems, utMachines, dftMachines]);

  // Updated search: show items even if some fields missing
  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return allSearchableItems.slice(0, 10);
    }
    return allSearchableItems.filter(item => {
      const candidates: string[] = [];

      if ('name' in item && item.name) candidates.push(String(item.name).toLowerCase());
      if ('machineName' in item && item.machineName) candidates.push(String(item.machineName).toLowerCase());
      if ('serialNumber' in item && item.serialNumber) candidates.push(String(item.serialNumber).toLowerCase());
      if ('ariesId' in item && item.ariesId) candidates.push(String(item.ariesId).toLowerCase());
      if (item.itemType) candidates.push(item.itemType.toLowerCase());

      // match if any candidate includes the term
      return candidates.some(c => c.includes(term));
    }).slice(0, 50); // limit results for performance
  }, [searchTerm, allSearchableItems]);

  const handleSelect = (item: CertItem) => {
    if (!selectedItems.some(i => i.id === item.id && i.itemType === item.itemType)) {
      setSelectedItems(prev => [...prev, item]);
    }
    setSearchTerm('');
  };

  const handleRemove = (itemId: string, itemType: string) => {
    setSelectedItems(prev => prev.filter(item => !(item.id === itemId && item.itemType === itemType)));
  };

  const handleExport = async (type: 'excel' | 'pdf') => {
    if (selectedItems.length === 0) {
      toast({ title: 'No items to export', variant: 'destructive' });
      return;
    }

    // map to the minimal shape required by generators
    const exportData = selectedItems.map(item => ({
      materialName: 'name' in item && item.name ? item.name : ('machineName' in item ? item.machineName : 'Unknown Item'),
      manufacturerSrNo: 'serialNumber' in item && item.serialNumber ? item.serialNumber : '',
      newOrOld: 'OLD', // default value — change if you want to use a different field
    }));

    try {
      // NOTE: header image path — place image at public/images/aries-header.png
      const headerImagePath = '/images/aries-header.png';

      if (type === 'excel') {
        await generateTpCertExcel(exportData, headerImagePath);
        toast({ title: 'Excel generated', variant: 'default' });
      } else {
        await generateTpCertPdf(exportData, headerImagePath);
        toast({ title: 'PDF generated', variant: 'default' });
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Export failed', description: String(err), variant: 'destructive' });
    }
  };

  const getItemName = (item: CertItem) => {
    if ('name' in item && item.name) return item.name;
    if ('machineName' in item && item.machineName) return item.machineName;
    return 'Unknown Item';
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
              placeholder="Search by name, Serial No, Aries ID or type..."
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              {filteredItems.length === 0 ? (
                <CommandEmpty>No results found.</CommandEmpty>
              ) : (
                <CommandGroup>
                  {filteredItems.map(item => (
                    <CommandItem
                      key={`${item.id}-${item.itemType}`}
                      onSelect={() => handleSelect(item)}
                      className="cursor-pointer"
                    >
                      {getItemName(item)} — (SN: {item.serialNumber || 'N/A'}) — [{item.itemType}]
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
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

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
          <div className="flex gap-2">
            <Button onClick={() => handleExport('excel')}>
              <FileDown className="mr-2 h-4 w-4" /> Export Excel
            </Button>
            <Button onClick={() => handleExport('pdf')}>
              <FileDown className="mr-2 h-4 w-4" /> Export PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
