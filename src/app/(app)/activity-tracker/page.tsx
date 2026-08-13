'use client';
import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import ActivityLogTable from '@/components/activity-tracker/activity-log-table';
import { AlertTriangle, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useToast } from '@/hooks/use-toast';

export default function ActivityTrackerPage() {
    const { user, users, can } = useAuth();
    const { activityLogs } = useGeneral();
    const { toast } = useToast();

    const visibleLogs = useMemo(() => {
        const sortedLogs = [...activityLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        if (!user) return [];
        if (can.view_activity_logs || can.view_all) {
            return sortedLogs;
        }
        return sortedLogs.filter(log => log.userId === user.id);
    }, [activityLogs, user, can.view_activity_logs, can.view_all]);

    const handleExportExcel = async () => {
        if (visibleLogs.length === 0) {
            toast({ title: "No logs to export", variant: "destructive" });
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Activity Audit Log');

        worksheet.columns = [
            { header: 'DATE & TIME', key: 'timestamp', width: 25 },
            { header: 'USER NAME', key: 'userName', width: 30 },
            { header: 'EMAIL', key: 'email', width: 35 },
            { header: 'ROLE', key: 'role', width: 20 },
            { header: 'ACTION', key: 'action', width: 25 },
            { header: 'MINUTE DETAILS', key: 'details', width: 80 },
        ];

        // Format header
        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        visibleLogs.forEach(log => {
            const author = users.find(u => u.id === log.userId);
            worksheet.addRow({
                timestamp: format(parseISO(log.timestamp), 'dd-MM-yyyy HH:mm:ss'),
                userName: author?.name || 'Unknown User',
                email: author?.email || 'N/A',
                role: author?.role || 'N/A',
                action: log.action,
                details: log.details || 'N/A',
            }).alignment = { vertical: 'top', wrapText: true };
        });

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `System_Activity_Log_${format(new Date(), 'yyyyMMdd')}.xlsx`);
        toast({ title: "Activity report generated." });
    };

    if (!can.view_activity_logs && !can.view_all) {
        return (
            <Card className="w-full max-w-md mx-auto mt-20">
                <CardHeader className="text-center items-center">
                    <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4">
                        <AlertTriangle className="h-10 w-10 text-destructive" />
                    </div>
                    <CardTitle>Access Denied</CardTitle>
                    <CardDescription>You do not have permission to view this page.</CardDescription>
                </CardHeader>
            </Card>
        );
    }
    
    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Activity Tracker</h1>
                    <p className="text-muted-foreground text-sm font-medium">Review system activity records from the last 30 days. Historical data is pruned automatically.</p>
                </div>
                <Button onClick={handleExportExcel} className="font-bold">
                    <FileDown className="mr-2 h-4 w-4" />
                    Export Detailed Log
                </Button>
            </div>

            <Card className="border-2 shadow-sm">
                <CardHeader className="bg-muted/10 border-b">
                    <CardTitle className="text-lg">Audit Logs</CardTitle>
                    <CardDescription>A chronological audit trail of user sessions and minute operational details.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <ActivityLogTable logs={visibleLogs} />
                </CardContent>
            </Card>
        </div>
    );
}
