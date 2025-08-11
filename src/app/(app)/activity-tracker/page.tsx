'use client';
import { useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import ActivityLogTable from '@/components/activity-tracker/activity-log-table';
import { AlertTriangle } from 'lucide-react';

export default function ActivityTrackerPage() {
    const { user, users, activityLogs, can } = useAppContext();

    const visibleLogs = useMemo(() => {
        const sortedLogs = [...activityLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        if (!user) return [];
        if (can.view_activity_logs) {
            return sortedLogs;
        }
        return sortedLogs.filter(log => log.userId === user.id);
    }, [activityLogs, user, can.view_activity_logs]);

    if (!can.view_activity_logs) {
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
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Activity Tracker</h1>
                <p className="text-muted-foreground">Review user login sessions and activities from the last 30 days.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Session Logs</CardTitle>
                    <CardDescription>A detailed log of user sessions and the actions they performed.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ActivityLogTable logs={visibleLogs} />
                </CardContent>
            </Card>
        </div>
    );
}
