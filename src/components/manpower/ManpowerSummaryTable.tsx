'use client';
import { useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

interface ManpowerSummaryTableProps {
  selectedDate?: Date;
}

export default function ManpowerSummaryTable({ selectedDate }: ManpowerSummaryTableProps) {
  const { projects, manpowerLogs } = useAppContext();

    const summary = useMemo(() => {
        if (!selectedDate) {
            return { summary: [], totalIn: 0, totalOut: 0 };
        }

        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const logsForDate = manpowerLogs.filter(log => log.date === dateStr);

        let totalIn = 0;
        let totalOut = 0;
        
        const summaryData = projects.map(project => {
            const log = logsForDate.find(l => l.projectId === project.id);
            totalIn += log?.countIn || 0;
            totalOut += log?.countOut || 0;
            return {
                projectId: project.id,
                projectName: project.name,
                countIn: log?.countIn || 0,
                countOut: log?.countOut || 0,
            };
        });
        
        return { summary: summaryData, totalIn, totalOut };
    }, [projects, manpowerLogs, selectedDate]);

    if (!selectedDate) {
        return <p className="text-muted-foreground text-center py-4">Please select a date to view the summary.</p>;
    }
    
    if (summary.totalIn === 0 && summary.totalOut === 0) {
        return <p className="text-muted-foreground text-center py-8">No manpower logged for {selectedDate ? format(selectedDate, 'dd LLL, yyyy') : 'the selected date'}.</p>;
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Project / Location</TableHead>
                    <TableHead className="text-center">Manpower In</TableHead>
                    <TableHead className="text-center">Manpower Out</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {summary.summary.map(row => (
                    <TableRow key={row.projectId}>
                        <TableCell className="font-medium">{row.projectName}</TableCell>
                        <TableCell className="text-center">{row.countIn}</TableCell>
                        <TableCell className="text-center">{row.countOut}</TableCell>
                    </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/50">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-center">{summary.totalIn}</TableCell>
                    <TableCell className="text-center">{summary.totalOut}</TableCell>
                </TableRow>
            </TableBody>
        </Table>
    );
}
