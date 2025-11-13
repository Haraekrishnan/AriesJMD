
'use client';
import { useMemo, useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, isBefore, parseISO } from 'date-fns';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';

interface ManpowerSummaryTableProps {
  selectedDate?: Date;
}

interface EditableCell {
  projectId: string;
  field: 'countIn' | 'countOut' | 'reason' | 'countOnLeave';
  value: string | number;
}

export default function ManpowerSummaryTable({ selectedDate }: ManpowerSummaryTableProps) {
  const { projects, manpowerLogs, addManpowerLog, updateManpowerLog } = useAppContext();
  const { toast } = useToast();
  const [editableData, setEditableData] = useState<Record<string, Partial<any>>>({});

  const summary = useMemo(() => {
    if (!selectedDate) {
      return { summary: [], overallTotal: 0, totalOnLeave: 0, totalActive: 0 };
    }

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    const summaryData = projects.map(project => {
        const logsForProjectDay = manpowerLogs.filter(log => log.date === dateStr && log.projectId === project.id);
        const latestLog = logsForProjectDay.length > 0
            ? logsForProjectDay.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
            : null;
        
        let dayTotal = 0;
        if (latestLog) {
            dayTotal = latestLog.total;
        } else {
            const previousLogs = manpowerLogs
                .filter(l => l.projectId === project.id && isBefore(parseISO(l.date), selectedDate))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            dayTotal = previousLogs.length > 0 ? (previousLogs[0].total || 0) : 0;
        }

        const onLeave = latestLog?.countOnLeave || 0;
        const active = dayTotal - onLeave;

        return {
            projectId: project.id,
            projectName: project.name,
            log: latestLog,
            total: dayTotal,
            onLeave,
            active,
        };
    });
    
    const overallTotal = summaryData.reduce((acc, curr) => acc + (curr.total || 0), 0);
    const totalOnLeave = summaryData.reduce((acc, curr) => acc + (curr.onLeave || 0), 0);
    const totalActive = summaryData.reduce((acc, curr) => acc + (curr.active || 0), 0);
    
    return { summary: summaryData, overallTotal, totalOnLeave, totalActive };
  }, [projects, manpowerLogs, selectedDate]);
  
  useEffect(() => {
    const data: Record<string, Partial<any>> = {};
    summary.summary.forEach(row => {
        data[row.projectId] = {
            countIn: row.log?.countIn || 0,
            countOut: row.log?.countOut || 0,
            reason: row.log?.reason || '',
            countOnLeave: row.onLeave || 0
        }
    });
    setEditableData(data);
  }, [summary]);

  const handleInputChange = (projectId: string, field: keyof EditableCell['value'], value: string | number) => {
    setEditableData(prev => ({
        ...prev,
        [projectId]: {
            ...prev[projectId],
            [field]: value
        }
    }));
  };

  const handleBlur = async (projectId: string) => {
    if(!selectedDate) return;

    const projectData = editableData[projectId];
    if (!projectData) return;

    const logDateStr = format(selectedDate, 'yyyy-MM-dd');
    const existingLog = summary.summary.find(s => s.projectId === projectId)?.log;

    const logPayload = {
        countIn: Number(projectData.countIn || 0),
        countOut: Number(projectData.countOut || 0),
        reason: projectData.reason || '',
        countOnLeave: Number(projectData.countOnLeave || 0)
    };

    try {
        if(existingLog) {
            await updateManpowerLog(existingLog.id, logPayload);
        } else {
            await addManpowerLog({
                projectId,
                ...logPayload
            }, selectedDate);
        }
        toast({ title: 'Log Saved', description: `Manpower count for ${projects.find(p => p.id === projectId)?.name} has been updated.` });
    } catch(error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save log.' });
    }
  };

  if (!selectedDate) {
    return <p className="text-muted-foreground text-center py-4">Please select a date to view the summary.</p>;
  }

  return (
    <div className="overflow-x-auto">
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead>Project / Location</TableHead>
                <TableHead className="text-center">In</TableHead>
                <TableHead className="text-center">Out</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-center">Day Total</TableHead>
                <TableHead className="text-center">Today's Leave</TableHead>
                <TableHead className="text-center">Today's Active</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {summary.summary.map(row => (
                <TableRow key={row.projectId}>
                    <TableCell className="font-medium">{row.projectName}</TableCell>
                    <TableCell>
                        <Input
                            type="number"
                            className="w-20 text-center h-8"
                            value={editableData[row.projectId]?.countIn ?? 0}
                            onChange={(e) => handleInputChange(row.projectId, 'countIn', e.target.value)}
                            onBlur={() => handleBlur(row.projectId)}
                        />
                    </TableCell>
                    <TableCell>
                        <Input
                            type="number"
                            className="w-20 text-center h-8"
                            value={editableData[row.projectId]?.countOut ?? 0}
                            onChange={(e) => handleInputChange(row.projectId, 'countOut', e.target.value)}
                            onBlur={() => handleBlur(row.projectId)}
                        />
                    </TableCell>
                    <TableCell>
                        <Input
                            className="w-48 h-8"
                            value={editableData[row.projectId]?.reason ?? ''}
                            onChange={(e) => handleInputChange(row.projectId, 'reason', e.target.value)}
                            onBlur={() => handleBlur(row.projectId)}
                            placeholder="Reason for change..."
                        />
                    </TableCell>
                    <TableCell className="text-center font-bold">{row.total}</TableCell>
                     <TableCell>
                        <Input
                            type="number"
                            className="w-20 text-center h-8"
                            value={editableData[row.projectId]?.countOnLeave ?? 0}
                            onChange={(e) => handleInputChange(row.projectId, 'countOnLeave', e.target.value)}
                            onBlur={() => handleBlur(row.projectId)}
                        />
                    </TableCell>
                    <TableCell className="text-center font-bold">{row.active}</TableCell>
                </TableRow>
            ))}
            <TableRow className="font-bold bg-muted/50">
                <TableCell>Overall Total</TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell className="text-center">{summary.overallTotal}</TableCell>
                <TableCell className="text-center">{summary.totalOnLeave}</TableCell>
                <TableCell className="text-center">{summary.totalActive}</TableCell>
            </TableRow>
        </TableBody>
    </Table>
    </div>
  );
}
