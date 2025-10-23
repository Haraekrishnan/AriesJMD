
'use client';
import { useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parseISO } from 'date-fns';
import { FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Badge } from '../ui/badge';
import { MemoRecord } from '@/lib/types';

interface MemoReportDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

interface MemoReportItem extends MemoRecord {
  employeeName: string;
  employeeTrade: string;
}

export default function MemoReportDialog({ isOpen, setIsOpen }: MemoReportDialogProps) {
  const { manpowerProfiles } = useAppContext();

  const allMemos = useMemo(() => {
    const memos: MemoReportItem[] = [];
    manpowerProfiles.forEach(profile => {
        const historyArray = Array.isArray(profile.memoHistory) ? profile.memoHistory : Object.values(profile.memoHistory || {});
        historyArray.forEach(memo => {
            if (memo) {
                memos.push({
                    ...memo,
                    employeeName: profile.name,
                    employeeTrade: profile.trade,
                });
            }
        });
    });
    return memos.sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [manpowerProfiles]);

  const handleDownloadExcel = () => {
    if (allMemos.length === 0) return;

    const dataToExport = allMemos.map(memo => ({
      'Employee Name': memo.employeeName,
      'Trade': memo.employeeTrade,
      'Type': memo.type,
      'Date': format(parseISO(memo.date), 'dd-MM-yyyy'),
      'Reason': memo.reason,
      'Issued By': memo.issuedBy,
      'Attachment Link': memo.attachmentUrl || 'N/A',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Memo Report');
    XLSX.writeFile(workbook, 'Memo_And_Warning_Letter_Report.xlsx');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl h-full max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Memo & Warning Letter Report</DialogTitle>
          <DialogDescription>A complete log of all memos and warning letters issued to employees.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Issued By</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {allMemos.map(memo => (
                    <TableRow key={memo.id}>
                    <TableCell>
                        <p className="font-semibold">{memo.employeeName}</p>
                        <p className="text-xs text-muted-foreground">{memo.employeeTrade}</p>
                    </TableCell>
                    <TableCell><Badge variant={memo.type === 'Warning Letter' ? 'destructive' : 'secondary'}>{memo.type}</Badge></TableCell>
                    <TableCell>{format(parseISO(memo.date), 'dd-MM-yyyy')}</TableCell>
                    <TableCell className="max-w-xs truncate">{memo.reason}</TableCell>
                    <TableCell>{memo.issuedBy}</TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            {allMemos.length === 0 && <p className="text-center py-8 text-muted-foreground">No memos or warnings found.</p>}
            </ScrollArea>
        </div>
        <DialogFooter className="mt-auto">
            <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
            <Button onClick={handleDownloadExcel} disabled={allMemos.length === 0}>
                <FileDown className="mr-2 h-4 w-4" /> Export to Excel
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

