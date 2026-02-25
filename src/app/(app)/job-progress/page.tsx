'use client';

import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, AlertTriangle, ChevronLeft, ChevronRight, Search, Clock } from 'lucide-react';
import CreateJobDialog from '@/components/job-progress/CreateJobDialog';
import ViewJobProgressDialog from '@/components/job-progress/ViewJobProgressDialog';
import { JobProgress, Timesheet, Role } from '@/lib/types';
import { JobProgressTable } from '@/components/job-progress/JobProgressTable';
import { format, startOfMonth, addMonths, subMonths, isSameMonth, parseISO, isBefore, isAfter, startOfToday } from 'date-fns';
import CreateTimesheetDialog from '@/components/job-progress/CreateTimesheetDialog';
import TimesheetTrackerTable from '@/components/job-progress/TimesheetTrackerTable';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import OngoingJobsReport from '@/components/job-progress/OngoingJobsReport';
import { ScrollArea } from '@/components/ui/scroll-area';

const implementationStartDate = new Date(2025, 9, 1); // October 2025

export default function JobProgressPage() {
  const { can, jobProgress, timesheets, user, projects, users } = useAppContext();
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false);
  const [isCreateTimesheetOpen, setIsCreateTimesheetOpen] = useState(false);
  const [viewingJob, setViewingJob] = useState<JobProgress | null>(null);
  const { toast } = useToast();
  
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [jmsSearchTerm, setJmsSearchTerm] = useState('');
  const [timesheetSearchTerm, setTimesheetSearchTerm] = useState('');

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

  const myOngoingItems = useMemo(() => {
    if (!user) return [];

    const items = new Map<string, { job: JobProgress; step: any }>();

    jobProgress.forEach(job => {
      const myAcknowledgedStep = (job.steps || []).find(
        step => step.assigneeId === user.id && step.status === 'Acknowledged'
      );
      if (myAcknowledgedStep) {
        items.set(job.id, { job, step: myAcknowledgedStep });
      }
    });

    jobProgress.forEach(job => {
      if (job.creatorId === user.id && job.status !== 'Completed' && !items.has(job.id)) {
        const currentStep =
          job.steps.find(s => s.isReturned === true) ||
          job.steps.find(s => s.status === 'Pending') ||
          job.steps.find(s => s.status === 'Acknowledged');
        if (currentStep) {
          items.set(job.id, { job, step: currentStep });
        }
      }
    });

    return Array.from(items.values());
  }, [jobProgress, user]);


  const canCreateJms = useMemo(() => {
    if (!user) return false;
    const allowedRoles: Role[] = ['Admin', 'Project Coordinator', 'Document Controller'];
    return allowedRoles.includes(user.role);
  }, [user]);

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
      return isSameMonth(dateToCompare, currentMonth);
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
  
  }, [jobProgress, currentMonth, user, jmsSearchTerm, projects]);

  const filteredTimesheets = useMemo(() => {
    const visibleTimesheets = timesheets.filter(ts => {
      const canViewAll = user?.role === 'Admin' || user?.role === 'Project Coordinator' || user?.role === 'Document Controller';
      if (canViewAll) return true;

      if (ts.submitterId === user?.id || ts.submittedToId === user?.id) return true;

      if (!user?.projectIds) return false;
      return user.projectIds.includes(ts.projectId);
    });

    const timesheetsInMonth = visibleTimesheets.filter(ts => isSameMonth(parseISO(ts.submissionDate), currentMonth));

    if (!timesheetSearchTerm) return timesheetsInMonth;
    const lowercasedTerm = timesheetSearchTerm.toLowerCase();
    return timesheetsInMonth.filter(ts => {
        const project = projects.find(p => p.id === ts.projectId);
        return (
            (project && project.name.toLowerCase().includes(lowercasedTerm)) ||
            (ts.plantUnit && ts.plantUnit.toLowerCase().includes(lowercasedTerm))
        );
    });
  }, [timesheets, currentMonth, user, timesheetSearchTerm, projects]);


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
    <div className="space-y-8 h-full flex flex-col">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trackers</h1>
          <p className="text-muted-foreground">Monitor the lifecycle of JMS and Timesheets.</p>
        </div>
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => changeMonth(-1)} disabled={!canGoToPreviousMonth}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-lg font-semibold w-32 text-center">{format(currentMonth, 'MMMM yyyy')}</span>
                <Button variant="outline" size="icon" onClick={() => changeMonth(1)} disabled={!canGoToNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
            {canCreateJms && (
              <Button onClick={() => setIsCreateJobOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Create New JMS
              </Button>
            )}
             <Button onClick={() => setIsCreateTimesheetOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Submit Timesheet
            </Button>
        </div>
      </div>
      
      {myPendingJmsSteps.length > 0 || myPendingTimesheets.length > 0 ? (
          <Card className="border-primary">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="text-primary"/> Pending Acknowledgement
                </CardTitle>
                <CardDescription>Items that require your attention to acknowledge or start working on.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {myPendingJmsSteps.map(({ job, step }) => (
                  <div key={step.id} className="p-3 border rounded-md flex justify-between items-center bg-card">
                      <div>
                          <p className="font-semibold">JMS Step: {step.name}</p>
                          <p className="text-sm text-muted-foreground">{job.title}</p>
                      </div>
                      <Button onClick={() => { setViewingJob(job); }}>View JMS</Button>
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
                              toast({
                                  title: "Scroll down to find the Timesheet Tracker",
                                  description: "The timesheet will be visible in the list below.",
                              });
                          }}>View</Button>
                      </div>
                  )
              })}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle/> Pending Acknowledgement
                </CardTitle>
                <CardDescription>Items that require your attention to acknowledge or start working on.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">No items are pending your acknowledgement.</p>
            </CardContent>
          </Card>
        )
      }

      <Card>
          <CardHeader className="flex flex-row justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock/> On-Going Activities
              </CardTitle>
              <CardDescription>A list of your active tasks and jobs you've created that are still in progress.</CardDescription>
            </div>
            <OngoingJobsReport jobs={myOngoingItems} />
          </CardHeader>
          <CardContent>
              <ScrollArea className="h-72">
                <div className="space-y-3 pr-4">
                    {myOngoingItems.length > 0 ? (
                        myOngoingItems.map(({ job, step }) => (
                            <div key={job.id} className="p-3 border rounded-md flex justify-between items-center bg-card">
                                <div>
                                    <p className="font-semibold">{job.title}</p>
                                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                                        <span>Current Step: {step.name}</span>
                                        {step.assigneeId !== user?.id && (
                                            <>
                                                <span>&middot;</span>
                                                <span>With: {users.find(u => u.id === step.assigneeId)?.name || 'Unassigned'}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <Button onClick={() => { setViewingJob(job); }}>View JMS</Button>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground text-center pt-8">You have no on-going activities.</p>
                    )}
                </div>
              </ScrollArea>
          </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-8 mt-4">
        <Card>
            <CardHeader>
                <CardTitle>JMS Tracker</CardTitle>
                <div className="relative w-full sm:w-auto flex-1 pt-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-[-50%] h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by title, JMS no, project..."
                        className="pl-9"
                        value={jmsSearchTerm}
                        onChange={e => setJmsSearchTerm(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent>
                <JobProgressTable jobs={filteredJobs} onViewJob={setViewingJob} />
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Timesheet Tracker</CardTitle>
                 <div className="relative w-full sm:w-auto flex-1 pt-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-[-50%] h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by project or unit..."
                        className="pl-9"
                        value={timesheetSearchTerm}
                        onChange={e => setTimesheetSearchTerm(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent>
                <TimesheetTrackerTable timesheets={filteredTimesheets}/>
            </CardContent>
        </Card>
      </div>

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
