
'use client';
import { useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import type { ManpowerLog } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { DateRange } from 'react-day-picker';
import { format, isWithinInterval, parseISO, subDays } from 'date-fns';

interface ManpowerSummaryReportDownloadsProps {
  dateRange: DateRange | undefined;
}

export default function ManpowerSummaryReportDownloads({ dateRange }: ManpowerSummaryReportDownloadsProps) {
  const { manpowerLogs, projects } = useAppContext();

  const summaryData = useMemo(() => {
    if (!dateRange || !dateRange.from) {
      return [];
    }
    const { from, to = from } = dateRange;

    return projects.map(project => {
        const startOfRangeDate = subDays(from, 1);
        const startOfRangeStr = format(startOfRangeDate, 'yyyy-MM-dd');
        
        const previousLogs = manpowerLogs
            .filter(l => l.projectId === project.id && l.date <= startOfRangeStr)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const startingCount = previousLogs[0]?.total || 0;

        const logsInRange = manpowerLogs.filter(log => {
            const logDate = parseISO(log.date);
            return log.projectId === project.id && isWithinInterval(logDate, { start: from, end: to });
        });

        const totalIn = logsInRange.reduce((acc, log) => acc + log.countIn, 0);
        const totalOut = logsInRange.reduce((acc, log) => acc + log.countOut, 0);
        const endingCount = startingCount + totalIn - totalOut;
        
        return {
            'Project': project.name,
            'Starting Manpower': startingCount,
            'Total In': totalIn,
            'Total Out': totalOut,
            'Ending Manpower': endingCount,
        };
    });
  }, [dateRange, manpowerLogs, projects]);

  const handleDownloadExcel = () => {
    if (summaryData.length === 0) {
        alert("No data available for the selected date range to generate a summary.");
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(summaryData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Manpower Summary');
    const fromDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
    const toDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : fromDate;
    XLSX.writeFile(workbook, `Manpower_Summary_Report_${fromDate}_to_${toDate}.xlsx`);
  };

  return (
    <Button variant="outline" onClick={handleDownloadExcel} disabled={!dateRange || !dateRange.from}>
        <FileDown className="mr-2 h-4 w-4" />
        Export Summary
    </Button>
  );
}
