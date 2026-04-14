

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { PlusCircle, Bell, Clock, Folder, List, LayoutGrid, Settings, X, Info, Search, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import CreateJobDialog from '@/components/job-progress/CreateJobDialog';
import ViewJobProgressDialog from '@/components/job-progress/ViewJobProgressDialog';
import { JobProgress, Timesheet, Role, DocumentMovement } from '@/lib/types';
import { format, startOfMonth, addMonths, subMonths, isSameMonth, parseISO, isBefore, isAfter, startOfToday, differenceInDays, endOfMonth, isValid } from 'date-fns';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';


const implementationStartDate = new Date(2025, 9, 1); // October 2025

export default function JobProgressPage() {
  const { can, jobProgress, timesheets, user, projects, users, trackerNotificationCount, documentMovements, updateUserViewPreference, getVisibleUsers } = useAppContext();
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false);
  const [isCreateTimesheetOpen, setIsCreateTimesheetOpen] = useState(false);
  const [isCreateDocumentOpen, setIsCreateDocumentOpen] = useState(false);
  const [viewingJob, setViewingJob] = useState<JobProgress | null>(null);
  const [viewingTimesheet, setViewingTimesheet] = useState<Timesheet | null>(null);
  const [viewingDocument, setViewingDocument] = useState<DocumentMovement | null>(null);
  const [isPendingDialogOpen, setIsPendingDialogOpen] = useState(false);
  const [isLongPendingDialogOpen, setIsLongPendingDialogOpen] = useState(false);
  const [showViewNotice, setShowViewNotice] = useState(true);
  
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

    // Apply project and assignee filters first
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

    // Then, if there's a search term, apply it globally (ignoring month)
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
    
    // Otherwise, filter by month
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

    // If not searching, filter by current month
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


  const canViewLongPending = user && ['Admin', 'Project Coordinator', 'Document Controller'].includes(user.role);
  
  const handleViewJob = (job: JobProgress) => {
    const jobDate = parseISO(job.dateFrom || job.createdAt);
    // If there's a search term active and the job is not in the current month, switch months
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
    <div className="space-y-4 h-full flex flex-col">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trackers</h1>
          <p className="text-muted-foreground">Monitor the lifecycle of JMS, Timesheets, and other documents.</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-start sm:justify-end gap-2 w-full sm:w-auto">
            <OngoingJobsReport jobs={filteredJobs} />
            <Button variant="outline" onClick={() => setIsPendingDialogOpen(true)}>
              <Bell className="mr-2 h-4 w-4" />
              Pending Actions
              {trackerNotificationCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {trackerNotificationCount}
                </Badge>
              )}
            </Button>
            {canViewLongPending && (
                <Button variant="outline" onClick={() => setIsLongPendingDialogOpen(true)}>
                    <Clock className="mr-2 h-4 w-4" />
                    Long Pending
                    {longPendingJobs.length > 0 && (
                    <Badge variant="destructive" className="ml-2">
                        {longPendingJobs.length}
                    </Badge>
                    )}
                </Button>
            )}
            <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" onClick={() => changeMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" className="w-32" onClick={handleTodayClick}>{format(currentMonth, 'MMMM yyyy')}</Button>
                <Button variant="outline" size="icon" onClick={() => changeMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            {canCreateJms && (
              <Button onClick={() => setIsCreateJobOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Create New JMS
              </Button>
            )}
             <Button onClick={() => setIsCreateTimesheetOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Submit Timesheet
            </Button>
             <Button onClick={() => setIsCreateDocumentOpen(true)}>
                <Folder className="mr-2 h-4 w-4" /> Create Document
            </Button>
        </div>
      </div>
      
      <Tabs defaultValue="jms" onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="shrink-0 grid w-full grid-cols-3">
          <TabsTrigger value="jms">JMS Tracker</TabsTrigger>
          <TabsTrigger value="timesheets">Timesheet Tracker</TabsTrigger>
          <TabsTrigger value="documents">Document Tracker</TabsTrigger>
        </TabsList>
        <TabsContent value="jms" className="flex-1 overflow-hidden flex flex-col">
           <div className="flex flex-col sm:flex-row justify-between items-center pt-2 pb-4 gap-2">
              <div className="flex flex-col sm:flex-row gap-2 items-center w-full">
                  <div className="relative w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                          placeholder="Search..."
                          className="pl-9 w-full"
                          value={jmsSearchTerm}
                          onChange={e => setJmsSearchTerm(e.target.value)}
                      />
                  </div>
                  <Select value={jmsProjectFilter} onValueChange={setJmsProjectFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filter by project..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Projects</SelectItem>
                        {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={jmsAssigneeFilter} onValueChange={setJmsAssigneeFilter}>
                      <SelectTrigger className="w-full sm:w-[200px]">
                          <SelectValue placeholder="Filter by assignee..." />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">All Assignees</SelectItem>
                          {assignableUsers.map(u => (
                              <SelectItem key={u.id} value={u.id} disabled={u.status === 'locked'}>
                                  {u.name}{u.status === 'locked' && ' (Locked)'}
                              </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>
              <div className="flex items-center gap-2 self-end">
                <Button variant={jmsView === 'board' ? 'secondary' : 'outline'} size="icon" onClick={() => setJmsView('board')}><LayoutGrid className="h-4 w-4" /></Button>
                <Button variant={jmsView === 'list' ? 'secondary' : 'outline'} size="icon" onClick={() => setJmsView('list')}><List className="h-4 w-4" /></Button>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon"><Settings className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuLabel>Default View</DropdownMenuLabel>
                                <DropdownMenuRadioGroup value={user?.viewPreferences?.jmsTracker || 'list'} onValueChange={handleJmsDefaultViewChange}>
                                <DropdownMenuRadioItem value="board">Board</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="list">List</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                            </DropdownMenu>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Set your default view for the JMS tracker.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
              </div>
          </div>
          {jmsView === 'board' ? (
            <JobProgressBoard jobs={filteredJobs} onViewJob={handleViewJob} />
          ) : (
            <JobProgressTable jobs={filteredJobs} onViewJob={handleViewJob} />
          )}
        </TabsContent>
        <TabsContent value="timesheets" className="flex-1 overflow-hidden flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-center pt-2 pb-4 gap-2">
              <div className="flex flex-col sm:flex-row gap-2 items-center w-full">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                      placeholder="Search by unit..."
                      className="pl-9 w-full"
                      value={timesheetSearchTerm}
                      onChange={e => setTimesheetSearchTerm(e.target.value)}
                  />
                </div>
                 <Select value={timesheetProjectFilter} onValueChange={setTimesheetProjectFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filter by project..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Projects</SelectItem>
                        {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <Select value={timesheetSubmitterFilter} onValueChange={setTimesheetSubmitterFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filter by submitter..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Submitters</SelectItem>
                        {allSubmitters.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 self-end">
                <Button variant={timesheetView === 'board' ? 'secondary' : 'outline'} size="icon" onClick={() => setTimesheetView('board')}><LayoutGrid className="h-4 w-4" /></Button>
                <Button variant={timesheetView === 'list' ? 'secondary' : 'outline'} size="icon" onClick={() => setTimesheetView('list')}><List className="h-4 w-4" /></Button>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon"><Settings className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuLabel>Default View</DropdownMenuLabel>
                                <DropdownMenuRadioGroup value={user?.viewPreferences?.timesheetTracker || 'list'} onValueChange={handleTimesheetDefaultViewChange}>
                                <DropdownMenuRadioItem value="board">Board</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="list">List</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                            </DropdownMenu>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Set your default view for the Timesheet tracker.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
              </div>
          </div>
          {timesheetView === 'board' ? (
            <TimesheetBoard timesheets={filteredTimesheets} onViewTimesheet={handleViewTimesheet} />
          ) : (
            <TimesheetTrackerTable timesheets={filteredTimesheets} onViewTimesheet={handleViewTimesheet} />
          )}
        </TabsContent>
         <TabsContent value="documents" className="flex-1 overflow-hidden">
            <div className="w-full sm:w-auto max-w-sm pt-2 pb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by title..."
                    className="pl-9"
                    value={docSearchTerm}
                    onChange={e => setDocSearchTerm(e.target.value)}
                />
              </div>
          </div>
          <DocumentMovementList documents={filteredDocuments} onViewDocument={setViewingDocument} />
        </TabsContent>
      </Tabs>


      <CreateJobDialog isOpen={isCreateJobOpen} setIsOpen={setIsCreateJobOpen} />
      <CreateTimesheetDialog isOpen={isCreateTimesheetOpen} setIsOpen={setIsCreateTimesheetOpen} />
      <CreateDocumentMovementDialog isOpen={isCreateDocumentOpen} setIsOpen={setIsCreateDocumentOpen} />
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
      {viewingDocument && (
        <ViewDocumentMovementDialog
            isOpen={!!viewingDocument}
            setIsOpen={() => setViewingDocument(null)}
            movement={viewingDocument}
        />
      )}
      <PendingActionsDialog 
        isOpen={isPendingDialogOpen} 
        setIsOpen={setIsPendingDialogOpen} 
        onViewJob={handleViewJob}
        onViewTimesheet={setViewingTimesheet}
        onViewDocument={setViewingDocument}
      />
      <LongPendingJmsDialog
        isOpen={isLongPendingDialogOpen}
        setIsOpen={setIsLongPendingDialogOpen}
        longPendingJobs={longPendingJobs}
        onViewJob={handleViewJob}
      />
    </div>
  );
}
