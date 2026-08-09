'use client';
import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import ActivityLogTable from '@/components/activity-tracker/activity-log-table';
import { AlertTriangle, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format, parseISO } from 'date-fns';
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
            toast({
                title: "No Data to Export",
                description: "There are no activity logs available to generate a report.",
                variant: "destructive"
            });
            return;
        }

        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('System Activity Log');

            // Define columns with specific widths for high detail
            worksheet.columns = [
                { header: 'DATE & TIME', key: 'timestamp', width: 25 },
                { header: 'USER NAME', key: 'userName', width: 25 },
                { header: 'USER EMAIL', key: 'userEmail', width: 30 },
                { header: 'ACTION', key: 'action', width: 25 },
                { header: 'MINUTE DETAILS', key: 'details', width: 60 },
            ];

            // Style the header row
            const headerRow = worksheet.getRow(1);
            headerRow.height = 30;
            headerRow.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF1E40AF' } // Deep Blue
                };
                cell.font = {
                    bold: true,
                    color: { argb: 'FFFFFFFF' }, // White
                    size: 11
                };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });

            // Add rows
            visibleLogs.forEach(log => {
                const logUser = users.find(u => u.id === log.userId);
                const row = worksheet.addRow({
                    timestamp: format(parseISO(log.timestamp), 'dd MMM yyyy, HH:mm:ss'),
                    userName: logUser?.name || 'Unknown User',
                    userEmail: logUser?.email || 'N/A',
                    action: log.action.toUpperCase(),
                    details: log.details || 'No additional details provided.'
                });

                // Style data cells
                row.eachCell((cell) => {
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
                    };
                    cell.alignment = { vertical: 'top', wrapText: true };
                    cell.font = { name: 'Calibri', size: 10 };
                });
            });

            // Save the file
            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Activity_Log_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
            
            toast({
                title: "Report Generated",
                description: "Detailed activity log has been downloaded."
            });
        } catch (error) {
            console.error("Excel Export Error:", error);
            toast({
                title: "Export Failed",
                description: "An error occurred while generating the Excel report.",
                variant: "destructive"
            });
        }
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
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 uppercase">Activity Tracker</h1>
                    <p className="text-muted-foreground font-medium">Review system interactions and session logs from the last 30 days.</p>
                </div>
                <Button 
                    onClick={handleExportExcel} 
                    className="bg-[#2563EB] hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[10px] h-11 px-6 shadow-md shadow-blue-500/20"
                >
                    <FileDown className="mr-2 h-4 w-4" /> Export Full Activity Log
                </Button>
            </div>

            <Card className="border-2 shadow-sm">
                <CardHeader className="bg-muted/20 border-b">
                    <CardTitle className="text-lg font-bold uppercase tracking-tight">Session Logs</CardTitle>
                    <CardDescription className="text-xs font-medium">A high-resolution chronological feed of system events.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <ActivityLogTable logs={visibleLogs} />
                </CardContent>
            </Card>
        </div>
    );
}
