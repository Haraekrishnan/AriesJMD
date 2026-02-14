
'use client';

import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, AlertTriangle, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import CreateJobDialog from '@/components/job-progress/CreateJobDialog';
import ViewJobProgressDialog from '@/components/job-progress/ViewJobProgressDialog';
import { JobProgress } from '@/lib/types';
import { JobProgressTable } from '@/components/job-progress/JobProgressTable';
import { format, startOfMonth, addMonths, subMonths, isSameMonth, parseISO, isBefore, isAfter, startOfToday } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CreateTimesheetDialog from '@/components/job-progress/CreateTimesheetDialog';
import TimesheetTrackerTable from '@/components/job-progress/TimesheetTrackerTable';
import { Input } from '@/components/ui/input';

const implementationStartDate = new Date(2025, 9, 1); // October 2025 (Month is 0-indexed)

export default function JobProgressPage() {
  const { can, jobProgress, user, projects } = useAppContext();
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false);
  const [isCreateTimesheetOpen, setIsCreateTimesheetOpen] = useState(false);
  const [viewingJob, setViewingJob] = useState<JobProgress | null>(null);
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [searchTerm, setSearchTerm] = useState('');


  const changeMonth = (amount: number) => {
    setCurrentMonth(prev => addMonths(prev, amount));
  };

  const canGoToPreviousMonth = useMemo(() => {
    const firstDayOfCurrentMonth = startOfMonth(currentMonth);
    return isAfter(firstDayOfCurrentMonth, implementationStartDate);
  }, [currentMonth]);

  const canGoToNextMonth = useMemo(() => {
    return isBefore(startOfMonth(currentMonth), startOfToday());
  }, [currentMonth]);

  const filteredJobs = useMemo(() => {
    // 1. Permission-based filtering
    const visibleJobs = jobProgress.filter(job => {
      const canViewAll = user?.role === 'Admin' || user?.role === 'Project Coordinator' || user?.role === 'Document Controller';
      if (canViewAll) {
        return true;
      }
      if (job.creatorId === user?.id) {
          return true;
      }
      if (!user?.projectIds) return false;
      return user.projectIds.some(userProjectId => {
          if (job.projectId === userProjectId) return true;
          const project = projects.find(p => p.id === job.projectId);
          // Fallback check in case project name was stored instead of ID
          return project && user.projectIds?.includes(project.name);
      });
    });
  
    // 2. Month filter
    const jobsInMonth = visibleJobs.filter(job => {
      if (!job.createdAt || !isSameMonth(parseISO(job.createdAt), currentMonth)) {
        return false;
      }
      return true;
    });
  
    // 3. Search filter
    if (!searchTerm) {
        return jobsInMonth;
    }
    const lowercasedTerm = searchTerm.toLowerCase();
    return jobsInMonth.filter(job => {
        const project = projects.find(p => p.id === job.projectId);
        return (
            job.title.toLowerCase().includes(lowercasedTerm) ||
            (job.jmsNo && job.jmsNo.toLowerCase().includes(lowercasedTerm)) ||
            (project && project.name.toLowerCase().includes(lowercasedTerm)) ||
            (job.plantUnit && job.plantUnit.toLowerCase().includes(lowercasedTerm))
        );
    });
  
  }, [jobProgress, currentMonth, user, searchTerm, projects]);

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
          <h1 className="text-3xl font-bold tracking-tight">Trackers</h1>
          <p className="text-muted-foreground">Monitor the lifecycle of JMS and Timesheets.</p>
        </div>
      </div>
      
      <Tabs defaultValue="jms-tracker">
        <TabsList>
            <TabsTrigger value="jms-tracker">JMS Tracker</TabsTrigger>
            <TabsTrigger value="timesheet-tracker">Timesheet Tracker</TabsTrigger>
        </TabsList>
        <TabsContent value="jms-tracker" className="mt-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => changeMonth(-1)} disabled={!canGoToPreviousMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-lg font-semibold w-32 text-center">{format(currentMonth, 'MMMM yyyy')}</span>
                    <Button variant="outline" size="icon" onClick={() => changeMonth(1)} disabled={!canGoToNextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by title, JMS no, project..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button onClick={() => setIsCreateJobOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Create New JMS
                </Button>
            </div>
            <Card>
                <CardHeader>
                  <CardTitle>JMS for {format(currentMonth, 'MMMM yyyy')}</CardTitle>
                  <CardDescription>A list of all JMS created this month and their current status.</CardDescription>
                </CardHeader>
                <CardContent>
                  <JobProgressTable jobs={filteredJobs} onViewJob={setViewingJob} />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="timesheet-tracker" className="mt-4">
            <div className="flex items-center justify-end gap-2 mb-4">
                 <Button onClick={() => setIsCreateTimesheetOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Submit Timesheet
                </Button>
            </div>
             <Card>
                <CardHeader>
                  <CardTitle>Timesheet Submissions</CardTitle>
                  <CardDescription>Track the submission and approval status of all timesheets.</CardDescription>
                </CardHeader>
                <CardContent>
                  <TimesheetTrackerTable />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

      <CreateJobDialog isOpen={isCreateJobOpen} setIsOpen={setIsCreateJobOpen} />
      <CreateTimesheetDialog isOpen={isCreateTimesheetOpen} setIsOpen={setIsCreateTimesheetOpen} />
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
