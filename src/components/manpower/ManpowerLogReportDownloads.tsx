'use client';

import { useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useAppContext } from '@/hooks/use-app-context';
import { format, eachDayOfInterval, isWithinInterval } from 'date-fns';

type ManpowerLogReportDownloadsProps = {
    dateRange?: DateRange;
};

export default function ManpowerLogReportDownloads({ dateRange }: ManpowerLogReportDownloadsProps) {
    const { manpowerLogs, projects } = useAppContext();

    const handleDownload = () => {
        if (!dateRange || !dateRange.from || !dateRange.to) {
            alert("Please select a valid date range.");
            return;
        }

        const interval = { start: dateRange.from, end: dateRange.to };
        const daysInInterval = eachDayOfInterval(interval);

        const data: (string | number)[][] = [];
        
        // Header
        const header = ["Date"];
        projects.forEach(p => {
            header.push(`${p.name} IN`, `${p.name} OUT`, `${p.name} Reason`);
        });
        data.push(header);

        // Rows
        daysInInterval.forEach(day => {
            const row: (string | number)[] = [format(day, 'dd-MM-yyyy')];
            projects.forEach(p => {
                const log = manpowerLogs.find(l => 
                    format(new Date(l.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd') &&
                    l.projectId === p.id
                );
                row.push(log ? log.countIn : 0, log ? log.countOut : 0, log ? log.reason : '');
            });
            data.push(row);
        });

        const worksheet = XLSX.utils.aoa_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Manpower Report');
        
        const fileName = `Manpower_Report_${format(dateRange.from, 'yyyyMMdd')}_${format(dateRange.to, 'yyyyMMdd')}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    return (
        <Button onClick={handleDownload} disabled={!dateRange || !dateRange.from || !dateRange.to}>
            <Download className="mr-2 h-4 w-4" />
            Download Report
        </Button>
    );
}
