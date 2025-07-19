
'use client';
import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, sub, isBefore, parseISO } from 'date-fns';
import { Button } from '../ui/button';
import { Edit } from 'lucide-react';
import type { ManpowerLog } from '@/lib/types';
import EditManpowerLogDialog from './EditManpowerLogDialog';

interface ManpowerSummaryTableProps {
  selectedDate?: Date;
}

export default function ManpowerSummaryTable({ selectedDate }: ManpowerSummaryTableProps) {
  const { projects, manpowerLogs, can } = useAppContext();
  const [editingLog, setEditingLog] = useState<ManpowerLog | null>(null);

    const summary = useMemo(() => {
        if (!selectedDate) {
            return { summary: [], totalIn: 0, totalOut: 0, overallTotal: 0, totalOnLeave: 0 };
        }

        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        
        const summaryData = projects.map(project => {
            const logsForProjectDay = manpowerLogs.filter(log => log.date === dateStr && log.projectId === project.id);
            const latestLog = logsForProjectDay.sort((a,b) => new Date(b.updatedBy).getTime() - new Date(a.updatedBy).getTime())[0];
            
            let dayTotal = 0;
            if (latestLog) {
                dayTotal = latestLog.total;
            } else {
                // Find the most recent log for this project *before* the selected date
                const previousLogs = manpowerLogs
                    .filter(l => l.projectId === project.id && isBefore(parseISO(l.date), selectedDate))
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                dayTotal = previousLogs.length > 0 ? (previousLogs[0].total || 0) : 0;
            }

            return {
                projectId: project.id,
                projectName: project.name,
                log: latestLog,
                total: dayTotal,
                onLeave: latestLog?.countOnLeave || 0
            };
        });
        
        const overallTotal = summaryData.reduce((acc, curr) => acc + (curr.total || 0), 0);
        const totalOnLeave = summaryData.reduce((acc, curr) => acc + (curr.onLeave || 0), 0);
        
        return { summary: summaryData, overallTotal, totalOnLeave };
    }, [projects, manpowerLogs, selectedDate]);

    if (!selectedDate) {
        return <p className="text-muted-foreground text-center py-4">Please select a date to view the summary.</p>;
    }
    
    if (summary.overallTotal === 0 && !manpowerLogs.some(l => l.date === format(selectedDate, 'yyyy-MM-dd'))) {
        return <p className="text-muted-foreground text-center py-8">No manpower logged for {format(selectedDate, 'dd LLL, yyyy')}.</p>;
    }

    return (
        <>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Project / Location</TableHead>
                    <TableHead className="text-center">In</TableHead>
                    <TableHead className="text-center">Out</TableHead>
                    <TableHead className="text-center">On Leave</TableHead>
                    <TableHead className="text-center">Reason</TableHead>
                    <TableHead className="text-center">Day Total</TableHead>
                    {can.manage_manpower && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
                {summary.summary.map(row => (
                    <TableRow key={row.projectId}>
                        <TableCell className="font-medium">{row.projectName}</TableCell>
                        <TableCell className="text-center">{row.log?.countIn || 0}</TableCell>
                        <TableCell className="text-center">{row.log?.countOut || 0}</TableCell>
                        <TableCell className="text-center">{row.onLeave}</TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">{row.log?.reason || 'No log entry'}</TableCell>
                        <TableCell className="text-center font-bold">{row.total}</TableCell>
                        {can.manage_manpower && (
                            <TableCell className="text-right">
                                {row.log && (
                                    <Button variant="ghost" size="icon" onClick={() => setEditingLog(row.log!)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                )}
                            </TableCell>
                        )}
                    </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/50">
                    <TableCell>Overall Total</TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-center">{summary.totalOnLeave}</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-center">{summary.overallTotal}</TableCell>
                    {can.manage_manpower && <TableCell></TableCell>}
                </TableRow>
            </TableBody>
        </Table>
        {editingLog && <EditManpowerLogDialog isOpen={!!editingLog} setIsOpen={() => setEditingLog(null)} log={editingLog} />}
        </>
    );
}
