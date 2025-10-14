
'use client';

import { useAppContext } from '@/contexts/app-provider';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import JobRecordSheet from '@/components/job-record/JobRecordSheet';
import { AlertTriangle } from 'lucide-react';

export default function JobRecordPage() {
    const { can } = useAppContext();

    if (!can.manage_job_record) {
        return (
            <Card className="w-full max-w-md mx-auto mt-20">
                <CardHeader className="text-center items-center">
                    <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4">
                        <AlertTriangle className="h-10 w-10 text-destructive" />
                    </div>
                    <CardTitle>Access Denied</CardTitle>
                    <CardDescription>You do not have permission to manage Job Records.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <div className="h-[calc(100vh-10rem)] flex flex-col space-y-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Job Record Sheet</h1>
                <p className="text-muted-foreground">
                    Track monthly attendance and work allocation for each employee.
                </p>
            </div>
            <div className="flex-1 min-h-0">
                <JobRecordSheet />
            </div>
        </div>
    );
}
