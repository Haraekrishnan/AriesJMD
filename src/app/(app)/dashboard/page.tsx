'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-provider';
import { useTask } from '@/contexts/task-provider';
import { useManpower } from '@/contexts/manpower-provider';
import { useGeneral } from '@/contexts/general-provider';
import { usePlanner } from '@/contexts/planner-provider';
import { useInventory } from '@/contexts/inventory-provider';
import { Button } from '@/components/ui/button';
import { format, formatDistanceToNow, parseISO, isPast, addDays, isBefore, isValid, isAfter, endOfDay } from 'date-fns';
import StatCard from '@/components/dashboard/stat-card';
import { 
    Users, 
    CheckCircle, 
    ListTodo, 
    ShieldAlert, 
    ShieldCheck, 
    Clock, 
    ArrowRight, 
    UserCheck, 
    AlertCircle, 
    AlertTriangle, 
    TrendingUp, 
    Layout, 
    HardHat, 
    Warehouse, 
    ArrowRightLeft, 
    ClipboardCheck, 
    Hammer, 
    MessageSquare,
    Zap,
    PlusCircle,
    Send,
    Bell,
    Inbox,
    Package
} from 'lucide-react';
import TasksCompletedChart from '@/components/dashboard/tasks-completed-chart';
import TeamTaskDistributionChart from '@/components/dashboard/team-task-distribution-chart';
import AnnouncementFeed from '@/components/announcements/AnnouncementFeed';
import RecentPlannerActivity from '@/components/planner/RecentActivity';
import DelegatedEventFeed from '@/components/planner/DelegatedEventFeed';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { user, getVisibleUsers, markFeatureAsViewed, can } = useAuth();
  const { tasks: allTasks } = useTask();
  const { lastManpowerUpdate, manpowerLogs } = useManpower();
  const { projects, managementRequests } = useGeneral();
  const { jobSchedules, timesheets, jobProgress, documentMovements, trackerNotificationCount } = usePlanner();
  const { ppeRequests, inventoryTransferRequests, inventoryItems, damageReports, internalRequests } = useInventory();

  const teamUsers = useMemo(() => getVisibleUsers(), [getVisibleUsers]);
  const teamUserIds = useMemo(() => new Set(teamUsers.map(u => u.id)), [teamUsers]);

  const teamTasks = useMemo(() => {
    return allTasks.filter(task => {
        if (!task.assigneeIds) return false;
        return task.assigneeIds.some(id => teamUserIds.has(id));
    });
  }, [allTasks, teamUserIds]);

  // --- ACTION CENTER DATA ---
  const actionCenterData = useMemo(() => {
    if (!user) return null;

    // 1. My Pending Tracker Actions (JMS, TS, Docs)
    const pendingActions = trackerNotificationCount || 0;

    // 2. Unread Management Requests
    const unreadDirectivesCount = (managementRequests || []).filter(d => {
        const isRecipient = d.toUserId === user.id || (d.ccUserIds || []).includes(user.id);
        return isRecipient && !d.readBy?.[user.id];
    }).length;

    // 3. Request Updates (PPE/Store)
    const updatedInternalCount = (internalRequests || []).filter(r => {
        if (r.requesterId !== user.id) return false;
        return !r.acknowledgedByRequester && (r.status === 'Approved' || r.status === 'Issued' || r.status === 'Rejected');
    }).length;

    const myPpeRequests = (ppeRequests || []).filter(r => r.requesterId === user.id);
    const updatedPpeCount = myPpeRequests.filter(r => (r.status === 'Approved' || r.status === 'Rejected' || r.status === 'Issued') && !r.viewedByRequester).length;

    return {
        pendingActions,
        unreadDirectives: unreadDirectivesCount,
        requestUpdates: updatedInternalCount + updatedPpeCount,
        totalPersonalAlerts: pendingActions + unreadDirectivesCount + updatedInternalCount + updatedPpeCount
    };
  }, [user, trackerNotificationCount, managementRequests, internalRequests, ppeRequests]);

  const teamPerformance = useMemo(() => {
      return teamUsers.map(member => {
          const memberTasks = allTasks.filter(t => t.assigneeIds?.includes(member.id));
          const completed = memberTasks.filter(t => t.status === 'Done').length;
          
          // Updated overdue logic: Only if status isn't done/pending and end of day has passed
          const overdue = memberTasks.filter(t => {
              if (t.status === 'Done' || t.status === 'Pending Approval') return false;
              if (!t.dueDate) return false;
              const dueDate = parseISO(t.dueDate);
              if (!isValid(dueDate)) return false;
              return isAfter(new Date(), endOfDay(dueDate));
          }).length;

          const total = memberTasks.length;
          const score = total > 0 ? Math.round((completed / total) * 100) : 0;
          return { member, completed, overdue, total, score };
      }).sort((a, b) => {
          const isALocked = a.member.status === 'locked';
          const isBLocked = b.member.status === 'locked';
          if (isALocked !== isBLocked) return isALocked ? 1 : -1;
          return b.score - a.score;
      });
  }, [teamUsers, allTasks]);

  // --- MANAGEMENT SUMMARY DATA ---
  const managementData = useMemo(() => {
    if (!user) return null;

    const isManager = user.role === 'Admin' || user.role === 'Manager' || user.role === 'Project Coordinator';
    const isStoreStaff = user.role === 'Store in Charge' || user.role === 'Assistant Store Incharge';
    const hasTransferAuth = user.canApproveTransfers || can.approve_transfer_requests;

    const pendingPpeApproval = ppeRequests.filter(r => r.status === 'Pending').length;
    const pendingPpeIssuance = ppeRequests.filter(r => r.status === 'Approved').length;

    const pendingTransfers = inventoryTransferRequests.filter(r => r.status === 'Pending' || r.status === 'Disputed').length;
    const pendingDamageReportCount = can.manage_inventory ? (damageReports || []).filter(r => r.status === 'Pending').length : 0;

    const thirtyDaysFromNow = addDays(new Date(), 30);
    
    // EXCLUDE INACTIVE ITEMS FROM ASSET COMPLIANCE COUNTS
    const expiredCount = inventoryItems.filter(item => {
        if (item.isArchived || item.status === 'Damaged' || item.status === 'Quarantine' || item.status === 'Moved to another project') return false;
        const inspDue = item.inspectionDueDate ? parseISO(item.inspectionDueDate) : null;
        const tpDue = item.tpInspectionDueDate ? parseISO(item.tpInspectionDueDate) : null;
        return (inspDue && isPast(inspDue)) || (tpDue && isPast(tpDue));
    }).length;

    const expiringSoonCount = inventoryItems.filter(item => {
        if (item.isArchived || item.status === 'Damaged' || item.status === 'Quarantine' || item.status === 'Moved to another project') return false;
        const inspDue = item.inspectionDueDate ? parseISO(item.inspectionDueDate) : null;
        const tpDue = item.tpInspectionDueDate ? parseISO(item.tpInspectionDueDate) : null;
        const inspSoon = inspDue && !isPast(inspDue) && isBefore(inspDue, thirtyDaysFromNow);
        const tpSoon = tpDue && !isPast(tpDue) && isBefore(tpDue, thirtyDaysFromNow);
        return inspSoon || tpSoon;
    }).length;

    return {
        show: isManager || isStoreStaff || hasTransferAuth,
        ppe: { pending: pendingPpeApproval, ready: pendingPpeIssuance },
        store: { transfers: pendingTransfers, damage: pendingDamageReportCount },
        compliance: { expired: expiredCount, soon: expiringSoonCount }
    };
  }, [user, can, ppeRequests, inventoryTransferRequests, inventoryItems, damageReports]);

  const { totalWorking, totalOnLeave } = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const scheduleForToday = jobSchedules.find(s => s.date === todayStr);

    let working = 0;
    let onLeave = 0;

    projects.forEach(project => {
      const latestLogForDay = manpowerLogs
        .filter(log => log.projectId === project.id && log.date === todayStr)
        .sort((a,b) => parseISO(b.updatedAt).getTime() - parseISO(a.updatedAt).getTime())[0];
      
      const scheduledCount = scheduleForToday?.items?.filter(item => item.projectId === project.id)
          .reduce((sum, item) => sum + (item.manpowerIds?.length || 0), 0) || 0;

      const openingManpower = latestLogForDay?.openingManpower ?? scheduledCount;
      const countIn = latestLogForDay?.countIn || 0;
      const countOut = latestLogForDay?.countOut || 0;
      working += (openingManpower + countIn - countOut);
      onLeave += (latestLogForDay?.countOnLeave || 0);
    });
    return { totalWorking: working, totalOnLeave: onLeave };
  }, [manpowerLogs, projects, jobSchedules]);


  const completedTeamTasks = useMemo(() => teamTasks.filter(t => t.status === 'Done').length, [teamTasks]);
  const openTeamTasks = useMemo(() => teamTasks.length - completedTeamTasks, [teamTasks]);
  const activeManpowerToday = totalWorking - totalOnLeave;
  const showEhsNotice = can.access_ehs_portal && !user?.viewedFeatures?.ehs;

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome, {user?.name}!</h1>
            <p className="text-muted-foreground">Here is an interactive summary of your workspace and team.</p>
        </div>
      </div>

      {showEhsNotice && (
        <Alert className="bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800 animate-in fade-in slide-in-from-top-2 duration-500">
          <ShieldAlert className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-4">
            <div>
                <AlertTitle className="text-emerald-900 dark:text-emerald-200 font-bold">New Feature: EHS Portal</AlertTitle>
                <AlertDescription className="text-emerald-800 dark:text-emerald-300">
                    Manage site audits, report incidents, and conduct risk assessments all in one secure place.
                </AlertDescription>
            </div>
            <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" className="border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400" onClick={() => markFeatureAsViewed('ehs')}>
                    Dismiss
                </Button>
                <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Link href="/ehs">Explore Portal</Link>
                </Button>
            </div>
          </div>
        </Alert>
      )}

      <DelegatedEventFeed />
      <AnnouncementFeed />
      <RecentPlannerActivity />

      {/* --- MANAGEMENT CONTROL CENTER --- */}
      {managementData?.show && (
          <Card className="border-2 border-primary/20 shadow-sm bg-primary/[0.01]">
              <CardHeader className="pb-3 border-b bg-muted/20">
                  <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      <div>
                          <CardTitle className="text-lg">Management Control Center</CardTitle>
                          <CardDescription className="text-xs uppercase font-bold tracking-wider">Operational Approvals & Action Items</CardDescription>
                      </div>
                  </div>
              </CardHeader>
              <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-3">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                              <HardHat className="h-3 w-3" /> PPE Requests
                          </h4>
                          <div className="space-y-2">
                              <Link href="/my-requests" className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group">
                                  <span className="text-sm font-medium">Awaiting Manager Approval</span>
                                  <Badge variant={managementData.ppe.pending > 0 ? "destructive" : "secondary"} className="h-6 min-w-[2rem] justify-center">
                                      {managementData.ppe.pending}
                                  </Badge>
                              </Link>
                              <Link href="/ppe-stock" className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group">
                                  <span className="text-sm font-medium">Approved (Ready to Issue)</span>
                                  <Badge variant={managementData.ppe.ready > 0 ? "default" : "secondary"} className="h-6 min-w-[2rem] justify-center">
                                      {managementData.ppe.ready}
                                  </Badge>
                              </Link>
                          </div>
                      </div>

                      <div className="space-y-3">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                              <Warehouse className="h-3 w-3" /> Store & Transfers
                          </h4>
                          <div className="space-y-2">
                              <Link href="/store-inventory" className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group">
                                  <span className="text-sm font-medium">Pending Transfer Requests</span>
                                  <Badge variant={managementData.store.transfers > 0 ? "destructive" : "secondary"} className="h-6 min-w-[2rem] justify-center">
                                      {managementData.store.transfers}
                                  </Badge>
                              </Link>
                              <Link href="/damage-reports" className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group">
                                  <span className="text-sm font-medium">Open Damage Reports</span>
                                  <Badge variant={managementData.store.damage > 0 ? "destructive" : "secondary"} className="h-6 min-w-[2rem] justify-center">
                                      {managementData.store.damage}
                                  </Badge>
                              </Link>
                          </div>
                      </div>

                      <div className="space-y-3">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                              <ClipboardCheck className="h-3 w-3" /> Asset Compliance
                          </h4>
                          <div className="space-y-2">
                              <Link href="/store-inventory" className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-colors group">
                                  <div className="flex items-center gap-2">
                                      <AlertTriangle className="h-4 w-4 text-destructive" />
                                      <span className="text-sm font-black text-destructive">EXPIRED CERTIFICATIONS</span>
                                  </div>
                                  <Badge variant="destructive" className="h-6 min-w-[2rem] justify-center">
                                      {managementData.compliance.expired}
                                  </Badge>
                              </Link>
                              <Link href="/store-inventory" className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group">
                                  <span className="text-sm font-medium">Expiring Soon (30 Days)</span>
                                  <Badge variant="warning" className="h-6 min-w-[2rem] justify-center">
                                      {managementData.compliance.soon}
                                  </Badge>
                              </Link>
                          </div>
                      </div>
                  </div>
              </CardContent>
          </Card>
      )}

      {/* --- GLOBAL METRICS --- */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Team Completed" 
          value={completedTeamTasks.toString()} 
          icon={CheckCircle} 
          description="Tasks finalized by your team"
        />
        <StatCard 
          title="Team Open" 
          value={openTeamTasks.toString()}
          icon={ListTodo}
          description="In-progress or to-do"
        />
        <StatCard 
          title="Active Manpower" 
          value={activeManpowerToday.toString()}
          icon={Users}
          description={`${totalOnLeave} currently on leave`}
        />
        <StatCard 
          title="Manpower Update" 
          value={lastManpowerUpdate ? format(parseISO(lastManpowerUpdate), 'HH:mm') : 'N/A'}
          icon={Clock}
          description={lastManpowerUpdate ? `Updated ${formatDistanceToNow(parseISO(lastManpowerUpdate), { addSuffix: true })}` : 'No recent updates'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* --- MY ACTION CENTER --- */}
        <Card className="flex flex-col border-2 shadow-sm bg-blue-50/5">
            <CardHeader className="bg-muted/30 border-b pb-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary animate-pulse" />
                        <CardTitle className="text-lg font-black uppercase tracking-tight">My Action Center</CardTitle>
                    </div>
                    <Badge variant={actionCenterData?.totalPersonalAlerts! > 0 ? "destructive" : "secondary"}>
                        {actionCenterData?.totalPersonalAlerts} ALERTS
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Link href="/job-progress" className="flex flex-col items-center justify-center p-3 rounded-xl border-2 bg-white hover:bg-blue-50 transition-all group">
                        <Badge variant={actionCenterData?.pendingActions! > 0 ? "destructive" : "outline"} className="mb-2 h-7 min-w-[1.75rem] justify-center font-black">
                            {actionCenterData?.pendingActions}
                        </Badge>
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest text-center group-hover:text-primary transition-colors">Pending<br/>Signatures</span>
                    </Link>
                    <Link href="/management-requests" className="flex flex-col items-center justify-center p-3 rounded-xl border-2 bg-white hover:bg-blue-50 transition-all group">
                        <Badge variant={actionCenterData?.unreadDirectives! > 0 ? "destructive" : "outline"} className="mb-2 h-7 min-w-[1.75rem] justify-center font-black">
                            {actionCenterData?.unreadDirectives}
                        </Badge>
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest text-center group-hover:text-primary transition-colors">Unread<br/>Messages</span>
                    </Link>
                    <Link href="/my-requests" className="flex flex-col items-center justify-center p-3 rounded-xl border-2 bg-white hover:bg-blue-50 transition-all group">
                        <Badge variant={actionCenterData?.requestUpdates! > 0 ? "destructive" : "outline"} className="mb-2 h-7 min-w-[1.75rem] justify-center font-black">
                            {actionCenterData?.requestUpdates}
                        </Badge>
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest text-center group-hover:text-primary transition-colors">Request<br/>Updates</span>
                    </Link>
                </div>

                <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                        <Layout className="h-3 w-3" /> Quick Access Hub
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                        <Button asChild variant="outline" className="h-14 justify-start px-4 border-2 hover:bg-blue-50 hover:border-blue-200 transition-all group">
                            <Link href="/my-requests">
                                <Package className="mr-3 h-5 w-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-[11px] font-black uppercase tracking-tight">New Store Req</span>
                                    <span className="text-[9px] font-bold text-slate-400 mt-1">Tools & Materials</span>
                                </div>
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="h-14 justify-start px-4 border-2 hover:bg-blue-50 hover:border-blue-200 transition-all group">
                            <Link href="/my-requests">
                                <HardHat className="mr-3 h-5 w-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-[11px] font-black uppercase tracking-tight">New PPE Req</span>
                                    <span className="text-[9px] font-bold text-slate-400 mt-1">Safety Equipment</span>
                                </div>
                            </Link>
                        </Button>
                        {can.log_manpower && (
                            <Button asChild variant="outline" className="h-14 justify-start px-4 border-2 hover:bg-emerald-50 hover:border-emerald-200 transition-all group">
                                <Link href="/manpower">
                                    <Users className="mr-3 h-5 w-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                                    <div className="flex flex-col items-start leading-none">
                                        <span className="text-[11px] font-black uppercase tracking-tight">Log Manpower</span>
                                        <span className="text-[9px] font-bold text-slate-400 mt-1">Daily Site Count</span>
                                    </div>
                                </Link>
                            </Button>
                        )}
                        <Button asChild variant="outline" className="h-14 justify-start px-4 border-2 hover:bg-rose-50 hover:border-rose-200 transition-all group">
                            <Link href="/incident-reporting">
                                <ShieldAlert className="mr-3 h-5 w-5 text-slate-400 group-hover:text-rose-600 transition-colors" />
                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-[11px] font-black uppercase tracking-tight">Report Incident</span>
                                    <span className="text-[9px] font-bold text-slate-400 mt-1">HSE Submission</span>
                                </div>
                            </Link>
                        </Button>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="bg-muted/10 border-t p-4 flex justify-between items-center">
                 <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    <Clock className="h-3 w-3" /> Live Operations Mode
                 </div>
                 <Button variant="link" asChild className="text-[10px] font-black uppercase tracking-[0.2em] h-auto py-0">
                    <Link href="/tasks">All Tasks <ArrowRight className="ml-1 h-3 w-3"/></Link>
                </Button>
            </CardFooter>
        </Card>

        {/* --- TEAM STATUS --- */}
        <Card className="flex flex-col border-2 shadow-sm">
            <CardHeader className="bg-muted/30 border-b pb-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <UserCheck className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Team Overview</CardTitle>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground">{teamUsers.length} Members</span>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[355px]">
                    <div className="divide-y">
                        {teamPerformance.length > 0 ? teamPerformance.map(({ member, score, overdue, total }) => (
                            <div key={member.id} className={cn(
                                "p-4 flex items-center justify-between hover:bg-muted/20 transition-colors",
                                member.status === 'locked' && "opacity-40 grayscale pointer-events-none bg-muted/10"
                            )}>
                                <div className="flex items-center gap-3 min-w-0">
                                    <Avatar className="h-8 w-8 border">
                                        <AvatarImage src={member.avatar} />
                                        <AvatarFallback>{member.name[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold truncate leading-tight">{member.name}</p>
                                            {member.status === 'locked' && (
                                                <Badge variant="outline" className="text-[9px] font-black h-4 px-1 leading-none border-muted-foreground/30">LOCKED</Badge>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{member.role}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 ml-auto shrink-0">
                                    <div className="text-right">
                                        <p className="text-sm font-black">{score}%</p>
                                        <p className="text-[9px] uppercase font-bold text-muted-foreground leading-none">Done</p>
                                    </div>
                                    <div className="w-[90px] flex justify-end">
                                        <Badge 
                                          variant={overdue > 0 ? "destructive" : "secondary"} 
                                          className="h-5 px-2 text-[10px] font-black whitespace-nowrap"
                                        >
                                            {overdue > 0 ? `${overdue} OVERDUE` : 'CLEAR'}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
                                <Users className="h-10 w-10 opacity-10" />
                                <p className="text-sm font-medium">No team members found.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
            <CardFooter className="bg-muted/10 border-t p-4 flex justify-center mt-auto">
                <Button variant="link" asChild className="text-xs font-bold uppercase tracking-widest h-auto py-0">
                    <Link href="/performance">View Performance Reports</Link>
                </Button>
            </CardFooter>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <TasksCompletedChart tasks={teamTasks} />
        <TeamTaskDistributionChart tasks={teamTasks} />
      </div>
    </div>
  );
}
