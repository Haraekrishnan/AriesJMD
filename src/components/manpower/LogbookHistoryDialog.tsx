
'use client';
import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '../ui/label';
import { ManpowerProfile, LogbookStatus } from '@/lib/types';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { ChevronsUpDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface LogbookHistoryDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const getStatusVariant = (status?: LogbookStatus) => {
    switch (status) {
        case 'Received': return 'success';
        case 'Not Received': return 'destructive';
        case 'Sent back as requested': return 'warning';
        case 'Requested': return 'default';
        case 'Pending':
        default:
            return 'secondary';
    }
};

export default function LogbookHistoryDialog({ isOpen, setIsOpen }: LogbookHistoryDialogProps) {
  const { manpowerProfiles } = useAppContext();
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  
  const selectedProfile = useMemo(() => {
    return manpowerProfiles.find(p => p.id === selectedProfileId);
  }, [selectedProfileId, manpowerProfiles]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
        setSelectedProfileId(null);
    }
    setIsOpen(open);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg h-full max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Logbook History</DialogTitle>
          <DialogDescription>Select an employee to view their logbook status and history.</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-2">
            <Label>Select Employee</Label>
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                        {selectedProfile ? selectedProfile.name : "Select employee..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                        <CommandInput placeholder="Search employee..." />
                        <CommandList>
                            <CommandEmpty>No employees found.</CommandEmpty>
                            <CommandGroup>
                                {manpowerProfiles.map(p => (
                                    <CommandItem key={p.id} value={p.name} onSelect={() => {
                                        setSelectedProfileId(p.id);
                                        setIsPopoverOpen(false);
                                    }}>
                                        {p.name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>

        {selectedProfile && (
            <div className="flex-1 overflow-hidden flex flex-col mt-4">
                <h3 className="font-semibold mb-2">History for {selectedProfile.name}</h3>
                <ScrollArea className="flex-1 border rounded-md p-4">
                    {selectedProfile.logbook ? (
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-2"><strong>Status:</strong> <Badge variant={getStatusVariant(selectedProfile.logbook.status)}>{selectedProfile.logbook.status || 'Pending'}</Badge></div>
                            {selectedProfile.logbook?.outDate && <p><strong>Out Date:</strong> {format(parseISO(selectedProfile.logbook.outDate), 'dd MMM, yyyy')}</p>}
                            {selectedProfile.logbook?.inDate && <p><strong>In Date:</strong> {format(parseISO(selectedProfile.logbook.inDate), 'dd MMM, yyyy')}</p>}
                            {selectedProfile.logbook?.remarks && <p className="whitespace-pre-wrap"><strong>Remarks:</strong> {selectedProfile.logbook.remarks}</p>}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">No logbook history found for this employee.</p>
                    )}
                </ScrollArea>
            </div>
        )}

        <DialogFooter className="mt-auto">
          <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
