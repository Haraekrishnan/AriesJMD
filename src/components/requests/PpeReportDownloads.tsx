
'use client';
import { useMemo } from 'react';
import type { PpeRequest, PpeHistoryRecord, PpeInwardRecord } from '@/lib/types';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { DateRange } from 'react-day-picker';
import { format, isWithinInterval, parseISO, startOfDay, endOfDay, compareAsc, isBefore } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface PpeReportDownloadsProps {
  dateRange: DateRange | undefined;
}

export default function PpeReportDownloads({ dateRange }: PpeReportDownloadsProps) {
  const { ppeRequests, users, manpowerProfiles, projects, ppeInwardHistory, ppeStock } = useAppContext();
  const { toast } = useToast();
  
  const handleDownloadExcel = () => {
    if (!dateRange || !dateRange.from) {
        toast({
            variant: 'destructive',
            title: 'No Date Range Selected',
            description: 'Please select a start and end date to generate the report.',
        });
        return;
    }
    const { from, to = from } = dateRange;

    // 1. Get all transactions within the date range
    const issuedItems: (PpeHistoryRecord & { employee: any, type: 'issue' })[] = manpowerProfiles.flatMap(profile => {
        const historyArray: PpeHistoryRecord[] = Array.isArray(profile.ppeHistory) ? profile.ppeHistory : Object.values(profile.ppeHistory || {});
        return historyArray
            .filter(item => {
                if (!item.issueDate) return false;
                const issueDate = parseISO(item.issueDate);
                return isWithinInterval(issueDate, { start: startOfDay(from), end: endOfDay(to) });
            })
            .map(item => ({ ...item, employee: profile, type: 'issue' as const }))
    });
    
    const inwardItems: (PpeInwardRecord & { type: 'inward' })[] = ppeInwardHistory.filter(item => {
        if (!item.date) return false;
        const inwardDate = parseISO(item.date);
        return isWithinInterval(inwardDate, { start: startOfDay(from), end: endOfDay(to) });
    }).map(item => ({ ...item, type: 'inward' as const }));

    // 2. Group transactions by item key (e.g., "Coverall-S", "Safety Shoes")
    const groupedTransactions: { [key: string]: (typeof issuedItems[0] | typeof inwardItems[0])[] } = {};

    [...issuedItems, ...inwardItems].forEach(transaction => {
      let key: string;
      if (transaction.ppeType === 'Coverall') {
        key = `${transaction.ppeType}-${transaction.size}`;
      } else { // Safety Shoes
        key = transaction.ppeType;
      }

      if (!groupedTransactions[key]) {
        groupedTransactions[key] = [];
      }
      groupedTransactions[key].push(transaction);
    });

    if (Object.keys(groupedTransactions).length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Data Found',
        description: 'No PPE transactions occurred in the selected date range.',
      });
      return;
    }

    const workbook = XLSX.utils.book_new();

    // 3. For each group, create a sheet
    for (const key in groupedTransactions) {
      const transactions = groupedTransactions[key].sort((a,b) => {
        const dateA = 'issueDate' in a ? a.issueDate : a.date;
        const dateB = 'issueDate' in b ? b.issueDate : b.date;
        return compareAsc(parseISO(dateA), parseISO(dateB));
      });
      
      const ppeType = transactions[0].ppeType;
      const size = transactions[0].size;
      
      const isCoverall = ppeType === 'Coverall';

      // Calculate initial stock at the beginning of the date range
      const initialInward = ppeInwardHistory
          .filter(t => {
              if (isBefore(parseISO(t.date), startOfDay(from))) {
                  if (isCoverall) {
                      return t.ppeType === ppeType && t.sizes?.[size!];
                  }
                  return t.ppeType === ppeType;
              }
              return false;
          })
          .reduce((sum, t) => sum + (isCoverall ? (t.sizes?.[size!] || 0) : (t.quantity || 0)), 0);
          
      const initialIssued = manpowerProfiles.flatMap(p => Array.isArray(p.ppeHistory) ? p.ppeHistory : Object.values(p.ppeHistory || {}))
          .filter(t => t && t.issueDate && t.ppeType === ppeType && (isCoverall ? t.size === size : true) && isBefore(parseISO(t.issueDate), startOfDay(from)))
          .reduce((sum, t) => sum + (t.quantity || 1), 0);
      
      let runningStock = initialInward - initialIssued;

      const sheetData = transactions.map(t => {
        const stockBefore = runningStock;
        let qtyIn = 0;
        let qtyOut = 0;
        
        const row: any = {
          'Date': format(parseISO('issueDate' in t ? t.issueDate : t.date), 'dd-MM-yyyy'),
          'Transaction Type': t.type === 'issue' ? 'Issued' : 'Inward',
          'Employee Name': 'N/A',
          'Trade': 'N/A',
          'Project': 'N/A',
        };
        
        if (t.type === 'issue') {
            const request = ppeRequests.find(r => r.id === t.requestId);
            qtyOut = t.quantity || 1;
            runningStock -= qtyOut;

            row['Employee Name'] = t.employee.name;
            row['Trade'] = t.employee.trade;
            row['Project'] = t.employee.eic ? projects.find(p => p.id === t.employee.eic)?.name : 'N/A';
            row['Justification'] = request?.newRequestJustification || 'N/A';
            row['Remarks'] = t.remarks || request?.remarks || '';
        } else { // Inward
            qtyIn = isCoverall ? (t.sizes?.[size!] || 0) : (t.quantity || 0);
            runningStock += qtyIn;

            row['Employee Name'] = `Inward by ${users.find(u => u.id === t.addedByUserId)?.name || 'Unknown'}`;
        }
        
        row['Quantity In'] = qtyIn;
        row['Quantity Out'] = qtyOut;
        row['Stock Before Transaction'] = stockBefore;
        row['Stock After Transaction'] = runningStock;

        return row;
      });
      
      // Add opening balance row
      sheetData.unshift({
        'Date': format(from, 'dd-MM-yyyy'),
        'Transaction Type': 'Opening Stock',
        'Employee Name': '', 'Trade': '', 'Project': '',
        'Quantity In': '', 'Quantity Out': '',
        'Stock Before Transaction': '',
        'Stock After Transaction': initialInward - initialIssued,
        'Justification': '', 'Remarks': ''
      });

      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      // Sheet names can't contain certain characters, so we sanitize it.
      const sheetName = key.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 31);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }

    XLSX.writeFile(workbook, `PPE_Report_${format(from, 'yyyy-MM-dd')}_to_${format(to, 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={handleDownloadExcel} disabled={!dateRange || !dateRange.from}>
        <FileDown className="mr-2 h-4 w-4" /> Export Report
      </Button>
    </div>
  );
}
