
'use client';

import { useAppContext } from '@/contexts/app-provider';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import JobRecordSheet from '@/components/job-record/JobRecordSheet';
import { AlertTriangle } from 'lucide-react';

export default function JobRecordPage() {
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
