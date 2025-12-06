

'use client';
import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { ManpowerProfile, LogbookRecord, LogbookStatus } from '@/lib/types';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { DatePickerInput } from '../ui/date-picker-input';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

interface LogbookRegisterDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const statusOptions: LogbookStatus[] = ['Pending', 'Received'];

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

export default function LogbookRegisterDialog({ isOpen, setIsOpen }: LogbookRegisterDialogProps) {
  const { manpowerProfiles, updateManpowerProfile, addLogbookHistoryRecord } = useAppContext();
  const { toast } = useToast();
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);
  const [status, setStatus] = useState<LogbookStatus | ''>('');
  const [inDate, setInDate] = useState<Date | undefined>();
  const [outDate, setOutDate] = useState<Date | undefined>();
  const [remarks, setRemarks] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProfiles = useMemo(() => {
    return manpowerProfiles.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [manpowerProfiles, searchTerm]);

  const handleUpdate = () => {
    if (selectedProfileIds.length === 0) {
      toast({ title: 'No employees selected', variant: 'destructive' });
      return;
    }
    if (!status) {
      toast({ title: 'Please select a status', variant: 'destructive' });
      return;
    }

    selectedProfileIds.forEach(profileId => {
      addLogbookHistoryRecord(profileId, {
        status,
        inDate: inDate?.toISOString(),
        outDate: outDate?.toISOString(),
        remarks,
      });
    });

    toast({ title: `${selectedProfileIds.length} profile(s) updated successfully.` });
    setSelectedProfileIds([]);
    setStatus('');
    setInDate(undefined);
    setOutDate(undefined);
    setRemarks('');
  };
  
  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedProfileIds(filteredProfiles.map(p => p.id));
    } else {
      setSelectedProfileIds([]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl h-full max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Logbook Register</DialogTitle>
          <DialogDescription>Update logbook status for multiple employees.</DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-md">
            <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                    <SelectTrigger><SelectValue placeholder="Set Status" /></SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label>In Date</Label>
                <DatePickerInput value={inDate} onChange={setInDate} />
            </div>
            <div className="space-y-2">
                <Label>Out Date</Label>
                <DatePickerInput value={outDate} onChange={setOutDate} />
            </div>
            <div className="space-y-2">
                <Label>Remarks</Label>
                <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </div>
             <div className="col-span-full flex justify-end">
                <Button onClick={handleUpdate} disabled={selectedProfileIds.length === 0 || !status}>Update Selected ({selectedProfileIds.length})</Button>
            </div>
        </div>

        <div className="relative flex-1 overflow-hidden flex flex-col">
          <Input 
            placeholder="Search employees..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-2"
          />
          <ScrollArea className="flex-1 border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12">
                            <Checkbox 
                                checked={selectedProfileIds.length > 0 && selectedProfileIds.length === filteredProfiles.length ? true : (selectedProfileIds.length > 0 ? 'indeterminate' : false)}
                                onCheckedChange={handleSelectAll} 
                            />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Trade</TableHead>
                        <TableHead>Current Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredProfiles.map(profile => (
                        <TableRow key={profile.id}>
                            <TableCell><Checkbox checked={selectedProfileIds.includes(profile.id)} onCheckedChange={() => {
                                setSelectedProfileIds(prev => prev.includes(profile.id) ? prev.filter(id => id !== profile.id) : [...prev, profile.id])
                            }} /></TableCell>
                            <TableCell>{profile.name}</TableCell>
                            <TableCell>{profile.trade}</TableCell>
                            <TableCell>
                                <Badge variant={getStatusVariant(profile.logbook?.status)}>{profile.logbook?.status || 'Pending'}</Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
