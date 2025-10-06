
'use client';

import { useAppContext } from '@/contexts/app-provider';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import JobRecordSheet from '@/components/job-record/JobRecordSheet';
import { AlertTriangle } from 'lucide-react';

export default function JobRecordPage() {
    const { can } = useAppContext();

    return (
        <div className="space-y-8 h-full flex flex-col">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Job Record Sheet</h1>
                <p className="text-muted-foreground">
                    Track monthly attendance and work allocation for each employee.
                </p>
            </div>
            <JobRecordSheet />
        </div>
    );
}
