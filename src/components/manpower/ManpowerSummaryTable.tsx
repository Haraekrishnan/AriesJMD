'use client';
import { useMemo } from 'react';
import { useAppContext } from '@/hooks/use-app-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

type ManpowerSummaryTableProps = {
    selectedDate?: Date;
};

export default function ManpowerSummaryTable({ selectedDate }: ManpowerSummaryTableProps) {
    const { manpowerLogs, projects } = useAppContext();

    const summaryData = useMemo(() => {
        if (!selectedDate) return [];

        const formattedDate = format(selectedDate, 'yyyy-MM-dd');
        const logsForDate = manpowerLogs.filter(log => log.date === formattedDate);

        return projects.map(project => {
            const log = logsForDate.find(l => l.projectId === project.id);
            return {
                projectId: project.id,
                projectName: project.name,
                countIn: log?.countIn || 0,
                countOut: log?.countOut || 0,
                reason: log?.reason || 'N/A',
            };
        });

    }, [manpowerLogs, projects, selectedDate]);

    if (!selectedDate || summaryData.length === 0) {
        return <p className="text-muted-foreground text-center py-8">No manpower logs for this date.</p>;
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead className="text-right">Count In</TableHead>
                    <TableHead className="text-right">Count Out</TableHead>
                    <TableHead>Reason</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {summaryData.map(row => (
                    <TableRow key={row.projectId}>
                        <TableCell className="font-medium">{row.projectName}</TableCell>
                        <TableCell className="text-right">{row.countIn}</TableCell>
                        <TableCell className="text-right">{row.countOut}</TableCell>
                        <TableCell>{row.reason}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
