
'use client';

import { useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, AlertTriangle } from 'lucide-react';
import CreateJobDialog from '@/components/job-progress/CreateJobDialog';
import ViewJobProgressDialog from '@/components/job-progress/ViewJobProgressDialog';
import { JobProgress } from '@/lib/types';
import { JobProgressTable } from '@/components/job-progress/JobProgressTable';

export default function JobProgressPage() {
  const { can, jobProgress } = useAppContext();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewingJob, setViewingJob] = useState<JobProgress | null>(null);

  if (!can.manage_job_progress) {
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
          <h1 className="text-3xl font-bold tracking-tight">Job Progress Tracker</h1>
          <p className="text-muted-foreground">Monitor the lifecycle of multi-step jobs.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Job
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Jobs</CardTitle>
          <CardDescription>A list of all created jobs and their current status.</CardDescription>
        </CardHeader>
        <CardContent>
          <JobProgressTable jobs={jobProgress} onViewJob={setViewingJob} />
        </CardContent>
      </Card>

      <CreateJobDialog isOpen={isCreateOpen} setIsOpen={setIsCreateOpen} />
      {viewingJob && (
        <ViewJobProgressDialog 
            isOpen={!!viewingJob} 
            setIsOpen={() => setViewingJob(null)} 
            job={viewingJob} 
        />
      )}
    </div>
  );
}
