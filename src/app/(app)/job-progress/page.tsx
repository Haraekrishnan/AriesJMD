
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { PlusCircle, Bell, Clock, Folder, List, LayoutGrid, Settings, X, Info, Search } from 'lucide-react';
import CreateJobDialog from '@/components/job-progress/CreateJobDialog';
import ViewJobProgressDialog from '@/components/job-progress/ViewJobProgressDialog';
import { JobProgress, Timesheet, Role, DocumentMovement } from '@/lib/types';
import { format, startOfMonth, addMonths, subMonths, isSameMonth, parseISO, isBefore, isAfter, startOfToday, differenceInDays } from 'date-fns';
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
  const [timesheetSearchTerm, setTimesheetSearchTerm] = useState('');
  const [docSearchTerm, setDocSearchTerm] = useState('');

  const [jmsView, setJmsView] = useState<'board' | 'list'>(user?.viewPreferences?.jmsTracker || 'list');
  const [timesheetView, setTimesheetView] = useState<'board' | 'list'>(user?.viewPreferences?.timesheetTracker || 'list');

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
    return visibleJobs.filter(job => {
        let assigneeMatch = true;
        if (jmsAssigneeFilter !== 'all') {
            const returnedStep = job.steps.find(s => s.isReturned === true);
            const pendingStep = job.steps.find(s => s.status === 'Pending');
            const acknowledgedStep = job.steps.find(s => s.status === 'Acknowledged');
            const currentStep = returnedStep || pendingStep || acknowledgedStep || null;
            
            if (job.status === 'Completed') {
                const lastStep = job.steps[job.steps.length - 1];
                const completerId = lastStep?.completedBy;
                assigneeMatch = completerId === jmsAssigneeFilter;
            } else {
                assigneeMatch = currentStep?.assigneeId === jmsAssigneeFilter;
            }
        }
        
        let searchMatch = true;
        if (jmsSearchTerm) {
            const lowercasedTerm = jmsSearchTerm.toLowerCase();
            const project = projects.find(p => p.id === job.projectId);
            const amountStr = job.amount?.toString() || '';
            searchMatch = (
                job.title.toLowerCase().includes(lowercasedTerm) ||
                (job.jmsNo && job.jmsNo.toLowerCase().includes(lowercasedTerm)) ||
                (project && project.name.toLowerCase().includes(lowercasedTerm)) ||
                (job.plantUnit && job.plantUnit.toLowerCase().includes(lowercasedTerm)) ||
                amountStr.includes(lowercasedTerm)
            );
        }

        return assigneeMatch && searchMatch;
    });
  
  }, [visibleJobs, user, jmsSearchTerm, jmsAssigneeFilter, projects]);

  const filteredTimesheets = useMemo(() => {
    const visibleTimesheets = timesheets.filter(ts => {
      const canViewAll = user?.role === 'Admin' || user?.role === 'Project Coordinator' || user?.role === 'Document Controller';
      if (canViewAll) return true;

      if (ts.submitterId === user?.id || ts.submittedToId === user?.id) return true;

      if (!user?.projectIds) return false;
      return user.projectIds.includes(ts.projectId);
    });

    if (!timesheetSearchTerm) return visibleTimesheets;
    
    const lowercasedTerm = timesheetSearchTerm.toLowerCase();
    return visibleTimesheets.filter(ts => {
        const project = projects.find(p => p.id === ts.projectId);
        return (
            (project && project.name.toLowerCase().includes(lowercasedTerm)) ||
            (ts.plantUnit && ts.plantUnit.toLowerCase().includes(lowercasedTerm))
        );
    });
  }, [timesheets, user, timesheetSearchTerm, projects]);
  
  const filteredDocuments = useMemo(() => {
    if (!docSearchTerm) return documentMovements;
    const lowercasedTerm = docSearchTerm.toLowerCase();
    return documentMovements.filter(doc => doc.title.toLowerCase().includes(lowercasedTerm));
  }, [documentMovements, docSearchTerm]);


  const canViewLongPending = user && ['Admin', 'Project Coordinator', 'Document Controller'].includes(user.role);

  return (
    <div className="space-y-4 h-full flex flex-col">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trackers</h1>
          <p className="text-muted-foreground">Monitor the lifecycle of JMS, Timesheets, and other documents.</p>
        </div>
        <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2">
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
      
      <Tabs defaultValue="jms" className="flex-1 flex flex-col">
        <TabsList className="shrink-0 grid w-full grid-cols-3">
          <TabsTrigger value="jms">JMS Tracker</TabsTrigger>
          <TabsTrigger value="timesheets">Timesheet Tracker</TabsTrigger>
          <TabsTrigger value="documents">Document Tracker</TabsTrigger>
        </TabsList>
        <TabsContent value="jms" className="flex-1 overflow-hidden flex flex-col">
           {showViewNotice && (
                <div className="relative mt-4 mb-2">
                    <Alert className="pr-12 border-blue-500/50 text-blue-900 bg-blue-50 dark:border-blue-700 dark:text-blue-200 dark:bg-blue-900/30">
                        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <AlertTitle className="font-semibold text-blue-800 dark:text-blue-100">New! List View & Default Settings</AlertTitle>
                        <AlertDescription className="text-blue-700 dark:text-blue-300">
                            You can now switch between Board and List views. Use the <Settings className="inline h-4 w-4" /> icon to set your preferred default view for this tracker.
                        </AlertDescription>
                    </Alert>
                    <Button variant="ghost" size="icon" className="absolute top-1/2 -translate-y-1/2 right-2 h-8 w-8 text-blue-800 dark:text-blue-100 hover:bg-blue-100 dark:hover:bg-blue-900" onClick={() => setShowViewNotice(false)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}
           <div className="flex justify-between items-center pt-2 pb-4">
              <div className="flex gap-2 items-center">
                  <div className="relative w-full sm:w-auto max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                          placeholder="Search by Job Desc, JMS no, project, amount..."
                          className="pl-9"
                          value={jmsSearchTerm}
                          onChange={e => setJmsSearchTerm(e.target.value)}
                      />
                  </div>
                  <Select value={jmsAssigneeFilter} onValueChange={setJmsAssigneeFilter}>
                      <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Filter by assignee..." />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">All Assignees</SelectItem>
                          {assignableUsers.map(u => (
                              <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>
              <div className="flex items-center gap-2">
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
            <JobProgressBoard jobs={filteredJobs} onViewJob={setViewingJob} />
          ) : (
            <JobProgressTable jobs={filteredJobs} onViewJob={setViewingJob} />
          )}
        </TabsContent>
        <TabsContent value="timesheets" className="flex-1 overflow-hidden flex flex-col">
          {showViewNotice && (
              <div className="relative mt-4 mb-2">
                    <Alert className="pr-12 border-blue-500/50 text-blue-900 bg-blue-50 dark:border-blue-700 dark:text-blue-200 dark:bg-blue-900/30">
                        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <AlertTitle className="font-semibold text-blue-800 dark:text-blue-100">New! List View & Default Settings</AlertTitle>
                        <AlertDescription className="text-blue-700 dark:text-blue-300">
                            You can now switch between Board and List views. Use the <Settings className="inline h-4 w-4" /> icon to set your preferred default view for this tracker.
                        </AlertDescription>
                    </Alert>
                    <Button variant="ghost" size="icon" className="absolute top-1/2 -translate-y-1/2 right-2 h-8 w-8 text-blue-800 dark:text-blue-100 hover:bg-blue-100 dark:hover:bg-blue-900" onClick={() => setShowViewNotice(false)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
          )}
          <div className="flex justify-between items-center pt-2 pb-4">
              <div className="relative w-full sm:w-auto max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by project or unit..."
                    className="pl-9"
                    value={timesheetSearchTerm}
                    onChange={e => setTimesheetSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
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
            <TimesheetBoard timesheets={filteredTimesheets} onViewTimesheet={setViewingTimesheet} />
          ) : (
            <TimesheetTrackerTable timesheets={filteredTimesheets} />
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
        onViewJob={setViewingJob}
        onViewTimesheet={setViewingTimesheet}
        onViewDocument={setViewingDocument}
      />
      <LongPendingJmsDialog
        isOpen={isLongPendingDialogOpen}
        setIsOpen={setIsLongPendingDialogOpen}
        longPendingJobs={longPendingJobs}
        onViewJob={setViewingJob}
      />
    </div>
  );
}
