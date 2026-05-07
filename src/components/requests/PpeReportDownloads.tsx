'use client';
import { useMemo } from 'react';
import type { PpeRequest, PpeHistoryRecord, PpeInwardRecord } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { DateRange } from 'react-day-picker';
import { format, isWithinInterval, parseISO, startOfDay, endOfDay, compareAsc, isAfter, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useInventory } from '@/contexts/inventory-provider';
import { useAuth } from '@/contexts/auth-provider';
import { useManpower } from '@/contexts/manpower-provider';
import { useGeneral } from '@/contexts/general-provider';
import jsPDF from 'jspdf';
import 'jspdf-autotable';


interface PpeReportDownloadsProps {
  dateRange: DateRange | undefined;
}

export default function PpeReportDownloads({ dateRange }: PpeReportDownloadsProps) {
  const { ppeRequests, ppeInwardHistory, ppeStock } = useInventory();
  const { users } = useAuth();
  const { manpowerProfiles } = useManpower();
  const { projects } = useGeneral();
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

    // 1. Get all unique item keys (e.g., "Coverall-S", "Safety Shoes")
    const allItems = new Set<string>();
    ppeInwardHistory.forEach(item => {
        if(item.ppeType === 'Coverall' && item.sizes) {
            Object.keys(item.sizes).forEach(size => allItems.add(`Coverall-${size}`));
        } else if (item.ppeType === 'Safety Shoes') {
            allItems.add('Safety Shoes');
        }
    });
    manpowerProfiles.forEach(profile => {
        const historyArray: PpeHistoryRecord[] = Array.isArray(profile.ppeHistory) ? profile.ppeHistory : Object.values(profile.ppeHistory || {});
        historyArray.forEach(item => {
            if(item.ppeType === 'Coverall' && item.size) {
                allItems.add(`Coverall-${item.size}`);
            } else if (item.ppeType === 'Safety Shoes') {
                allItems.add('Safety Shoes');
            }
        });
    });

    if (allItems.size === 0) {
      toast({
        variant: 'destructive',
        title: 'No Data Found',
        description: 'No PPE transactions occurred in the selected date range.',
      });
      return;
    }

    const workbook = XLSX.utils.book_new();

    // 2. For each unique item, create a sheet
    allItems.forEach(itemKey => {
      const [ppeType, size] = itemKey.split('-') as ['Coverall' | 'Safety Shoes', string | undefined];

      // 3. Calculate Opening Stock by "rewinding" from current stock
      const coverallStockData = ppeStock.find(s => s.id === 'coveralls');
      const shoeStockData = ppeStock.find(s => s.id === 'safetyShoes');
      
      let currentStock = 0;
      if (ppeType === 'Coverall' && size && coverallStockData?.sizes) {
          currentStock = coverallStockData.sizes[size] || 0;
      } else if (ppeType === 'Safety Shoes' && shoeStockData) {
          currentStock = shoeStockData.quantity || 0;
      }
      
      const issuedSinceFrom = manpowerProfiles.flatMap(p => Array.isArray(p.ppeHistory) ? p.ppeHistory : Object.values(p.ppeHistory || {}))
          .filter(t => t && t.ppeType === ppeType && (!size || t.size === size) && isAfter(parseISO(t.issueDate), startOfDay(from)))
          .reduce((sum, t) => sum + (t.quantity || 1), 0);

      const manualInwardSinceFrom = ppeInwardHistory
          .filter(t => t.ppeType === ppeType && (t.type === 'Inward' || !t.type) && isAfter(parseISO(t.date), startOfDay(from)))
          .reduce((sum, t) => {
            if (ppeType === 'Coverall' && t.sizes && size) return sum + (t.sizes[size] || 0);
            if (ppeType === 'Safety Shoes') return sum + (t.quantity || 0);
            return sum;
          }, 0);

      const manualOutwardSinceFrom = ppeInwardHistory
          .filter(t => t.ppeType === ppeType && t.type === 'Outward' && isAfter(parseISO(t.date), startOfDay(from)))
          .reduce((sum, t) => {
            if (ppeType === 'Coverall' && t.sizes && size) return sum + (t.sizes[size] || 0);
            if (ppeType === 'Safety Shoes') return sum + (t.quantity || 0);
            return sum;
          }, 0);
          
      const openingStock = currentStock + (issuedSinceFrom + manualOutwardSinceFrom) - manualInwardSinceFrom;

      // 4. Gather all transactions for the item within the date range
      const issuedItemsInRange = manpowerProfiles.flatMap(profile => 
        (Array.isArray(profile.ppeHistory) ? profile.ppeHistory : Object.values(profile.ppeHistory || {}))
        .filter(item => 
          item &&
          item.ppeType === ppeType && 
          (!size || item.size === size) &&
          isWithinInterval(parseISO(item.issueDate), { start: startOfDay(from), end: endOfDay(to) })
        )
        .map(item => ({ ...item, employee: profile, transactionType: 'issue' as const, transactionDate: item.issueDate }))
      );

      const manualTransactionsInRange = ppeInwardHistory
        .filter(item => item.ppeType === ppeType && isWithinInterval(parseISO(item.date), { start: startOfDay(from), end: endOfDay(to) }))
        .map(item => ({ 
            ...item, 
            transactionType: (item.type === 'Outward' ? 'outward-manual' : 'inward') as 'inward' | 'outward-manual', 
            transactionDate: item.date 
        }));

      const allTransactions = [...issuedItemsInRange, ...manualTransactionsInRange].sort((a,b) => 
        compareAsc(parseISO(a.transactionDate), parseISO(b.transactionDate))
      );

      // 5. Build sheet data with running balance
      let runningStock = openingStock;
      const sheetData: any[] = [];
      sheetData.push({ 'Date': format(from, 'dd-MM-yyyy'), 'Transaction Type': 'Opening Stock', 'Stock After Transaction': openingStock });

      allTransactions.forEach(t => {
        let qtyIn = 0;
        let qtyOut = 0;
        
        const row: any = {
          'Date': format(parseISO(t.transactionDate), 'dd-MM-yyyy'),
          'Employee Name': 'N/A', 'Trade': 'N/A', 'Project': 'N/A',
          'Justification': 'N/A', 'Remarks': 'N/A',
        };
        
        if (t.transactionType === 'issue') {
            const request = ppeRequests.find(r => r.id === t.requestId);
            qtyOut = (t as any).quantity || 1;
            row['Transaction Type'] = `Issued (${(t as any).requestType})`;
            row['Employee Name'] = (t as any).employee.name;
            row['Trade'] = (t as any).employee.trade;
            row['Project'] = (t as any).employee.eic ? projects.find(p => p.id === (t as any).employee.eic)?.name : 'N/A';
            row['Justification'] = request?.newRequestJustification || 'N/A';
            row['Remarks'] = (t as any).remarks || request?.remarks || '';
        } else if (t.transactionType === 'outward-manual') {
            qtyOut = (ppeType === 'Coverall' && (t as any).sizes && size) ? ((t as any).sizes[size] || 0) : ((t as any).quantity || 0);
            row['Transaction Type'] = 'Outward Stock (Manual)';
            row['Remarks'] = (t as any).remarks || '';
        } else { // Inward
            qtyIn = (ppeType === 'Coverall' && (t as any).sizes && size) ? ((t as any).sizes[size] || 0) : ((t as any).quantity || 0);
            row['Transaction Type'] = 'Inward Stock';
            row['Employee Name'] = `Added by ${users.find(u => u.id === (t as any).addedByUserId)?.name || 'Unknown'}`;
            row['Remarks'] = (t as any).remarks || '';
        }
        
        runningStock = runningStock + qtyIn - qtyOut;
        row['Quantity In'] = qtyIn || '';
        row['Quantity Out'] = qtyOut || '';
        row['Stock After Transaction'] = runningStock;

        sheetData.push(row);
      });
      
      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      // Clean up sheet name for Excel
      const sheetName = itemKey.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 31);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    XLSX.writeFile(workbook, `PPE_Report_${format(from, 'yyyy-MM-dd')}_to_${format(to, 'yyyy-MM-dd')}.xlsx`);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = parseISO(dateString);
    return isValid(date) ? format(date, 'dd MMM, yyyy') : 'N/A';
  };

  const isDisabled = !dateRange || !dateRange.from;

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={handleDownloadExcel} disabled={isDisabled}><FileDown className="mr-2 h-4 w-4"/> Export Report</Button>
    </div>
  );
}
