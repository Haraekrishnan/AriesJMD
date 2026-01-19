'use client';
import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '../ui/label';
import { ManpowerProfile, LogbookStatus, LogbookRecord, Comment } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { ChevronsUpDown, Trash2, MessageSquare, FileDown } from 'lucide-react';
import { format, parseISO, formatDistanceToNow, isValid } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { DatePickerInput } from '../ui/date-picker-input';
import { Textarea } from '../ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import LogbookSummary from './LogbookSummary';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface LogbookRegisterDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const statusOptions: LogbookStatus[] = ['Pending', 'Received', 'Sent back as requested', 'Not Received'];

const getStatusVariant = (status?: LogbookStatus) => {
    switch (status) {
        case 'Received': return 'success';
        case 'Not Received': return 'destructive';
        case 'Sent back as requested': return 'warning';
        case 'Pending':
        default:
            return 'secondary';
    }
};

export default function LogbookRegisterDialog({ isOpen, setIsOpen }: LogbookRegisterDialogProps) {
  const { user, manpowerProfiles, users, addLogbookHistoryRecord } = useAppContext();
  const { toast } = useToast();
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);
  const [status, setStatus] = useState<LogbookStatus | ''>('');
  const [inDate, setInDate] = useState<Date | undefined>();
  const [outDate, setOutDate] = useState<Date | undefined>();
  const [remarks, setRemarks] = useState('');
  const [requestedById, setRequestedById] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [manpowerStatusFilter, setManpowerStatusFilter] = useState<'Working' | 'On Leave' | 'All'>('All');

  const filteredProfilesForStatus = useMemo(() => {
    if (manpowerStatusFilter === 'All') {
        return manpowerProfiles;
    }
    return manpowerProfiles.filter(p => p.status === manpowerStatusFilter);
  }, [manpowerProfiles, manpowerStatusFilter]);

  const filteredProfilesForList = useMemo(() => {
    return filteredProfilesForStatus.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [filteredProfilesForStatus, searchTerm]);
  
  const possibleRequesters = useMemo(() => {
    return users.filter(u => u.role !== 'Manager');
  }, [users]);

  const handleUpdate = () => {
    if (selectedProfileIds.length === 0) {
      toast({ title: 'No employees selected', variant: 'destructive' });
      return;
    }
    if (!status) {
      toast({ title: 'Please select a status', variant: 'destructive' });
      return;
    }
    if (status === 'Sent back as requested' && !requestedById) {
      toast({ title: 'Please select who requested the logbook', variant: 'destructive' });
      return;
    }

    selectedProfileIds.forEach(profileId => {
      addLogbookHistoryRecord(profileId, {
        status,
        inDate: inDate?.toISOString(),
        outDate: outDate?.toISOString(),
        remarks,
        requestedById: status === 'Sent back as requested' ? requestedById : null,
      });
    });

    toast({ title: `${selectedProfileIds.length} profile(s) updated successfully.` });
    setSelectedProfileIds([]);
    setStatus('');
    setInDate(undefined);
    setOutDate(undefined);
    setRemarks('');
    setRequestedById(null);
  };
  
  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedProfileIds(filteredProfilesForList.map(p => p.id));
    } else {
      setSelectedProfileIds([]);
    }
  };

  const handleExportExcel = async () => {
    const profilesToExport = filteredProfilesForStatus;
    if (profilesToExport.length === 0) {
      toast({
        variant: "destructive",
        title: "No Data to Export",
        description: "There are no manpower profiles to generate a history report from for the selected filter.",
      });
      return;
    }

    const allRecords = profilesToExport.flatMap(profile => {
        const history = profile.logbookHistory ? (Array.isArray(profile.logbookHistory) ? Object.values(profile.logbookHistory) : Object.values(profile.logbookHistory || {})) : [];

        if (history.length > 0) {
            return history.map(record => {
                const enteredBy = users.find(u => u.id === record.enteredById);
                const requestedBy = record.requestedById ? users.find(u => u.id === record.requestedById) : null;
                const approver = record.approverId ? users.find(u => u.id === record.approverId) : null;
                
                return {
                    'Employee Name': profile.name,
                    'Trade': profile.trade,
                    'Status': record.status || 'N/A',
                    'In Date': record.inDate ? format(parseISO(record.inDate), 'dd-MM-yyyy') : '',
                    'Out Date': record.outDate ? format(parseISO(record.outDate), 'dd-MM-yyyy') : '',
                    'Request Remarks': record.requestRemarks || '',
                    'Approver Remarks': record.approverComment || '',
                    'Manual Entry Remarks': record.remarks || '',
                    'Entry Date': record.entryDate ? format(parseISO(record.entryDate), 'dd-MM-yyyy p') : '',
                    'Entered By': enteredBy?.name || 'Unknown',
                    'Requested By': requestedBy?.name || 'N/A',
                    'Approved/Rejected By': approver?.name || 'N/A',
                };
            });
        } else if (!profile.logbook || profile.logbook.status === 'Pending') {
            return [{
                'Employee Name': profile.name,
                'Trade': profile.trade,
                'Status': 'Pending',
                'In Date': '',
                'Out Date': '',
                'Request Remarks': '',
                'Approver Remarks': '',
                'Manual Entry Remarks': '',
                'Entry Date': '',
                'Entered By': '',
                'Requested By': '',
                'Approved/Rejected By': '',
            }];
        }
        return [];
    });

    if (allRecords.length === 0) {
        toast({ title: 'No History Found', description: 'No logbook history or pending records to export for the selected filter.' });
        return;
    }
    
    allRecords.sort((a, b) => {
        const dateA = a['Entry Date'] ? parseISO(a['Entry Date']) : null;
        const dateB = b['Entry Date'] ? parseISO(b['Entry Date']) : null;
        if (!dateA && !dateB) return (a['Employee Name'] || '').localeCompare(b['Employee Name'] || '');
        if (!dateA) return 1;
        if (!dateB) return -1;
        if (dateB.getTime() === dateA.getTime()) {
            return (a['Employee Name'] || '').localeCompare(b['Employee Name'] || '');
        }
        return dateB.getTime() - dateA.getTime();
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Logbook History');

    worksheet.columns = [
      { header: 'Employee Name', key: 'Employee Name', width: 25 },
      { header: 'Trade', key: 'Trade', width: 20 },
      { header: 'Status', key: 'Status', width: 20 },
      { header: 'In Date', key: 'In Date', width: 15 },
      { header: 'Out Date', key: 'Out Date', width: 15 },
      { header: 'Request Remarks', key: 'Request Remarks', width: 40 },
      { header: 'Approver Remarks', key: 'Approver Remarks', width: 40 },
      { header: 'Manual Entry Remarks', key: 'Manual Entry Remarks', width: 40 },
      { header: 'Entry Date', key: 'Entry Date', width: 20 },
      { header: 'Entered By', key: 'Entered By', width: 20 },
      { header: 'Requested By', key: 'Requested By', width: 20 },
      { header: 'Approved/Rejected By', key: 'Approved/Rejected By', width: 20 },
    ];
    
    worksheet.addRows(allRecords);
    
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), 'Logbook_History_Report.xlsx');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl h-full max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Logbook Register</DialogTitle>
          <DialogDescription>Update logbook status for multiple employees.</DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center gap-4">
          <Label>Filter by Status:</Label>
          <Select value={manpowerStatusFilter} onValueChange={(v) => setManpowerStatusFilter(v as any)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Working">Working</SelectItem>
              <SelectItem value="On Leave">On Leave</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <LogbookSummary profiles={filteredProfilesForStatus} />

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 p-4 border rounded-md">
            <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                    <SelectTrigger><SelectValue placeholder="Set Status" /></SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            {status === 'Sent back as requested' && (
                <div className="space-y-2">
                    <Label>Requested By</Label>
                    <Select value={requestedById || ''} onValueChange={setRequestedById}>
                        <SelectTrigger><SelectValue placeholder="Select User" /></SelectTrigger>
                        <SelectContent>
                            {possibleRequesters.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            )}
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
                                checked={filteredProfilesForList.length > 0 && selectedProfileIds.length === filteredProfilesForList.length ? true : (selectedProfileIds.length > 0 ? 'indeterminate' : false)}
                                onCheckedChange={handleSelectAll} 
                            />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Trade</TableHead>
                        <TableHead>Current Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredProfilesForList.map(profile => (
                        <TableRow key={profile.id} onClick={() => {
                                setSelectedProfileIds(prev => prev.includes(profile.id) ? prev.filter(id => id !== profile.id) : [...prev, profile.id])
                            }} className="cursor-pointer">
                            <TableCell><Checkbox checked={selectedProfileIds.includes(profile.id)} /></TableCell>
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

        <DialogFooter className="mt-auto flex justify-between w-full">
          <Button variant="secondary" onClick={handleExportExcel} type="button">
              <FileDown className="mr-2 h-4 w-4"/> Excel Report
          </Button>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
