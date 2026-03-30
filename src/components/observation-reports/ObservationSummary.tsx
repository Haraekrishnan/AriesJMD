

'use client';
import { useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { parseISO } from 'date-fns';

export default function ObservationSummary() {
    const { observationReports, users } = useAppContext();
    const summary = useMemo(() => {
        const userStats: { [userId: string]: { name: string, total: number, open: number, closed: number, totalTime: number, closedCount: number } } = {};
        
        users.forEach(u => {
            userStats[u.id] = { name: u.name, total: 0, open: 0, closed: 0, totalTime: 0, closedCount: 0 };
        });

        observationReports.forEach(report => {
            if(userStats[report.reporterId]) {
                userStats[report.reporterId].total++;
                if (report.status === 'Open') {
                    userStats[report.reporterId].open++;
                } else if (report.status === 'Closed') {
                    userStats[report.reporterId].closed++;
                    if (report.closedAt) {
                        const timeDiff = parseISO(report.closedAt).getTime() - parseISO(report.createdAt).getTime();
                        userStats[report.reporterId].totalTime += timeDiff;
                        userStats[report.reporterId].closedCount++;
                    }
                }
            }
        });
        
        return Object.values(userStats).filter(s => s.total > 0).map(s => ({
            ...s,
            avgClosingTime: s.closedCount > 0 ? (s.totalTime / s.closedCount) / (1000 * 60 * 60 * 24) : 0, // in days
        })).sort((a,b) => b.total - a.total);

    }, [observationReports, users]);

    return (
        <Card>
            <CardHeader><CardTitle>Observation Summary</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Reporter</TableHead>
                            <TableHead className="text-center">Total</TableHead>
                            <TableHead className="text-center">Open</TableHead>
                            <TableHead className="text-center">Closed</TableHead>
                            <TableHead className="text-center">Avg. Closing Time (Days)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {summary.map(s => (
                            <TableRow key={s.name}>
                                <TableCell className="font-medium">{s.name}</TableCell>
                                <TableCell className="text-center">{s.total}</TableCell>
                                <TableCell className="text-center">{s.open}</TableCell>
                                <TableCell className="text-center">{s.closed}</TableCell>
                                <TableCell className="text-center">{s.avgClosingTime.toFixed(1)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}


    