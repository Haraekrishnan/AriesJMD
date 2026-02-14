'use client';

import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, AlertTriangle, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import CreateJobDialog from '@/components/job-progress/CreateJobDialog';
import ViewJobProgressDialog from '@/components/job-progress/ViewJobProgressDialog';
import { JobProgress, Timesheet } from '@/lib/types';
import { JobProgressTable } from '@/components/job-progress/JobProgressTable';
import { format, startOfMonth, addMonths, subMonths, isSameMonth, parseISO, isBefore, isAfter, startOfToday } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CreateTimesheetDialog from '@/components/job-progress/CreateTimesheetDialog';
import TimesheetTrackerTable from '@/components/job-progress/TimesheetTrackerTable';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const implementationStartDate = new Date(2025, 9, 1); // October 2025

export default function JobProgressPage() {
  const { can, jobProgress, timesheets, user, projects, users } = useAppContext();
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false);
  const [isCreateTimesheetOpen, setIsCreateTimesheetOpen] = useState(false);
  const [viewingJob, setViewingJob] = useState<JobProgress | null>(null);
  const { toast } = useToast();
  
  // JMS States
  const [currentJmsMonth, setCurrentJmsMonth] = useState(startOfMonth(new Date()));
  const [jmsSearchTerm, setJmsSearchTerm] = useState('');

  // Timesheet States
  const [currentTimesheetMonth, setCurrentTimesheetMonth] = useState(startOfMonth(new Date()));
  const [timesheetSearchTerm, setTimesheetSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('jms-tracker');

  const myPendingJmsSteps = useMemo(() => {
    if (!user) return [];
    return jobProgress.flatMap(job =>
      (job.steps || [])
            .filter(step => step.assigneeId === user.id && step.status === 'Pending')
            .map(step => ({ job, step }))
    );
  }, [jobProgress, user]);

  const myPendingTimesheets = useMemo(() => {
      if (!user) return [];
      const canAcknowledgeOffice = ['Admin', 'Document Controller', 'Project Coordinator'].includes(user.role);
      return timesheets.filter(ts => 
          (ts.submittedToId === user.id && ts.status === 'Pending') ||
          (canAcknowledgeOffice && ts.status === 'Sent To Office')
      );
  }, [timesheets, user]);


  const changeJmsMonth = (amount: number) => {
    setCurrentJmsMonth(prev => addMonths(prev, amount));
  };
  
  const changeTimesheetMonth = (amount: number) => {
    setCurrentTimesheetMonth(prev => addMonths(prev, amount));
  };

  const canGoToPreviousJmsMonth = useMemo(() => {
    const firstDayOfCurrentMonth = startOfMonth(currentJmsMonth);
    return isAfter(firstDayOfCurrentMonth, implementationStartDate);
  }, [currentJmsMonth]);

  const canGoToNextJmsMonth = useMemo(() => {
    return isBefore(startOfMonth(currentJmsMonth), startOfToday());
  }, [currentJmsMonth]);
  
  const canGoToPreviousTimesheetMonth = useMemo(() => {
    const firstDayOfCurrentMonth = startOfMonth(currentTimesheetMonth);
    return isAfter(firstDayOfCurrentMonth, implementationStartDate);
  }, [currentTimesheetMonth]);

  const canGoToNextTimesheetMonth = useMemo(() => {
    return isBefore(startOfMonth(currentTimesheetMonth), startOfToday());
  }, [currentTimesheetMonth]);

  const filteredJobs = useMemo(() => {
    const visibleJobs = jobProgress.filter(job => {
      const canViewAll = user?.role === 'Admin' || user?.role === 'Project Coordinator' || user?.role === 'Document Controller';
      if (canViewAll) return true;
      
      const isAssignee = job.steps.some(step => step.assigneeId === user?.id);
      if (isAssignee) return true;

      if (job.creatorId === user?.id) return true;
      
      if (!user?.projectIds) return false;
      
      return user.projectIds.some(userProjectId => {
        if (job.projectId === userProjectId) return true;
        const project = projects.find(p => p.id === job.projectId);
        return project && user.projectIds?.includes(project.name);
      });
    });
  
    const jobsInMonth = visibleJobs.filter(job => {
      const dateToCompare = job.dateFrom ? parseISO(job.dateFrom) : parseISO(job.createdAt);
      return isSameMonth(dateToCompare, currentJmsMonth);
    });
  
    if (!jmsSearchTerm) return jobsInMonth;
    const lowercasedTerm = jmsSearchTerm.toLowerCase();
    return jobsInMonth.filter(job => {
        const project = projects.find(p => p.id === job.projectId);
        return (
            job.title.toLowerCase().includes(lowercasedTerm) ||
            (job.jmsNo && job.jmsNo.toLowerCase().includes(lowercasedTerm)) ||
            (project && project.name.toLowerCase().includes(lowercasedTerm)) ||
            (job.plantUnit && job.plantUnit.toLowerCase().includes(lowercasedTerm))
        );
    });
  
  }, [jobProgress, currentJmsMonth, user, jmsSearchTerm, projects]);

  const filteredTimesheets = useMemo(() => {
    const visibleTimesheets = timesheets.filter(ts => {
      const canViewAll = user?.role === 'Admin' || user?.role === 'Project Coordinator' || user?.role === 'Document Controller';
      if (canViewAll) return true;

      // Show if user is the submitter or the one it's submitted to, regardless of project
      if (ts.submitterId === user?.id || ts.submittedToId === user?.id) return true;

      // Fallback for managers who might not be directly involved but oversee projects
      if (!user?.projectIds) return false;
      return user.projectIds.includes(ts.projectId);
    });

    const timesheetsInMonth = visibleTimesheets.filter(ts => isSameMonth(parseISO(ts.submissionDate), currentTimesheetMonth));

    if (!timesheetSearchTerm) return timesheetsInMonth;
    const lowercasedTerm = timesheetSearchTerm.toLowerCase();
    return timesheetsInMonth.filter(ts => {
        const project = projects.find(p => p.id === ts.projectId);
        return (
            (project && project.name.toLowerCase().includes(lowercasedTerm)) ||
            (ts.plantUnit && ts.plantUnit.toLowerCase().includes(lowercasedTerm))
        );
    });
  }, [timesheets, currentTimesheetMonth, user, timesheetSearchTerm, projects]);


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
      
      {(myPendingJmsSteps.length > 0 || myPendingTimesheets.length > 0) && (
        <Card className="border-primary">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="text-primary"/> My Pending Actions
                </CardTitle>
                <CardDescription>Items that require your attention, regardless of the month filter below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {myPendingJmsSteps.map(({ job, step }) => (
                    <div key={step.id} className="p-3 border rounded-md flex justify-between items-center bg-card">
                        <div>
                            <p className="font-semibold">JMS Step: {step.name}</p>
                            <p className="text-sm text-muted-foreground">{job.title}</p>
                        </div>
                        <Button onClick={() => {
                            setCurrentJmsMonth(startOfMonth(parseISO(job.dateFrom || job.createdAt)));
                            setViewingJob(job);
                        }}>View JMS</Button>
                    </div>
                ))}
                {myPendingTimesheets.map(ts => {
                    const submitter = users.find(u => u.id === ts.submitterId);
                    const project = projects.find(p => p.id === ts.projectId);
                    return (
                        <div key={ts.id} className="p-3 border rounded-md flex justify-between items-center bg-card">
                            <div>
                                <p className="font-semibold">Timesheet requires acknowledgement</p>
                                <p className="text-sm text-muted-foreground">
                                    From {submitter?.name} for {project?.name} - {ts.plantUnit}
                                </p>
                            </div>
                            <Button onClick={() => {
                                setActiveTab('timesheet-tracker');
                                setCurrentTimesheetMonth(startOfMonth(parseISO(ts.submissionDate)));
                                toast({
                                    title: "Navigated to Timesheet Month",
                                    description: "The timesheet will be visible in the list below.",
                                });
                            }}>View</Button>
                        </div>
                    )
                })}
            </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
            <TabsTrigger value="jms-tracker">JMS Tracker</TabsTrigger>
            <TabsTrigger value="timesheet-tracker">Timesheet Tracker</TabsTrigger>
        </TabsList>
        <TabsContent value="jms-tracker" className="mt-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => changeJmsMonth(-1)} disabled={!canGoToPreviousJmsMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-lg font-semibold w-32 text-center">{format(currentJmsMonth, 'MMMM yyyy')}</span>
                    <Button variant="outline" size="icon" onClick={() => changeJmsMonth(1)} disabled={!canGoToNextJmsMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by title, JMS no, project..."
                        className="pl-9"
                        value={jmsSearchTerm}
                        onChange={e => setJmsSearchTerm(e.target.value)}
                    />
                </div>
                <Button onClick={() => setIsCreateJobOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Create New JMS
                </Button>
            </div>
            <Card>
                <CardHeader>
                  <CardTitle>JMS for {format(currentJmsMonth, 'MMMM yyyy')}</CardTitle>
                  <CardDescription>A list of all JMS with start dates in this month and their current status.</CardDescription>
                </CardHeader>
                <CardContent>
                  <JobProgressTable jobs={filteredJobs} onViewJob={setViewingJob} />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="timesheet-tracker" className="mt-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => changeTimesheetMonth(-1)} disabled={!canGoToPreviousTimesheetMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-lg font-semibold w-32 text-center">{format(currentTimesheetMonth, 'MMMM yyyy')}</span>
                    <Button variant="outline" size="icon" onClick={() => changeTimesheetMonth(1)} disabled={!canGoToNextTimesheetMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by project or unit..."
                        className="pl-9"
                        value={timesheetSearchTerm}
                        onChange={e => setTimesheetSearchTerm(e.target.value)}
                    />
                </div>
                 <Button onClick={() => setIsCreateTimesheetOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Submit Timesheet
                </Button>
            </div>
             <Card>
                <CardHeader>
                  <CardTitle>Timesheet Submissions for {format(currentTimesheetMonth, 'MMMM yyyy')}</CardTitle>
                  <CardDescription>Track the submission and approval status of all timesheets.</CardDescription>
                </CardHeader>
                <CardContent>
                  <TimesheetTrackerTable timesheets={filteredTimesheets}/>
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
