
'use client';
import { useMemo } from 'react';
import type { PpeRequest } from '@/lib/types';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { DateRange } from 'react-day-picker';
import { format, isWithinInterval, parseISO } from 'date-fns';

interface PpeReportDownloadsProps {
  dateRange: DateRange | undefined;
}

export default function PpeReportDownloads({ dateRange }: PpeReportDownloadsProps) {
  const { ppeRequests, users, manpowerProfiles, projects } = useAppContext();
  
  const issuedRequests = useMemo(() => {
    return ppeRequests.filter(r => r.status === 'Issued');
  }, [ppeRequests]);

  const handleDownloadExcel = () => {
    if (!dateRange || !dateRange.from) {
        alert("Please select a date range to generate the report.");
        return;
    }
    const { from, to = from } = dateRange;

    const filteredRequests = issuedRequests.filter(req => {
        const issuedComment = (Array.isArray(req.comments) ? req.comments : Object.values(req.comments || {})).find(c => c.text.toLowerCase().includes('issued'));
        if (!issuedComment) return false;
        
        const issueDate = parseISO(issuedComment.date);
        return isWithinInterval(issueDate, { start: from, end: to });
    });

    if (filteredRequests.length === 0) {
        alert("No issued PPE data found for the selected date range.");
        return;
    }

    const dataToExport = filteredRequests.map(req => {
      const manpower = manpowerProfiles.find(p => p.id === req.manpowerId);
      const requester = users.find(u => u.id === req.requesterId);
      const approver = users.find(u => u.id === req.approverId);
      const issuedComment = (Array.isArray(req.comments) ? req.comments : Object.values(req.comments || {})).find(c => c.text.toLowerCase().includes('issued'));
      const issuer = issuedComment ? users.find(u => u.id === issuedComment.userId) : null;
      
      return {
        'Issue Date': issuedComment ? format(parseISO(issuedComment.date), 'dd-MM-yyyy') : 'N/A',
        'Employee Name': manpower?.name || 'N/A',
        'Trade': manpower?.trade || 'N/A',
        'Project': manpower?.eic ? projects.find(p => p.id === manpower.eic)?.name : 'N/A',
        'PPE Type': req.ppeType,
        'Size': req.size,
        'Quantity': req.quantity || (req.ppeType === 'Safety Shoes' ? 1 : 'N/A'),
        'Request Type': req.requestType,
        'Requester': requester?.name || 'N/A',
        'Approver': approver?.name || 'N/A',
        'Issued By': issuer?.name || 'N/A',
        'Requester Remarks': req.remarks || '',
        'Store Remarks': issuedComment?.text || '',
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
