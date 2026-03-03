'use client';
import { useAppContext } from '@/contexts/app-provider';
import type { ManpowerLog } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { DateRange } from 'react-day-picker';
import { format } from 'date-fns';

interface ManpowerLogReportDownloadsProps {
  dateRange: DateRange | undefined;
}

export default function ManpowerLogReportDownloads({ dateRange }: ManpowerLogReportDownloadsProps) {
  const { manpowerLogs, projects, users } = useAppContext();

  const handleDownloadExcel = () => {
    if (!dateRange || !dateRange.from) {
        alert("Please select a date range to generate the report.");
        return;
    }

    const from = dateRange.from;
    const to = dateRange.to || from;

    const filteredLogs = manpowerLogs.filter(log => {
      // Create dates in a way that ignores time and timezone for comparison
      const logDateParts = log.date.split('-').map(Number);
      const logDate = new Date(logDateParts[0], logDateParts[1] - 1, logDateParts[2]);

      const startDate = new Date(from.getFullYear(), from.getMonth(), from.getDate());
      const endDate = new Date(to.getFullYear(), to.getMonth(), to.getDate());
      
      return logDate >= startDate && logDate <= endDate;
    });

    if (filteredLogs.length === 0) {
        alert("No logs found for the selected date range.");
        return;
    }

    const dataToExport = filteredLogs.map(log => {
        const project = projects.find(p => p.id === log.projectId);
        const updater = users.find(u => u.id === log.updatedBy);
        return {
            'Date': log.date, // Use the original string date for display
            'Project': project?.name || 'N/A',
            'Manpower In': log.countIn,
            'Names (In)': log.personInName || 'N/A',
            'Manpower Out': log.countOut,
            'Names (Out)': log.personOutName || 'N/A',
            'Reason': log.reason,
            'Updated By': updater?.name || 'N/A',
        }
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Manpower Log Report');
    XLSX.writeFile(workbook, `Manpower_Log_Report_${format(from, 'yyyy-MM-dd')}_to_${format(to, 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <Button variant="outline" onClick={handleDownloadExcel} disabled={!dateRange || !dateRange.from}>
        <FileDown className="mr-2 h-4 w-4" />
        Export Excel
    </Button>
  );
}