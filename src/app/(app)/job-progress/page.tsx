'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { usePlanner } from '@/contexts/planner-provider';
import { useGeneral } from '@/contexts/general-provider';
import { Button } from '@/components/ui/button';
import { Bell, Clock, Folder, List, LayoutGrid, Search, ChevronLeft, ChevronRight, AlertTriangle, PlusCircle, FolderKanban } from 'lucide-react';
import ViewJobProgressDialog from '@/components/job-progress/ViewJobProgressDialog';
import { JobProgress, Timesheet, Role, DocumentMovement } from '@/lib/types';
import { format, startOfMonth, addMonths, isSameMonth, parseISO, isAfter, isBefore, startOfToday, differenceInDays, endOfMonth, isValid } from 'date-fns';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import CreateJobDialog from '@/components/job-progress/CreateJobDialog';
import { Separator } from '@/components/ui/separator';

const implementationStartDate = new Date(2025, 9, 1); // October 2025

export default function JobProgressPage() {
  const { user, users, getVisibleUsers, can } = useAuth();
  const { projects, workOrders } = useGeneral();
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
  const [jmsAssigneeId, setJmsAssigneeId] = useState('all');
  const [jmsProjectFilter, setJmsProjectFilter] = useState('all');
  const [jmsUnitFilter, setJmsUnitFilter] = useState('all');
  const [timesheetSearchTerm, setTimesheetSearchTerm] = useState('');
  const [timesheetSubmitterFilter, setTimesheetSubmitterFilter] = useState('all');
  const [timesheetProjectFilter, setTimesheetProjectFilter] = useState('all');
  const [docSearchTerm, setDocSearchTerm] = useState('');

  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [jmsView, setJmsView] = useState<'board' | 'list'>('list');
  const [timesheetView, setTimesheetView] = useState<'board' | 'list'>('list');
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
      return project && user.projectIds?.includes(project.id);
    });
  }), [jobProgress, user, projects]);

  const jobsInMonth = useMemo(() => {
    return visibleJobs.filter(job => {
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
  }, [visibleJobs, currentMonth]);

  const availableUnits = useMemo(() => {
    const units = new Set<string>();
    jobsInMonth.forEach(job => {
      if (job.plantUnit) units.add(job.plantUnit);
    });
    return Array.from(units).sort();
  }, [jobsInMonth]);

  const filteredJobs = useMemo(() => {
    let jobs = jobsInMonth;

    if (jmsProjectFilter !== 'all') {
      jobs = jobs.filter(job => job.projectId === jmsProjectFilter);
    }
    if (jmsUnitFilter !== 'all') {
      jobs = jobs.filter(job => job.plantUnit === jmsUnitFilter);
    }
    if (jmsAssigneeId !== 'all') {
      jobs = jobs.filter(job => {
        const currentStep = job.steps.find(s => s.status === 'Pending' || s.isReturned || s.status === 'Acknowledged');
        if (job.status === 'Completed') {
            const lastStep = job.steps[job.steps.length - 1];
            return lastStep?.completedBy === jmsAssigneeId;
        } else {
            return currentStep?.assigneeId === jmsAssigneeId;
        }
      });
    }

    if (jmsSearchTerm) {
      const lowercasedTerm = jmsSearchTerm.toLowerCase();
      jobs = jobs.filter(job => {
        const project = projects.find(p => p.id === job.projectId);
        const amountStr = job.amount?.toString() || '';
        const formattedAmount = job.amount ? new Intl.NumberFormat('en-IN').format(job.amount) : '';

        return (
            job.title.toLowerCase().includes(lowercasedTerm) ||
            (job.jmsNo && job.jmsNo.toLowerCase().includes(lowercasedTerm)) ||
            (project && project.name.toLowerCase().includes(lowercasedTerm)) ||
            (job.plantUnit && job.plantUnit.toLowerCase().includes(lowercasedTerm)) ||
            amountStr.includes(lowercasedTerm) ||
            formattedAmount.includes(lowercasedTerm)
        );
      });
    }
    
    return jobs;
  }, [jobsInMonth, jmsSearchTerm, jmsAssigneeId, jmsProjectFilter, jmsUnitFilter, projects]);

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
        visibleTimesheets = visibleTimesheets.filter(ts => ts.plantUnit && ts.plantUnit.toLowerCase().includes(lowercasedTerm));
    }

    return visibleTimesheets.filter(ts => {
        const tsStartDate = parseISO(ts.startDate);
        const tsEndDate = parseISO(ts.endDate);
        if (!isValid(tsStartDate) || !isValid(tsEndDate)) return false;
        return isSameMonth(tsStartDate, currentMonth) || isSameMonth(tsEndDate, currentMonth) || (isBefore(tsStartDate, startOfMonth(currentMonth)) && isAfter(tsEndDate, endOfMonth(currentMonth)));
    });
  }, [timesheets, user, timesheetSearchTerm, currentMonth, timesheetSubmitterFilter, timesheetProjectFilter]);
  
  const filteredDocuments = useMemo(() => {
    if (!docSearchTerm) return documentMovements;
    const lowercasedTerm = docSearchTerm.toLowerCase();
    return documentMovements.filter(doc => doc.title.toLowerCase().includes(lowercasedTerm));
  }, [documentMovements, docSearchTerm]);

  const handleViewJob = (job: JobProgress) => {
    setViewingJob(job);
  };
  
  const handleViewTimesheet = (timesheet: Timesheet) => {
    setViewingTimesheet(timesheet);
  };

  const changeMonth = (amount: number) => {
    setCurrentMonth(prev => addMonths(prev, amount));
    setJmsUnitFilter('all');
  };
  
  const handleTodayClick = () => {
    setCurrentMonth(startOfMonth(new Date()));
    setJmsUnitFilter('all');
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
    <div className="flex flex-1 h-full flex-col min-h-0 overflow-hidden gap-4">
       <div className="shrink-0">
          <h1 className="text-3xl font-bold tracking-tight">JMS Tracker</h1>
          <p className="text-muted-foreground text-sm">Monitor the progress of Job Measurement Sheets, Timesheets, and Documents.</p>
       </div>
      
       <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 h-0 flex-col min-h-0">
            <div className="shrink-0 mb-2">
                <TabsList className="bg-muted/50">
                    <TabsTrigger value="jms" className="text-xs px-3">JMS Tracker</TabsTrigger>
                    <TabsTrigger value="timesheets" className="text-xs px-3">Timesheet Tracker</TabsTrigger>
                    <TabsTrigger value="documents" className="text-xs px-3">Document Tracker</TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="jms" className="flex flex-1 h-0 min-h-0 flex-col overflow-hidden data-[state=active]:flex">
                <div className="flex flex-1 h-0 min-h-0 flex-col rounded-lg border bg-card overflow-hidden">
                    <div className="border-b shrink-0 p-3 space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => changeMonth(-1)} disabled={!canGoToPreviousMonth}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" className="h-8 px-2 text-sm font-bold" onClick={handleTodayClick}>{format(currentMonth, 'MMMM yyyy')}</Button>
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => changeMonth(1)} disabled={!canGoToNextMonth}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => setIsPendingDialogOpen(true)} className="relative h-8">
                                    <Bell className="mr-1.5 h-3.5 w-3.5" />
                                    Pending
                                    {trackerNotificationCount > 0 && (
                                        <Badge variant="destructive" className="absolute -top-1.5 -right-1.5 h-4 min-w-[1rem] flex items-center justify-center p-0.5 rounded-full text-[9px] animate-pulse">
                                            {trackerNotificationCount}
                                        </Badge>
                                    )}
                                </Button>
                                {user && ['Admin', 'Project Coordinator', 'Document Controller'].includes(user.role) && (
                                    <Button variant="outline" size="sm" onClick={() => setIsLongPendingDialogOpen(true)} className="h-8">
                                        <Clock className="mr-1.5 h-3.5 w-3.5" />
                                        Long Pending
                                        {longPendingJobs.length > 0 && <Badge variant="destructive" className="ml-1.5 h-4 text-[9px]">{longPendingJobs.length}</Badge>}
                                    </Button>
                                )}
                                <OngoingJobsReport jobs={filteredJobs} />
                                {can.create_jms && (
                                    <Button onClick={() => setIsCreateJmsOpen(true)} size="sm" className="h-8">
                                        <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> New JMS
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                            <div className="relative w-full sm:w-56">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Search job, jms no, value..."
                                    className="pl-8 h-8 text-xs"
                                    value={jmsSearchTerm}
                                    onChange={e => setJmsSearchTerm(e.target.value)}
                                />
                            </div>
                            <Select value={jmsProjectFilter} onValueChange={setJmsProjectFilter}>
                                <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Project" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Projects</SelectItem>
                                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={jmsUnitFilter} onValueChange={setJmsUnitFilter}>
                                <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Plant Unit" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Units</SelectItem>
                                    {availableUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={jmsAssigneeId} onValueChange={setJmsAssigneeId}>
                                <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Assignee" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Assignees</SelectItem>
                                    {assignableUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <div className="flex items-center gap-1.5 ml-auto">
                                <Button variant={jmsView === 'board' ? 'secondary' : 'outline'} size="icon" className="h-8 w-8" onClick={() => setJmsView('board')}><LayoutGrid className="h-4 w-4" /></Button>
                                <Button variant={jmsView === 'list' ? 'secondary' : 'outline'} size="icon" className="h-8 w-8" onClick={() => setJmsView('list')}><List className="h-4 w-4" /></Button>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 relative overflow-auto min-h-[650px]">
                        {jmsView === 'board' ? (
                              <JobProgressBoard jobs={filteredJobs} onViewJob={handleViewJob} />
                        ) : (
                            <JobProgressTable jobs={filteredJobs} onViewJob={handleViewJob} />
                        )}
                    </div>
                </div>
            </TabsContent>

            <TabsContent value="timesheets" className="flex flex-1 h-0 min-h-0 flex-col overflow-hidden data-[state=active]:flex">
                <div className="flex flex-1 h-0 min-h-0 flex-col rounded-lg border bg-card overflow-hidden">
                    <div className="border-b shrink-0 p-3 space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => changeMonth(-1)} disabled={!canGoToPreviousMonth}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" className="h-8 px-2 text-sm font-bold" onClick={handleTodayClick}>{format(currentMonth, 'MMMM yyyy')}</Button>
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => changeMonth(1)} disabled={!canGoToNextMonth}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                            <Button onClick={() => setIsCreateTimesheetOpen(true)} size="sm" className="h-8">
                                <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> New Timesheet
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                            <div className="relative w-full sm:w-56">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Search unit..."
                                    className="pl-8 h-8 text-xs"
                                    value={timesheetSearchTerm}
                                    onChange={e => setTimesheetSearchTerm(e.target.value)}
                                />
                            </div>
                            <Select value={timesheetProjectFilter} onValueChange={setTimesheetProjectFilter}>
                                <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Project" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Projects</SelectItem>
                                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={timesheetSubmitterFilter} onValueChange={setTimesheetSubmitterFilter}>
                                <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Submitter" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Submitters</SelectItem>
                                    {allSubmitters.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <div className="flex items-center gap-1.5 ml-auto">
                                <Button variant={timesheetView === 'board' ? 'secondary' : 'outline'} size="icon" className="h-8 w-8" onClick={() => setTimesheetView('board')}><LayoutGrid className="h-4 w-4" /></Button>
                                <Button variant={timesheetView === 'list' ? 'secondary' : 'outline'} size="icon" className="h-8 w-8" onClick={() => setViewingTimesheet(null)}><List className="h-4 w-4" /></Button>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 relative overflow-auto min-h-[650px]">
                        {timesheetView === 'board' ? (
                              <TimesheetBoard timesheets={filteredTimesheets} onViewTimesheet={handleViewTimesheet} />
                        ) : (
                            <TimesheetTrackerTable timesheets={filteredTimesheets} onViewTimesheet={handleViewTimesheet} />
                        )}
                    </div>
                </div>
            </TabsContent>

            <TabsContent value="documents" className="flex flex-1 h-0 min-h-0 flex-col overflow-hidden data-[state=active]:flex">
                <div className="flex flex-1 h-0 min-h-0 flex-col rounded-lg border bg-card overflow-hidden">
                    <div className="border-b shrink-0 p-3 flex justify-between items-center">
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search document title..."
                                className="pl-8 h-8 text-xs"
                                value={docSearchTerm}
                                onChange={e => setDocSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button onClick={() => setIsCreateDocumentOpen(true)} size="sm" className="h-8 px-3">
                            <Folder className="mr-1.5 h-3.5 w-3.5" /> New Tracker
                        </Button>
                    </div>
                    <div className="flex-1 relative overflow-auto min-h-[650px]">
                        <DocumentMovementList documents={filteredDocuments} onViewDocument={setViewingDocument} />
                    </div>
                </div>
            </TabsContent>
        </Tabs>

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
