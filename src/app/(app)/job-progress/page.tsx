'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { usePlanner } from '@/contexts/planner-provider';
import { useGeneral } from '@/contexts/general-provider';
import { Button } from '@/components/ui/button';
import { Bell, Clock, Folder, List, LayoutGrid, Settings, Search, ChevronLeft, ChevronRight, AlertTriangle, PlusCircle, FileStack } from 'lucide-react';
import ViewJobProgressDialog from '@/components/job-progress/ViewJobProgressDialog';
import { JobProgress, Timesheet, Role, DocumentMovement } from '@/lib/types';
import { format, startOfMonth, addMonths, isSameMonth, parseISO, isBefore, isAfter, startOfToday, differenceInDays, endOfMonth, isValid } from 'date-fns';
import CreateTimesheetDialog from '@/components/job-progress/CreateTimesheetDialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import JobProgressBoard from '@/components/job-progress/JobProgressBoard';
import { JobProgressTable } from '@/components/job-progress/JobProgressTable';
import TimesheetBoard from '@/components/job-progress/TimesheetBoard';
import ViewTimesheetDialog from '@/components/job-progress/ViewTimesheetDialog';
import { Badge } from '@/components/ui/badge';
import PendingActionsDialog from '@/components/job-progress/PendingActionsDialog';
import OngoingJobsReport from '@/components/job-progress/OngoingJobsReport';
import LongPendingJmsDialog from '@/components/job-progress/LongPendingJmsDialog';
import CreateDocumentMovementDialog from '@/components/job-progress/CreateDocumentMovementDialog';
import DocumentMovementList from '@/components/job-progress/DocumentMovementList';
import ViewDocumentMovementDialog from '@/components/job-progress/ViewDocumentMovementDialog';
import TimesheetTrackerTable from '@/components/job-progress/TimesheetTrackerTable';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import CreateJobDialog from '@/components/job-progress/CreateJobDialog';

const implementationStartDate = new Date(2025, 9, 1); // October 2025

