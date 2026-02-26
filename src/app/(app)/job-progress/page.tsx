'use client';

import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { PlusCircle, ChevronLeft, ChevronRight, Search, Bell, FileDown } from 'lucide-react';
import CreateJobDialog from '@/components/job-progress/CreateJobDialog';
import ViewJobProgressDialog from '@/components/job-progress/ViewJobProgressDialog';
import { JobProgress, Timesheet, Role } from '@/lib/types';
import { format, startOfMonth, addMonths, subMonths, isSameMonth, parseISO, isBefore, isAfter, startOfToday, differenceInDays } from 'date-fns';
import CreateTimesheetDialog from '@/components/job-progress/CreateTimesheetDialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import JobProgressBoard from '@/components/job-progress/JobProgressBoard';
import TimesheetBoard from '@/components/job-progress/TimesheetBoard';
import ViewTimesheetDialog from '@/components/job-progress/ViewTimesheetDialog';
import { Badge } from '@/components/ui/badge';
import PendingActionsDialog from '@/components/job-progress/PendingActionsDialog';
import OngoingJobsReport from '@/components/job-progress/OngoingJobsReport';
import { JobProgressTable } from '@/components/job-progress/JobProgressTable';


const implementationStartDate = new Date(2025, 9, 1); // October 2025

export default function JobProgressPage() {
  const { can, jobProgress, timesheets, user, projects, users, jmsAndTimesheetNotificationCount } = useAppContext();
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false);
  const [isCreateTimesheetOpen, setIsCreateTimesheetOpen] = useState(false);
  const [viewingJob, setViewingJob] = useState<JobProgress | null>(null);
  const [viewingTimesheet, setViewingTimesheet] = useState<Timesheet | null>(null);
  const [isPendingDialogOpen, setIsPendingDialogOpen] = useState(false);
  
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [jmsSearchTerm, setJmsSearchTerm] = useState('');
  const [timesheetSearchTerm, setTimesheetSearchTerm] = useState('');

  const canCreateJms = useMemo(() => {
    if (!user) return false;
    const allowedRoles: Role[] = ['Admin', 'Project Coordinator', 'Document Controller'];
    return allowedRoles.includes(user.role);
  }, [user]);

  const longPendingJobs = useMemo(() => {
    if (!user) return [];
    const allowedRoles: Role[] = ['Admin', 'Project Coordinator', 'Document Controller'];
    if (!allowedRoles.includes(user.role)) return [];
    
    return jobProgress.filter(job => {
        const isPendingAck = job.steps.some(s => s.status === 'Pending');
        const isInProgress = job.steps.some(s => s.status === 'Acknowledged');
        
        if (job.status !== 'Completed' && (isPendingAck || isInProgress)) {
            const daysIdle = differenceInDays(new Date(), parseISO(job.lastUpdated));
            return daysIdle > 3;
        }
        return false;
    });
  }, [jobProgress, user]);

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
    return null;
  }

  const canViewLongPending = user && ['Admin', 'Project Coordinator', 'Document Controller'].includes(user.role);

  return (
    <div className="space-y-4 h-full flex flex-col">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trackers</h1>
          <p className="text-muted-foreground">Monitor the lifecycle of JMS and Timesheets.</p>
        </div>
        <div className="flex items-center gap-2">
            <OngoingJobsReport jobs={filteredJobs} />
            <Button variant="outline" onClick={() => setIsPendingDialogOpen(true)}>
              <Bell className="mr-2 h-4 w-4" />
              Pending Actions
              {jmsAndTimesheetNotificationCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {jmsAndTimesheetNotificationCount}
                </Badge>
              )}
            </Button>
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
      
      <Tabs defaultValue="jms" className="flex-1 flex flex-col">
        <TabsList className="shrink-0">
          <TabsTrigger value="jms">JMS Tracker</TabsTrigger>
          <TabsTrigger value="timesheets">Timesheet Tracker</TabsTrigger>
          {canViewLongPending && (
             <TabsTrigger value="long-pending">Long Pending JMS</TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="jms" className="flex-1 overflow-hidden">
           <div className="w-full sm:w-auto max-w-sm pt-2 pb-4">
              <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                      placeholder="Search by title, JMS no, project..."
                      className="pl-9"
                      value={jmsSearchTerm}
                      onChange={e => setJmsSearchTerm(e.target.value)}
                  />
              </div>
          </div>
          <JobProgressBoard jobs={filteredJobs} onViewJob={setViewingJob} />
        </TabsContent>
        <TabsContent value="timesheets" className="flex-1 overflow-hidden">
            <div className="w-full sm:w-auto max-w-sm pt-2 pb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by project or unit..."
                    className="pl-9"
                    value={timesheetSearchTerm}
                    onChange={e => setTimesheetSearchTerm(e.target.value)}
                />
              </div>
          </div>
          <TimesheetBoard timesheets={filteredTimesheets} onViewTimesheet={setViewingTimesheet} />
        </TabsContent>
        {canViewLongPending && (
          <TabsContent value="long-pending" className="flex-1 overflow-hidden mt-4">
            <JobProgressTable jobs={longPendingJobs} onViewJob={setViewingJob} />
          </TabsContent>
        )}
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
       {viewingTimesheet && (
        <ViewTimesheetDialog
          isOpen={!!viewingTimesheet}
          setIsOpen={() => setViewingTimesheet(null)}
          timesheet={viewingTimesheet}
        />
      )}
      <PendingActionsDialog isOpen={isPendingDialogOpen} setIsOpen={setIsPendingDialogOpen} />
    </div>
  );
}
