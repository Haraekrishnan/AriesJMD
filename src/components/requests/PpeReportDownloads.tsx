
'use client';
import { useMemo } from 'react';
import type { PpeRequest } from '@/lib/types';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { DateRange } from 'react-day-picker';
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface PpeReportDownloadsProps {
  dateRange: DateRange | undefined;
}

export default function PpeReportDownloads({ dateRange }: PpeReportDownloadsProps) {
  const { ppeRequests, users, manpowerProfiles, projects } = useAppContext();
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

    const issuedItems = manpowerProfiles.flatMap(profile => 
        (profile.ppeHistory || [])
            .filter(item => {
                const issueDate = parseISO(item.issueDate);
                return isWithinInterval(issueDate, { start: startOfDay(from), end: endOfDay(to) });
            })
            .map(item => ({ ...item, employee: profile }))
    );


    if (issuedItems.length === 0) {
        toast({
            variant: 'destructive',
            title: 'No Data Found',
            description: 'No PPE was issued in the selected date range.',
        });
        return;
    }

    const dataToExport = issuedItems.map(item => {
      const request = ppeRequests.find(r => r.id === item.requestId);
      const requester = request ? users.find(u => u.id === request.requesterId) : null;
      const approver = request ? users.find(u => u.id === request.approverId) : null;
      
      return {
        'Issue Date': item.issueDate ? format(parseISO(item.issueDate), 'dd-MM-yyyy') : 'N/A',
        'Employee Name': item.employee.name,
        'Trade': item.employee.trade,
        'Project': item.employee.eic ? projects.find(p => p.id === item.employee.eic)?.name : 'N/A',
        'PPE Type': item.ppeType,
        'Size': item.size,
        'Quantity': item.quantity || (item.ppeType === 'Safety Shoes' ? 1 : 'N/A'),
        'Request Type': item.requestType,
        'Requester': requester?.name || 'N/A',
        'Approver': approver?.name || 'N/A',
        'Issued By': users.find(u=>u.id === item.issuedById)?.name || 'N/A',
        'Requester Remarks': item.remarks || '',
        'Store Remarks': item.storeComment || '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PPE Issue Report');
    XLSX.writeFile(workbook, `PPE_Issue_Report_${format(from, 'yyyy-MM-dd')}_to_${format(to, 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={handleDownloadExcel} disabled={!dateRange || !dateRange.from}>
        <FileDown className="mr-2 h-4 w-4" /> Export Report
      </Button>
    </div>
  );
}