export default function JobProgressPage() {
  const { user, users, updateUserViewPreference, getVisibleUsers, can } = useAuth();
  const { projects } = useGeneral();
  const { jobProgress, timesheets, trackerNotificationCount, documentMovements } = usePlanner();

  const [isCreateTimesheetOpen, setIsCreateTimesheetOpen] = useState(false);
  const [isCreateDocumentOpen, setIsCreateDocumentOpen] = useState(false);
  const [isCreateJmsOpen, setIsCreateJmsOpen] = useState(false);
  const [viewingJob, setViewingJob] = useState<JobProgress | null>(null);
  const [viewingTimesheet, setViewingTimesheet] = useState<Timesheet | null>(null);
  const [viewingDocument, setViewingDocument] = useState<DocumentMovement | null>(null);
  const [isPendingDialogOpen, setIsPendingDialogOpen] = useState(false);
  const [isLongPendingDialogOpen, setIsLongPendingDialogOpen] = useState(false);
  
  const [jmsSearchTerm, setJmsSearchTerm] = useState('');
  const [jmsAssigneeFilter, setJmsAssigneeFilter] = useState('all');
  const [jmsProjectFilter, setJmsProjectFilter] = useState('all');
  const [timesheetSearchTerm, setTimesheetSearchTerm] = useState('');
  const [timesheetSubmitterFilter, setTimesheetSubmitterFilter] = useState('all');
  const [timesheetProjectFilter, setTimesheetProjectFilter] = useState('all');
  const [docSearchTerm, setDocSearchTerm] = useState('');

  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [jmsView, setJmsView] = useState<'board' | 'list'>(user?.viewPreferences?.jmsTracker || 'list');
  const [timesheetView, setTimesheetView] = useState<'board' | 'list'>(user?.viewPreferences?.timesheetTracker || 'list');
  const [activeTab, setActiveTab] = useState('jms');

  const assignableUsers = useMemo(() => {
    return getVisibleUsers().filter(u => u.role !== 'Manager');
  }, [getVisibleUsers]);

  const canGoToPreviousMonth = useMemo(() => {
    const firstDayOfCurrentMonth = startOfMonth(currentMonth);
    return isAfter(firstDayOfCurrentMonth, implementationStartDate);
  }, [currentMonth]);

  const canGoToNextMonth = useMemo(() => {
    const firstDayOfCurrentMonth = startOfMonth(currentMonth);
    return isBefore(firstDayOfCurrentMonth, startOfToday());
  }, [currentMonth]);

  useEffect(() => {
    if (user?.viewPreferences?.jmsTracker) {
        setJmsView(user.viewPreferences.jmsTracker);
    }
    if (user?.viewPreferences?.timesheetTracker) {
        setTimesheetView(user.viewPreferences.timesheetTracker);
    }
  }, [user?.viewPreferences]);
  
  const handleJmsDefaultViewChange = (value: string) => {
    updateUserViewPreference('jmsTracker', value as 'board' | 'list');
  };

  const handleTimesheetDefaultViewChange = (value: string) => {
    updateUserViewPreference('timesheetTracker', value as 'board' | 'list');
  };

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

  const visibleJobs = useMemo(() => jobProgress.filter(job => {
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
  }), [jobProgress, user, projects]);

  const filteredJobs = useMemo(() => {
    let jobs = visibleJobs;

    if (jmsProjectFilter !== 'all') {
      jobs = jobs.filter(job => job.projectId === jmsProjectFilter);
    }
    if (jmsAssigneeFilter !== 'all') {
      jobs = jobs.filter(job => {
        const returnedStep = job.steps.find(s => s.isReturned === true);
        const pendingStep = job.steps.find(s => s.status === 'Pending');
        const acknowledgedStep = job.steps.find(s => s.status === 'Acknowledged');
        const currentStep = returnedStep || pendingStep || acknowledgedStep || null;
        
        if (job.status === 'Completed') {
            const lastStep = job.steps[job.steps.length - 1];
            const completerId = lastStep?.completedBy;
            return completerId === jmsAssigneeFilter;
        } else {
            return currentStep?.assigneeId === jmsAssigneeFilter;
        }
      });
    }

    if (jmsSearchTerm) {
      const lowercasedTerm = jmsSearchTerm.toLowerCase();
      return jobs.filter(job => {
        const project = projects.find(p => p.id === job.projectId);
        const amountStr = job.amount?.toString() || '';
        return (
            job.title.toLowerCase().includes(lowercasedTerm) ||
            (job.jmsNo && job.jmsNo.toLowerCase().includes(lowercasedTerm)) ||
            (project && project.name.toLowerCase().includes(lowercasedTerm)) ||
            (job.plantUnit && job.plantUnit.toLowerCase().includes(lowercasedTerm)) ||
            amountStr.includes(lowercasedTerm)
        );
      });
    }
    
    jobs = jobs.filter(job => {
        const jobStartDate = job.dateFrom ? parseISO(job.dateFrom) : parseISO(job.createdAt);
        const jobEndDate = job.dateTo ? parseISO(job.dateTo) : null;
        if (!isValid(jobStartDate)) return false;

        if (jobEndDate && isValid(jobEndDate)) {
            return isSameMonth(jobStartDate, currentMonth) || 
                   isSameMonth(jobEndDate, currentMonth) ||
                   (isBefore(jobStartDate, startOfMonth(currentMonth)) && isAfter(jobEndDate, endOfMonth(currentMonth)));
        }
        return isSameMonth(jobStartDate, currentMonth);
    });

    return jobs;
  }, [visibleJobs, jmsSearchTerm, jmsAssigneeFilter, jmsProjectFilter, projects, currentMonth]);

  const filteredTimesheets = useMemo(() => {
    let visibleTimesheets = timesheets.filter(ts => {
      const canViewAll = user?.role === 'Admin' || user?.role === 'Project Coordinator' || user?.role === 'Document Controller';
      if (canViewAll) return true;

      if (ts.submitterId === user?.id || ts.submittedToId === user?.id) return true;

      if (!user?.projectIds) return false;
      return user.projectIds.includes(ts.projectId);
    });

    if (timesheetSubmitterFilter !== 'all') {
        visibleTimesheets = visibleTimesheets.filter(ts => ts.submitterId === timesheetSubmitterFilter);
    }
    if (timesheetProjectFilter !== 'all') {
        visibleTimesheets = visibleTimesheets.filter(ts => ts.projectId === timesheetProjectFilter);
    }

    if (timesheetSearchTerm) {
        const lowercasedTerm = timesheetSearchTerm.toLowerCase();
        visibleTimesheets = visibleTimesheets.filter(ts => {
            return (ts.plantUnit && ts.plantUnit.toLowerCase().includes(lowercasedTerm));
        });
    }

    return visibleTimesheets.filter(ts => {
        const tsStartDate = parseISO(ts.startDate);
        const tsEndDate = parseISO(ts.endDate);
        if (!isValid(tsStartDate) || !isValid(tsEndDate)) return false;

        return isSameMonth(tsStartDate, currentMonth) ||
               isSameMonth(tsEndDate, currentMonth) ||
               (isBefore(tsStartDate, startOfMonth(currentMonth)) && isAfter(tsEndDate, endOfMonth(currentMonth)));
    });
  }, [timesheets, user, timesheetSearchTerm, projects, currentMonth, timesheetSubmitterFilter, timesheetProjectFilter]);
  
  const filteredDocuments = useMemo(() => {
    if (!docSearchTerm) return documentMovements;
    const lowercasedTerm = docSearchTerm.toLowerCase();
    return documentMovements.filter(doc => doc.title.toLowerCase().includes(lowercasedTerm));
  }, [documentMovements, docSearchTerm]);

  const handleViewJob = (job: JobProgress) => {
    const jobDate = parseISO(job.dateFrom || job.createdAt);
    if (jmsSearchTerm && !isSameMonth(jobDate, currentMonth)) {
        setCurrentMonth(startOfMonth(jobDate));
    }
    setViewingJob(job);
  };
  
  const handleViewTimesheet = (timesheet: Timesheet) => {
    if (timesheetSearchTerm) {
      const tsDate = parseISO(timesheet.startDate);
      if (!isSameMonth(tsDate, currentMonth)) {
        setCurrentMonth(startOfMonth(tsDate));
      }
    }
    setViewingTimesheet(timesheet);
  };

  const changeMonth = (amount: number) => {
    setCurrentMonth(prev => addMonths(prev, amount));
  };
  
  const handleTodayClick = () => {
    setCurrentMonth(startOfMonth(new Date()));
  };

    const allSubmitters = useMemo(() => {
        const submitterIds = new Set(timesheets.map(ts => ts.submitterId));
        return users.filter(u => submitterIds.has(u.id));
    }, [timesheets, users]);
    
    if (!can.view_job_progress && !can.view_all) {
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
    <div className="flex flex-col h-[calc(100vh-10rem)] space-y-4">
       {/* 1. Global Header Section */}
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 sticky top-0 z-20">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Trackers</h1>
          <p className="text-muted-foreground text-xs">Monitor lifecycle of JMS, Timesheets, and Documents.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsPendingDialogOpen(true)} className="relative h-8">
              <Bell className="mr-2 h-4 w-4" />
              Pending
              {trackerNotificationCount > 0 && (
                <Badge variant="destructive" className="absolute -top-1.5 -right-1.5 h-4 min-w-[1rem] flex items-center justify-center p-0.5 rounded-full text-[10px] animate-pulse">
                  {trackerNotificationCount}
                </Badge>
              )}
            </Button>
            {user && ['Admin', 'Project Coordinator', 'Document Controller'].includes(user.role) && (
                <Button variant="outline" size="sm" onClick={() => setIsLongPendingDialogOpen(true)} className="h-8">
                    <Clock className="mr-2 h-4 w-4" />
                    Long Pending
                    {longPendingJobs.length > 0 && (
                    <Badge variant="destructive" className="ml-2 h-4 min-w-[1rem] text-[10px]">
                        {longPendingJobs.length}
                    </Badge>
                    )}
                </Button>
            )}
            <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-md border h-8">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => changeMonth(-1)} disabled={!canGoToPreviousMonth}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" className="h-7 px-3 text-xs font-bold" onClick={handleTodayClick}>{format(currentMonth, 'MMMM yyyy')}</Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => changeMonth(1)} disabled={!canGoToNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
      </div>
      
      {/* 2. Main Tabs Navigation */}
      <Tabs defaultValue="jms" onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="shrink-0 w-full grid grid-cols-3 h-10 p-1 bg-muted/50 rounded-lg">
          <TabsTrigger value="jms" className="data-[state=active]:bg-background">JMS Tracker</TabsTrigger>
          <TabsTrigger value="timesheets" className="data-[state=active]:bg-background">Timesheet Tracker</TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:bg-background">Document Tracker</TabsTrigger>
        </TabsList>

        {/* 3. JMS Content */}
        <TabsContent value="jms" className="flex-1 min-h-0 flex flex-col pt-4 data-[state=active]:flex">
           <div className="flex flex-col sm:flex-row justify-between items-center pb-4 gap-4 shrink-0">
              <div className="flex flex-wrap gap-2 items-center flex-1">
                  <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                          placeholder="Search job, jms no..."
                          className="pl-9 h-9 text-sm bg-background"
                          value={jmsSearchTerm}
                          onChange={e => setJmsSearchTerm(e.target.value)}
                      />
                  </div>
                  <Select value={jmsProjectFilter} onValueChange={setJmsProjectFilter}>
                    <SelectTrigger className="w-full sm:w-[150px] h-9 text-sm bg-background"><SelectValue placeholder="Project" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Projects</SelectItem>
                        {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={jmsAssigneeFilter} onValueChange={setJmsAssigneeFilter}>
                      <SelectTrigger className="w-full sm:w-[150px] h-9 text-sm bg-background">
                          <SelectValue placeholder="Assignee" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">All Assignees</SelectItem>
                          {assignableUsers.map(u => (
                              <SelectItem key={u.id} value={u.id} disabled={u.status === 'locked'}>
                                  {u.name}
                              </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <OngoingJobsReport jobs={filteredJobs} />
                <Separator orientation="vertical" className="h-6 mx-1" />
                <Button variant={jmsView === 'board' ? 'secondary' : 'outline'} size="icon" className="h-9 w-9" onClick={() => setJmsView('board')}><LayoutGrid className="h-4 w-4" /></Button>
                <Button variant={jmsView === 'list' ? 'secondary' : 'outline'} size="icon" className="h-9 w-9" onClick={() => setJmsView('list')}><List className="h-4 w-4" /></Button>
                {can.create_jms && (
                    <Button onClick={() => setIsCreateJmsOpen(true)} size="sm" className="h-9 px-4">
                        <PlusCircle className="mr-2 h-4 w-4" /> New JMS
                    </Button>
                )}
              </div>
          </div>
          <div className="flex-1 min-h-0 bg-white dark:bg-slate-950 rounded-lg shadow-sm border overflow-hidden flex flex-col">
            {jmsView === 'board' ? (
                <JobProgressBoard jobs={filteredJobs} onViewJob={handleViewJob} />
            ) : (
                <JobProgressTable jobs={filteredJobs} onViewJob={handleViewJob} />
            )}
          </div>
        </TabsContent>

        {/* 4. Timesheet Content */}
        <TabsContent value="timesheets" className="flex-1 min-h-0 flex flex-col pt-4 data-[state=active]:flex">
          <div className="flex flex-col sm:flex-row justify-between items-center pb-4 gap-4 shrink-0">
              <div className="flex flex-wrap gap-2 items-center flex-1">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                      placeholder="Search unit..."
                      className="pl-9 h-9 text-sm bg-background"
                      value={timesheetSearchTerm}
                      onChange={e => setTimesheetSearchTerm(e.target.value)}
                  />
                </div>
                 <Select value={timesheetProjectFilter} onValueChange={setTimesheetProjectFilter}>
                    <SelectTrigger className="w-full sm:w-[150px] h-9 text-sm bg-background"><SelectValue placeholder="Project" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Projects</SelectItem>
                        {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <Select value={timesheetSubmitterFilter} onValueChange={setTimesheetSubmitterFilter}>
                    <SelectTrigger className="w-full sm:w-[150px] h-9 text-sm bg-background"><SelectValue placeholder="Submitter" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Submitters</SelectItem>
                        {allSubmitters.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant={timesheetView === 'board' ? 'secondary' : 'outline'} size="icon" className="h-9 w-9" onClick={() => setTimesheetView('board')}><LayoutGrid className="h-4 w-4" /></Button>
                <Button variant={timesheetView === 'list' ? 'secondary' : 'outline'} size="icon" className="h-9 w-9" onClick={() => setTimesheetView('list')}><List className="h-4 w-4" /></Button>
                <Button onClick={() => setIsCreateTimesheetOpen(true)} size="sm" className="h-9 px-4">
                    <PlusCircle className="mr-2 h-4 w-4" /> New Timesheet
                </Button>
              </div>
          </div>
          <div className="flex-1 min-h-0 bg-white dark:bg-slate-950 rounded-lg shadow-sm border overflow-hidden flex flex-col">
            {timesheetView === 'board' ? (
                <TimesheetBoard timesheets={filteredTimesheets} onViewTimesheet={handleViewTimesheet} />
            ) : (
                <TimesheetTrackerTable timesheets={filteredTimesheets} onViewTimesheet={handleViewTimesheet} />
            )}
          </div>
        </TabsContent>

        {/* 5. Document Content */}
        <TabsContent value="documents" className="flex-1 min-h-0 pt-4 data-[state=active]:flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-center pb-4 gap-4 shrink-0">
            <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search document title..."
                    className="pl-9 h-9 text-sm bg-background"
                    value={docSearchTerm}
                    onChange={e => setDocSearchTerm(e.target.value)}
                />
            </div>
            <Button onClick={() => setIsCreateDocumentOpen(true)} size="sm" className="h-9 px-4">
                <Folder className="mr-2 h-4 w-4" /> New Tracker
            </Button>
          </div>
          <div className="flex-1 min-h-0 bg-white dark:bg-slate-950 rounded-lg shadow-sm border overflow-hidden flex flex-col">
            <DocumentMovementList documents={filteredDocuments} onViewDocument={setViewingDocument} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateTimesheetDialog isOpen={isCreateTimesheetOpen} setIsOpen={setIsCreateTimesheetOpen} />
      <CreateDocumentMovementDialog isOpen={isCreateDocumentOpen} setIsOpen={setIsCreateDocumentOpen} />
      <CreateJobDialog isOpen={isCreateJmsOpen} setIsOpen={setIsCreateJmsOpen} />
      {viewingJob && <ViewJobProgressDialog isOpen={!!viewingJob} setIsOpen={() => setViewingJob(null)} job={viewingJob} />}
      {viewingTimesheet && <ViewTimesheetDialog isOpen={!!viewingTimesheet} setIsOpen={() => setViewingTimesheet(null)} timesheet={viewingTimesheet} />}
      {viewingDocument && <ViewDocumentMovementDialog isOpen={!!viewingDocument} setIsOpen={() => setViewingDocument(null)} movement={viewingDocument} />}
      <PendingActionsDialog isOpen={isPendingDialogOpen} setIsOpen={setIsPendingDialogOpen} onViewJob={handleViewJob} onViewTimesheet={handleViewTimesheet} onViewDocument={setViewingDocument} />
      <LongPendingJmsDialog isOpen={isLongPendingDialogOpen} setIsOpen={setIsLongPendingDialogOpen} longPendingJobs={longPendingJobs} onViewJob={handleViewJob} />
    </div>
  );
}